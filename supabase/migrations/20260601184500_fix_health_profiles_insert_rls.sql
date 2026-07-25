alter table public.health_profiles
  alter column created_by set default auth.uid();

drop policy if exists "health_profiles_insert_owner" on public.health_profiles;
create policy "health_profiles_insert_authenticated"
on public.health_profiles
for insert
to authenticated
with check (auth.uid() is not null);
