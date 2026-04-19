-- Migration 2 — notion de bail (leases) et colocation (lease_tenants).
-- Objet metier central du logiciel X14 d'agence. Un bail lie 1+ locataires a UN bien,
-- sur une periode donnee. Contrainte : un seul bail actif par property (parking/cave
-- = property distincte si besoin).

-- ────────────────────────────────────────────────────────────────────────────
-- Table leases
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  external_ref text,
  lease_type text NOT NULL DEFAULT 'residential'
    CHECK (lease_type IN ('residential','commercial','parking','other')),
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  rent_amount numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Table lease_tenants (many-to-many avec is_primary)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lease_tenants (
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  exited_at date,
  PRIMARY KEY (lease_id, tenant_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Contrainte critique : un seul bail actif par property
-- Index partiel unique → permet plusieurs baux inactifs en historique.
-- ────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_leases_one_active_per_property
  ON leases(property_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_leases_agency ON leases(agency_id);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_active ON leases(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_leases_external_ref ON leases(agency_id, external_ref)
  WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_tenants_tenant ON lease_tenants(tenant_id);

DROP TRIGGER IF EXISTS set_updated_at_leases ON leases;
CREATE TRIGGER set_updated_at_leases
  BEFORE UPDATE ON leases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — pattern identique à tenants/owners/properties.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members manage leases" ON leases;
CREATE POLICY "Agency members manage leases"
  ON leases FOR ALL
  USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "Agency isolation on leases" ON leases;
CREATE POLICY "Agency isolation on leases"
  ON leases FOR ALL
  USING (agency_id = get_user_agency_id());

DROP POLICY IF EXISTS "Agency members manage lease_tenants" ON lease_tenants;
CREATE POLICY "Agency members manage lease_tenants"
  ON lease_tenants FOR ALL
  USING (
    lease_id IN (SELECT id FROM leases WHERE agency_id = user_agency_id())
  );

DROP POLICY IF EXISTS "Agency isolation on lease_tenants" ON lease_tenants;
CREATE POLICY "Agency isolation on lease_tenants"
  ON lease_tenants FOR ALL
  USING (
    lease_id IN (SELECT id FROM leases WHERE agency_id = get_user_agency_id())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Backfill — 1 lease par (agency_id, property_id) pour preserver la contrainte
-- UNIQUE meme si plusieurs tenants pointent sur la meme property. Premier tenant
-- (created_at ASC) devient is_primary = true.
-- ────────────────────────────────────────────────────────────────────────────
WITH grouped AS (
  SELECT
    agency_id,
    property_id,
    min(COALESCE(lease_start, '2024-01-01'::date)) AS start_date,
    max(lease_end) AS end_date,
    bool_or(COALESCE(is_active, true)) AS is_active
  FROM tenants
  WHERE property_id IS NOT NULL
    AND agency_id IS NOT NULL
  GROUP BY agency_id, property_id
)
INSERT INTO leases (agency_id, property_id, start_date, end_date, is_active, lease_type, notes)
SELECT agency_id, property_id, start_date, end_date, is_active, 'residential',
       'Bail cree automatiquement lors de la migration vers le schema leases'
FROM grouped
ON CONFLICT DO NOTHING;

WITH ranked AS (
  SELECT
    t.id AS tenant_id,
    l.id AS lease_id,
    row_number() OVER (PARTITION BY t.property_id ORDER BY t.created_at NULLS LAST, t.id) AS rn
  FROM tenants t
  JOIN leases l ON l.property_id = t.property_id AND l.agency_id = t.agency_id
  WHERE t.property_id IS NOT NULL
)
INSERT INTO lease_tenants (lease_id, tenant_id, is_primary)
SELECT lease_id, tenant_id, (rn = 1)
FROM ranked
ON CONFLICT (lease_id, tenant_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- Attention : DROP des deux tables supprime toute donnee lease creee depuis. Si
-- des tickets ont ete lies via tickets.lease_id (migration 3), leur FK passe a
-- NULL via le ON DELETE SET NULL qui sera pose par la migration 3.
-- ────────────────────────────────────────────────────────────────────────────
--
-- DROP POLICY IF EXISTS "Agency isolation on lease_tenants" ON lease_tenants;
-- DROP POLICY IF EXISTS "Agency members manage lease_tenants" ON lease_tenants;
-- DROP POLICY IF EXISTS "Agency isolation on leases" ON leases;
-- DROP POLICY IF EXISTS "Agency members manage leases" ON leases;
-- DROP TRIGGER IF EXISTS set_updated_at_leases ON leases;
-- DROP INDEX IF EXISTS idx_lease_tenants_tenant;
-- DROP INDEX IF EXISTS idx_leases_external_ref;
-- DROP INDEX IF EXISTS idx_leases_active;
-- DROP INDEX IF EXISTS idx_leases_property;
-- DROP INDEX IF EXISTS idx_leases_agency;
-- DROP INDEX IF EXISTS idx_leases_one_active_per_property;
-- DROP TABLE IF EXISTS lease_tenants;
-- DROP TABLE IF EXISTS leases;
