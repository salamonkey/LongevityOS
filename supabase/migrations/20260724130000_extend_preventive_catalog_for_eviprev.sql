alter table public.preventive_catalog_items
  drop constraint if exists preventive_catalog_items_category_check;
alter table public.preventive_catalog_items
  add constraint preventive_catalog_items_category_check
  check (category in ('checkup', 'vaccination', 'counseling'));

alter table public.preventive_catalog_items
  add column if not exists recommendation_text text;

alter table public.preventive_catalog_rule_bands
  add column if not exists cadence_label text,
  add column if not exists recurrence_interval_days integer,
  add column if not exists recurrence_soon_window_days integer,
  add column if not exists required_risk_flags text[],
  add column if not exists evidence_tier text,
  add column if not exists uspstf_grade text,
  add column if not exists requires_shared_decision boolean not null default false;

alter table public.preventive_catalog_rule_bands
  drop constraint if exists preventive_catalog_rule_bands_evidence_tier_check;
alter table public.preventive_catalog_rule_bands
  add constraint preventive_catalog_rule_bands_evidence_tier_check
  check (evidence_tier is null or evidence_tier in ('strong', 'moderate', 'conditional'));

alter table public.plan_items
  drop constraint if exists plan_items_category_check;
alter table public.plan_items
  add constraint plan_items_category_check
  check (category in ('checkup', 'vaccination', 'counseling'));

alter table public.health_profiles
  add column if not exists risk_flags text[] not null default '{}'::text[];
