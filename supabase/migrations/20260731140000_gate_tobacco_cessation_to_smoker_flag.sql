-- tobacco-cessation-support's own recommendation text is conditional ("If
-- you smoke or vape, talk with your clinician...") but the item had no risk
-- gate at all, so it showed to every adult regardless of smoking status --
-- confusing/irrelevant advice for a confirmed non-smoker. Every other
-- counseling item either has neutral, universally-relevant copy (alcohol,
-- nutrition, activity, sun) or is already correctly gated when its copy is
-- conditional (sexual-behavior-counseling -> sti_risk_behavior). This
-- brings tobacco in line with that second pattern, using the
-- already-collected smoker_current_or_former risk-profile flag.
update public.preventive_catalog_items
set required_risk_flags = array['smoker_current_or_former']
where item_id = 'tobacco-cessation-support';
