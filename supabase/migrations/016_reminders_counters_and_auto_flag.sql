-- Phase 2 — relances : trace les colonnes compteurs déjà appliquées hors fichier,
-- et ajoute le flag agency_settings.auto_reminders_enabled (défaut FALSE).
-- Par défaut, chaque agence démarre en manuel (le gestionnaire voit les relances à
-- envoyer dans le dashboard et clique pour confirmer). Bascule en auto via Settings.

-- Compteurs relance par destinataire (idempotent — colonnes déjà présentes en prod
-- via un apply_migration antérieur hors repo). Ajoute aussi un index dédié au cron futur.
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS reminders_sent_artisan integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminders_sent_owner integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminders_sent_tenant integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS requires_manual_action boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_reminders_cron
  ON tickets(agency_id, status, last_action_at)
  WHERE requires_manual_action = false
    AND status NOT IN ('closed','resolution_syndic','escalade_syndic');

-- Flag agence : auto ON/OFF. Nouveau, défaut FALSE.
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS auto_reminders_enabled boolean NOT NULL DEFAULT false;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE agency_settings DROP COLUMN IF EXISTS auto_reminders_enabled;
-- DROP INDEX IF EXISTS idx_tickets_reminders_cron;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS requires_manual_action;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS reminder_paused_until;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS reminders_sent_tenant;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS reminders_sent_owner;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS reminders_sent_artisan;
