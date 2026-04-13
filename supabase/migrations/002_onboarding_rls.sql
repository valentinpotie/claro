-- ============================================================
-- Onboarding RLS policies
-- Allow a newly signed-up user (who has no agency yet) to:
--   1. Create an agency
--   2. Link their profile to that agency
--   3. Create agency_settings & email_templates for that agency
-- ============================================================

-- 1. agencies: allow any authenticated user to INSERT a new agency
--    (they can only READ their own agency via the existing policy)
drop policy if exists "Authenticated users create agency" on public.agencies;
create policy "Authenticated users create agency"
  on public.agencies for insert
  to authenticated
  with check (true);

-- 2. profiles: allow users to INSERT their own profile (upsert scenario)
--    The existing "Users update own profile" policy only covers UPDATE.
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 3. agency_settings: allow insert when the user's profile points to that agency
--    OR when the user has no agency yet (onboarding — they just created it)
--    The existing "Agency members write settings" uses `for all` but only matches
--    users who already have an agency_id. We need to also allow users whose
--    profile.agency_id matches the target agency_id being inserted.
drop policy if exists "Agency members write settings" on public.agency_settings;
create policy "Agency members write settings"
  on public.agency_settings for all
  to authenticated
  using (
    agency_id = public.user_agency_id()
    OR public.user_agency_id() IS NULL
  )
  with check (
    agency_id = public.user_agency_id()
    OR public.user_agency_id() IS NULL
  );

-- 4. email_templates: same pattern — allow when user_agency_id is NULL (onboarding)
drop policy if exists "Agency members manage templates" on public.email_templates;
create policy "Agency members manage templates"
  on public.email_templates for all
  to authenticated
  using (
    agency_id = public.user_agency_id()
    OR public.user_agency_id() IS NULL
  )
  with check (
    agency_id = public.user_agency_id()
    OR public.user_agency_id() IS NULL
  );
