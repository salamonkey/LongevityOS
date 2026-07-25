-- Vaccination-specific replacement for what preventive_catalog_rule_bands does for
-- checkup/counseling items. A single preventive_catalog_rule_bands row (age range +
-- one cadence) can't express a dose series (e.g. DTP: 3 infant doses + boosters at
-- 4-7y, 11-15y, 25y, 45y, 65y, then every 10y) or the population split a vaccine like
-- Pneumococcal needs (general >=65 vs. a dozen distinct risk conditions). This table
-- adds dose-sequence and month-precision age fields; ages are in months (not years) so
-- infant dosing at 2/4/9/12/15/18 months is representable. See the BAG Impfplan
-- reconciliation plan for the full item inventory this powers.

create table if not exists public.preventive_catalog_vaccine_doses (
  id bigint generated always as identity primary key,
  item_id text not null references public.preventive_catalog_items(item_id) on delete cascade,
  gender text not null check (gender in ('female', 'male', 'both')),
  age_min_months integer not null check (age_min_months >= 0),
  age_max_months integer not null check (age_max_months >= age_min_months),
  target_age_months integer not null check (target_age_months >= 0),
  priority_order integer not null check (priority_order >= 1),
  dose_number integer check (dose_number >= 1),
  doses_in_series integer check (doses_in_series >= 1),
  min_interval_from_previous_dose_days integer check (min_interval_from_previous_dose_days >= 0),
  recurrence_interval_days integer check (recurrence_interval_days > 0),
  cadence_label text not null,
  population_type text not null check (population_type in ('general', 'risk_condition', 'exposure_group', 'pregnancy')),
  required_risk_flags text[] not null default '{}'::text[],
  source_ref text not null,
  evidence_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists preventive_catalog_vaccine_doses_item_id_idx
  on public.preventive_catalog_vaccine_doses(item_id);

alter table public.preventive_catalog_vaccine_doses enable row level security;

drop policy if exists "preventive_catalog_vaccine_doses_select_all" on public.preventive_catalog_vaccine_doses;
create policy "preventive_catalog_vaccine_doses_select_all"
on public.preventive_catalog_vaccine_doses
for select
to anon, authenticated
using (true);

grant select on public.preventive_catalog_vaccine_doses to anon, authenticated;
