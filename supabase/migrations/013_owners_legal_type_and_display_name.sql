-- Migration 1 — enrichissement `owners` pour accepter personnes morales
-- (SCI/SARL/indivision) tout en conservant le fonctionnement actuel pour les personnes
-- physiques. Aucune perte de donnée.
--
-- Nouveaux champs :
--   - legal_type : person | sci | sarl | indivision | other (default 'person')
--   - civility   : M. | Mme | Mlle (nullable, pertinent uniquement pour legal_type='person')
--   - company_name : raison sociale (nullable, requis UI pour legal_type != 'person')
--   - display_name : calculé STORED depuis company_name sinon civility+first+last
--
-- last_name est rendu nullable au niveau DB — la validation "nom requis pour personne
-- physique" reste au niveau applicatif (Owners.tsx).

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS legal_type text NOT NULL DEFAULT 'person'
    CHECK (legal_type IN ('person','sci','sarl','indivision','other')),
  ADD COLUMN IF NOT EXISTS civility text
    CHECK (civility IS NULL OR civility IN ('M.','Mme','Mlle')),
  ADD COLUMN IF NOT EXISTS company_name text;

-- display_name calculé, jamais écrit par l'app. CONCAT_WS n'étant pas IMMUTABLE, on fait
-- le concat manuel + regexp_replace pour squasher les espaces multiples, le tout en
-- expressions immutables.
ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS display_name text
    GENERATED ALWAYS AS (
      COALESCE(
        NULLIF(company_name, ''),
        NULLIF(
          TRIM(regexp_replace(
            COALESCE(civility, '') || ' ' ||
            COALESCE(first_name, '') || ' ' ||
            COALESCE(last_name, ''),
            '\s+', ' ', 'g'
          )),
          ''
        ),
        'Sans nom'
      )
    ) STORED;

ALTER TABLE owners ALTER COLUMN last_name DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- Attention : le rollback échoue si des lignes personnes morales (last_name IS NULL)
-- ont été créées après la migration. Il faut alors soit les supprimer, soit leur
-- renseigner un last_name avant de pouvoir restaurer le NOT NULL.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ALTER TABLE owners ALTER COLUMN last_name SET NOT NULL;
-- ALTER TABLE owners DROP COLUMN IF EXISTS display_name;
-- ALTER TABLE owners DROP COLUMN IF EXISTS company_name;
-- ALTER TABLE owners DROP COLUMN IF EXISTS civility;
-- ALTER TABLE owners DROP COLUMN IF EXISTS legal_type;
