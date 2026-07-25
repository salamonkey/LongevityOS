drop policy if exists "health_profiles_select_creator" on public.health_profiles;
create policy "health_profiles_select_creator"
on public.health_profiles
for select
to authenticated
using (created_by = auth.uid());
