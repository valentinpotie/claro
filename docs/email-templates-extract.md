# Extract — Templates d'email Claro

**Base :** Supabase `email_templates`
**Date d'extraction :** 2026-04-18
**Total :** 154 lignes en base · 22 agences · **20 templates distincts** (`use_case` × `target`)

Les templates sont dupliqués par agence (chaque agence possède sa propre copie, modifiable via l'écran Paramètres). Les entrées ci-dessous montrent **une version canonique par `use_case`** — les variantes entre agences diffèrent peu (surtout la signature `{{nom_agence}}`).

---

## Variables disponibles

| Variable | Source |
|---|---|
| `{{adresse}}` | `tickets.bien.adresse` |
| `{{lot}}` | `tickets.bien.lot` |
| `{{description}}` | `tickets.description` |
| `{{categorie}}` | `tickets.categorie` |
| `{{montant}}` | devis sélectionné ou facture |
| `{{delai}}` | devis sélectionné |
| `{{date_intervention}}` | `tickets.dateInterventionPrevue` |
| `{{nom_locataire}}` | locataire |
| `{{telephone_locataire}}` | locataire |
| `{{nom_proprietaire}}` | propriétaire |
| `{{nom_artisan}}` | artisan |
| `{{telephone_artisan}}` | artisan |
| `{{nom_agence}}` | `agency_settings.agency_name` |

---

## Templates `auto:*` — canoniques

### Artisan (5)

#### `auto:artisan_demande_preuve`
**Objet :** `Preuves d'intervention — {{adresse}}`

```
Bonjour {{nom_artisan}},

Suite à votre intervention au {{adresse}}, pourriez-vous nous transmettre des photos attestant de la réalisation des travaux ?

Merci de répondre à ce message en joignant les éléments demandés.

Cordialement,
{{nom_agence}}
```

#### `auto:artisan_devis_valide`
**Objet :** `Devis validé — {{adresse}}`

```
Bonjour {{nom_artisan}},

Le devis de {{montant}} € concernant le bien au {{adresse}} a été validé. Merci de confirmer votre disponibilité pour l'intervention s'il vous plaît.

Locataire : {{nom_locataire}} — {{telephone_locataire}}

Cordialement,
{{nom_agence}}
```

#### `auto:artisan_facture_payee`
**Objet :** `Paiement transmis — {{adresse}}`

```
Bonjour {{nom_artisan}},

Nous avons bien reçu et validé votre facture de {{montant}} €. Le paiement vous a été transmis.

Merci pour votre intervention au {{adresse}}.

Cordialement,
{{nom_agence}}
```

#### `auto:artisan_relance_date`
**Objet :** `Relance — Date d'intervention {{adresse}}`

```
Bonjour {{nom_artisan}},

Nous attendons que vous preniez contact avec le locataire {{nom_locataire}} ({{telephone_locataire}}) pour fixer une date d'intervention au {{adresse}}.

Merci de nous confirmer la date retenue dans les meilleurs délais.

Cordialement,
{{nom_agence}}
```

#### `auto:artisan_relance_facture`
**Objet :** `Facture en attente — {{adresse}}`

```
Bonjour {{nom_artisan}},

Nous n'avons pas encore reçu votre facture concernant l'intervention au {{adresse}}. Pourriez-vous nous la transmettre dans les meilleurs délais ?

Celle-ci est nécessaire pour finaliser le dossier.

Cordialement,
{{nom_agence}}
```

---

### Locataire (5)

#### `auto:locataire_artisan_vient`
**Objet :** `Votre demande avance — {{adresse}}`

```
Bonjour {{nom_locataire}},

Votre demande est en cours de traitement. Le devis a été validé et l'artisan {{nom_artisan}} va prochainement prendre contact avec vous pour convenir d'une date d'intervention au {{adresse}}.

Cordialement,
{{nom_agence}}
```

#### `auto:locataire_contact_artisan`
**Objet :** `Votre dossier — {{adresse}}`

```
Bonjour {{nom_locataire}},

L'artisan chargé de votre intervention au {{adresse}} devrait vous avoir contacté pour convenir d'une date de passage. Avez-vous été contacté ?

Si oui, pourriez-vous nous indiquer la date et l'heure convenues ?

Cordialement,
{{nom_agence}}
```

#### `auto:locataire_proprio_approuve`
**Objet :** `Intervention confirmée — {{adresse}}`

```
Bonjour {{nom_locataire}},

L'intervention au {{adresse}} a été confirmée par le propriétaire. L'artisan {{nom_artisan}} va prochainement prendre contact avec vous pour convenir d'une date de passage.

Cordialement,
{{nom_agence}}
```

#### `auto:locataire_preuve_passage`
**Objet :** `Confirmation d'intervention — {{adresse}}`

```
Bonjour {{nom_locataire}},

L'artisan nous a transmis sa facture suite à son intervention au {{adresse}}. Pourriez-vous nous faire parvenir une photo ou une vidéo confirmant que l'intervention a bien eu lieu à votre domicile ?

Merci.

{{nom_agence}}
```

#### `auto:locataire_cloture`
**Objet :** `Dossier clôturé — {{adresse}}`

```
Bonjour {{nom_locataire}},

L'intervention à votre domicile est terminée et votre dossier est désormais clôturé. N'hésitez pas à nous contacter pour tout nouveau problème.

Cordialement,
{{nom_agence}}
```

---

### Propriétaire (3)

#### `auto:proprietaire_accord_devis`
**Objet :** `Devis à approuver — {{adresse}}`

```
Bonjour {{nom_proprietaire}},

Suite au signalement au {{adresse}} ({{lot}}), nous avons reçu un devis de {{nom_artisan}} pour un montant de {{montant}} €.

Description : {{description}}

Merci de nous confirmer votre accord dans les meilleurs délais.

Cordialement,
{{nom_agence}}
```

#### `auto:proprietaire_facture`
**Objet :** `Compte-rendu travaux — {{adresse}}`

```
Bonjour {{nom_proprietaire}},

Voici le compte-rendu d'intervention pour votre bien au {{adresse}} ({{lot}}). La facture de {{montant}} € a été réglée.

Cordialement,
{{nom_agence}}
```

#### `auto:proprietaire_cloture`
**Objet :** `Dossier clôturé — {{adresse}}`

```
Bonjour {{nom_proprietaire}},

Le dossier concernant le problème signalé au {{adresse}} ({{lot}}) a été clôturé suite à l'intervention de {{nom_artisan}}.

Montant facturé : {{montant}} €.

Cordialement,
{{nom_agence}}
```

---

### Syndic (2)

#### `auto:contact_syndic`
**Objet :** `Signalement incident — {{adresse}}`

```
Bonjour,

Nous vous signalons un incident dans les parties communes de la résidence au {{adresse}}.

Description : {{description}}

Merci de bien vouloir prendre en charge ce problème dans les meilleurs délais.

Cordialement,
{{nom_agence}}
```

#### `auto:relance_syndic`
**Objet :** `Relance — Incident {{adresse}}`

```
Bonjour,

Sans réponse de votre part depuis notre précédent contact concernant l'incident au {{adresse}}, nous nous permettons de vous relancer.

Merci de bien vouloir traiter ce signalement dans les meilleurs délais.

Cordialement,
{{nom_agence}}
```

---

## Templates legacy (use_case en texte libre)

Ces templates ont un `use_case` en prose plutôt que le slug `auto:xxx`. Certains sont **redondants** avec un template `auto:*`. À harmoniser.

### `Demande de devis suite à un signalement` (artisan)
**Objet :** `Demande de devis — {{adresse}}`

```
Bonjour {{nom_artisan}},

Nous avons un besoin d'intervention pour un problème de {{categorie}} au {{adresse}} ({{lot}}).

Description : {{description}}

Merci de nous adresser votre devis dans les meilleurs délais.

Cordialement,
{{nom_agence}}
```

> Pas d'équivalent `auto:*` — c'est le **template d'entrée du workflow** (contact artisan initial).

### `Confirmation de la date d'intervention` (artisan)
**Objet :** `Confirmation d'intervention — {{adresse}}`

```
Bonjour {{nom_artisan}},

Nous confirmons votre intervention prévue le {{date_intervention}} au {{adresse}} ({{lot}}).

Locataire : {{nom_locataire}} — {{telephone_locataire}}

Merci.

{{nom_agence}}
```

### `Envoi du devis pour accord` (owner) — **doublon de `auto:proprietaire_accord_devis`**
**Objet :** `Devis à approuver — {{adresse}}`

```
Bonjour {{nom_proprietaire}},

Suite au signalement au {{adresse}} ({{lot}}), nous avons reçu un devis de {{nom_artisan}} pour un montant de {{montant}} €.

Description : {{description}}

Merci de nous confirmer votre accord.

Cordialement,
{{nom_agence}}
```

### `Informer le propriétaire de la clôture` (owner) — **doublon de `auto:proprietaire_cloture`**
**Objet :** `Dossier clôturé — {{adresse}}`

```
Bonjour {{nom_proprietaire}},

Le dossier concernant le problème signalé au {{adresse}} ({{lot}}) a été clôturé suite à l'intervention de {{nom_artisan}}.

Montant facturé : {{montant}} €.

Cordialement,
{{nom_agence}}
```

### `Prévenir le locataire d'une intervention` (tenant)
**Objet :** `Intervention prévue — {{adresse}}`

```
Bonjour {{nom_locataire}},

Un artisan interviendra le {{date_intervention}} à votre domicile ({{adresse}}, {{lot}}) pour résoudre le problème signalé.

Artisan : {{nom_artisan}} — {{telephone_artisan}}

Merci de prévoir votre présence ou de nous indiquer un créneau.

Cordialement,
{{nom_agence}}
```

---

## Récapitulatif par use_case

| use_case | target | use_case legacy équivalent | statut |
|---|---|---|---|
| `auto:artisan_demande_preuve` | artisan | — | ok |
| `auto:artisan_devis_valide` | artisan | — | ok |
| `auto:artisan_facture_payee` | artisan | — | ok |
| `auto:artisan_relance_date` | artisan | — | ok |
| `auto:artisan_relance_facture` | artisan | — | ok |
| `auto:locataire_artisan_vient` | tenant | — | ok |
| `auto:locataire_cloture` | tenant | — | ok |
| `auto:locataire_contact_artisan` | tenant | — | ok |
| `auto:locataire_preuve_passage` | tenant | — | ok |
| `auto:locataire_proprio_approuve` | tenant | — | ok |
| `auto:proprietaire_accord_devis` | owner | `Envoi du devis pour accord` | **doublon** |
| `auto:proprietaire_cloture` | owner | `Informer le propriétaire de la clôture` | **doublon** |
| `auto:proprietaire_facture` | owner | — | ok |
| `auto:contact_syndic` | syndic | — | ok |
| `auto:relance_syndic` | syndic | — | ok |
| *(legacy uniquement)* `Demande de devis suite à un signalement` | artisan | — | à migrer en `auto:artisan_demande_devis` |
| *(legacy uniquement)* `Confirmation de la date d'intervention` | artisan | — | à migrer en `auto:artisan_confirmation_date` |
| *(legacy uniquement)* `Prévenir le locataire d'une intervention` | tenant | — | à migrer en `auto:locataire_intervention_prevue` |
