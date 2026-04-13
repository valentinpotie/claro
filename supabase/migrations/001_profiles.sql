-- ============================================================
-- 1. Table profiles — lie chaque user Supabase Auth à une agence
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  agency_id  uuid references public.agencies(id),
  full_name  text,
  role       text not null default 'gestionnaire',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. RLS — chaque user ne voit que son propre profil
-- ============================================================
alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 3. Trigger — crée automatiquement un profil lors du signup
--    Le frontend passe agency_id + full_name dans les metadata.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, agency_id, full_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'agency_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

-- Drop the trigger first if it already exists (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. RLS policies sur les tables métier — accès par agency_id
--    Chaque user ne voit que les données de son agence.
-- ============================================================

-- Helper: retourne l'agency_id du user connecté
create or replace function public.user_agency_id()
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select agency_id from public.profiles where id = auth.uid()
$$;

-- agencies
alter table public.agencies enable row level security;
drop policy if exists "Agency members read own agency" on public.agencies;
create policy "Agency members read own agency"
  on public.agencies for select
  using (id = public.user_agency_id());

-- agency_settings
alter table public.agency_settings enable row level security;
drop policy if exists "Agency members read settings" on public.agency_settings;
create policy "Agency members read settings"
  on public.agency_settings for select
  using (agency_id = public.user_agency_id());
drop policy if exists "Agency members write settings" on public.agency_settings;
create policy "Agency members write settings"
  on public.agency_settings for all
  using (agency_id = public.user_agency_id());

-- email_templates
alter table public.email_templates enable row level security;
drop policy if exists "Agency members manage templates" on public.email_templates;
create policy "Agency members manage templates"
  on public.email_templates for all
  using (agency_id = public.user_agency_id());

-- artisans
alter table public.artisans enable row level security;
drop policy if exists "Agency members manage artisans" on public.artisans;
create policy "Agency members manage artisans"
  on public.artisans for all
  using (agency_id = public.user_agency_id());

-- tickets
alter table public.tickets enable row level security;
drop policy if exists "Agency members manage tickets" on public.tickets;
create policy "Agency members manage tickets"
  on public.tickets for all
  using (agency_id = public.user_agency_id());

-- ticket sub-tables (no agency_id — access via ticket ownership)
do $$ 
declare
  tbl text;
begin
  for tbl in 
    select unnest(array[
      'ticket_quotes', 'ticket_messages', 'ticket_photos', 
      'ticket_notes', 'ticket_mail_sources', 'ticket_syndic_followups',
      'ticket_invoices', 'ticket_journal_entries'
    ])
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "Access via ticket agency" on public.%I', tbl);
    execute format(
      'create policy "Access via ticket agency" on public.%I for all '
      'using (ticket_id in (select id from public.tickets where agency_id = public.user_agency_id()))',
      tbl
    );
  end loop;
end $$;

-- properties, tenants, owners
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['properties', 'tenants', 'owners'])
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "Agency members manage %I" on public.%I', tbl, tbl);
    execute format(
      'create policy "Agency members manage %I" on public.%I for all '
      'using (agency_id = public.user_agency_id())',
      tbl, tbl
    );
  end loop;
end $$;

-- ============================================================
-- 5. Compte de démo — à exécuter APRÈS avoir créé le user 
--    dans Supabase Auth (Dashboard > Authentication > Add user)
--    
--    Email : demo@claro.app
--    Password : Demo2026!
--
--    Puis récupérer l'UUID du user créé et l'insérer ici :
-- ============================================================
-- INSERT INTO public.profiles (id, agency_id, full_name, role)
-- VALUES (
--   '<UUID_DU_USER_AUTH>',
--   '11111111-1111-1111-1111-111111111111',
--   'Compte Démo',
--   'gestionnaire'
-- );
