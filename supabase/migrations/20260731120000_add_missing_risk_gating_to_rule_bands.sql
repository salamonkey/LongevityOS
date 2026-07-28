-- Full audit of the risk-flag <-> item correlation the user reported as
-- "off" (tobacco card shown to a non-smoker). Two distinct findings:
--
-- 1. Tobacco/alcohol/annual-visit/etc. are CORRECTLY universal (that's the
--    real USPSTF/EviPrev recommendation -- "screening" means asking
--    everyone, not just people who already use tobacco). Not touched here.
--
-- 2. AAA and lung-cancer screening were already properly gated to
--    smoker_current_or_former via preventive_catalog_items.required_risk_flags
--    (the item-level fallback hasRequiredRiskFlags() uses when a rule band's
--    own required_risk_flags is empty) -- also not touched.
--
-- 3. Real bugs found and fixed here:
--    - hiv-screening was gated to the "hiv" personal-risk-factor flag at the
--      item level, so the USPSTF Grade A *universal* 18-65 recommendation
--      was hidden from nearly everyone instead of shown to everyone in that
--      age range. Cleared -- this is the highest-impact fix, since it means
--      most users were never being shown a Grade A universal screening.
--    - hepatitis-b-screening, hepatitis-c-screening and syphilis-screening
--      were either ungated (hep C) or gated to only a single risk flag (hep
--      B: high-prevalence-region only; syphilis: sti_risk_behavior only)
--      when the real risk groups (per EviPrev/CDC) are broader. Expanded to
--      one row per qualifying flag each, same OR-across-rows pattern already
--      used by the vaccine dose tables.

update public.preventive_catalog_items
set required_risk_flags = '{}'::text[]
where item_id = 'hiv-screening';

-- rule_bands (unlike vaccine_doses) was created with a unique constraint on
-- (item_id, gender, min_age, max_age, target_age, priority_order), which
-- blocks exactly the "same age range, different risk flag" pattern needed
-- below -- drop it here rather than fake-differentiating priority_order per
-- flag, since these rows are OR-equivalent alternatives, not a real
-- priority ordering (matching how the vaccine table already has no such
-- constraint).
do $$
declare
  found_constraint text;
begin
  select con.conname into found_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'preventive_catalog_rule_bands'
    and con.contype = 'u';

  if found_constraint is not null then
    execute format('alter table public.preventive_catalog_rule_bands drop constraint %I', found_constraint);
  end if;
end $$;

delete from public.preventive_catalog_rule_bands where item_id = 'hepatitis-b-screening';
insert into public.preventive_catalog_rule_bands
  (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label,
   recurrence_interval_days, recurrence_soon_window_days, required_risk_flags,
   evidence_tier, uspstf_grade, requires_shared_decision, source_ref)
select 'hepatitis-b-screening', gender, 18, 75, 18, 4, 'Repeat based on ongoing risk',
       null, null, array[flag], 'moderate', 'B', false, 'Hepatitis B und C'
from unnest(array['female', 'male']) as gender
cross join unnest(array[
  'born_or_family_in_high_prevalence_region',
  'injection_drug_use',
  'msm',
  'hiv',
  'chronic_kidney_dialysis'
]) as flag;

delete from public.preventive_catalog_rule_bands where item_id = 'hepatitis-c-screening';
insert into public.preventive_catalog_rule_bands
  (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label,
   recurrence_interval_days, recurrence_soon_window_days, required_risk_flags,
   evidence_tier, uspstf_grade, requires_shared_decision, source_ref)
select 'hepatitis-c-screening', gender, 18, 75, 18, 4, 'Once, then based on risk factors',
       null, null, array[flag], 'moderate', 'B', false, 'Hepatitis B und C'
from unnest(array['female', 'male']) as gender
cross join unnest(array[
  'injection_drug_use',
  'hiv',
  'chronic_kidney_dialysis',
  'incarcerated_or_correctional_staff'
]) as flag;

delete from public.preventive_catalog_rule_bands where item_id = 'syphilis-screening';
insert into public.preventive_catalog_rule_bands
  (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label,
   recurrence_interval_days, recurrence_soon_window_days, required_risk_flags,
   evidence_tier, uspstf_grade, requires_shared_decision, source_ref)
select 'syphilis-screening', gender, 18, 75, 18, 4, 'Repeat based on ongoing risk',
       null, null, array[flag], 'strong', 'A', false, 'Syphilis'
from unnest(array['female', 'male']) as gender
cross join unnest(array[
  'sti_risk_behavior',
  'msm',
  'hiv',
  'injection_drug_use',
  'incarcerated_or_correctional_staff'
]) as flag;
