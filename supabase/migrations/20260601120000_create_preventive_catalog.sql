create table if not exists public.preventive_catalog_items (
  item_id text primary key,
  name text not null,
  category text not null check (category in ('checkup', 'vaccination')),
  effort_level text not null check (effort_level in ('low', 'medium', 'high')),
  cadence_label text not null,
  why_it_matters text not null,
  required_risk_flags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preventive_catalog_rule_bands (
  id bigint generated always as identity primary key,
  item_id text not null references public.preventive_catalog_items(item_id) on delete cascade,
  gender text not null check (gender in ('female', 'male')),
  min_age integer not null check (min_age >= 0),
  max_age integer not null check (max_age >= min_age),
  target_age integer not null check (target_age >= 0),
  priority_order integer not null check (priority_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, gender, min_age, max_age, target_age, priority_order)
);

create index if not exists preventive_catalog_rule_bands_item_id_idx
  on public.preventive_catalog_rule_bands(item_id);

alter table public.preventive_catalog_items enable row level security;
alter table public.preventive_catalog_rule_bands enable row level security;

drop policy if exists "preventive_catalog_items_select_all" on public.preventive_catalog_items;
create policy "preventive_catalog_items_select_all"
on public.preventive_catalog_items
for select
to anon, authenticated
using (true);

drop policy if exists "preventive_catalog_rule_bands_select_all" on public.preventive_catalog_rule_bands;
create policy "preventive_catalog_rule_bands_select_all"
on public.preventive_catalog_rule_bands
for select
to anon, authenticated
using (true);

grant select on public.preventive_catalog_items to anon, authenticated;
grant select on public.preventive_catalog_rule_bands to anon, authenticated;
