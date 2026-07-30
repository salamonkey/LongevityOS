-- Self-service "delete my account" support. The client only ever holds the
-- anon/authenticated key, so it cannot delete from auth.users directly (that
-- requires the service_role key or superuser privileges) -- this function is
-- SECURITY DEFINER so it runs with the privileges of its owner (postgres,
-- same pattern already used by rls_auto_enable in the initial remote schema)
-- while still only ever acting on the calling user's own auth.uid().
--
-- health_profiles.created_by is `references auth.users(id) on delete restrict`
-- (see create_live_profile_plan_entities), so the owned profiles must be
-- deleted explicitly, before auth.users, or the final delete would be
-- blocked by that constraint. Deleting a health_profiles row cascades to
-- plans -> plan_items, and to profile_memberships and appointments.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  delete from public.health_profiles where created_by = current_user_id;

  -- Defensive: no cross-account profile sharing exists yet (every
  -- profile_memberships row today is created alongside its health_profiles
  -- row by the same user, see createLiveEnrollmentAndPlan), but this keeps
  -- deletion correct if a membership ever outlives the profile it points to.
  delete from public.profile_memberships where user_id = current_user_id;

  delete from public.app_user_preferences where user_id = current_user_id;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
