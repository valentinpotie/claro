ALTER TABLE tickets ALTER COLUMN planned_intervention_date TYPE timestamptz USING planned_intervention_date::timestamptz;
