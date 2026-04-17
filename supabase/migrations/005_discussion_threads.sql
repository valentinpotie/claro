-- Migration 005: Add discussion thread columns to ticket_messages
-- Enables per-stakeholder email threading (tenant, owner, artisan, syndic, insurance)

ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS recipient_type TEXT,
  ADD COLUMN IF NOT EXISTS subject        TEXT,
  ADD COLUMN IF NOT EXISTS template_id   UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direction     TEXT DEFAULT 'outbound';

-- Backfill existing rows
UPDATE ticket_messages
  SET recipient_type = 'artisan'
  WHERE artisan_id IS NOT NULL AND recipient_type IS NULL;

-- Index for filtering by stakeholder type on a ticket
CREATE INDEX IF NOT EXISTS idx_ticket_messages_recipient_type
  ON ticket_messages (ticket_id, recipient_type);
