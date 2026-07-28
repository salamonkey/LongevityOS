alter table public.preventive_catalog_rule_bands
  add column if not exists source_ref text;

-- EviPrev 2023 (Unisanté) German recommendations table -- each item_id maps to
-- the exact row label as printed in that table, so the citation points to the
-- same single line for every age/risk band of that item (EviPrev's table has
-- no deeper section numbering, unlike the BAG vaccination schedule chapters).
-- annual-wellness-visit and anxiety-screening are deliberately left null:
-- the former isn't itself an EviPrev-listed screening/counseling topic, and
-- EviPrev 2023 has no row for anxiety screening at all (USPSTF-only).
update public.preventive_catalog_rule_bands set source_ref = 'Tabak' where item_id = 'tobacco-cessation-support';
update public.preventive_catalog_rule_bands set source_ref = 'Alkohol' where item_id = 'alcohol-use-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Illegale Drogen' where item_id = 'illicit-drug-use-counseling';
update public.preventive_catalog_rule_bands set source_ref = 'Bewegung' where item_id = 'physical-activity-counseling';
update public.preventive_catalog_rule_bands set source_ref = 'Ernährung' where item_id = 'nutrition-counseling';
update public.preventive_catalog_rule_bands set source_ref = 'Sexuelles Verhalten' where item_id = 'sexual-behavior-counseling';
update public.preventive_catalog_rule_bands set source_ref = 'Sonnenbestrahlung' where item_id = 'sun-exposure-counseling';
update public.preventive_catalog_rule_bands set source_ref = 'Zervix' where item_id = 'cervical-cancer-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Kolon und Rektum' where item_id = 'colorectal-cancer-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Brust' where item_id = 'breast-cancer-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Prostata' where item_id = 'prostate-health-discussion';
update public.preventive_catalog_rule_bands set source_ref = 'Lunge' where item_id = 'lung-cancer-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Arterielle Hypertonie' where item_id = 'blood-pressure-check';
update public.preventive_catalog_rule_bands set source_ref = 'Übergewicht' where item_id = 'weight-bmi-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Dyslipidämie' where item_id = 'cholesterol-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Diabetes' where item_id = 'diabetes-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Bauchaortenaneurysma' where item_id = 'abdominal-aortic-aneurysm-screening';
update public.preventive_catalog_rule_bands set source_ref = 'HIV' where item_id = 'hiv-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Syphilis' where item_id = 'syphilis-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Chlamydien und Gonorrhoe' where item_id = 'chlamydia-gonorrhea-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Hepatitis B und C' where item_id = 'hepatitis-b-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Hepatitis B und C' where item_id = 'hepatitis-c-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Depression' where item_id = 'depression-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Häusliche Gewalt' where item_id = 'domestic-violence-screening';
update public.preventive_catalog_rule_bands set source_ref = 'Osteoporose' where item_id = 'osteoporosis-screening';
