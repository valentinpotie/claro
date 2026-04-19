// inbound-email
// Webhook target for Resend inbound. Two flows:
//   - Reply to an existing ticket (subject contains [CLR-XX]) → delegate to classify-reply
//   - New email without reference → create inbound_emails row + AI qualification for dashboard
//
// We always forward the raw Resend attachments array to classify-reply so it can persist
// any PDFs/images (quote, invoice, proof) in Supabase Storage + ticket_documents.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { createLogger } from "./logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getEmailContent(emailId: string): Promise<{ text: string; html: string; in_reply_to: string | null; references: string | null; raw: Record<string, unknown> }> {
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
    if (!r.ok) return { text: "", html: "", in_reply_to: null, references: null, raw: {} };
    const d = await r.json();
    // Resend exposes raw headers when available. We look for In-Reply-To / References in several
    // likely locations to be resilient to API shape changes.
    const inReplyTo = (d.in_reply_to ?? d.headers?.["in-reply-to"] ?? d.headers?.["In-Reply-To"] ?? null) as string | null;
    const references = (d.references ?? d.headers?.references ?? d.headers?.References ?? null) as string | null;
    return { text: d.text ?? "", html: d.html ?? "", in_reply_to: inReplyTo, references, raw: d };
  } catch {
    return { text: "", html: "", in_reply_to: null, references: null, raw: {} };
  }
}

/** Extracts a ticket UUID from any of our anchor patterns present in an In-Reply-To/References string. */
function extractTicketIdFromHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = header.match(/claro-ticket-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@mail\.claroimmo\.fr/i);
  return m ? m[1] : null;
}

/**
 * Asks Claude to pick the most likely ticket among a short list of open candidates.
 * Returns the ticket id only if confidence is "high" — otherwise we fall back to creating a new signalement.
 */
async function matchWithClaude(
  fromEmail: string,
  subject: string,
  bodyText: string,
  candidates: Array<{ id: string; reference: string; title: string; status: string; created_at: string }>,
): Promise<string | null> {
  if (candidates.length === 0) return null;
  const listBlock = candidates.map((c, i) => `${i + 1}. [${c.reference}] "${c.title}" — statut: ${c.status} — créé le ${c.created_at.slice(0, 10)}`).join("\n");
  const prompt = `Tu reçois un email dans une agence de gestion locative. L'expéditeur (${fromEmail}) a plusieurs tickets ouverts. Décide si cet email est un suivi d'UN de ces tickets existants, ou un nouveau signalement.

Email:
Sujet: ${subject}
Corps: ${bodyText.slice(0, 2000)}

Tickets ouverts pour cet expéditeur:
${listBlock}

Retourne UNIQUEMENT ce JSON strict (pas de markdown, pas de backticks):
{
  "ticket_reference": "CLR-XX" ou null si nouveau signalement,
  "confidence": "high" | "medium" | "low",
  "reason": "phrase courte expliquant le choix"
}

Règle: "high" uniquement si tu es certain (ex: l'email mentionne explicitement un détail du ticket). Par défaut "medium" → sera traité comme un nouveau signalement.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw = d?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { ticket_reference: string | null; confidence: string; reason: string };
    if (parsed.ticket_reference && parsed.confidence === "high") {
      const match = candidates.find((c) => c.reference === parsed.ticket_reference);
      return match?.id ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function getAttachments(emailId: string): Promise<unknown[]> {
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d.data) ? d.data : [];
  } catch {
    return [];
  }
}

type ResendAtt = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  content?: string;
  download_url?: string;
};

async function fetchAttachmentBytes(att: ResendAtt, emailId: string): Promise<Uint8Array | null> {
  // Prefer inline base64 if present; fall back to download_url; fall back to Resend API.
  try {
    if (typeof att.content === "string" && att.content.length > 0) {
      const bin = atob(att.content);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    if (typeof att.download_url === "string") {
      const r = await fetch(att.download_url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
    }
    if (typeof att.id === "string") {
      const url = `https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
      if (r.ok) {
        const ct = (r.headers.get("content-type") ?? "").toLowerCase();
        if (ct.includes("application/json")) {
          const j = await r.json();
          const b64 = j?.content ?? j?.data?.content;
          if (typeof b64 === "string") {
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return bytes;
          }
        } else {
          return new Uint8Array(await r.arrayBuffer());
        }
      }
    }
  } catch {
    // fall through to null
  }
  return null;
}

/**
 * Persist signalement attachments to Storage so the dashboard can render thumbnails
 * via signed URLs. Replaces the raw Resend download_url (which requires the API key)
 * with a storage_path accessible to the agency via RLS.
 */
async function persistSignalementAttachments(
  inboundId: string,
  emailId: string,
  rawAttachments: unknown[],
): Promise<Array<{ filename: string; content_type: string | null; size: number | null; storage_path: string }>> {
  const out: Array<{ filename: string; content_type: string | null; size: number | null; storage_path: string }> = [];
  for (let i = 0; i < rawAttachments.length; i++) {
    const att = rawAttachments[i] as ResendAtt;
    const bytes = await fetchAttachmentBytes(att, emailId);
    if (!bytes) continue;
    const safeName = (att.filename ?? `piece-${i + 1}.bin`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `inbound-${inboundId}/${safeName}`;
    const { error: uploadErr } = await supabase.storage.from("ticket-documents").upload(storagePath, bytes, {
      contentType: att.content_type ?? "application/octet-stream",
      upsert: true,
    });
    if (uploadErr) continue;
    out.push({
      filename: att.filename ?? safeName,
      content_type: att.content_type ?? null,
      size: typeof att.size === "number" ? att.size : bytes.byteLength,
      storage_path: storagePath,
    });
  }
  return out;
}

async function qualify(from_email: string, from_name: string, subject: string, body: string): Promise<Record<string, unknown> | null> {
  const prompt = `Tu es un agent de qualification d'incidents locatifs francais. Tu recois un email d'un locataire signalant un probleme dans son logement.

De: ${from_email}
Nom: ${from_name}
Sujet: ${subject}
Corps: ${body}

Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans backticks, sans explication:
{
  "title": "titre court max 8 mots",
  "category": "plumbing|electrical|locksmith|heating|roofing|humidity|pests|painting|other",
  "priority": "urgent|high|normal|low",
  "responsibility": "tenant|owner|shared|syndic",
  "ai_required_action": "contractor|syndic|owner|manager",
  "ai_summary": "phrase max 10 mots pour dashboard",
  "ai_qualified_description": "reformulation claire et structuree du probleme en 2-3 phrases",
  "tenant_name": "nom extrait du mail ou null",
  "is_urgent": false
}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) { console.error("Anthropic API Error:", await r.text()); return null; }
    const d = await r.json();
    const raw = d?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (e) { console.error("Anthropic Parse Error:", e); return null; }
}

function extractTicketReference(subject: string): string | null {
  const m = subject.match(/\[(CLR-[A-Z0-9-]+)\]/i);
  return m ? m[1].toUpperCase() : null;
}

async function invokeClassifyReply(payload: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: unknown }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/classify-reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  const log = createLogger("inbound-email", supabase);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { log.warn("invalid-json-body"); await log.flush(); return new Response("ok", { status: 200 }); }
  if (body.type !== "email.received") { log.debug("skipped-non-email-event", { type: body.type }); await log.flush(); return new Response(JSON.stringify({ skipped: true }), { status: 200 }); }

  const ev = body.data as Record<string, unknown>;
  const emailId = ev?.email_id as string;
  const toEmail = (Array.isArray(ev?.to) ? ev.to[0] : ev?.to) as string;
  const subject = (ev?.subject as string) ?? "";
  const fromEmail = (ev?.from as string) ?? "";
  const fromName = (ev?.from_name as string) ?? "";
  if (!emailId) { log.error("missing-email-id", { payload: ev }); await log.flush(); return new Response("ok", { status: 200 }); }

  log.info("received", { emailId, toEmail, fromEmail, subject });

  const { text: bodyText, html: bodyHtml, in_reply_to, references } = await getEmailContent(emailId);
  const attachments = await getAttachments(emailId);
  log.debug("content-fetched", { textLength: bodyText.length, htmlLength: bodyHtml.length, attachmentCount: attachments.length, hasInReplyTo: !!in_reply_to, hasReferences: !!references });

  const { data: agency } = await supabase.from("agencies").select("id, name").eq("email_inbound", toEmail).maybeSingle();
  if (!agency) { log.error("agency-not-found", { toEmail }); await log.flush(); return new Response("ok", { status: 200 }); }

  // ─── Resolve ticket via 3 strategies (strongest signal wins) ──────────────
  // 1. [CLR-XX] in subject (explicit reference, strongest)
  // 2. In-Reply-To / References headers contain our anchor
  // 3. Claude matches against open tickets of this sender (fallback when sender
  //    strips the reference and sends as a "new" email but it's actually a follow-up)
  let matchedTicketId: string | null = null;
  let matchedVia: "subject-ref" | "in-reply-to" | "ai-inference" | null = null;

  // Strategy 1
  const ticketRef = extractTicketReference(subject);
  if (ticketRef) {
    const { data: ticket } = await supabase.from("tickets").select("id").eq("reference", ticketRef).eq("agency_id", agency.id).maybeSingle();
    if (ticket) { matchedTicketId = ticket.id; matchedVia = "subject-ref"; }
    else log.warn("ref-in-subject-but-ticket-not-found", { ticketRef, toEmail }, { agencyId: agency.id });
  }

  // Strategy 2
  if (!matchedTicketId) {
    const fromHeaderId = extractTicketIdFromHeader(in_reply_to) ?? extractTicketIdFromHeader(references);
    if (fromHeaderId) {
      const { data: ticket } = await supabase.from("tickets").select("id").eq("id", fromHeaderId).eq("agency_id", agency.id).maybeSingle();
      if (ticket) { matchedTicketId = ticket.id; matchedVia = "in-reply-to"; }
      else log.warn("anchor-in-header-but-ticket-missing", { fromHeaderId }, { agencyId: agency.id });
    }
  }

  // Strategy 3: AI inference when sender has 1+ open tickets
  if (!matchedTicketId) {
    const from = fromEmail.toLowerCase();
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(); // 60 days window
    // Fetch open tickets where this sender is a known stakeholder (tenant/owner/syndic/artisan)
    const { data: candidates } = await supabase
      .from("tickets")
      .select("id, reference, title, status, created_at, tenant_email, property_owner_email, syndic_email, assigned_artisan_id")
      .eq("agency_id", agency.id)
      .neq("status", "closed")
      .gt("created_at", since)
      .order("created_at", { ascending: false });

    const candidateList = (candidates ?? []).filter((t) =>
      (t.tenant_email ?? "").toLowerCase() === from ||
      (t.property_owner_email ?? "").toLowerCase() === from ||
      (t.syndic_email ?? "").toLowerCase() === from,
    );

    // Also check artisan email (separate table)
    if (candidateList.length === 0 && (candidates ?? []).some((t) => t.assigned_artisan_id)) {
      const artisanIds = (candidates ?? []).map((t) => t.assigned_artisan_id).filter(Boolean) as string[];
      const { data: artisans } = await supabase.from("artisans").select("id, email").in("id", artisanIds);
      const artisanIdsByEmail = (artisans ?? []).filter((a) => (a.email ?? "").toLowerCase() === from).map((a) => a.id);
      const artisanTickets = (candidates ?? []).filter((t) => t.assigned_artisan_id && artisanIdsByEmail.includes(t.assigned_artisan_id));
      candidateList.push(...artisanTickets);
    }

    if (candidateList.length > 0) {
      log.info("ai-match-candidates", { count: candidateList.length, refs: candidateList.map((c) => c.reference) }, { agencyId: agency.id });
      const aiStart = Date.now();
      const aiMatched = await matchWithClaude(fromEmail, subject, bodyText, candidateList.map((c) => ({
        id: c.id as string, reference: c.reference as string, title: c.title as string,
        status: c.status as string, created_at: c.created_at as string,
      })));
      if (aiMatched) {
        matchedTicketId = aiMatched;
        matchedVia = "ai-inference";
        log.info("ai-match-found", { ticketId: aiMatched }, { agencyId: agency.id, durationMs: Date.now() - aiStart });
      } else {
        log.info("ai-match-none", { candidatesCount: candidateList.length }, { agencyId: agency.id, durationMs: Date.now() - aiStart });
      }
    }
  }

  // If any strategy matched → route as reply
  if (matchedTicketId) {
    log.info("routed-as-reply", { via: matchedVia, ticketId: matchedTicketId }, { agencyId: agency.id, ticketId: matchedTicketId });
    {
      const classifyStart = Date.now();
      const res = await invokeClassifyReply({
        ticket_id: matchedTicketId,
        resend_email_id: emailId,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        body_text: bodyText,
        attachments,
        correlation_id: log.correlationId,
      });
      if (!res.ok) log.error("classify-reply-failed", { status: res.status, response: res.body }, { agencyId: agency.id, ticketId: matchedTicketId, durationMs: Date.now() - classifyStart });
      else log.info("classify-reply-done", { response: res.body }, { agencyId: agency.id, ticketId: matchedTicketId, durationMs: Date.now() - classifyStart });
      await log.flush();
      return new Response(JSON.stringify({ success: true, routed_to_ticket: matchedTicketId, matched_via: matchedVia, correlation_id: log.correlationId }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }

  // New signalement flow (no strategy matched)
  const { data: inbound, error: ie } = await supabase.from("inbound_emails").insert({
    agency_id: agency.id,
    from_email: fromEmail,
    from_name: fromName,
    to_email: toEmail,
    subject,
    body_text: bodyText,
    body_html: bodyHtml,
    attachments: attachments.length > 0 ? attachments : null,
    status: "processing",
    received_at: new Date().toISOString(),
  }).select("id").single();
  if (ie || !inbound) { log.error("inbound-insert-failed", { error: ie?.message }, { agencyId: agency.id }); await log.flush(); return new Response("ok", { status: 200 }); }

  log.info("signalement-created", { inboundId: inbound.id }, { agencyId: agency.id });

  // Download & persist attachments to Storage so the dashboard signalement card can render
  // thumbnails/links via signed URLs. Replaces the raw Resend download_url (which requires
  // an API key) with a storage_path accessible via RLS.
  if (attachments.length > 0) {
    try {
      const persisted = await persistSignalementAttachments(inbound.id as string, emailId, attachments);
      if (persisted.length > 0) {
        await supabase.from("inbound_emails").update({ attachments: persisted }).eq("id", inbound.id);
        log.info("signalement-attachments-stored", { count: persisted.length }, { agencyId: agency.id });
      }
    } catch (err) {
      log.warn("signalement-attachments-failed", { error: err instanceof Error ? err.message : String(err) }, { agencyId: agency.id });
    }
  }

  const textForAi = bodyText.trim() !== "" ? bodyText : bodyHtml;
  const aiStart = Date.now();
  const q = await qualify(fromEmail, fromName, subject, textForAi);
  log.info("ai-qualify-done", { success: !!q }, { agencyId: agency.id, durationMs: Date.now() - aiStart });

  const { error: updateError } = await supabase.from("inbound_emails").update({
    status: "processed",
    validation_status: "pending",
    ai_suggestion: q ?? null,
    error_message: q ? null : "Qualification IA echouee",
    processed_at: new Date().toISOString(),
  }).eq("id", inbound.id);
  if (updateError) log.error("inbound-update-failed", { error: updateError.message }, { agencyId: agency.id });
  else log.info("done", { inboundId: inbound.id, agency: agency.name }, { agencyId: agency.id, durationMs: log.elapsedMs() });

  await log.flush();
  return new Response(JSON.stringify({ success: true, inbound_id: inbound.id, correlation_id: log.correlationId }), { status: 200, headers: { "Content-Type": "application/json" } });
});
