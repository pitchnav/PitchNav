-- Prevent public client roles from changing privileged profile fields.
-- Admin promotion must use a trusted service-role or database-admin path.

revoke update on table public.profiles from anon, authenticated;

-- Remove any column-level grants that may have been applied independently.
revoke update (id, email, is_admin, created_at, updated_at)
  on table public.profiles
  from anon, authenticated;

-- Preserve the profile fields currently intended for athlete self-service.
grant update (full_name, avatar_url)
  on table public.profiles
  to authenticated;

-- Require ownership both before and after an authenticated profile update.
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
