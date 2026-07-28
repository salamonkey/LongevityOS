-- Adds a third plan_items.source value for items adopted from the "not
-- applicable" ghosted list on Vorsorge (see resolveNonApplicableCatalogItems
-- / adoptCatalogItemToSnapshot) -- a real catalog item the rules engine
-- excluded (wrong age/gender/risk-flag/guideline-country), but the user
-- explicitly chose to add anyway. Distinct from 'custom' (a freeform,
-- user-typed item with no catalog backing) since this one keeps its real
-- catalog copy (why_it_matters, recommendation_text, source_ref, etc.).
alter table public.plan_items
  drop constraint if exists plan_items_source_check;
alter table public.plan_items
  add constraint plan_items_source_check
  check (source in ('catalog', 'custom', 'manually-adopted'));
