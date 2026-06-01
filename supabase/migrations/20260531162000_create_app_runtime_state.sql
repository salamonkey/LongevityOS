create table if not exists public.app_runtime_state (
  state_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_runtime_state enable row level security;

drop policy if exists "app_runtime_state_select_all" on public.app_runtime_state;
create policy "app_runtime_state_select_all"
on public.app_runtime_state
for select
to anon, authenticated
using (true);

drop policy if exists "app_runtime_state_insert_all" on public.app_runtime_state;
create policy "app_runtime_state_insert_all"
on public.app_runtime_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_runtime_state_update_all" on public.app_runtime_state;
create policy "app_runtime_state_update_all"
on public.app_runtime_state
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.app_runtime_state to anon, authenticated;
