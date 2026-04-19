-- Tracks the last time a stakeholder or the agency acted on this ticket.
-- Updated by:
--   - send-ticket-email (outbound)            → gestionnaire/agent action
--   - classify-reply   (inbound ANY classif)  → stakeholder response (any type)
--   - TicketContext manual actions            → validateQuote, ownerRespond, etc.
-- Used by:
--   - UI chip "Derniere action : il y a Nj"
--   - Dashboard urgent-to-call badge
--   - Phase 2 auto-reminder cron (stale tickets)

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;

UPDATE tickets
  SET last_action_at = COALESCE(updated_at, reported_at, created_at)
  WHERE last_action_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_last_action_at
  ON tickets(last_action_at);

CREATE INDEX IF NOT EXISTS idx_tickets_agency_status_last_action
  ON tickets(agency_id, status, last_action_at);
