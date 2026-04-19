-- Super admin peut lire agency_settings cross-agency pour la page Admin / Observabilité.
-- Sans cette policy, la config par agence ne remontait qu'une seule ligne (celle de l'agence
-- de l'utilisateur) même pour un super admin, via "Agency members read settings".

DROP POLICY IF EXISTS "Super admin reads all agency_settings" ON agency_settings;
CREATE POLICY "Super admin reads all agency_settings"
  ON agency_settings FOR SELECT
  USING (is_super_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Super admin reads all agency_settings" ON agency_settings;
