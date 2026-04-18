// Thin wrappers around the Claro edge functions. One place for request/response
// typing, error normalisation, and local log echoes. Keeps TicketContext readable.

import { supabase } from "@/lib/supabase";

export type SendTicketEmailRecipient = "artisan" | "locataire" | "proprietaire" | "syndic";

export type SendTicketEmailPayload = {
  ticket_id: string;
  recipient_type: SendTicketEmailRecipient;
  /** When recipient_type is "artisan", which artisan to contact. Defaults to ticket.assigned_artisan_id. */
  artisan_id?: string;
  /** If set, the edge function looks up the template in email_templates. Falls back to `fallback_content`/`fallback_subject` if missing. */
  template_use_case?: string;
  /** Raw body to use if the template is missing or when no template_use_case is given. Variables are interpolated. */
  fallback_content: string;
  /** Raw subject (without the [CLR-XX] prefix — the function adds it). */
  fallback_subject: string;
  /** Optional — links the logs of a cascading workflow (e.g. quote approved → notify artisan + tenant). */
  correlation_id?: string;
  /** `ticket_documents` UUIDs to attach to the outgoing email (downloaded from Storage by the edge function). */
  attachment_document_ids?: string[];
};

export type SendTicketEmailResponse = {
  success: true;
  message_id: string | null;
  ticket_message_id: string | null;
  /** false if the email was sent via Resend but ticket_messages insert failed — thread UI may lag. */
  message_logged?: boolean;
  message_log_error?: string | null;
  correlation_id: string;
};

export class SendTicketEmailError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = "SendTicketEmailError";
  }
}

export async function invokeSendTicketEmail(payload: SendTicketEmailPayload): Promise<SendTicketEmailResponse> {
  // Explicitly attach the user's JWT. functions.invoke sometimes falls back to the anon key
  // depending on the supabase-js version, which the edge function rejects with 401 when verify_jwt=true.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new SendTicketEmailError("You must be signed in to send emails", 401);
  }

  const { data, error } = await supabase.functions.invoke<SendTicketEmailResponse | { error: string; details?: unknown }>(
    "send-ticket-email",
    {
      body: payload,
      headers: { Authorization: `Bearer ${session.access_token}` },
    },
  );

  if (error) {
    const details = (data as { error?: string; details?: unknown } | null) ?? null;
    throw new SendTicketEmailError(
      details?.error ?? error.message ?? "Unknown error",
      (error as { status?: number }).status ?? 500,
      details?.details,
    );
  }
  if (!data || !("success" in data) || !data.success) {
    throw new SendTicketEmailError(
      (data as { error?: string } | null)?.error ?? "Edge function returned no success",
      500,
    );
  }
  return data;
}
