create table if not exists public.health_profiles (
  id bigint generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  birthdate date not null,
  gender text not null check (gender in ('female', 'male')),
  height_cm numeric(6, 2) not null check (height_cm > 0 and height_cm < 300),
  weight_kg numeric(6, 2) not null check (weight_kg > 0 and weight_kg < 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_memberships (
  id bigint generated always as identity primary key,
  profile_id bigint not null references public.health_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (profile_id, user_id)
);

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  profile_id bigint not null unique references public.health_profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_items (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.plans(id) on delete cascade,
  catalog_item_id text not null,
  name text not null,
  category text not null check (category in ('checkup', 'vaccination')),
  intervention_type text not null,
  intervention_type_label text not null,
  effort_level text not null,
  cadence_label text not null,
  why_it_matters text not null,
  recurrence_interval_days integer,
  recurrence_soon_window_days integer,
  target_age integer,
  priority_order integer,
  initial_due_date timestamptz,
  next_due_date timestamptz,
  initial_bucket text check (initial_bucket in ('today', 'soon', 'later')),
  status text not null check (status in ('due', 'soon', 'pending', 'planned', 'done')),
  completed_on date,
  reminder_timing_type text,
  reminder_scheduled_for date,
  reminder_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, catalog_item_id)
);

create index if not exists profile_memberships_user_id_idx on public.profile_memberships(user_id);
create index if not exists plans_profile_id_idx on public.plans(profile_id);
create index if not exists plan_items_plan_id_idx on public.plan_items(plan_id);
create index if not exists plan_items_catalog_item_id_idx on public.plan_items(catalog_item_id);

create table if not exists public.app_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_profile_id bigint references public.health_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.health_profiles enable row level security;
alter table public.profile_memberships enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.app_user_preferences enable row level security;

drop policy if exists "health_profiles_select_member" on public.health_profiles;
create policy "health_profiles_select_member"
on public.health_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = health_profiles.id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "health_profiles_insert_owner" on public.health_profiles;
create policy "health_profiles_insert_owner"
on public.health_profiles
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "health_profiles_update_member" on public.health_profiles;
create policy "health_profiles_update_member"
on public.health_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = health_profiles.id
      and membership.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = health_profiles.id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "profile_memberships_select_related" on public.profile_memberships;
create policy "profile_memberships_select_related"
on public.profile_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profile_memberships owner_membership
    where owner_membership.profile_id = profile_memberships.profile_id
      and owner_membership.user_id = auth.uid()
      and owner_membership.role = 'owner'
  )
);

drop policy if exists "profile_memberships_insert_owner_or_self" on public.profile_memberships;
create policy "profile_memberships_insert_owner_or_self"
on public.profile_memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profile_memberships owner_membership
    where owner_membership.profile_id = profile_memberships.profile_id
      and owner_membership.user_id = auth.uid()
      and owner_membership.role = 'owner'
  )
);

drop policy if exists "profile_memberships_update_owner" on public.profile_memberships;
create policy "profile_memberships_update_owner"
on public.profile_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships owner_membership
    where owner_membership.profile_id = profile_memberships.profile_id
      and owner_membership.user_id = auth.uid()
      and owner_membership.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profile_memberships owner_membership
    where owner_membership.profile_id = profile_memberships.profile_id
      and owner_membership.user_id = auth.uid()
      and owner_membership.role = 'owner'
  )
);

drop policy if exists "plans_select_member" on public.plans;
create policy "plans_select_member"
on public.plans
for select
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = plans.profile_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "plans_insert_owner_or_editor" on public.plans;
create policy "plans_insert_owner_or_editor"
on public.plans
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = plans.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);

drop policy if exists "plans_update_owner_or_editor" on public.plans;
create policy "plans_update_owner_or_editor"
on public.plans
for update
to authenticated
using (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = plans.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.profile_memberships membership
    where membership.profile_id = plans.profile_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);

drop policy if exists "plan_items_select_member" on public.plan_items;
create policy "plan_items_select_member"
on public.plan_items
for select
to authenticated
using (
  exists (
    select 1
    from public.plans p
    join public.profile_memberships membership on membership.profile_id = p.profile_id
    where p.id = plan_items.plan_id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists "plan_items_insert_owner_or_editor" on public.plan_items;
create policy "plan_items_insert_owner_or_editor"
on public.plan_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.plans p
    join public.profile_memberships membership on membership.profile_id = p.profile_id
    where p.id = plan_items.plan_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);

drop policy if exists "plan_items_update_owner_or_editor" on public.plan_items;
create policy "plan_items_update_owner_or_editor"
on public.plan_items
for update
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
)
with check (
  exists (
    select 1
    from public.plans p
    join public.profile_memberships membership on membership.profile_id = p.profile_id
    where p.id = plan_items.plan_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'editor')
  )
);

drop policy if exists "app_user_preferences_select_own" on public.app_user_preferences;
create policy "app_user_preferences_select_own"
on public.app_user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "app_user_preferences_insert_own" on public.app_user_preferences;
create policy "app_user_preferences_insert_own"
on public.app_user_preferences
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    active_profile_id is null
    or exists (
      select 1
      from public.profile_memberships membership
      where membership.profile_id = active_profile_id
        and membership.user_id = auth.uid()
    )
  )
);

drop policy if exists "app_user_preferences_update_own" on public.app_user_preferences;
create policy "app_user_preferences_update_own"
on public.app_user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    active_profile_id is null
    or exists (
      select 1
      from public.profile_memberships membership
      where membership.profile_id = active_profile_id
        and membership.user_id = auth.uid()
    )
  )
);

grant select, insert, update, delete on public.health_profiles to authenticated;
grant select, insert, update, delete on public.profile_memberships to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.plan_items to authenticated;
grant select, insert, update, delete on public.app_user_preferences to authenticated;
