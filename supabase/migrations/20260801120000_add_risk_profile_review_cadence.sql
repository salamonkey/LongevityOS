-- Adds cadence-based staleness tracking to the risk profile, per user
-- feedback: tobacco-style "shown to everyone regardless of relevance" bugs
-- are one problem, but the deeper issue is that risk factors are captured
-- once and never revisited. This lets a profile know when it's gone stale.
--
-- risk_profile_reviewed_at: stamped on every risk-profile save (final or
-- autosaved) -- distinct from risk_profile_reviewed_keys, which tracks WHICH
-- questions were ever answered, not WHEN. Null until the first save.
--
-- risk_profile_review_cadence_months: user-chosen reminder cadence (0 = "Nie",
-- i.e. disabled). Defaults to 12 months per product decision.
alter table public.health_profiles
  add column if not exists risk_profile_reviewed_at timestamptz,
  add column if not exists risk_profile_review_cadence_months integer not null default 12;

alter table public.health_profiles
  drop constraint if exists health_profiles_review_cadence_check;
alter table public.health_profiles
  add constraint health_profiles_review_cadence_check
  check (risk_profile_review_cadence_months in (0, 6, 12));

-- Backfill: profiles that already have reviewed_keys were reviewed at some
-- point before this column existed. updated_at is the best available proxy
-- for when that happened -- without this, every existing user would
-- instantly show as "never reviewed" / maximally overdue the moment this
-- ships, which is the opposite of what the feature is for.
update public.health_profiles
set risk_profile_reviewed_at = updated_at
where risk_profile_reviewed_at is null
  and risk_profile_reviewed_keys is not null
  and array_length(risk_profile_reviewed_keys, 1) > 0;
