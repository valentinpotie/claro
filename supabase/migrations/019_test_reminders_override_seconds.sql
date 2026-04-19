-- Mode test : si test_reminders_override_seconds > 0, send-reminders considère
-- qu'un ticket est "stale" après ce nombre de SECONDES (au lieu des jours configurés).
-- Permet de tester le flux de relance en local sans attendre plusieurs jours.
-- Défaut NULL = comportement normal (jours).

ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS test_reminders_override_seconds integer;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE agency_settings DROP COLUMN IF EXISTS test_reminders_override_seconds;
