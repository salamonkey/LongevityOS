-- Appointments: real-world scheduled events, optionally tied to a plan item.
-- Unlinked appointments (e.g. "Physiotherapy") are a deliberate first-class
-- case -- see the Convert-to-plan-item migration that follows this one.
create table if not exists public.appointments (
  id bigint generated always as identity primary key,
  profile_id bigint not null references public.health_profiles(id) on delete cascade,
  plan_item_id bigint references public.plan_items(id) on delete set null,
  title text not null,
  scheduled_for timestamptz not null,
  provider text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_profile_id_idx on public.appointments(profile_id);
create index if not exists appointments_plan_item_id_idx on public.appointments(plan_item_id);

alter table public.appointments enable row level security;

drop policy if exists "appointments_select_member" on public.appointments;
create policy "appointments_select_member"
on public.appointments
for select
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = appointments.profile_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "appointments_insert_owner_or_editor" on public.appointments;
create policy "appointments_insert_owner_or_editor"
on public.appointments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = appointments.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);

drop policy if exists "appointments_update_owner_or_editor" on public.appointments;
create policy "appointments_update_owner_or_editor"
on public.appointments
for update
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = appointments.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = appointments.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);

drop policy if exists "appointments_delete_owner_or_editor" on public.appointments;
create policy "appointments_delete_owner_or_editor"
on public.appointments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = appointments.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);
