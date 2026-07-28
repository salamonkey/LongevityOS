-- One-time backfill for plan_items rows created before source_ref existed on
-- this table (see 20260730130000_add_source_ref_to_plan_items.sql). Normal
-- app usage never re-derives denormalized catalog fields for items that
-- already exist in a plan (see saveLivePlanForProfile in
-- supabaseLivePlans.js, which only writes the full denormalized row for
-- brand-new items and only touches status/completion fields on existing
-- ones) -- so without this, every plan generated before today would be
-- permanently missing the citation. This fills in the same value a fresh
-- plan generation would have produced, without touching anything already set.

update public.plan_items pi
set source_ref = rb.source_ref
from public.preventive_catalog_rule_bands rb
where pi.category in ('checkup', 'counseling')
  and pi.catalog_item_id = rb.item_id
  and rb.source_ref is not null
  and pi.source_ref is null;

-- Vaccination rows don't carry a matched-band id, so the closest reliable
-- link back to "which dose row generated this item" is the cadence_label
-- that was copied from it verbatim at generation time.
update public.plan_items pi
set source_ref = vd.source_ref
from public.preventive_catalog_vaccine_doses vd
where pi.category = 'vaccination'
  and pi.catalog_item_id = vd.item_id
  and pi.cadence_label = vd.cadence_label
  and vd.source_ref is not null
  and pi.source_ref is null;
