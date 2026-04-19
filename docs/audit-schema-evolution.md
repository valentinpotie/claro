# Audit — Évolution schéma Claro (baux, personnes morales, canal préféré)

**Objectif** : identifier tous les points d'impact avant toute migration. Aucune modification tant que ce rapport n'est pas validé.

**Date** : 2026-04-19
**Périmètre** : onboarding agence pilote (134 proprios, 161 baux, 9 artisans, colocations, SCI, indivisions).

---

## État factuel de la base aujourd'hui

| Table | Colonnes clés | Contraintes bloquantes |
|---|---|---|
| `tenants` | `first_name`, `last_name NOT NULL`, `property_id uuid (nullable)` | `last_name` interdit les entités sans nom de famille |
| `owners` | `first_name`, `last_name NOT NULL`, `prefers_phone boolean` | Idem + pas de champ société/SCI |
| `properties` | `address`, `unit_number`, `external_ref` | OK |
| `tickets` | `tenant_id`, `property_id`, `owner_id` (toutes nullable), `last_action_at` (Phase 1 relances déjà en place) | Une seule FK par partie prenante |
| `artisans` | `name`, `email`, `phone` | Pas de canal préféré |

**Volume actuel** : 49 tickets, 6 tenants, 7 owners, 5 properties. ~22 tickets liés à des FK. Backfill trivial.

**Absents** : `leases`, `lease_tenants`, `legal_type`, `company_name`, `display_name`, `preferred_contact_channel`, champs de compteurs relance par destinataire.

---

## A — Flux email entrant (`inbound-email/index.ts`)

### Comment fonctionne le matching ?

[inbound-email/index.ts:260-315](supabase/functions/inbound-email/index.ts#L260-L315) — le edge function **ne fait AUCUN matching à un tenant ou à un property**. Il matche uniquement à un **ticket existant** via 3 stratégies (strongest signal first) :

1. **[CLR-XX]** dans le subject → lookup `tickets.reference`
2. **In-Reply-To / References headers** → lookup `tickets.id` (anchor `<claro-ticket-{id}@mail.claroimmo.fr>`)
3. **AI inference** : Claude cherche un match dans les tickets ouverts de cet agency où `tenant_email`, `property_owner_email` ou `syndic_email` == `from_email`

Si aucun match → création d'une ligne dans `inbound_emails` (table `signalements pending`). **Pas de tenant/property matching à l'ingestion.** Le matching vers les entités métier se fait **uniquement** au moment de la validation manuelle du signalement par le gestionnaire ([Dashboard.tsx](src/pages/Dashboard.tsx) ou [NewTicketModal](src/components/NewTicketModal.tsx)).

### Risques avec le nouveau schéma

- **Strategy 3 AI inference** compare `from_email` à **un seul** `tenant_email`/`property_owner_email` snapshot sur le ticket. Avec une colocation, seul le locataire principal est dans le snapshot → un reply du 2ᵉ co-locataire ne matche pas. **Risque** : mails classés "inconnu" et nouveau signalement créé alors qu'un ticket existait. **Mitigation possible** : interroger aussi `lease_tenants` pour récupérer tous les emails des co-locataires du bail actif et étendre la comparaison.
- **Indivisions** : un indivisaire secondaire qui répond ne matchera pas non plus (même cause).
- Pas d'impact direct sur le matching subject/header → ceux-ci continueront de fonctionner tant que le destinataire répond en gardant `[CLR-XX]`.

### À quel moment lier le ticket au bail actif ?

Proposition : au moment de la **validation du signalement** (`validateSignalement` dans [TicketContext.tsx:1557](src/contexts/TicketContext.tsx#L1557)). Le flux actuel demande déjà au gestionnaire de sélectionner un tenant + property + owner ; il suffit que la sélection tenant résolve le **lease actif** de ce tenant (en tenant compte de la date de signalement). Si le tenant a plusieurs baux actifs (résidentiel + parking, cas réel dans les données pilote), présenter un **choix explicite** — pas d'auto-sélection silencieuse.

### Locataire avec plusieurs baux actifs

Oui, c'est un cas réel dans le dataset pilote (parking + appartement séparés, ou cave). **Décision produit à prendre** : on lie le ticket à un seul bail (le bail qui matche la catégorie/adresse du signalement), et la modale de validation affiche les baux disponibles en clair.

---

## B — Création manuelle de ticket (`createTicket` / `validateSignalement`)

### Où les entités sont-elles liées ?

Les deux fonctions (dans [TicketContext.tsx](src/contexts/TicketContext.tsx)) **n'insèrent aucun tenant/owner/property** — elles reçoivent les `tenant_id`, `property_id`, `owner_id` en paramètre et se contentent de :

1. Insérer le ticket avec les 3 FK (si fournies)
2. Dénormaliser les snapshots (`tenant_name`, `tenant_phone`, `tenant_email`, `property_address`, `property_unit`, `property_owner_name/phone/email`)

La création des entités CRM se fait séparément via les pages [Tenants.tsx](src/pages/Tenants.tsx), [Owners.tsx](src/pages/Owners.tsx), [Properties.tsx](src/pages/Properties.tsx).

### Colonnes snapshot actuellement écrites sur `tickets`

[TicketContext.tsx:619-629](src/contexts/TicketContext.tsx#L619-L629) et [TicketContext.tsx:1635-1645](src/contexts/TicketContext.tsx#L1635-L1645) :

```
tenant_name, tenant_phone, tenant_email,
property_address, property_unit,
property_owner_name, property_owner_phone, property_owner_email
tenant_id, property_id, owner_id
```

Le helper [`splitFullName`](src/contexts/TicketContext.tsx#L89) concatène toujours `first_name + last_name` — tolérant à `first_name = ""`, mais va casser si on lui file un objet SCI où `last_name` est null.

### Évolution avec le nouveau schéma

- **Ajouter `lease_id`** en paramètre et sur le snapshot → la source de vérité pour l'historique
- **Ajouter `lease_ref`** (snapshot texte type `BAIL000363`) pour traçabilité après suppression éventuelle du bail
- Les snapshots `tenant_name` / `property_owner_name` restent (garantissent que l'affichage d'un vieux ticket ne dépend pas des tables liées)
- **Pour colocation** : `tenant_name` snapshot devient par convention le co-locataire principal, ou on concatène `"Martin & Dupont"`
- **Pour SCI/indivision** : `property_owner_name` snapshot = `company_name` ou `display_name` résolu via la fonction applicative

---

## C — Affichage du ticket ([TicketDetail.tsx](src/pages/TicketDetail.tsx))

### D'où viennent les infos affichées ?

Tout vient des **snapshots locaux** (`ticket.locataire.nom/telephone/email`, `ticket.bien.adresse/lot/proprietaire/telephoneProprio/emailProprio`), jamais de `tenants`/`owners`/`properties` directement. C'est une bonne chose : la page est immune aux modifications d'entités. Les 15 références identifiées :

- [TicketDetail.tsx:470](src/pages/TicketDetail.tsx#L470) — card `validation_proprio` (texte d'info)
- [TicketDetail.tsx:646-726](src/pages/TicketDetail.tsx#L646) — drafts intervention (accès au nom/tel locataire)
- [TicketDetail.tsx:881](src/pages/TicketDetail.tsx#L881) — relance facture artisan
- [TicketDetail.tsx:963](src/pages/TicketDetail.tsx#L963) — affichage "Responsable paiement" dans la card facture
- [TicketDetail.tsx:1144-1166](src/pages/TicketDetail.tsx#L1144) — cards sidebar Locataire & Bien+Proprio

### Ce qui casse si `tenants.property_id` devient nullable

**Rien** côté UI : `property_id` sur `tenants` n'est utilisé par **aucun** fichier frontend (`grep` confirmé). La nullabilité est transparente.

### Ce qui casse avec personne morale sans `last_name`

- L'**hydrator** [supabaseData.ts:697,707](src/lib/supabaseData.ts#L697-L707) concatène `first_name + last_name` en fallback quand le snapshot ticket est vide → produit une chaîne vide pour une SCI. **Fix** : lire `display_name` si présent, sinon concat.
- Le reste de la page lit le snapshot `ticket.locataire.nom` / `ticket.bien.proprietaire` qui est une string résolue côté ingestion → **aucun impact direct** sur TicketDetail.

---

## D — Flux email sortant (`send-ticket-email/index.ts` + `dispatchOutbound`)

### Résolution du destinataire

[send-ticket-email/index.ts:181-221](supabase/functions/send-ticket-email/index.ts#L181-L221) résout par type :

| recipient_type | Source |
|---|---|
| `artisan` | `SELECT * FROM artisans WHERE id = assigned_artisan_id` |
| `locataire` | `ticket.tenant_email` + `ticket.tenant_name` (**snapshot scalaire**) |
| `proprietaire` | `ticket.property_owner_email` + `ticket.property_owner_name` (**snapshot scalaire**) |
| `syndic` | `ticket.syndic_email` + `ticket.syndic_name` (**snapshot scalaire**) |

### Hypothèses cachées qui cassent avec colocation/indivision

1. **Un seul mail par type** — pour envoyer à 2 co-locataires, il faudrait soit envoyer 2 mails séparés, soit passer en `bcc`/`to` multi. Actuellement la fonction n'accepte qu'un seul `recipient.email`.
2. **Indivision** — seul 1 indivisaire est notifié. Les autres n'ont jamais l'info.
3. **Accès direct `ticket.tenant_email`** (et non via `leases`/`lease_tenants`) — c'est un choix délibéré pour l'immuabilité historique, mais pour l'envoi d'un NOUVEAU mail, il faudrait passer par la table de jointure.

### `preferred_contact_channel`

**Aucun check** à ce jour. Le flux envoie systématiquement un mail dès qu'il y a une adresse. Il faudrait :
- Ajouter un check early-return dans `send-ticket-email` : si `recipient.preferred_contact_channel === 'phone'` → ne pas envoyer, retourner `{ skipped: true, reason: "phone_preferred" }`
- Côté UI, surface un badge "Appel téléphonique préféré" sur la card du destinataire pour que le gestionnaire ne soit pas surpris

### Endroits où on hardcode `tenants[0]` ou `owners[0]`

Aucun — mais le **modèle actuel est scalaire** par design (une FK par ticket). Tout le code assume implicitement `1-1`. Passer au multi demandera :
- Une méthode `resolveRecipients(ticket, type)` qui retourne `Array<{email, name, preferred_channel}>`
- `dispatchOutbound` qui itère et fait N appels au edge function, OU un edge function qui accepte un array
- `classify-reply` qui tolère `fromEmail ∈ Set(tenants du bail)`

---

## E — Réponses / classify-reply

### Identification du sender

[classify-reply/index.ts:176-188](supabase/functions/classify-reply/index.ts#L176-L188) : match **exact** entre `fromEmail` normalisé et UNE de ces 4 scalaires :

1. `ticket.tenant_email`
2. `ticket.property_owner_email`
3. `ticket.syndic_email`
4. `artisan.email` (via `assigned_artisan_id`)

**Priorité** documentée : tenant → owner → syndic → artisan (pour éviter qu'un artisan avec la même adresse que le locataire n'écrase la routage).

### Colocation — tenant 2 répond

Aujourd'hui : `from_role: "unknown"`, `thread_key: "general"`. Le message est inséré dans une conversation `"general"` invisible du gestionnaire (pas d'onglet dédié). **Critique** : la réponse est PERDUE fonctionnellement.

**Mitigation** : étendre `identifySender` pour vérifier **toute adresse présente dans `lease_tenants` du bail lié au ticket**. Si match → `from_role: "tenant"` (toujours `thread_key: "locataire"`, un seul thread locataire par ticket — peu importe quel co-locataire répond). Ajouter un champ `lease_tenant_id` sur `ticket_messages` pour tracer QUI a répondu.

### Indivision — indivisaire secondaire répond

Même problème. Même mitigation : étendre `identifySender` à vérifier tous les `owners` liés à la `property` OU à une table d'indivision dédiée. Accepter si match, tracer qui via `owner_id` sur le message.

**Question produit** : faut-il considérer qu'une réponse d'un indivisaire secondaire vaut accord ? **Réponse recommandée** : oui pour classification (on considère que c'est un accord), mais surface dans l'UI "Réponse reçue de [Nom] — un autre indivisaire [Principal] n'a pas encore répondu". Le gestionnaire décide.

---

## F — Composants UI utilisant `first_name` / `last_name`

### Lieux identifiés

| Fichier | Ligne | Usage | Niveau de risque |
|---|---|---|---|
| [Tenants.tsx](src/pages/Tenants.tsx) | 52, 179 | **Validation `last_name.trim()` requis** à la soumission | **BLOQUANT** pour entités company-only |
| [Tenants.tsx](src/pages/Tenants.tsx) | 130, 169-170 | Display table + form fields | Cosmétique |
| [Owners.tsx](src/pages/Owners.tsx) | 53, 180 | **Validation `last_name` requis** | **BLOQUANT** pour SCI/SARL |
| [Owners.tsx](src/pages/Owners.tsx) | 129, 167-168 | Display table + form fields | Cosmétique |
| [NewTicketModal.tsx](src/components/NewTicketModal.tsx) | 59-60, 142, 149, 178, 185 | Concat display dans selectors | Cosmétique → `display_name` |
| [Dashboard.tsx](src/pages/Dashboard.tsx) | 666, 750, 894, 900, 949, 955 | Comboboxes de validation signalement | Cosmétique → `display_name` |
| [supabaseData.ts](src/lib/supabaseData.ts) | 697, 707 | Fallback quand snapshot ticket vide | Cosmétique → `display_name` |
| [TicketContext.tsx](src/contexts/TicketContext.tsx) | 89, 609-619 | `splitFullName` helper + écriture snapshot | Tolère `first_name=""` mais doit tolérer `last_name=null` |

**Bonne nouvelle** : aucun site ne lit `first_name` ou `last_name` isolément — tout est concaténé pour affichage. Un helper `resolveName(entity) → string` qui retourne `display_name ?? company_name ?? "${first} ${last}".trim()` remplace tout proprement.

---

## Edge cases critiques

Les scénarios qui vont **casser** si on migre sans précaution :

### 1. SCI avec 3 indivisaires et 2 locataires en colocation
- **Validation du devis** : aujourd'hui envoie UN mail à `property_owner_email` (le principal). Les 2 autres indivisaires ne voient rien. Un refus par un indivisaire non-notifié = litige. → Fix dans le flux send-ticket-email avec multi-recipient.
- **Réponse du locataire 2** : aujourd'hui classée `unknown`, message perdu dans un thread `general` invisible. → Fix avec `lease_tenants` lookup.
- **Accord du proprio** : actuellement détection AI via `approval` — mais si c'est l'indivisaire 2 qui accepte (pas le principal), sender = `unknown` → détection ratée. → Fix : étendre `identifySender` aux indivisaires.

### 2. Tenant avec 2 baux actifs (appartement + parking)
- **Signalement "fuite"** : l'adresse du bail appartement vs parking diffère. La validation doit présenter un choix. → Ajouter dropdown "quel bail ?" dans `NewTicketModal` / validation signalement quand multiple baux actifs.
- **Ticket historique** : sans `lease_id`, impossible de savoir ensuite à quel bail le ticket se rattachait → chgt de locataire = ambigüité. → `tickets.lease_id` obligatoire pour nouveaux tickets post-migration.

### 3. Changement de locataire (bail renouvelé avec un autre)
- Aujourd'hui : `tickets.tenant_id` pointe vers la ligne `tenants` → si le tenant part et est supprimé, FK cascade ou SET NULL → historique cassé.
- **Fix clé** : `lease_id` + `lease_ref` (texte) sur `tickets`. Même si la ligne `leases` est supprimée, on garde le `lease_ref` pour la trace. Les snapshots `tenant_name` / `tenant_email` restent.

### 4. Personne morale qui change d'email (changement de gérant SCI)
- Le snapshot `property_owner_email` reste celui du ticket historique → OK.
- Les nouveaux mails sortants utilisent `owners.email` actuel → OK si on lit depuis l'entité et pas depuis le snapshot (c'est déjà le cas côté edge function **MAIS** elle lit `ticket.property_owner_email` qui est le snapshot… donc un vieux email reste utilisé. **Comportement actuel discutable, à décider**).

### 5. Propriétaire qui préfère le téléphone (`prefers_phone=true`)
- Aucun check actuellement. Le système envoie le mail quand même. → Quand on généralise `preferred_contact_channel`, `dispatchOutbound` doit consulter et skipper avec un log "channel_skipped" + notifier le gestionnaire.

### 6. Colocataire qui quitte le logement en cours de bail
- Aujourd'hui : `tenants.is_active` existe. Si on a `lease_tenants`, il faut aussi un champ `lease_tenants.exited_at` pour dater la sortie d'un colocataire d'un bail (sans supprimer sa trace).

---

## Ordre recommandé des migrations

Ton ordre est bon, je propose **un ajustement mineur** : passer la migration 5 (relances) avant la migration 4 (canal préféré) — la Phase 1 des relances est **déjà en place** avec `last_action_at` + bouton "Relancer" (cf. [migration 011](supabase/migrations/011_tickets_last_action_at.sql)). Le reste des champs relance est pour Phase 2 (cron). Mais le canal préféré est un prérequis pour que Phase 2 ne spamme pas les owners qui préfèrent le téléphone. Donc l'ordre pratique est :

1. **Migration 1** — `owners` enrichi pour personnes morales (SCI/SARL/indivision + `display_name`)
2. **Migration 2** — `leases` + `lease_tenants` + backfill depuis `tenants.property_id`
3. **Migration 3** — `tickets.lease_id` + backfill depuis tenant actif
4. **Migration 4** — `preferred_contact_channel` généralisé (tenants + artisans + harmo owners.prefers_phone)
5. **Migration 5** — compteurs relance + backfill last_action_at (déjà partiellement fait)

**Point important** : entre chaque migration, le code doit continuer à fonctionner avec les tickets de démo existants. Les nouveaux champs sont **ajoutés nullable**, le code est migré progressivement pour les lire, et on **ne supprime aucune colonne** tant que l'intégralité du code ne lit plus l'ancienne.

---

## Estimation temps

| Migration | DDL | Backfill | Code impact | UI impact | Tests | **Total** |
|---|---|---|---|---|---|---|
| 1 — owners enrichi | 20 min | 10 min | 30 min (Owners.tsx + supabaseData) | 45 min (form legal_type + display_name) | 30 min | **~2 h** |
| 2 — leases + lease_tenants | 45 min | 1 h (backfill depuis tenants.property_id) | 1 h (nouveaux hooks + types) | 2 h (page Baux CRUD ou inline dans Tenants) | 1 h | **~6 h** |
| 3 — tickets.lease_id | 20 min | 30 min (backfill depuis tenant actif) | 45 min (NewTicketModal + validateSignalement + classify-reply lease resolution) | 30 min (badge "Bail BAIL000363" dans TicketDetail) | 45 min | **~3 h** |
| 4 — preferred_contact_channel | 15 min | 15 min (mapping prefers_phone → channel) | 45 min (send-ticket-email check + dispatchOutbound skip) | 45 min (badge UI + form settings) | 30 min | **~2 h 30** |
| 5 — compteurs relance (Phase 2) | 20 min | 10 min | 2 h (edge function cron send-reminders) | 45 min (badge action requise, snooze) | 1 h | **~4 h** |

**Total estimé : ~17-18 h de dev focalisé**, réparties sur ~3-4 jours avec tests manuels entre chaque étape. Pas de deadline dure à moins de 3 mois, donc tout à fait tenable avec validation intermédiaire.

---

## Livrables après validation

À ta demande, pour chaque migration :
- un fichier SQL idempotent dans `supabase/migrations/NNN_*.sql`
- un rapport de diff code modifié / code ajouté avec commits atomiques
- une checklist de test manuel (cas nominal + au moins 2 edge cases dérivés de la section 5 ci-dessus)

**Je n'entame aucune migration tant que ce rapport n'est pas validé.**

---

## Addendum — Validation utilisateur (2026-04-19)

Rapport validé. Trois précisions à intégrer :

### P1 — Source de vérité pour les emails sortants (scope migration 3)
Pour les **nouveaux** emails envoyés, `send-ticket-email`, `dispatchOutbound` et `classify-reply` doivent lire l'adresse actuelle depuis `tenants` / `owners` / `artisans`, **pas** depuis les snapshots du ticket. Les snapshots restent la source de vérité pour l'affichage historique et la trace des mails déjà envoyés.
→ Intégré dans la migration 3 quand on touche déjà au flux ticket (pas de migration dédiée).

### P2 — Rollback SQL
Chaque migration doit inclure un bloc de rollback commenté en bas du fichier. Obligatoire pour migrations 1, 2, 3.

### P3 — Décisions produit migration 2
- **Backfill `lease_tenants`** : le premier tenant migré devient `is_primary = true`. Pour les imports futurs avec plusieurs noms sur une ligne (Alessandro colocations), le **premier listé** est primary, les autres `is_primary = false`. Le gestionnaire peut modifier après import.
- **UI baux** : page dédiée `/leases`, pas inline dans Tenants. 161 baux chez Alessandro, filtrable/scannable indépendamment. Design calqué sur la page Tenants existante.
