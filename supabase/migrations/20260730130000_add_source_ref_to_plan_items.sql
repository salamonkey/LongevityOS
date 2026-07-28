-- plan_items denormalizes catalog metadata at generation time (see toPlanItemRow
-- in supabaseLivePlans.js). It already carries evidence_tier/uspstf_grade (see
-- 20260724150000_add_eviprev_metadata_to_plan_items.sql) but source_ref was
-- missed, so the BAG/EviPrev citation was silently dropped on the
-- write-then-reload round trip through Supabase for every category, not just
-- checkups/counseling -- it only ever showed up for an item viewed in the
-- same in-memory session it was generated in, before any reload.

alter table public.plan_items
  add column if not exists source_ref text;
