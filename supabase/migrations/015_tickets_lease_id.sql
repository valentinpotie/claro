-- Migration 3 — lier les tickets au bail (lease_id) + snapshot texte (lease_ref) pour
-- preserver la trace historique meme si le bail est supprime. FK nullable + ON DELETE
-- SET NULL pour que la suppression d'un bail ne casse pas les tickets.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS lease_id uuid REFERENCES leases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lease_ref text;

CREATE INDEX IF NOT EXISTS idx_tickets_lease_id
  ON tickets(lease_id) WHERE lease_id IS NOT NULL;

-- Backfill best-effort : tickets avec tenant_id → cherche le lease actif de ce tenant
-- via lease_tenants. Aucune erreur si le tenant n'a pas de bail (ticket reste avec
-- lease_id NULL, comportement attendu).
UPDATE tickets t
SET
  lease_id = l.id,
  lease_ref = l.external_ref
FROM leases l
JOIN lease_tenants lt ON lt.lease_id = l.id
WHERE lt.tenant_id = t.tenant_id
  AND l.is_active = true
  AND t.lease_id IS NULL
  AND t.tenant_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_tickets_lease_id;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS lease_ref;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS lease_id;
