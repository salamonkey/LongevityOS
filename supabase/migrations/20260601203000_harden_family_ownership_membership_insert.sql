drop policy if exists "profile_memberships_insert_own" on public.profile_memberships;

create policy "profile_memberships_insert_owned_profile"
on public.profile_memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.health_profiles hp
    where hp.id = profile_memberships.profile_id
      and hp.created_by = auth.uid()
  )
);
