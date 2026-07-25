drop policy if exists "profile_memberships_select_related" on public.profile_memberships;
drop policy if exists "profile_memberships_insert_owner_or_self" on public.profile_memberships;
drop policy if exists "profile_memberships_update_owner" on public.profile_memberships;

create policy "profile_memberships_select_own"
on public.profile_memberships
for select
to authenticated
using (user_id = auth.uid());

create policy "profile_memberships_insert_own"
on public.profile_memberships
for insert
to authenticated
with check (user_id = auth.uid());

create policy "profile_memberships_update_own"
on public.profile_memberships
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
