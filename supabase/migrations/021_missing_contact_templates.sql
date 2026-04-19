-- Ajoute les 2 templates manquants utilisés par ArtisanContactModal :
--   - auto:artisan_demande_devis : contact initial artisan
--   - auto:locataire_signalement_recu : accusé de réception au locataire
--
-- Avant cette migration, ces use_cases étaient référencés dans le code mais sans
-- template en DB, donc la modale ArtisanContactModal tombait sur des textes
-- hardcodés locaux — pas customisables via Settings. Rollout sur toutes les agences.

WITH tpls(name, target, use_case, subject, body) AS (VALUES
  ('Demande de devis — contact initial artisan', 'artisan', 'auto:artisan_demande_devis', 'Demande de devis — {{adresse}}', $b$Bonjour {{nom_artisan}},

Nous avons un signalement concernant un problème de {{categorie}} au {{adresse}} ({{lot}}).

Description : {{description}}

Locataire à contacter sur place :
{{nom_locataire}} — {{telephone_locataire}}

Seriez-vous disponible pour passer diagnostiquer le problème et nous transmettre un devis ?

Merci d'avance pour votre retour,
{{nom_agence}}$b$),

  ('Accusé de réception — signalement locataire', 'tenant', 'auto:locataire_signalement_recu', 'Votre signalement a bien été pris en compte — {{adresse}}', $b$Bonjour {{nom_locataire}},

Nous avons bien reçu votre signalement concernant le problème de {{categorie}} au {{adresse}}.

Nous avons contacté {{nom_artisan}} pour qu'il se déplace et établisse un devis. Vous serez tenu informé de la suite — l'artisan devrait vous contacter prochainement pour convenir d'un créneau.

N'hésitez pas à nous joindre si vous avez des questions.

Bien cordialement,
{{nom_agence}}$b$)
)
INSERT INTO email_templates (agency_id, name, target, use_case, subject, body, is_active)
SELECT a.id, t.name, t.target, t.use_case, t.subject, t.body, true
FROM agencies a CROSS JOIN tpls t
ON CONFLICT (agency_id, use_case) DO UPDATE SET
  body = EXCLUDED.body,
  subject = EXCLUDED.subject,
  name = EXCLUDED.name,
  target = EXCLUDED.target,
  is_active = true,
  updated_at = now();
