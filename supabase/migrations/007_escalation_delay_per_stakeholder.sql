-- Migrate escalation delay: always store per-stakeholder values, never null.
-- Backfill any existing null values from the global escalation_delay_days, then enforce NOT NULL.

UPDATE agency_settings
SET
  escalation_delay_owner_days   = COALESCE(escalation_delay_owner_days,   escalation_delay_days, 3),
  escalation_delay_artisan_days = COALESCE(escalation_delay_artisan_days, escalation_delay_days, 3),
  escalation_delay_tenant_days  = COALESCE(escalation_delay_tenant_days,  escalation_delay_days, 3)
WHERE
  escalation_delay_owner_days IS NULL
  OR escalation_delay_artisan_days IS NULL
  OR escalation_delay_tenant_days IS NULL;

ALTER TABLE agency_settings
  ALTER COLUMN escalation_delay_owner_days   SET NOT NULL,
  ALTER COLUMN escalation_delay_owner_days   SET DEFAULT 3,
  ALTER COLUMN escalation_delay_artisan_days SET NOT NULL,
  ALTER COLUMN escalation_delay_artisan_days SET DEFAULT 3,
  ALTER COLUMN escalation_delay_tenant_days  SET NOT NULL,
  ALTER COLUMN escalation_delay_tenant_days  SET DEFAULT 3;
