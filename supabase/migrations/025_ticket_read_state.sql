-- Etat de lecture par utilisateur et par fil de discussion.
-- Une ligne par (user, ticket, thread_key). thread_key = '_global' pour la vue
-- ticket globale (clear bannière + pill liste) ; sinon "locataire"/"proprietaire"/
-- "syndic"/"assurance" ou l'UUID artisan pour une pastille d'onglet.
--
-- Design : on choisit une constante string plutôt que NULL pour ne pas dépendre de
-- NULLS NOT DISTINCT (PG 15+) et garder une PK portable.

CREATE TABLE IF NOT EXISTS ticket_read_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  thread_key text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id, thread_key)
);

CREATE INDEX IF NOT EXISTS idx_ticket_read_state_ticket ON ticket_read_state(ticket_id, user_id);

ALTER TABLE ticket_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own read state" ON ticket_read_state;
CREATE POLICY "Users manage their own read state"
  ON ticket_read_state FOR ALL
  USING (user_id = auth.uid() AND agency_id = user_agency_id())
  WITH CHECK (user_id = auth.uid() AND agency_id = user_agency_id());

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Users manage their own read state" ON ticket_read_state;
-- DROP INDEX IF EXISTS idx_ticket_read_state_ticket;
-- DROP TABLE IF EXISTS ticket_read_state;
