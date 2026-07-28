-- plan_items had select/insert/update RLS policies but no delete policy, so
-- every DELETE issued by saveLivePlanForProfile() (used whenever a
-- regenerated plan drops an item that no longer matches -- e.g. after a
-- risk-profile answer changes what's eligible) silently matched zero rows:
-- Postgres returns success for a DELETE whose WHERE clause (as seen through
-- RLS) matches nothing, so the app saw a clean 204 and never knew the row
-- was left behind. Real, confirmed symptom: hepatitis-c-screening stayed in
-- a profile's plan indefinitely after the risk flags that would exclude it
-- were already correctly "no", because the delete call to remove it was a
-- silent no-op.
drop policy if exists "plan_items_delete_owner_or_editor" on public.plan_items;
create policy "plan_items_delete_owner_or_editor"
on public.plan_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.plans p
    join public.profile_memberships membership on membership.profile_id = p.profile_id
    where p.id = plan_items.plan_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);
