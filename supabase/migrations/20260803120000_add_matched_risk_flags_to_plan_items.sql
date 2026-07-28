-- Records which risk flag(s) actually justified a risk-gated item's
-- inclusion in the plan, so the item detail page can explain "why is this
-- on my list" beyond age alone. Previously this match was computed in
-- plan.js purely as a yes/no gate and then discarded once satisfied --
-- nothing on the generated item recorded which flag did the work. Empty
-- array means the item is universal (no risk gate), same convention as the
-- catalog's own required_risk_flags columns.
alter table public.plan_items
  add column if not exists matched_risk_flags text[] not null default '{}'::text[];
