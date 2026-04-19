-- Rôle super admin : accès cross-agency en lecture pour la page Admin / Debug.
-- Un utilisateur avec profiles.is_super_admin = true peut lire toutes les agences,
-- tickets, function_logs. Ne modifie jamais rien cross-agency — écritures restent
-- isolées par agency_id via les policies existantes.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Helper : true si l'utilisateur courant est super admin.
CREATE OR REPLACE FUNCTION is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Policies de lecture cross-agency pour super admins.
DROP POLICY IF EXISTS "Super admin reads all agencies" ON agencies;
CREATE POLICY "Super admin reads all agencies"
  ON agencies FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admin reads all tickets" ON tickets;
CREATE POLICY "Super admin reads all tickets"
  ON tickets FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admin reads all function_logs" ON function_logs;
CREATE POLICY "Super admin reads all function_logs"
  ON function_logs FOR SELECT
  USING (is_super_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Super admin reads all function_logs" ON function_logs;
-- DROP POLICY IF EXISTS "Super admin reads all tickets" ON tickets;
-- DROP POLICY IF EXISTS "Super admin reads all agencies" ON agencies;
-- DROP FUNCTION IF EXISTS is_super_admin();
-- ALTER TABLE profiles DROP COLUMN IF EXISTS is_super_admin;
