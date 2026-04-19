-- Super admin peut UPDATE cross-agency sur agencies (demo_mode) et agency_settings
-- (test_reminders_override_seconds). Nécessaire pour la page /admin/agencies qui
-- permet de basculer les agences en production et de configurer les relances test
-- depuis un seul endroit — ces deux réglages ont été retirés de l'UI agence.

DROP POLICY IF EXISTS "Super admin updates all agencies" ON agencies;
CREATE POLICY "Super admin updates all agencies"
  ON agencies FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admin updates all agency_settings" ON agency_settings;
CREATE POLICY "Super admin updates all agency_settings"
  ON agency_settings FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Super admin updates all agency_settings" ON agency_settings;
-- DROP POLICY IF EXISTS "Super admin updates all agencies" ON agencies;
