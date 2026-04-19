-- Rollout of the humanized `auto:*` email templates across every agency.
-- Applied on 2026-04-19. Each existing row gets its body/subject refreshed; missing
-- rows are inserted. Covers 15 use cases × all agencies.
--
-- The subject field is synced too (used by the Discussion template picker to pre-fill
-- a draft's "Objet" field), but the send-ticket-email edge function ignores it at runtime
-- in favor of the canonical ticket subject "{title} — {address}" for threading consistency.
-- See send-ticket-email/index.ts for the canonical subject logic.

WITH tpls(name, target, use_case, subject, body) AS (VALUES
  ('Demande de preuves — artisan', 'artisan', 'auto:artisan_demande_preuve', 'Preuves d''intervention — {{adresse}}', $b$Bonjour {{nom_artisan}},

Merci encore pour votre intervention au {{adresse}}.

Pourriez-vous nous transmettre quelques photos permettant d'attester de la bonne réalisation des travaux ?
Vous pouvez simplement répondre à cet email en les joignant.

Merci d'avance pour votre retour.

Bien cordialement,
{{nom_agence}}$b$),

  ('Devis validé — confirmation artisan', 'artisan', 'auto:artisan_devis_valide', 'Devis validé — {{adresse}}', $b$Bonjour {{nom_artisan}},

Nous vous confirmons que le devis de {{montant}} € pour le bien situé au {{adresse}} a bien été validé.

Pouvez-vous nous indiquer vos disponibilités pour organiser l'intervention ?

Locataire à contacter :
{{nom_locataire}} — {{telephone_locataire}}

Merci par avance pour votre retour.

Bien cordialement,
{{nom_agence}}$b$),

  ('Paiement facture', 'artisan', 'auto:artisan_facture_payee', 'Paiement transmis — {{adresse}}', $b$Bonjour {{nom_artisan}},

Nous vous confirmons la bonne réception et validation de votre facture d'un montant de {{montant}} €.

Le paiement a bien été effectué.

Merci pour votre intervention au {{adresse}}.

Au plaisir de retravailler ensemble.

Bien cordialement,
{{nom_agence}}$b$),

  ('Relance artisan — date d''intervention', 'artisan', 'auto:artisan_relance_date', 'Relance — Intervention à planifier {{adresse}}', $b$Bonjour {{nom_artisan}},

Sauf erreur de notre part, le locataire {{nom_locataire}} ({{telephone_locataire}}) n'a pas encore été contacté afin de fixer une date d'intervention au {{adresse}}.

Pouvez-vous revenir vers lui rapidement et nous tenir informés de la date retenue ?

Merci pour votre réactivité.

Bien cordialement,
{{nom_agence}}$b$),

  ('Relance facture — artisan', 'artisan', 'auto:artisan_relance_facture', 'Facture en attente — {{adresse}}', $b$Bonjour {{nom_artisan}},

Sauf erreur de notre part, nous n'avons pas encore reçu votre facture concernant l'intervention réalisée au {{adresse}}.

Auriez-vous la possibilité de nous la transmettre prochainement ?
Cela nous permettra de finaliser le dossier.

Merci d'avance pour votre retour.

Bien cordialement,
{{nom_agence}}$b$),

  ('Artisan en route (devis auto-validé)', 'tenant', 'auto:locataire_artisan_vient', 'Votre demande avance — {{adresse}}', $b$Bonjour {{nom_locataire}},

Bonne nouvelle : votre demande est en cours de traitement.

Le devis a été validé et l'artisan {{nom_artisan}} va prochainement vous contacter afin de convenir d'un rendez-vous au {{adresse}}.

Nous restons bien entendu disponibles si besoin.

Bien cordialement,
{{nom_agence}}$b$),

  ('Contact locataire — confirmation artisan', 'tenant', 'auto:locataire_contact_artisan', 'Suivi de votre dossier — {{adresse}}', $b$Bonjour {{nom_locataire}},

Nous souhaitions faire un point avec vous concernant l'intervention au {{adresse}}.

L'artisan {{nom_artisan}} a normalement dû vous contacter pour fixer une date.
Est-ce bien le cas ?

Si oui, pourriez-vous nous indiquer la date et l'heure prévues ?

Merci beaucoup pour votre retour.

Bien cordialement,
{{nom_agence}}$b$),

  ('Intervention confirmée par le propriétaire', 'tenant', 'auto:locataire_proprio_approuve', 'Intervention confirmée — {{adresse}}', $b$Bonjour {{nom_locataire}},

Nous vous confirmons que le propriétaire a donné son accord pour l'intervention au {{adresse}}.

L'artisan {{nom_artisan}} va prochainement vous contacter afin de convenir d'un rendez-vous.

Nous restons à votre disposition si besoin.

Bien cordialement,
{{nom_agence}}$b$),

  ('Demande de preuve de passage', 'tenant', 'auto:locataire_preuve_passage', 'Confirmation d''intervention — {{adresse}}', $b$Bonjour {{nom_locataire}},

L'artisan nous a transmis sa facture suite à son intervention au {{adresse}}.

Afin de finaliser le dossier, pourriez-vous nous confirmer que l'intervention a bien eu lieu ?
Une photo ou une courte vidéo suffit.

Merci beaucoup pour votre aide.

Bien cordialement,
{{nom_agence}}$b$),

  ('Clôture dossier (locataire)', 'tenant', 'auto:locataire_cloture', 'Dossier clôturé — {{adresse}}', $b$Bonjour {{nom_locataire}},

Nous vous informons que l'intervention à votre domicile est désormais terminée et que votre dossier est clôturé.

Nous espérons que tout est désormais en ordre.
N'hésitez pas à revenir vers nous en cas de besoin.

Bien cordialement,
{{nom_agence}}$b$),

  ('Demande d''accord', 'owner', 'auto:proprietaire_accord_devis', 'Devis à valider — {{adresse}}', $b$Bonjour {{nom_proprietaire}},

Suite au signalement concernant votre bien situé au {{adresse}} ({{lot}}), nous avons reçu un devis de la part de {{nom_artisan}}.

Montant : {{montant}} €
Description : {{description}}

Pouvez-vous nous confirmer votre accord afin que nous puissions organiser l'intervention ?

Nous restons à votre disposition pour toute question.

Bien cordialement,
{{nom_agence}}$b$),

  ('Compte-rendu facture', 'owner', 'auto:proprietaire_facture', 'Compte-rendu d''intervention — {{adresse}}', $b$Bonjour {{nom_proprietaire}},

Nous vous transmettons le compte-rendu de l'intervention réalisée dans votre bien au {{adresse}} ({{lot}}).

La facture d'un montant de {{montant}} € a été réglée.

N'hésitez pas à nous contacter si vous souhaitez plus de détails.

Bien cordialement,
{{nom_agence}}$b$),

  ('Clôture dossier (propriétaire)', 'owner', 'auto:proprietaire_cloture', 'Dossier clôturé — {{adresse}}', $b$Bonjour {{nom_proprietaire}},

Nous vous informons que le dossier relatif au problème signalé au {{adresse}} ({{lot}}) est désormais clôturé, suite à l'intervention de {{nom_artisan}}.

Montant de la facture : {{montant}} €.

Nous restons à votre disposition si besoin.

Bien cordialement,
{{nom_agence}}$b$),

  ('Signalement syndic', 'syndic', 'auto:contact_syndic', 'Signalement incident — {{adresse}}', $b$Bonjour,

Nous souhaitons vous signaler un incident constaté dans les parties communes de la résidence située au {{adresse}}.

Description : {{description}}

Nous vous remercions par avance pour la prise en charge de ce point.

Restant à votre disposition si besoin.

Bien cordialement,
{{nom_agence}}$b$),

  ('Relance syndic', 'syndic', 'auto:relance_syndic', 'Relance — Incident {{adresse}}', $b$Bonjour,

Sauf erreur de notre part, nous n'avons pas encore eu de retour concernant l'incident signalé au {{adresse}}.

Nous nous permettons donc de revenir vers vous afin de savoir si celui-ci est en cours de traitement.

Merci par avance pour votre retour.

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
