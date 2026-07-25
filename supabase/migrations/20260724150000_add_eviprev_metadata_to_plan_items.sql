-- plan_items denormalizes catalog metadata at generation time (see toPlanItemRow
-- in supabaseLivePlans.js); it was missing the new EviPrev-era fields added to
-- preventive_catalog_items/preventive_catalog_rule_bands, so recommendation
-- copy and the shared-decision-making flag were silently dropped on the
-- write-then-reload round trip through Supabase.

alter table public.plan_items
  add column if not exists recommendation_text text,
  add column if not exists evidence_tier text,
  add column if not exists uspstf_grade text,
  add column if not exists requires_shared_decision boolean not null default false;

alter table public.plan_items
  drop constraint if exists plan_items_evidence_tier_check;
alter table public.plan_items
  add constraint plan_items_evidence_tier_check
  check (evidence_tier is null or evidence_tier in ('strong', 'moderate', 'conditional'));
