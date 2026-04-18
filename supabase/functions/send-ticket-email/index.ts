// send-ticket-email
// Sends a single outbound email tied to a ticket via Resend.
// Called from the frontend (TicketContext) when the agency is NOT in demo_mode.
//
// Responsibilities:
//   - verify the caller belongs to the ticket's agency
//   - resolve recipient email from the ticket row + recipient_type
//   - interpolate the template content with ticket variables
//   - prefix the subject with [<ticket.reference>] so inbound-email can route the reply
//   - send via Resend with reply_to = agency.email_inbound
//   - persist the outbound message in ticket_messages
//   - log every step to function_logs
//
// Safety:
//   - verify_jwt = true so the user's identity is validated by Supabase Auth
//   - we still re-check ticket.agency_id == user.agency_id before sending (belt & suspenders)
//   - we refuse to send if the recipient email is missing or malformed

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { createLogger } from "./logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const FROM_EMAIL = "notifications@mail.claroimmo.fr";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

type RecipientType = "artisan" | "locataire" | "proprietaire" | "syndic";

type RequestBody = {
  ticket_id: string;
  recipient_type: RecipientType;
  artisan_id?: string;
  template_use_case?: string;
  fallback_content: string;
  fallback_subject: string;
  correlation_id?: string;
  /** ticket_documents UUIDs to attach. Files are fetched from Storage + base64-encoded here. */
  attachment_document_ids?: string[];
};

type ResolvedRecipient = {
  email: string;
  name: string | null;
  thread_key: string; // what goes into ticket_messages — either "locataire"/"proprietaire"/"syndic" or the artisan uuid
};

async function getUserAgencyId(authedClient: SupabaseClient): Promise<string | null> {
  const { data, error } = await authedClient.rpc("user_agency_id");
  if (error) return null;
  return (data as string | null) ?? null;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function buildVariables(
  ticket: Record<string, unknown>,
  agencyName: string,
  artisan: { name: string | null; phone: string | null } | null,
  selectedQuote: { amount: number | null; delay_text: string | null; artisan_name_snapshot: string | null } | null,
) {
  // For owner-approval emails (and any template that mentions {{montant}}/{{nom_artisan}}),
  // we resolve from the ticket's selected quote when the recipient isn't the artisan itself.
  const fallbackArtisanName = artisan?.name ?? selectedQuote?.artisan_name_snapshot ?? "";
  const amountText = selectedQuote?.amount != null ? String(selectedQuote.amount) : "";
  return {
    nom_agence: agencyName,
    adresse: (ticket.property_address as string) ?? "",
    lot: (ticket.property_unit as string) ?? "",
    categorie: (ticket.category as string) ?? "",
    description: (ticket.ai_qualified_description as string) || (ticket.description as string) || "",
    titre: (ticket.title as string) ?? "",
    nom_artisan: fallbackArtisanName,
    telephone_artisan: artisan?.phone ?? "",
    nom_locataire: (ticket.tenant_name as string) ?? "",
    telephone_locataire: (ticket.tenant_phone as string) ?? "",
    email_locataire: (ticket.tenant_email as string) ?? "",
    nom_proprietaire: (ticket.property_owner_name as string) ?? "",
    telephone_proprietaire: (ticket.property_owner_phone as string) ?? "",
    email_proprietaire: (ticket.property_owner_email as string) ?? "",
    nom_syndic: (ticket.syndic_name as string) ?? "",
    email_syndic: (ticket.syndic_email as string) ?? "",
    montant: amountText,
    delai: selectedQuote?.delay_text ?? "",
    date_intervention: (ticket.planned_intervention_date as string | null) ?? "",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: JSON_HEADERS });
  }

  const log = createLogger("send-ticket-email", supabase, body.correlation_id);
  log.info("invoked", { ticketId: body.ticket_id, recipientType: body.recipient_type, templateUseCase: body.template_use_case }, { ticketId: body.ticket_id });

  // --- Authenticate and resolve user's agency ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    log.error("missing-jwt");
    await log.flush();
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: JSON_HEADERS });
  }

  const authedClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  const userAgencyId = await getUserAgencyId(authedClient);
  if (!userAgencyId) {
    log.error("user-agency-not-resolved");
    await log.flush();
    return new Response(JSON.stringify({ error: "User has no agency" }), { status: 403, headers: JSON_HEADERS });
  }

  // --- Fetch the ticket (service_role, but we verify agency_id below) ---
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", body.ticket_id)
    .maybeSingle();
  if (ticketError || !ticket) {
    log.error("ticket-fetch-failed", { error: ticketError?.message }, { ticketId: body.ticket_id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404, headers: JSON_HEADERS });
  }
  if (ticket.agency_id !== userAgencyId) {
    log.error("ticket-agency-mismatch", { ticketAgencyId: ticket.agency_id, userAgencyId }, { ticketId: body.ticket_id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: JSON_HEADERS });
  }

  // --- Fetch the agency (for name + reply_to) ---
  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, email_inbound, demo_mode")
    .eq("id", ticket.agency_id)
    .maybeSingle();
  if (!agency || !agency.email_inbound) {
    log.error("agency-missing-inbound", { agencyId: ticket.agency_id }, { ticketId: body.ticket_id, agencyId: ticket.agency_id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Agency has no inbound email configured" }), { status: 400, headers: JSON_HEADERS });
  }
  if (agency.demo_mode) {
    // Should never happen — the frontend must not call this function in demo mode.
    // We refuse explicitly to avoid surprise billing / email leaks during demos.
    log.warn("agency-is-in-demo-mode", { agencyId: agency.id }, { ticketId: body.ticket_id, agencyId: agency.id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Agency is in demo mode — real emails disabled" }), { status: 409, headers: JSON_HEADERS });
  }

  // --- Resolve recipient ---
  let recipient: ResolvedRecipient | null = null;
  let artisanRow: { id: string; name: string | null; phone: string | null; email: string | null } | null = null;

  if (body.recipient_type === "artisan") {
    const artisanId = body.artisan_id ?? ticket.assigned_artisan_id;
    if (!artisanId) {
      log.error("artisan-id-missing", {}, { ticketId: body.ticket_id, agencyId: agency.id });
      await log.flush();
      return new Response(JSON.stringify({ error: "artisan_id is required for artisan recipient" }), { status: 400, headers: JSON_HEADERS });
    }
    const { data: art } = await supabase
      .from("artisans")
      .select("id, name, phone, email")
      .eq("id", artisanId)
      .maybeSingle();
    if (!art?.email) {
      log.error("artisan-email-missing", { artisanId }, { ticketId: body.ticket_id, agencyId: agency.id });
      await log.flush();
      return new Response(JSON.stringify({ error: "Artisan has no email" }), { status: 400, headers: JSON_HEADERS });
    }
    artisanRow = art;
    recipient = { email: art.email, name: art.name, thread_key: art.id };
  } else if (body.recipient_type === "locataire") {
    if (!ticket.tenant_email) {
      log.error("tenant-email-missing", {}, { ticketId: body.ticket_id, agencyId: agency.id });
      await log.flush();
      return new Response(JSON.stringify({ error: "Tenant has no email" }), { status: 400, headers: JSON_HEADERS });
    }
    recipient = { email: ticket.tenant_email, name: ticket.tenant_name ?? null, thread_key: "locataire" };
  } else if (body.recipient_type === "proprietaire") {
    if (!ticket.property_owner_email) {
      log.error("owner-email-missing", {}, { ticketId: body.ticket_id, agencyId: agency.id });
      await log.flush();
      return new Response(JSON.stringify({ error: "Owner has no email" }), { status: 400, headers: JSON_HEADERS });
    }
    recipient = { email: ticket.property_owner_email, name: ticket.property_owner_name ?? null, thread_key: "proprietaire" };
  } else if (body.recipient_type === "syndic") {
    if (!ticket.syndic_email) {
      log.error("syndic-email-missing", {}, { ticketId: body.ticket_id, agencyId: agency.id });
      await log.flush();
      return new Response(JSON.stringify({ error: "Syndic has no email" }), { status: 400, headers: JSON_HEADERS });
    }
    recipient = { email: ticket.syndic_email, name: ticket.syndic_name ?? null, thread_key: "syndic" };
  }

  if (!recipient) {
    log.error("recipient-unresolved");
    await log.flush();
    return new Response(JSON.stringify({ error: "Invalid recipient_type" }), { status: 400, headers: JSON_HEADERS });
  }

  // --- Fetch template (optional override) ---
  let content = body.fallback_content;
  let subject = body.fallback_subject;
  let templateRowId: string | null = null;  // UUID of the email_templates row, for ticket_messages.template_id (uuid)
  if (body.template_use_case) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("id, subject, body")
      .eq("agency_id", agency.id)
      .eq("use_case", body.template_use_case)
      .eq("is_active", true)
      .maybeSingle();
    if (template) {
      content = template.body ?? content;
      subject = template.subject ?? subject;
      templateRowId = (template.id as string | null) ?? null;
      log.debug("template-used", { useCase: body.template_use_case, templateId: templateRowId }, { ticketId: body.ticket_id, agencyId: agency.id });
    } else {
      log.debug("template-not-found-using-fallback", { useCase: body.template_use_case }, { ticketId: body.ticket_id, agencyId: agency.id });
    }
  }

  // When the ticket has a selected quote, fetch it so we can resolve {{montant}} / {{delai}}
  // / {{nom_artisan}} for templates sent to owner/tenant (not just to the artisan himself).
  let selectedQuote: { amount: number | null; delay_text: string | null; artisan_name_snapshot: string | null } | null = null;
  if (ticket.selected_quote_id) {
    const { data: q } = await supabase
      .from("ticket_quotes")
      .select("amount, delay_text, artisan_name_snapshot")
      .eq("id", ticket.selected_quote_id)
      .maybeSingle();
    if (q) selectedQuote = q as typeof selectedQuote;
  }

  const vars = buildVariables(ticket, agency.name ?? "", artisanRow ? { name: artisanRow.name, phone: artisanRow.phone } : null, selectedQuote);
  const interpolatedContent = interpolate(content, vars);
  const interpolatedSubject = interpolate(subject, vars);
  // Only prefix the reference if it's not already present (prevents doubled prefixes
  // like "[CLR-44] Re: [CLR-44] ..." which break Gmail's subject-based threading).
  const refTag = `[${ticket.reference}]`;
  const alreadyTagged = new RegExp(`\\[${ticket.reference}\\]`, "i").test(interpolatedSubject);
  const taggedSubject = alreadyTagged ? interpolatedSubject : `${refTag} ${interpolatedSubject}`;

  // --- Send via Resend ---
  const sendStart = Date.now();
  const fromName = (agency.name ?? "Claro").replace(/[<>"]/g, "");

  // Threading strategy:
  //   1. Detect if this is the FIRST outbound for this ticket.
  //   2. If first: use `<claro-ticket-{id}@mail.claroimmo.fr>` as this email's Message-Id.
  //      Gmail sees it arrive in the recipient's mailbox with that ID → threading anchor exists.
  //   3. If not first: use a unique Message-Id + reference the anchor in In-Reply-To/References.
  //      Gmail groups this email with the first one because In-Reply-To points to a known ID.
  //
  // This is more robust than a purely virtual anchor (which Gmail tends to ignore).
  const { count: priorOutboundCount } = await supabase
    .from("ticket_messages")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", ticket.id)
    .eq("direction", "outbound");

  const threadAnchor = `<claro-ticket-${ticket.id}@mail.claroimmo.fr>`;
  const isFirstOutbound = (priorOutboundCount ?? 0) === 0;
  const thisMessageId = isFirstOutbound
    ? threadAnchor                                              // make the anchor real by BEING it
    : `<claro-msg-${crypto.randomUUID()}@mail.claroimmo.fr>`;

  const threadingHeaders: Record<string, string> = { "Message-Id": thisMessageId };
  if (!isFirstOutbound) {
    threadingHeaders["In-Reply-To"] = threadAnchor;
    threadingHeaders["References"] = threadAnchor;
  }

  log.debug("threading-computed", { isFirstOutbound, priorOutboundCount, thisMessageId }, { ticketId: ticket.id, agencyId: agency.id });

  // --- Build attachments from ticket_documents (optional) ---
  const attachments: Array<{ filename: string; content: string }> = [];
  if (body.attachment_document_ids && body.attachment_document_ids.length > 0) {
    const { data: docs } = await supabase
      .from("ticket_documents")
      .select("id, file_name, storage_path, mime_type")
      .eq("ticket_id", ticket.id)
      .in("id", body.attachment_document_ids);

    for (const doc of docs ?? []) {
      try {
        const { data: blob, error: dlError } = await supabase.storage.from("ticket-documents").download(doc.storage_path);
        if (dlError || !blob) {
          log.warn("attachment-download-failed", { documentId: doc.id, path: doc.storage_path, error: dlError?.message }, { ticketId: ticket.id, agencyId: agency.id });
          continue;
        }
        const buf = new Uint8Array(await blob.arrayBuffer());
        attachments.push({ filename: doc.file_name ?? `document-${doc.id}`, content: encodeBase64(buf) });
        log.debug("attachment-added", { documentId: doc.id, filename: doc.file_name, sizeBytes: buf.byteLength }, { ticketId: ticket.id, agencyId: agency.id });
      } catch (e) {
        log.warn("attachment-exception", { documentId: doc.id, error: e instanceof Error ? e.message : String(e) }, { ticketId: ticket.id, agencyId: agency.id });
      }
    }
    log.info("attachments-prepared", { requested: body.attachment_document_ids.length, included: attachments.length }, { ticketId: ticket.id, agencyId: agency.id });
  }

  const resendPayload: Record<string, unknown> = {
    from: `${fromName} <${FROM_EMAIL}>`,
    to: [recipient.email],
    reply_to: agency.email_inbound,
    subject: taggedSubject,
    text: interpolatedContent,
    headers: threadingHeaders,
  };
  if (attachments.length > 0) resendPayload.attachments = attachments;

  let resendMessageId: string | null = null;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });
    const resendBody = await r.json();
    if (!r.ok) {
      log.error("resend-failed", { status: r.status, response: resendBody }, { ticketId: body.ticket_id, agencyId: agency.id, durationMs: Date.now() - sendStart });
      await log.flush();
      return new Response(JSON.stringify({ error: "Resend API error", details: resendBody }), { status: 502, headers: JSON_HEADERS });
    }
    resendMessageId = resendBody?.id ?? null;
    log.info("resend-sent", { messageId: resendMessageId, to: recipient.email, subject: taggedSubject }, { ticketId: body.ticket_id, agencyId: agency.id, durationMs: Date.now() - sendStart });
  } catch (err) {
    log.error("resend-exception", { error: err instanceof Error ? err.message : String(err) }, { ticketId: body.ticket_id, agencyId: agency.id });
    await log.flush();
    return new Response(JSON.stringify({ error: "Failed to call Resend" }), { status: 502, headers: JSON_HEADERS });
  }

  // --- Persist in ticket_messages ---
  const { data: msgRow, error: msgError } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      artisan_id: body.recipient_type === "artisan" ? recipient.thread_key : null,
      recipient_type: body.recipient_type === "artisan" ? null : body.recipient_type === "locataire" ? "tenant" : body.recipient_type === "proprietaire" ? "owner" : body.recipient_type,
      from_role: "agency",
      content: interpolatedContent,
      subject: taggedSubject,
      template_id: templateRowId,
      direction: "outbound",
      resend_message_id: resendMessageId,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (msgError || !msgRow) {
    log.error("ticket-message-insert-failed", { error: msgError?.message }, { ticketId: body.ticket_id, agencyId: agency.id });
    // Email already sent — we don't fail the whole request. The log trace lets us recover manually.
  } else {
    log.info("ticket-message-persisted", { ticketMessageId: msgRow.id }, { ticketId: body.ticket_id, agencyId: agency.id });
  }

  log.info("done", { resendMessageId }, { ticketId: body.ticket_id, agencyId: agency.id, durationMs: log.elapsedMs() });
  await log.flush();

  return new Response(
    JSON.stringify({
      success: true,
      message_id: resendMessageId,
      ticket_message_id: msgRow?.id ?? null,
      // Partial failure flag: the email was sent via Resend but we couldn't persist
      // the local ticket_messages row. The frontend should surface this so the
      // gestionnaire knows the thread view may be out of sync.
      message_logged: !!msgRow,
      message_log_error: msgError?.message ?? null,
      correlation_id: log.correlationId,
    }),
    { status: 200, headers: JSON_HEADERS },
  );
});
