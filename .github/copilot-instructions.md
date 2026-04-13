# Claro — Project Context

## What is Claro

SaaS de gestion de travaux pour agences immobilières. Un email de locataire arrive → Claro l'analyse par IA → le gestionnaire valide → le ticket suit un workflow automatisé (artisan, devis, propriétaire, intervention, facturation, clôture).

## Stack

- **Frontend** : React 18 + TypeScript, Vite, Tailwind CSS v3, shadcn/ui (Radix primitives)
- **Routing** : React Router v6 (HashRouter, routes dans `src/App.tsx`)
- **Backend/DB** : Supabase (PostgreSQL). Flag `USE_SUPABASE` (env `VITE_USE_SUPABASE`) bascule entre mode réel et mode demo (mock data)
- **Email** : Resend (envoi), inbound via Supabase Edge Functions
- **Hébergement** : GitHub Pages, domaine OVH

## Structure du projet

```
src/
  App.tsx              # Routes
  contexts/
    TicketContext.tsx   # State central: tickets, artisans, signalements, CRUD + Supabase sync
    SettingsContext.tsx # Paramètres agence (agency_settings)
  hooks/
    useSignalements.ts # Fetch + realtime inbound_emails (consommé par TicketContext)
    useProperties.ts   # CRUD propriétés
    useTenants.ts      # CRUD locataires
    useOwners.ts       # CRUD propriétaires
    useTickets.ts      # Fetch tickets Supabase
    useArtisans.ts     # Fetch artisans Supabase
  lib/
    supabase.ts        # Client Supabase + USE_SUPABASE flag
    supabaseData.ts    # Hydratation DB → types app, mappings EN↔FR
  data/
    types.ts           # Tous les types/interfaces + labels FR
    mockData.ts        # Données demo
  pages/
    Dashboard.tsx      # Signalements + KPIs + modale de correction
    TicketDetail.tsx    # Détail ticket + workflow stepper
    Artisans.tsx       # Annuaire artisans (Google Places autocomplete)
    Properties.tsx, Tenants.tsx, Owners.tsx  # Pages CRM
    Signalement.tsx    # Création manuelle ticket
    ...
  components/
    AppSidebar.tsx     # Navigation sidebar avec section CRM
    ui/                # Composants shadcn/ui
```

## Conventions critiques

### Types FR vs DB EN

Les types app utilisent des clés FR (`plomberie`, `proprietaire`, `serrurerie`).
La DB et l'IA utilisent des clés EN (`plumbing`, `owner`, `locksmith`).

Mappings dans `src/lib/supabaseData.ts` :
- `categoryFromDb` / `categoryToDb` — conversion catégories
- `responsibilityFromDb` / `responsibilityToDb` — conversion responsabilité
- `mapStatusToDb` / `mapPriorityToDb` — status et priorité

Dans Dashboard, les helpers `normalizeCategory()` et `normalizeResponsibility()` normalisent les valeurs AI (EN ou FR) vers les clés FR internes.

### Contraintes DB importantes

- `tickets.reference` : NOT NULL + UNIQUE — généré via `generateUniqueRef()` (timestamp+random)
- `artisans.specialty` : CHECK constraint, valeurs autorisées : `plumbing`, `electrical`, `locksmith`, `heating`, `roofing`, `humidity`, `pests`, `painting`, `general`, `other`
- `tickets.tenant_id`, `property_id`, `owner_id` : FK optionnels vers tables CRM

### Flux signalement → ticket

1. Email arrive → Edge Function parse + IA → INSERT `inbound_emails` (status=pending)
2. `useSignalements` fetch + realtime subscription → affichage Dashboard
3. Gestionnaire clique "Valider" ou "Corriger" → `validateSignalement()` dans TicketContext
4. INSERT `tickets` + UPDATE `inbound_emails` (ticket_id + validated) + `removeSignalement()` du state local
5. Navigation vers `/tickets/:id`

### Pattern CRM hooks

`useProperties`, `useTenants`, `useOwners` suivent le même pattern :
- Export `{ items, loading, add, update, remove, bulkInsert, refetch }`
- Supabase si `USE_SUPABASE` + agencyId valide, sinon mock local
- Import CSV via `bulkInsert` avec papaparse

### Artisans — spécialités

Le formulaire dans `Artisans.tsx` utilise un dictionnaire `artisanSpecialtyLabels` :
- `value` = clé EN pour la DB (`plumbing`, `electrical`, etc.)
- Label affiché = FR (`Plomberie`, `Électricité`, etc.)
- Default : `"other"`

## Build & Test

```bash
bun install          # Dépendances
bun run dev          # Dev server Vite
npx tsc --noEmit     # Type-check
bun run test         # Vitest
```

## Pièges courants

- Ne jamais envoyer de valeurs FR dans les colonnes DB `category`, `responsibility`, `specialty`
- `body_text` peut être vide (Apple Mail) → fallback sur `body_html` via `getOriginalMailBody()`
- La modale de correction Dashboard utilise `overflow-y-auto` avec `!flex` pour le scroll
- Les routes CRM acceptent `/:id` (ex: `/tenants/:id`) pour la navigation depuis TicketDetail
- `ticketCounter` est un compteur local non persisté — ne pas l'utiliser pour les refs DB
