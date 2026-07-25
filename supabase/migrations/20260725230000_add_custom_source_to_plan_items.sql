-- Lets a plan item be user-authored ("custom") rather than only ever
-- generated from the locked catalog -- the first case is converting an
-- unlinked appointment (e.g. "Physiotherapie") into an ongoing plan item.
-- why_it_matters becomes nullable: a custom item has no catalog-authored
-- clinical rationale, and fabricating one would be dishonest; the app lets
-- the user leave an optional personal note in its place instead.
alter table public.plan_items
  add column if not exists source text not null default 'catalog',
  add column if not exists clinical_region text;

alter table public.plan_items
  drop constraint if exists plan_items_source_check;
alter table public.plan_items
  add constraint plan_items_source_check
  check (source in ('catalog', 'custom'));

alter table public.plan_items
  alter column why_it_matters drop not null;
