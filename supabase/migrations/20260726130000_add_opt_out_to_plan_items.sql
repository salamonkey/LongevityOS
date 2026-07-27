-- Lets a plan item be consciously opted out of (for a season, a year, or
-- forever) instead of only ever due/planned/done. opt_out_until is null for
-- a permanent opt-out and a concrete date for a timed one; the item's live
-- status naturally lapses back to normal once that date passes, so no
-- cleanup job is needed.
alter table public.plan_items
  add column if not exists opt_out_preset text,
  add column if not exists opt_out_until date,
  add column if not exists opt_out_decided_on date;

alter table public.plan_items
  drop constraint if exists plan_items_status_check;
alter table public.plan_items
  add constraint plan_items_status_check
  check (status in ('due', 'soon', 'pending', 'planned', 'done', 'opted_out'));

alter table public.plan_items
  drop constraint if exists plan_items_opt_out_preset_check;
alter table public.plan_items
  add constraint plan_items_opt_out_preset_check
  check (opt_out_preset is null or opt_out_preset in ('one_season', 'two_seasons', 'one_year', 'forever'));
