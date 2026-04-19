// classify-reply
// Called by inbound-email when an email matches [CLR-XX] and points to an existing ticket.
//
// Steps:
//   1. Verify internal auth (shared service_role secret)
//   2. Clean the quoted text (lib → regex fallback → Claude as safety net)
//   3. Identify the sender by matching from_email against the ticket's known contacts
//   4. Classify with Claude (acceptance / quote_sent / approval / …)
//   5. Persist inbound message in ticket_messages
//   6. Process attachments: download from Resend, upload to Storage, insert ticket_documents
//      + Claude Vision extraction for quote/invoice PDFs, photo detection for proofs
//   7. Conservative status transitions based on classification + extracted data

import { createClient } from "jsr:@supabase/supabase-js@2";
import EmailReplyParser from "npm:email-reply-parser@2.3.5";
import { decodeBase64, encodeBase64 } from "jsr:@std/encoding/base64";
import { createLogger, type Logger } from "./logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

/** Convertit un datetime naïf exprimé en heure locale Europe/Paris (ex: "2026-04-22T14:00:00")
 *  vers un instant UTC ISO. Gère DST automatiquement via Intl.DateTimeFormat.
 *  Nécessaire car Claude renvoie un format sans timezone et Deno interpréterait la chaîne
 *  comme UTC — ce qui décale de +1/+2h selon la saison au moment de l'affichage Paris. */
function parisLocalToUTCISO(localIso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(localIso);
  if (!m) return null;
  const [, yStr, moStr, dStr, hStr, miStr, sStr] = m;
  const y = Number(yStr), mo = Number(moStr), d = Number(dStr);
  const h = Number(hStr), mi = Number(miStr), s = Number(sStr ?? "0");
  // Approche : on calcule l'offset Paris AU moment demandé.
  // 1) Instant naïf traité comme UTC
  const naiveUtcMs = Date.UTC(y, mo - 1, d, h, mi, s, 0);
  // 2) Formatons ce naïf-UTC dans la timezone Paris — ça nous donne les composants
  //    visibles au même instant, ce qui révèle l'offset (diff entre wall-clock Paris
  //    et UTC).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(naiveUtcMs));
  const pick = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const parisWallMs = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour"), pick("minute"), pick("second"));
  const offsetMs = parisWallMs - naiveUtcMs; // +7200000 en été, +3600000 en hiver
  // 3) L'instant UTC correspondant au wall-clock Paris voulu est naiveUtcMs - offsetMs.
  return new Date(naiveUtcMs - offsetMs).toISOString();
}
const INTERNAL_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STORAGE_BUCKET = "ticket-documents";

type ResendAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  download_url?: string;
  content?: string;
  [k: string]: unknown;
};

type RequestBody = {
  ticket_id: string;
  resend_email_id: string;
  from_email: string;
  from_name?: string;
  subject: string;
  body_text: string;
  attachments?: ResendAttachment[];
  correlation_id?: string;
};

type Classification = {
  category:
    | "acceptance" | "refusal" | "quote_sent" | "invoice_sent" | "proof_sent"
    | "approval"   | "owner_refusal" | "question" | "info" | "unknown";
  confidence: "high" | "medium" | "low";
  summary: string;
  extracted?: Record<string, unknown>;
};

type SenderIdentity = {
  from_role: "artisan" | "tenant" | "owner" | "syndic" | "unknown";
  thread_key: string;
  artisan_id: string | null;
};

// ─── Level-2 regex fallback ─────────────────────────────────────────────────
function fallbackRegexClean(text: string): string {
  if (!text) return "";
  const quoteMarkers: RegExp[] = [
    /^>.*$/gm,
    /On \w+ \d+ \w+ \d{4},? at \d+:\d+/gi,
    /Le \w+ \d+ \w+ \d{4} à \d+:\d+/gi,
    /-{2,}\s*Original Message\s*-{2,}/gi,
    /^From:\s*.+<.+@.+>/gm,
    /^Envoyé le\s*:/gm,
    /^De\s*:/gm,
  ];
  let cutIndex = text.length;
  for (const pattern of quoteMarkers) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match && match.index < cutIndex) cutIndex = match.index;
  }
  return text.substring(0, cutIndex).trim();
}

// ─── Level-1 email-reply-parser with regex fallback ─────────────────────────
function cleanReply(rawBody: string): string {
  if (!rawBody) return "";
  try {
    // deno-lint-ignore no-explicit-any
    const parser = new (EmailReplyParser as any)();
    const visibleText: string = parser.read(rawBody).getVisibleText();
    const trimmed = (visibleText ?? "").trim();
    return trimmed.length > 0 ? trimmed : fallbackRegexClean(rawBody);
  } catch {
    return fallbackRegexClean(rawBody);
  }
}

function normalizeEmail(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

// ─── Claude classification (category/summary/extracted dates) ─────────────
async function classify(
  senderRole: SenderIdentity["from_role"],
  ticketStatus: string,
  subject: string,
  cleanedBody: string,
): Promise<Classification | null> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const prompt = `Tu classifies une reponse email recue dans le cadre d'un ticket de gestion locative.
Le corps ci-dessous a deja ete pre-nettoye, mais peut encore contenir du texte cite. Tu es le dernier filet.

Date du jour (pour resoudre les dates relatives) : ${todayIso}

Contexte:
- Expediteur: ${senderRole}
- Statut actuel du ticket: ${ticketStatus}
- Objet: ${subject}
- Corps: ${cleanedBody.slice(0, 4000)}

Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans backticks:
{
  "category": "acceptance"|"refusal"|"quote_sent"|"invoice_sent"|"proof_sent"|"approval"|"owner_refusal"|"question"|"info"|"unknown",
  "confidence": "high"|"medium"|"low",
  "summary": "phrase de 5-15 mots en francais",
  "extracted": {
    "intervention_date": "YYYY-MM-DDTHH:MM:00 ou null"
  }
}

NE reformule PAS le corps du mail — il est deja nettoye en amont par email-reply-parser.
Ton role est uniquement de CLASSIFIER et EXTRAIRE, pas de reecrire.

Regles:
- "acceptance" = l'artisan confirme qu'il peut se deplacer / faire l'intervention
- "refusal" = refus explicite
- "quote_sent" = devis en piece jointe ou mention explicite d'un devis
- "invoice_sent" = facture en piece jointe
- "proof_sent" = photo/video preuve d'intervention (locataire)
- "approval" = proprietaire approuve
- "owner_refusal" = proprietaire refuse
- "question" = demande d'infos complementaires
- "info" = message informatif
- "unknown" = non classifiable
- "confidence" = "high" uniquement si certain, par defaut "medium"

Extraction "intervention_date" :
- Renseigne UNIQUEMENT si l'email propose ou confirme explicitement UNE date concrete de passage ("lundi 22 avril a 14h", "le 25/04 matin", "demain 9h", "mardi prochain").
- Format ISO 8601 local sans timezone (ex: "2026-04-22T14:00:00"). Si heure imprecise ("matin"), prends 09:00; ("apres-midi") 14:00; ("fin de journee") 17:00.
- Resous les dates relatives par rapport a la date du jour donnee plus haut.
- Retourne null si le message n'indique pas de date concrete (question ouverte, plages vagues, disponibilites generiques).`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) { console.error("Anthropic classify error:", await r.text()); return null; }
    const d = await r.json();
    const raw = d?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as Classification;
  } catch (e) {
    console.error("Anthropic classify parse error:", e);
    return null;
  }
}

// Priority tenant → owner → syndic → artisan. Checking stakeholders first avoids routing
// a tenant's reply to the artisan thread when the two addresses collide.
//
// For tenant and owner we also consult the LIVE tables (tenants, owners) in addition to
// the ticket snapshots, so a stakeholder who changed email since the ticket was created
// still matches. For tenants with a lease_id we also check every co-tenant listed in
// lease_tenants — a co-locataire replying won't be routed to the invisible "general" thread.
async function identifySender(
  fromEmail: string,
  ticket: Record<string, unknown>,
  artisan: { id: string; email: string | null } | null,
): Promise<SenderIdentity> {
  const from = normalizeEmail(fromEmail);
  if (!from) return { from_role: "unknown", thread_key: "general", artisan_id: null };

  // 1) Tenant — snapshot first (cheap), then live row, then lease_tenants (colocation).
  if (normalizeEmail(ticket.tenant_email as string | null) === from) {
    return { from_role: "tenant", thread_key: "locataire", artisan_id: null };
  }
  if (ticket.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("email")
      .eq("id", ticket.tenant_id as string)
      .maybeSingle();
    if (normalizeEmail((tenant?.email as string | null) ?? null) === from) {
      return { from_role: "tenant", thread_key: "locataire", artisan_id: null };
    }
  }
  if (ticket.lease_id) {
    const { data: coTenants } = await supabase
      .from("lease_tenants")
      .select("tenant:tenants(email)")
      .eq("lease_id", ticket.lease_id as string);
    const matched = (coTenants ?? []).some((lt: { tenant: { email: string | null } | null }) =>
      normalizeEmail(lt.tenant?.email ?? null) === from,
    );
    if (matched) {
      return { from_role: "tenant", thread_key: "locataire", artisan_id: null };
    }
  }

  // 2) Owner — snapshot + live row.
  if (normalizeEmail(ticket.property_owner_email as string | null) === from) {
    return { from_role: "owner", thread_key: "proprietaire", artisan_id: null };
  }
  if (ticket.owner_id) {
    const { data: owner } = await supabase
      .from("owners")
      .select("email")
      .eq("id", ticket.owner_id as string)
      .maybeSingle();
    if (normalizeEmail((owner?.email as string | null) ?? null) === from) {
      return { from_role: "owner", thread_key: "proprietaire", artisan_id: null };
    }
  }

  // 3) Syndic (no dedicated table yet — snapshot only).
  if (normalizeEmail(ticket.syndic_email as string | null) === from) {
    return { from_role: "syndic", thread_key: "syndic", artisan_id: null };
  }

  // 4) Artisan (assigned artisan only — full directory fallback happens at call site).
  if (artisan?.email && normalizeEmail(artisan.email) === from) {
    return { from_role: "artisan", thread_key: artisan.id, artisan_id: artisan.id };
  }

  return { from_role: "unknown", thread_key: "general", artisan_id: null };
}

// ─── Attachment handling ────────────────────────────────────────────────────
// Classification wins over file type: a phone picture of a paper quote must be typed
// as "devis" (not "photo") so Vision extracts the amount. Only tenant proofs (proof_sent)
// default to "photo" regardless of what the image shows.
function guessDocumentType(att: ResendAttachment, classification: Classification | null): "devis" | "facture" | "photo" | "autre" {
  const mime = (att.content_type ?? "").toLowerCase();
  const filename = (att.filename ?? "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || filename.endsWith(".pdf");

  if (classification?.category === "quote_sent" && (isPdf || isImage)) return "devis";
  if (classification?.category === "invoice_sent" && (isPdf || isImage)) return "facture";
  if (classification?.category === "proof_sent" && isImage) return "photo";
  if (isImage) return "photo";
  return "autre";
}

async function downloadAttachmentContent(
  att: ResendAttachment,
  emailId: string,
  log: Logger,
): Promise<{ bytes: Uint8Array; size: number; base64: string } | null> {
  // Path 1: inline base64 in the list response
  if (typeof att.content === "string" && att.content.length > 0) {
    const bytes = decodeBase64(att.content);
    return { bytes, size: bytes.byteLength, base64: att.content };
  }
  // Path 2: explicit download_url
  if (typeof att.download_url === "string") {
    try {
      const r = await fetch(att.download_url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
      if (r.ok) {
        const buf = new Uint8Array(await r.arrayBuffer());
        return { bytes: buf, size: buf.byteLength, base64: encodeBase64(buf) };
      }
      log.warn("att-download-url-failed", { status: r.status, url: att.download_url });
    } catch (e) {
      log.warn("att-download-url-exception", { error: String(e) });
    }
  }
  // Path 3: Resend API GET /emails/receiving/{email_id}/attachments/{att_id}
  if (typeof att.id === "string") {
    try {
      const url = `https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
      if (r.ok) {
        const ct = (r.headers.get("content-type") ?? "").toLowerCase();
        if (ct.includes("application/json")) {
          const j = await r.json();
          const b64 = j?.content ?? j?.data?.content;
          if (typeof b64 === "string") {
            const bytes = decodeBase64(b64);
            return { bytes, size: bytes.byteLength, base64: b64 };
          }
          log.warn("att-resend-json-no-content", { keys: Object.keys(j ?? {}) });
        } else {
          const buf = new Uint8Array(await r.arrayBuffer());
          return { bytes: buf, size: buf.byteLength, base64: encodeBase64(buf) };
        }
      } else {
        log.warn("att-resend-api-failed", { status: r.status, url });
      }
    } catch (e) {
      log.warn("att-resend-api-exception", { error: String(e) });
    }
  }
  return null;
}

async function extractWithVision(
  base64: string,
  mimeType: string,
  purpose: "quote" | "invoice",
  log: Logger,
): Promise<Record<string, unknown> | null> {
  const prompt = purpose === "quote"
    ? `Analyse ce document qui devrait etre un devis d'artisan. Retourne UNIQUEMENT ce JSON strict, sans markdown:
{
  "amount": nombre en euros TTC (ou null si absent),
  "delay_text": "delai d'execution mentionne" (ou null),
  "description": "prestation en 1 phrase" (ou null),
  "ref_devis": "reference du devis" (ou null),
  "date_devis": "YYYY-MM-DD" (ou null)
}`
    : `Analyse ce document qui devrait etre une facture d'artisan. Retourne UNIQUEMENT ce JSON strict, sans markdown:
{
  "amount": nombre en euros TTC (ou null si absent),
  "invoice_ref": "reference facture" (ou null),
  "invoice_date": "YYYY-MM-DD" (ou null),
  "description": "prestation en 1 phrase" (ou null)
}`;

  const isPdf = mimeType.includes("pdf");
  const content = isPdf
    ? [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: prompt },
      ]
    : [
        { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
        { type: "text", text: prompt },
      ];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 500, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) {
      log.warn("vision-failed", { status: r.status, text: (await r.text()).slice(0, 200) });
      return null;
    }
    const d = await r.json();
    const raw = d?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    log.warn("vision-exception", { error: String(e) });
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!INTERNAL_SECRET || auth !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  let body: RequestBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const log = createLogger("classify-reply", supabase, body.correlation_id);
  log.info("invoked", {
    ticketId: body.ticket_id,
    fromEmail: body.from_email,
    subject: body.subject,
    rawBodyLength: body.body_text?.length ?? 0,
    attachmentCount: body.attachments?.length ?? 0,
  }, { ticketId: body.ticket_id });

  // Idempotency
  if (body.resend_email_id) {
    const { data: existing } = await supabase
      .from("ticket_messages")
      .select("id, ai_classification")
      .eq("resend_message_id", body.resend_email_id)
      .maybeSingle();
    if (existing) {
      log.info("idempotent-hit", { existingMessageId: existing.id }, { ticketId: body.ticket_id });
      await log.flush();
      return new Response(JSON.stringify({ success: true, ticket_message_id: existing.id, classification: existing.ai_classification, idempotent: true, correlation_id: log.correlationId }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, agency_id, status, reference, assigned_artisan_id, tenant_id, owner_id, lease_id, tenant_email, property_owner_email, syndic_email")
    .eq("id", body.ticket_id)
    .maybeSingle();
  if (ticketError || !ticket) {
    log.error("ticket-fetch-failed", { error: ticketError?.message }, { ticketId: body.ticket_id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  let artisan: { id: string; name: string | null; email: string | null } | null = null;
  if (ticket.assigned_artisan_id) {
    const { data } = await supabase.from("artisans").select("id, name, email").eq("id", ticket.assigned_artisan_id).maybeSingle();
    artisan = data;
  }

  let sender = await identifySender(body.from_email, ticket, artisan);

  // Fallback: the sender doesn't match the ticket's stakeholders or the currently-assigned artisan,
  // but it could be ANOTHER artisan contacted in parallel for a quote comparison. Look up the email
  // against the full agency artisan directory — that way multiple artisan replies land in their
  // own threads (keyed by each artisan's UUID).
  if (sender.from_role === "unknown") {
    const fromEmail = (body.from_email ?? "").trim().toLowerCase();
    if (fromEmail) {
      const { data: otherArtisans } = await supabase
        .from("artisans")
        .select("id, email")
        .eq("agency_id", ticket.agency_id);
      const match = (otherArtisans ?? []).find((a) => ((a.email as string | null) ?? "").trim().toLowerCase() === fromEmail);
      if (match) {
        sender = { from_role: "artisan", thread_key: match.id as string, artisan_id: match.id as string };
        log.info("sender-matched-via-agency-artisans", { artisanId: match.id }, { ticketId: ticket.id, agencyId: ticket.agency_id });
      }
    }
  }

  log.info("sender-identified", { fromRole: sender.from_role, threadKey: sender.thread_key }, { ticketId: ticket.id, agencyId: ticket.agency_id });
  if (sender.from_role === "unknown") log.warn("unknown-sender", { fromEmail: body.from_email }, { ticketId: ticket.id, agencyId: ticket.agency_id });

  // Level 1+2 cleaning
  const preCleaned = cleanReply(body.body_text ?? "");
  log.debug("pre-cleaned", { originalLength: body.body_text?.length ?? 0, cleanedLength: preCleaned.length }, { ticketId: ticket.id, agencyId: ticket.agency_id });

  // Level 3: Claude — classification + extraction uniquement (plus de nettoyage corps)
  const aiStart = Date.now();
  const classification = await classify(sender.from_role, ticket.status ?? "unknown", body.subject, preCleaned);
  log.info("classify-done", {
    success: !!classification,
    category: classification?.category,
    confidence: classification?.confidence,
  }, { ticketId: ticket.id, agencyId: ticket.agency_id, durationMs: Date.now() - aiStart });

  // Le contenu stocke vient de email-reply-parser (niveau 1) — preserve Bonjour /
  // Cordialement / signatures nominales. On n'utilise PLUS Claude pour re-nettoyer
  // le corps : il supprimait trop (formules de politesse), ce qui rendait les
  // messages secs et robotiques en UI.
  const finalContent = preCleaned.length > 0 ? preCleaned : (body.body_text ?? "");

  const recipientType = sender.from_role === "artisan" ? null
    : sender.from_role === "tenant" ? "tenant"
    : sender.from_role === "owner" ? "owner"
    : sender.from_role === "syndic" ? "syndic"
    : null;

  const { data: msgRow, error: msgError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    artisan_id: sender.artisan_id,
    recipient_type: recipientType,
    from_role: sender.from_role,
    content: finalContent,
    raw_body: body.body_text ?? null,
    subject: body.subject,
    direction: "inbound",
    ai_classification: classification ?? null,
    resend_message_id: body.resend_email_id,
    sent_at: new Date().toISOString(),
  }).select("id").single();

  if (msgError || !msgRow) {
    log.error("ticket-message-insert-failed", { error: msgError?.message }, { ticketId: ticket.id, agencyId: ticket.agency_id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Failed to persist inbound message" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  log.info("inbound-message-persisted", { ticketMessageId: msgRow.id, category: classification?.category, contentLength: finalContent.length }, { ticketId: ticket.id, agencyId: ticket.agency_id });

  // Reset the ticket's staleness clock for ANY inbound, regardless of AI classification.
  // Rationale: if Claude mis-classifies an "accord" as "question", we still don't want to
  // relance the sender 3 days later — they DID respond. Adjustment #1 from Phase 1 spec.
  const ticketUpdatePatch: Record<string, unknown> = { last_action_at: new Date().toISOString() };

  // If Claude extracted an intervention date from an artisan or tenant message, persist it.
  // The gestionnaire can always override via the DateTimePicker on the Intervention step.
  // We overwrite any previous value — the latest communication wins, which matches real
  // workflow (an artisan proposing a new slot after a first call supersedes the old one).
  const extractedDate = (classification?.extracted as Record<string, unknown> | undefined)?.intervention_date;
  const isPlausibleIsoDate = typeof extractedDate === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(extractedDate);
  if (isPlausibleIsoDate && (sender.from_role === "artisan" || sender.from_role === "tenant")) {
    // Claude renvoie l'heure en wall-clock Paris (instructions du prompt). On la convertit
    // en UTC DST-aware avant stockage — sinon Deno l'interpréterait comme UTC et on
    // verrait l'horaire décalé de +1/+2h à l'affichage côté frontend.
    const utcIso = parisLocalToUTCISO(extractedDate as string);
    if (utcIso) {
      ticketUpdatePatch.planned_intervention_date = utcIso;
      log.info("intervention-date-extracted", { parisLocal: extractedDate, utc: utcIso, fromRole: sender.from_role }, { ticketId: ticket.id, agencyId: ticket.agency_id });
    } else {
      log.warn("intervention-date-parse-failed", { raw: extractedDate }, { ticketId: ticket.id, agencyId: ticket.agency_id });
    }
  }

  await supabase.from("tickets").update(ticketUpdatePatch).eq("id", ticket.id);

  // ─── Attachments handling ─────────────────────────────────────────────────
  type ProcessedAtt = { document_type: "devis" | "facture" | "photo" | "autre"; extracted: Record<string, unknown> | null; document_id: string | null };
  const processed: ProcessedAtt[] = [];

  if (body.attachments && body.attachments.length > 0) {
    log.info("attachments-start", {
      count: body.attachments.length,
      sampleKeys: Object.keys(body.attachments[0] ?? {}),
      sample: { filename: body.attachments[0]?.filename, content_type: body.attachments[0]?.content_type, size: body.attachments[0]?.size, has_download_url: !!body.attachments[0]?.download_url, has_content: !!body.attachments[0]?.content, has_id: !!body.attachments[0]?.id },
    }, { ticketId: ticket.id, agencyId: ticket.agency_id });

    for (let i = 0; i < body.attachments.length; i++) {
      const att = body.attachments[i];
      const attStart = Date.now();
      const dl = await downloadAttachmentContent(att, body.resend_email_id, log);
      if (!dl) {
        log.error("attachment-download-failed", { filename: att.filename, index: i }, { ticketId: ticket.id, agencyId: ticket.agency_id });
        continue;
      }

      const docType = guessDocumentType(att, classification);
      const safeName = (att.filename ?? `piece-${Date.now()}-${i}.bin`).replace(/[^a-zA-Z0-9._-]/g, "_");
      // Path starts with ticket.id so the existing storage RLS policy
      // ("Agency members read their ticket documents" — checks foldername[1] ∈ tickets)
      // grants SELECT to agency members when they later call createSignedUrl.
      const storagePath = `${ticket.id}/${body.resend_email_id}_${safeName}`;

      const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, dl.bytes, {
        contentType: att.content_type ?? "application/octet-stream",
        upsert: true, // idempotent on retry
      });
      if (uploadErr) {
        log.error("attachment-upload-failed", { filename: safeName, error: uploadErr.message }, { ticketId: ticket.id, agencyId: ticket.agency_id });
        continue;
      }

      const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      const { data: docRow, error: docErr } = await supabase.from("ticket_documents").insert({
        ticket_id: ticket.id,
        agency_id: ticket.agency_id,
        ticket_message_id: msgRow.id,
        document_type: docType,
        file_name: att.filename ?? safeName,
        file_url: signed?.signedUrl ?? "",
        storage_path: storagePath,
        mime_type: att.content_type ?? null,
        file_size: dl.size,
        description: classification?.summary ?? null,
      }).select("id").single();
      if (docErr || !docRow) {
        log.error("attachment-insert-failed", { error: docErr?.message }, { ticketId: ticket.id, agencyId: ticket.agency_id });
        continue;
      }
      log.info("attachment-stored", { documentId: docRow.id, docType, filename: att.filename, size: dl.size }, { ticketId: ticket.id, agencyId: ticket.agency_id, durationMs: Date.now() - attStart });

      // Vision extraction for devis/facture — handles both PDFs and images (phone
      // pictures of paper documents are common). Claude natively supports both formats.
      let extracted: Record<string, unknown> | null = null;
      const mime = (att.content_type ?? "").toLowerCase();
      const isPdfFile = mime.includes("pdf") || safeName.toLowerCase().endsWith(".pdf");
      const isImageFile = mime.startsWith("image/");
      const visionMime = isPdfFile ? "application/pdf" : (mime || "image/jpeg"); // fallback when mime missing

      if (docType === "devis" && (isPdfFile || isImageFile)) {
        extracted = await extractWithVision(dl.base64, visionMime, "quote", log);
        log.info("quote-extracted", { extracted, source: isPdfFile ? "pdf" : "image" }, { ticketId: ticket.id, agencyId: ticket.agency_id });
      } else if (docType === "facture" && (isPdfFile || isImageFile)) {
        extracted = await extractWithVision(dl.base64, visionMime, "invoice", log);
        log.info("invoice-extracted", { extracted, source: isPdfFile ? "pdf" : "image" }, { ticketId: ticket.id, agencyId: ticket.agency_id });
      }

      processed.push({ document_type: docType, extracted, document_id: docRow.id });
    }
  }

  // ─── Business logic: quotes, invoices, status transitions ────────────────
  const nowIso = new Date().toISOString();
  let statusTransitioned: { from: string; to: string } | null = null;

  const quoteAtt = processed.find((p) => p.document_type === "devis" && p.extracted);
  if (quoteAtt && classification?.category === "quote_sent") {
    const amount = typeof quoteAtt.extracted?.amount === "number" ? quoteAtt.extracted.amount : null;
    if (amount != null) {
      // Resolve the sender's artisan name (may differ from the ticket's currently-assigned artisan
      // when a second artisan was contacted for a competing quote).
      let senderArtisanName = artisan?.name ?? null;
      if (sender.from_role === "artisan" && sender.artisan_id && sender.artisan_id !== ticket.assigned_artisan_id) {
        const { data: senderArtisanRow } = await supabase.from("artisans").select("name").eq("id", sender.artisan_id).maybeSingle();
        senderArtisanName = senderArtisanRow?.name ?? senderArtisanName;
      }

      // Never auto-select an inbound quote. The gestionnaire picks explicitly from the
      // QuoteComparison UI so the workflow stays deliberate (especially when comparing
      // multiple quotes from different artisans).
      const { data: quoteRow } = await supabase.from("ticket_quotes").insert({
        ticket_id: ticket.id,
        artisan_id: sender.artisan_id,
        artisan_name_snapshot: senderArtisanName,
        amount,
        delay_text: (quoteAtt.extracted?.delay_text as string | null) ?? null,
        description: (quoteAtt.extracted?.description as string | null) ?? null,
        is_selected: false,
      }).select("id").single();
      log.info("quote-inserted", { quoteId: quoteRow?.id, amount, autoSelected: false }, { ticketId: ticket.id, agencyId: ticket.agency_id });

      // Link the document that triggered this quote extraction → so the UI can show only
      // the PDFs belonging to the currently-selected quote (not all devis PDFs of the ticket).
      if (quoteRow?.id && quoteAtt.document_id) {
        await supabase.from("ticket_documents").update({ quote_id: quoteRow.id }).eq("id", quoteAtt.document_id);
      }

      // Status stays at "contractor_contacted" — the gestionnaire advances explicitly by
      // picking a quote in the UI (selectQuote → reception_devis). Quotes simply accumulate
      // on the contact_artisan step where the comparison card is displayed.
    } else {
      log.warn("quote-amount-missing", { extracted: quoteAtt.extracted }, { ticketId: ticket.id, agencyId: ticket.agency_id });
    }
  }

  const invoiceAtt = processed.find((p) => p.document_type === "facture" && p.extracted);
  if (invoiceAtt && classification?.category === "invoice_sent") {
    const amount = typeof invoiceAtt.extracted?.amount === "number" ? invoiceAtt.extracted.amount : null;
    if (amount != null) {
      await supabase.from("ticket_invoices").upsert({
        ticket_id: ticket.id,
        artisan_id: sender.artisan_id,
        amount,
        invoice_ref: (invoiceAtt.extracted?.invoice_ref as string | null) ?? null,
        invoice_date: (invoiceAtt.extracted?.invoice_date as string | null) ?? null,
        description: (invoiceAtt.extracted?.description as string | null) ?? null,
        is_paid: false,
        updated_at: nowIso,
      }, { onConflict: "ticket_id" });
      log.info("invoice-upserted", { amount }, { ticketId: ticket.id, agencyId: ticket.agency_id });

      if (ticket.status === "intervention") {
        await supabase.from("tickets").update({ status: "passage_confirmed", updated_at: nowIso }).eq("id", ticket.id);
        statusTransitioned = { from: "intervention", to: "passage_confirmed" };
      }
    } else {
      log.warn("invoice-amount-missing", { extracted: invoiceAtt.extracted }, { ticketId: ticket.id, agencyId: ticket.agency_id });
    }
  }

  const proofAtt = processed.find((p) => p.document_type === "photo");
  if (proofAtt && classification?.category === "proof_sent" && ticket.status === "passage_confirmed") {
    await supabase.from("tickets").update({ status: "billing", passage_confirmed: true, updated_at: nowIso }).eq("id", ticket.id);
    statusTransitioned = { from: "passage_confirmed", to: "billing" };
  }

  if (statusTransitioned) {
    log.info("status-transitioned", statusTransitioned, { ticketId: ticket.id, agencyId: ticket.agency_id });
  }

  log.info("done", { ticketMessageId: msgRow.id, attachmentsProcessed: processed.length, statusTransitioned }, { ticketId: ticket.id, agencyId: ticket.agency_id, durationMs: log.elapsedMs() });
  await log.flush();

  return new Response(JSON.stringify({
    success: true,
    ticket_message_id: msgRow.id,
    classification,
    attachments_processed: processed.length,
    status_transitioned: statusTransitioned,
    correlation_id: log.correlationId,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
