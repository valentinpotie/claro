-- Migration: ticket_documents
-- Stockage centralisé des fichiers attachés aux tickets (devis PDF, factures, photos, etc.)
-- Supports : upload manuel depuis l'UI + pièces jointes email automatiques

-- ─── Table ────────────────────────────────────────────────────────────────────

create table public.ticket_documents (
  id            uuid        primary key default gen_random_uuid(),
  ticket_id     uuid        not null references public.tickets(id)   on delete cascade,
  agency_id     uuid        not null references public.agencies(id)  on delete cascade,
  document_type text        not null check (document_type in ('devis', 'facture', 'photo', 'autre')),
  file_name     text        not null,              -- nom du fichier original
  file_url      text        not null,              -- URL signée / publique Supabase Storage
  storage_path  text        not null,              -- chemin dans le bucket : <ticket_id>/<uuid>.<ext>
  mime_type     text,                              -- ex: application/pdf, image/jpeg
  file_size     integer,                           -- taille en octets
  uploaded_by   uuid        references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now(),
  description   text                               -- note libre (ex: "Devis plombier Martin")
);

-- ─── Index ────────────────────────────────────────────────────────────────────

create index idx_ticket_documents_ticket_id on public.ticket_documents(ticket_id);
create index idx_ticket_documents_agency_id on public.ticket_documents(agency_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table public.ticket_documents enable row level security;

-- Les membres d'une agence peuvent lire, insérer et supprimer les documents
-- de leurs propres tickets (filtre sur agency_id du profil authentifié).
create policy "Agency members manage ticket documents"
  on public.ticket_documents
  for all
  using (
    agency_id in (
      select agency_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    agency_id in (
      select agency_id from public.profiles where id = auth.uid()
    )
  );

-- ─── Bucket Supabase Storage ──────────────────────────────────────────────────
-- Bucket privé (public = false), 50 Mo max par fichier.
-- Structure des chemins : ticket-documents/<ticket_id>/<uuid>.<ext>
-- Les policies Storage vérifient que le ticket_id dans le chemin
-- appartient bien à l'agence de l'utilisateur connecté.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-documents',
  'ticket-documents',
  false,
  52428800,   -- 50 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do nothing;

-- Lecture : membres de l'agence propriétaire du ticket
create policy "Agency members read their ticket documents"
  on storage.objects
  for select
  using (
    bucket_id = 'ticket-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.tickets
      where agency_id in (
        select agency_id from public.profiles where id = auth.uid()
      )
    )
  );

-- Upload : membres de l'agence propriétaire du ticket
create policy "Agency members upload ticket documents"
  on storage.objects
  for insert
  with check (
    bucket_id = 'ticket-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.tickets
      where agency_id in (
        select agency_id from public.profiles where id = auth.uid()
      )
    )
  );

-- Suppression : membres de l'agence propriétaire du ticket
create policy "Agency members delete their ticket documents"
  on storage.objects
  for delete
  using (
    bucket_id = 'ticket-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.tickets
      where agency_id in (
        select agency_id from public.profiles where id = auth.uid()
      )
    )
  );
