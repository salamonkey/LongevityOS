-- risk_flags only ever records which risk-profile questions were answered
-- "yes" -- there was no way to distinguish "explicitly answered no" from
-- "never looked at this question", so reopening the risk-profile wizard
-- after a session where every answer happened to be "no" would forget all
-- of it and reset progress to 0%. This column tracks every question the
-- user has given ANY explicit answer to (yes or no); risk_flags remains
-- exactly "the yes subset" and continues to drive plan generation
-- unchanged. On restore: a value present in risk_flags is "yes", present
-- here but not in risk_flags is "no", absent from both is still unanswered.
alter table public.health_profiles
  add column if not exists risk_profile_reviewed_keys text[] not null default '{}'::text[];
