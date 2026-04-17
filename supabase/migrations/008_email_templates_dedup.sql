-- Fix email templates duplication.
-- Root cause: template IDs like "t1" are not UUIDs → isUuid() returned false
-- → crypto.randomUUID() generated a new ID on every save → upsert on `id` never
-- found a conflict → inserted new rows instead of updating existing ones.
--
-- Fix: clean duplicates, then add UNIQUE(agency_id, use_case) so future
-- upserts conflict on the stable (agency, use_case) pair instead of the
-- ever-changing random id.

-- Step 1: remove duplicates, keeping the most recently created row per (agency_id, use_case)
DELETE FROM email_templates
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY agency_id, use_case
        ORDER BY COALESCE(created_at, '1970-01-01'::timestamptz) DESC
      ) AS rn
    FROM email_templates
    WHERE use_case IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: add the stable unique constraint
ALTER TABLE email_templates
  ADD CONSTRAINT email_templates_agency_use_case_key
  UNIQUE (agency_id, use_case);
