-- Link each ticket_documents row to the ticket_messages row that brought it in.
-- Populated by classify-reply for inbound attachments (and by send-ticket-email for
-- outbound later if we want). Enables the UI to render attachments inline in the
-- message bubble of the conversation.

ALTER TABLE ticket_documents
  ADD COLUMN IF NOT EXISTS ticket_message_id uuid REFERENCES ticket_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_documents_ticket_message_id
  ON ticket_documents(ticket_message_id);
