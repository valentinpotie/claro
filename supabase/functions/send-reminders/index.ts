// send-reminders
// Phase 2 — relances. Scanne les tickets bloqués dont last_action_at est trop vieux.
//
// Sécurités en place :
//   1. Cooldown 2h par (ticket, rôle) — ne renvoie pas la même relance à quelqu'un qu'on
//      a déjà relancé il y a moins de 2h, quel que soit le délai configuré.
//   2. Dedup par destinataire dans un run — une même adresse email ne reçoit pas 2
//      mails dans la même invocation de la function.
//   3. Audit complet : chaque événement (sent/skipped/failed) écrit en DB dans
//      ticket_reminders avec la raison. Counter sur tickets = snapshot dérivé.
//   4. Test override accepté uniquement si auto_reminders_enabled=true ET l'agence est
//      explicitement en demo_mode=false (les mails partent pour de vrai → risque réel).
//
// Input (optionnel, POST body JSON) :
//   { agency_id?: string,  // cibler une seule agence
//     mode?: "auto" | "dry-run",  // force dry-run
//     triggered_by?: string }     // "cron" | "manual_button" (défaut: "manual_button")
//
// verify_jwt=false côté gateway.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { createLogger } from "./logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

// Cooldown absolu : aucune relance du même rôle ne peut partir sur un ticket dans cette
// fenêtre, même si la config délai le permettrait. Garde-fou contre misconfig test.
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

type Role = "artisan" | "owner" | "tenant";

const STATUS_TO_ROLE: Record<string, { role: Role; useCase: string; fallbackContent: (ticket: Record<string, unknown>) => string }> = {
  contractor_contacted: {
    role: "artisan",
    useCase: "auto:artisan_relance_date",
    fallbackContent: (t) => `Bonjour,\n\nSauf erreur de notre part, nous n'avons pas eu de retour concernant le ticket ${t.reference} au ${t.property_address ?? ""}. Pouvez-vous revenir vers nous ?\n\nMerci,`,
  },
  owner_validation: {
    role: "owner",
    useCase: "auto:proprietaire_relance",
    fallbackContent: (t) => `Bonjour,\n\nSauf erreur de notre part, nous n'avons pas encore reçu votre retour concernant le devis pour ${t.property_address ?? ""}. Pourriez-vous nous confirmer votre accord ?\n\nBien cordialement,`,
  },
  passage_confirmed: {
    role: "tenant",
    useCase: "auto:locataire_contact_artisan",
    fallbackContent: (t) => `Bonjour,\n\nNous revenons vers vous au sujet de l'intervention au ${t.property_address ?? ""}. Avez-vous eu la visite de l'artisan ?\n\nBien à vous,`,
  },
};

const TERMINAL_STATUSES = new Set(["closed", "syndic_resolved", "syndic_escalation", "syndic_followup"]);

type DueReminder = {
  ticket_id: string;
  reference: string;
  agency_id: string;
  agency_name: string | null;
  role: Role;
  status: string;
  recipient_email: string | null;
  template_use_case: string;
  seconds_since_last_action: number;
  current_counter: number;
  max_counter: number;
  will_escalate: boolean;
  mode: "would-send" | "would-skip-cooldown" | "would-skip-dedup";
  skip_reason?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });

  const log = createLogger("send-reminders", supabase);
  log.info("invoked");

  let body: { agency_id?: string; mode?: "auto" | "dry-run"; triggered_by?: string } = {};
  try { body = await req.json(); } catch { /* body vide = accepté */ }
  const forcedDryRun = body.mode === "dry-run";
  const triggeredBy = body.triggered_by ?? "manual_button";

  let agenciesQuery = supabase.from("agencies").select("id, name, email_inbound, demo_mode").eq("demo_mode", false);
  if (body.agency_id) agenciesQuery = agenciesQuery.eq("id", body.agency_id);
  const { data: agencies, error: agErr } = await agenciesQuery;
  if (agErr || !agencies) {
    log.error("agencies-fetch-failed", { error: agErr?.message });
    await log.flush();
    return new Response(JSON.stringify({ error: "Failed to list agencies" }), { status: 500, headers: JSON_HEADERS });
  }

  let remindersSent = 0;
  let escalationsTriggered = 0;
  let skipped = 0;
  const due: DueReminder[] = [];

  // Dedup par destinataire sur tout le run (tous agences confondues). Protège contre
  // une même adresse qui apparaîtrait via 2 tickets différents → un seul mail part.
  const sentRecipients = new Set<string>();

  // Helper : enregistre un événement d'audit
  const auditInsert = async (entry: {
    ticket_id: string; agency_id: string; role: Role; status: "sent" | "skipped" | "failed";
    recipient_email?: string | null; reason?: string; template_use_case?: string;
    counter_after?: number | null; ticket_message_id?: string | null;
  }) => {
    const { error } = await supabase.from("ticket_reminders").insert({
      ...entry,
      correlation_id: log.correlationId,
      triggered_by: triggeredBy,
    });
    if (error) log.warn("audit-insert-failed", { error: error.message, entry });
  };

  for (const agency of agencies) {
    const { data: settings } = await supabase
      .from("agency_settings")
      .select("escalation_delay_artisan_days, escalation_delay_owner_days, escalation_delay_tenant_days, escalation_reminders_count, auto_reminders_enabled, test_reminders_override_seconds")
      .eq("agency_id", agency.id)
      .maybeSingle();

    if (!settings) { log.debug("agency-no-settings", { agencyId: agency.id }); continue; }

    const maxReminders = (settings.escalation_reminders_count as number | null) ?? 3;
    const testOverrideSec = (settings.test_reminders_override_seconds as number | null) ?? null;
    const delaysSec: Record<Role, number> = testOverrideSec && testOverrideSec > 0
      ? { artisan: testOverrideSec, owner: testOverrideSec, tenant: testOverrideSec }
      : {
          artisan: ((settings.escalation_delay_artisan_days as number | null) ?? 3) * 86400,
          owner:   ((settings.escalation_delay_owner_days   as number | null) ?? 3) * 86400,
          tenant:  ((settings.escalation_delay_tenant_days  as number | null) ?? 3) * 86400,
        };
    const agencyAuto = !!settings.auto_reminders_enabled;
    const effectiveAuto = agencyAuto && !forcedDryRun;
    if (testOverrideSec) log.info("test-override-active", { agencyId: agency.id, seconds: testOverrideSec });
    if (!agencyAuto) log.info("agency-in-manual-mode", { agencyId: agency.id });
    else if (forcedDryRun) log.info("forced-dry-run", { agencyId: agency.id });

    const targetStatuses = Object.keys(STATUS_TO_ROLE);
    const nowIso = new Date().toISOString();
    const { data: candidates, error: candErr } = await supabase
      .from("tickets")
      .select("id, reference, agency_id, status, tenant_id, owner_id, assigned_artisan_id, last_action_at, reported_at, reminders_sent_artisan, reminders_sent_owner, reminders_sent_tenant, reminder_paused_until, requires_manual_action, tenant_email, property_owner_email, property_address")
      .eq("agency_id", agency.id)
      .in("status", targetStatuses)
      .eq("requires_manual_action", false)
      .or(`reminder_paused_until.is.null,reminder_paused_until.lt.${nowIso}`);
    if (candErr) {
      log.warn("candidates-fetch-failed", { agencyId: agency.id, error: candErr.message });
      continue;
    }

    for (const ticket of candidates ?? []) {
      const spec = STATUS_TO_ROLE[ticket.status as string];
      if (!spec || TERMINAL_STATUSES.has(ticket.status as string)) { skipped++; continue; }

      const counterField = `reminders_sent_${spec.role}` as const;
      const currentCounter = (ticket as Record<string, number | null>)[counterField] ?? 0;
      if (currentCounter >= maxReminders) { skipped++; continue; }

      const lastActionIso = (ticket.last_action_at as string | null) ?? (ticket.reported_at as string | null);
      if (!lastActionIso) { skipped++; continue; }
      const secondsSince = Math.floor((Date.now() - new Date(lastActionIso).getTime()) / 1000);
      if (secondsSince < delaysSec[spec.role]) { skipped++; continue; }

      // ── Cooldown 2h : check l'audit trail pour cette combinaison (ticket, rôle)
      const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
      const { count: recentCount } = await supabase
        .from("ticket_reminders")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", ticket.id)
        .eq("role", spec.role)
        .eq("status", "sent")
        .gt("created_at", cooldownCutoff);
      if ((recentCount ?? 0) > 0) {
        skipped++;
        await auditInsert({
          ticket_id: ticket.id as string, agency_id: agency.id, role: spec.role,
          status: "skipped", reason: "cooldown_2h", template_use_case: spec.useCase,
          counter_after: currentCounter,
        });
        continue;
      }

      // ── Résoudre le destinataire en amont pour dedup par email
      let recipientEmail: string | null = null;
      if (spec.role === "artisan" && ticket.assigned_artisan_id) {
        const { data: art } = await supabase.from("artisans").select("email").eq("id", ticket.assigned_artisan_id).maybeSingle();
        recipientEmail = (art?.email as string | null) ?? null;
      } else if (spec.role === "owner" && ticket.owner_id) {
        const { data: own } = await supabase.from("owners").select("email").eq("id", ticket.owner_id).maybeSingle();
        recipientEmail = (own?.email as string | null) ?? (ticket.property_owner_email as string | null) ?? null;
      } else if (spec.role === "tenant" && ticket.tenant_id) {
        const { data: ten } = await supabase.from("tenants").select("email").eq("id", ticket.tenant_id).maybeSingle();
        recipientEmail = (ten?.email as string | null) ?? (ticket.tenant_email as string | null) ?? null;
      } else if (spec.role === "owner") {
        recipientEmail = ticket.property_owner_email as string | null;
      } else if (spec.role === "tenant") {
        recipientEmail = ticket.tenant_email as string | null;
      }

      const willEscalate = currentCounter + 1 >= maxReminders;
      const dedupKey = recipientEmail?.toLowerCase().trim() ?? `no-email-${ticket.id}-${spec.role}`;
      const dedupHit = recipientEmail && sentRecipients.has(dedupKey);

      // Ajouter au due[] avec label du traitement qui va suivre
      let mode: DueReminder["mode"] = effectiveAuto ? "would-send" : "would-skip-cooldown";
      if (dedupHit) mode = "would-skip-dedup";
      due.push({
        ticket_id: ticket.id as string,
        reference: (ticket.reference as string | null) ?? "",
        agency_id: ticket.agency_id as string,
        agency_name: agency.name,
        role: spec.role,
        status: ticket.status as string,
        recipient_email: recipientEmail,
        template_use_case: spec.useCase,
        seconds_since_last_action: secondsSince,
        current_counter: currentCounter,
        max_counter: maxReminders,
        will_escalate: willEscalate,
        mode: effectiveAuto ? (dedupHit ? "would-skip-dedup" : "would-send") : "would-skip-cooldown",
        skip_reason: !effectiveAuto ? "manual_mode_or_dry_run" : (dedupHit ? "dedup_same_recipient_in_run" : undefined),
      });

      if (!effectiveAuto) continue;
      if (dedupHit) {
        skipped++;
        await auditInsert({
          ticket_id: ticket.id as string, agency_id: agency.id, role: spec.role,
          status: "skipped", reason: "dedup_same_recipient_in_run",
          recipient_email: recipientEmail, template_use_case: spec.useCase,
          counter_after: currentCounter,
        });
        continue;
      }

      // ── Envoi via send-ticket-email (service_role bypass)
      const recipientType = spec.role === "artisan" ? "artisan" : spec.role === "owner" ? "proprietaire" : "locataire";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-ticket-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            ticket_id: ticket.id,
            recipient_type: recipientType,
            artisan_id: spec.role === "artisan" ? ticket.assigned_artisan_id : undefined,
            template_use_case: spec.useCase,
            fallback_subject: `Relance — ${ticket.reference ?? ticket.property_address ?? ""}`,
            fallback_content: spec.fallbackContent(ticket as Record<string, unknown>),
            correlation_id: log.correlationId,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          log.warn("reminder-send-failed", { ticketId: ticket.id, role: spec.role, status: res.status, error: errBody }, { ticketId: ticket.id as string, agencyId: agency.id });
          skipped++;
          await auditInsert({
            ticket_id: ticket.id as string, agency_id: agency.id, role: spec.role,
            status: "failed", reason: `http_${res.status}`, recipient_email: recipientEmail,
            template_use_case: spec.useCase, counter_after: currentCounter,
          });
          continue;
        }
        const okBody = await res.json().catch(() => ({}));
        const ticketMessageId = (okBody?.ticket_message_id as string | null) ?? null;

        const newCounter = currentCounter + 1;
        const patch: Record<string, unknown> = { [counterField]: newCounter };
        if (willEscalate) patch.requires_manual_action = true;
        await supabase.from("tickets").update(patch).eq("id", ticket.id);

        await auditInsert({
          ticket_id: ticket.id as string, agency_id: agency.id, role: spec.role,
          status: "sent", recipient_email: recipientEmail,
          template_use_case: spec.useCase, counter_after: newCounter,
          ticket_message_id: ticketMessageId,
        });

        if (recipientEmail) sentRecipients.add(dedupKey);
        remindersSent++;
        if (willEscalate) escalationsTriggered++;
        log.info("reminder-sent", { ticketId: ticket.id, role: spec.role, counter: newCounter, escalated: willEscalate, recipient: recipientEmail }, { ticketId: ticket.id as string, agencyId: agency.id });
      } catch (err) {
        log.error("reminder-send-exception", { ticketId: ticket.id, error: err instanceof Error ? err.message : String(err) }, { ticketId: ticket.id as string, agencyId: agency.id });
        skipped++;
        await auditInsert({
          ticket_id: ticket.id as string, agency_id: agency.id, role: spec.role,
          status: "failed", reason: `exception: ${err instanceof Error ? err.message : String(err)}`,
          recipient_email: recipientEmail, template_use_case: spec.useCase, counter_after: currentCounter,
        });
      }
    }
  }

  log.info("done", { remindersSent, escalationsTriggered, skipped, dueCount: due.length, forcedDryRun, triggeredBy });
  await log.flush();

  return new Response(JSON.stringify({
    reminders_sent: remindersSent,
    escalations_triggered: escalationsTriggered,
    skipped,
    due,
    correlation_id: log.correlationId,
  }), { status: 200, headers: JSON_HEADERS });
});
