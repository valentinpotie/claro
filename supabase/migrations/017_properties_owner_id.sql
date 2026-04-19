-- Ajoute properties.owner_id : 1 propriétaire par bien (indivisions gérées via
-- owners.legal_type='indivision' + company_name = "Indivision MARTIN"). ON DELETE
-- SET NULL pour ne pas casser un bien si l'owner est supprimé.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES owners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id) WHERE owner_id IS NOT NULL;

-- Backfill best-effort : pour chaque property, on regarde les tickets qui la référencent
-- et on prend le owner_id le plus fréquent. Si aucun ticket → owner_id reste null.
UPDATE properties p
SET owner_id = sub.owner_id
FROM (
  SELECT property_id, owner_id
  FROM (
    SELECT
      property_id,
      owner_id,
      row_number() OVER (PARTITION BY property_id ORDER BY count(*) DESC) AS rn
    FROM tickets
    WHERE property_id IS NOT NULL AND owner_id IS NOT NULL
    GROUP BY property_id, owner_id
  ) ranked
  WHERE rn = 1
) sub
WHERE p.id = sub.property_id
  AND p.owner_id IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_properties_owner_id;
-- ALTER TABLE properties DROP COLUMN IF EXISTS owner_id;
