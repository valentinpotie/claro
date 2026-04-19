-- Table d'audit des relances : une ligne par ÉVÉNEMENT (envoi, skip, erreur).
-- Source de vérité unique pour débug : qui, quand, pourquoi, où ça a fini.
-- Les counters sur tickets (reminders_sent_X) deviennent des snapshots dérivés — la
-- vérité détaillée est ici.

CREATE TABLE IF NOT EXISTS ticket_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('artisan','owner','tenant')),
  status text NOT NULL CHECK (status IN ('sent','skipped','failed')),
  recipient_email text,
  reason text,
  template_use_case text,
  counter_after integer,
  ticket_message_id uuid REFERENCES ticket_messages(id) ON DELETE SET NULL,
  correlation_id uuid,
  triggered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_reminders_ticket ON ticket_reminders(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_agency_status ON ticket_reminders(agency_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_correlation ON ticket_reminders(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE ticket_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members read their reminders" ON ticket_reminders;
CREATE POLICY "Agency members read their reminders"
  ON ticket_reminders FOR SELECT
  USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "Super admin reads all reminders" ON ticket_reminders;
CREATE POLICY "Super admin reads all reminders"
  ON ticket_reminders FOR SELECT
  USING (is_super_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Super admin reads all reminders" ON ticket_reminders;
-- DROP POLICY IF EXISTS "Agency members read their reminders" ON ticket_reminders;
-- DROP INDEX IF EXISTS idx_ticket_reminders_correlation;
-- DROP INDEX IF EXISTS idx_ticket_reminders_agency_status;
-- DROP INDEX IF EXISTS idx_ticket_reminders_ticket;
-- DROP TABLE IF EXISTS ticket_reminders;
