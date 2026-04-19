-- Template dédié à la relance propriétaire pour accord devis.
-- Avant cette migration, send-reminders utilisait auto:proprietaire_accord_devis (le
-- template du PREMIER envoi) — pas idéal car le ton n'est pas celui d'une relance.

WITH tpls(name, target, use_case, subject, body) AS (VALUES
  ('Relance propriétaire — accord devis', 'owner', 'auto:proprietaire_relance', 'Relance — Devis en attente d''accord {{adresse}}', $b$Bonjour {{nom_proprietaire}},

Sauf erreur de notre part, nous n'avons pas encore reçu votre retour concernant le devis de {{nom_artisan}} pour le bien au {{adresse}} ({{lot}}).

Montant : {{montant}} €
Description : {{description}}

Pourriez-vous nous confirmer votre accord afin que nous puissions organiser l'intervention ?

Nous restons à votre disposition pour toute question.

Bien cordialement,
{{nom_agence}}$b$)
)
INSERT INTO email_templates (agency_id, name, target, use_case, subject, body, is_active)
SELECT a.id, t.name, t.target, t.use_case, t.subject, t.body, true
FROM agencies a CROSS JOIN tpls t
ON CONFLICT (agency_id, use_case) DO UPDATE SET
  body = EXCLUDED.body, subject = EXCLUDED.subject, name = EXCLUDED.name,
  target = EXCLUDED.target, is_active = true, updated_at = now();
