-- Replaces the entire vaccination catalog (previously seeded under the generic
-- "sl001-mvp-v2-expanded-30" tag, never reconciled against a source document) with
-- content modeled directly on "Schweizerischer Impfplan 2026" (BAG/EKIF, Stand Februar
-- 2026). See the BAG Impfplan reconciliation plan for the full extraction this
-- migration implements: general-population basic/complementary schedule (Kapitel 1,
-- Tabelle 1), risk-condition indications (Kapitel 3.2.a, Tabelle 5), exposure/
-- transmission-risk indications (Kapitel 3.1, 3.3, Tabelle 8), and pregnancy-specific
-- indications (Kapitel 3.2.b). Catch-up decision trees (Tabellen 2-4, 9), injury-
-- triggered tetanus prophylaxis (Tabelle 10), and Mpox (published separately, not in
-- this document) are deliberately out of scope -- see the plan for why.
--
-- All ages in preventive_catalog_vaccine_doses are in months.

-- === Delete the 13 legacy vaccination items (cascades old rule_bands + translations) ===

delete from public.preventive_catalog_items where item_id in (
  'influenza-vaccine', 'tdap-booster', 'shingles-vaccine', 'covid-19-booster',
  'hepatitis-b-vaccine', 'pneumococcal-vaccine', 'rsv-vaccine', 'hpv-vaccine',
  'mmr-vaccine', 'varicella-vaccine', 'hepatitis-a-vaccine', 'meningococcal-vaccine',
  'polio-vaccine'
);

-- === Items ===

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('tdap-booster', 'Diphtheria, tetanus, and pertussis vaccine', 'vaccination', 'low', 'Infant series, then boosters through adulthood', 'Protects against diphtheria, tetanus, and whooping cough, and can pass protection to a newborn when given during pregnancy.', 'Complete the infant series, then boost at 4-7, 11-15, 25, 45, and 65 years, and every 10 years after 65.', ARRAY[]::text[]),
  ('polio-vaccine', 'Polio vaccine', 'vaccination', 'low', 'Infant series, then boosters through age 15', 'Protects against poliomyelitis, a disease still circulating in some parts of the world.', 'Complete the infant IPV series and the follow-up boosters at 4-7 and 11-15 years.', ARRAY[]::text[]),
  ('hepatitis-b-vaccine', 'Hepatitis B vaccine', 'vaccination', 'medium', 'Infant series, or adult series if risk-based', 'Protects against hepatitis B infection and the long-term liver damage it can cause.', 'Complete the infant series, or a 3-dose adult series if indicated by risk, exposure, or occupation.', ARRAY[]::text[]),
  ('hib-vaccine', 'Haemophilus influenzae type b vaccine', 'vaccination', 'low', 'Infant series', 'Protects infants against severe Hib infections such as meningitis.', 'Complete the 3-dose Hib series in infancy.', ARRAY[]::text[]),
  ('rotavirus-vaccine', 'Rotavirus vaccine', 'vaccination', 'low', '2-dose oral series in infancy', 'Reduces the risk of severe rotavirus gastroenteritis in infants.', 'Give the 2-dose oral rotavirus series at 2 and 4 months.', ARRAY[]::text[]),
  ('mmr-vaccine', 'MMR vaccine', 'vaccination', 'medium', 'Infant series, catch-up if born after 1963', 'Protects against measles, mumps, and rubella outbreaks.', 'Complete the 2-dose infant series; if you were born after 1963 without documented immunity, catch up as an adult.', ARRAY[]::text[]),
  ('varicella-vaccine', 'Varicella vaccine', 'vaccination', 'high', 'Infant series; catch-up under 40 if not immune', 'Reduces the risk of chickenpox and its complications.', 'Complete the 2-dose infant series, or catch up before age 40 if you are not immune.', ARRAY[]::text[]),
  ('hpv-vaccine', 'HPV vaccine', 'vaccination', 'high', '2- or 3-dose series, ages 11-26', 'Lowers the risk of several HPV-associated cancers and genital warts.', 'Complete the 2-dose series at ages 11-14, or a 3-dose series if starting later, up to age 26.', ARRAY[]::text[]),
  ('meningococcal-b-vaccine', 'Meningococcal B vaccine', 'vaccination', 'medium', 'Infant/adolescent series, or risk-based', 'Protects against serogroup B meningococcal disease, the leading cause of invasive meningococcal disease in young children.', 'Complete the infant or adolescent 4CMenB series, or a risk-based series if indicated.', ARRAY[]::text[]),
  ('meningococcal-acwy-vaccine', 'Meningococcal ACWY vaccine', 'vaccination', 'low', 'Adolescent dose, or risk-based', 'Protects against serogroups A, C, W, and Y meningococcal disease.', 'Get one dose of MCV-ACWY in adolescence, or a risk-based series if indicated.', ARRAY[]::text[]),
  ('shingles-vaccine', 'Shingles vaccine', 'vaccination', 'high', '2-dose series from 50 or 65', 'Reduces the risk of shingles and long-lasting nerve pain.', 'Complete the 2-dose Shingrix series from age 65, or earlier (from 50 or 18) if you have an elevated immune risk.', ARRAY[]::text[]),
  ('pneumococcal-vaccine', 'Pneumococcal vaccine', 'vaccination', 'medium', 'Infant series, or adults 65+/risk-based', 'Helps prevent serious pneumonia and bloodstream infections.', 'Complete the infant series, or a single adult dose from 65, or earlier if you have a qualifying chronic condition.', ARRAY[]::text[]),
  ('influenza-vaccine', 'Flu vaccine', 'vaccination', 'low', 'Yearly from 65, or any age if risk-based', 'Lowers the risk of severe seasonal flu complications.', 'Get a yearly flu shot from age 65 (high-dose from 75), or at any age if you are pregnant, a healthcare worker, or have a qualifying chronic condition.', ARRAY[]::text[]),
  ('covid-19-booster', 'COVID-19 booster', 'vaccination', 'low', 'Yearly, risk-based', 'Lowers the risk of severe COVID-19 in higher-risk groups.', 'Get a yearly COVID-19 booster if you have a qualifying chronic condition, are pregnant, or have Trisomy 21.', ARRAY[]::text[]),
  ('rsv-vaccine', 'RSV vaccine (adults)', 'vaccination', 'low', 'Single dose, 60-74 risk-based or 75+', 'Can reduce the risk of severe lower respiratory RSV infection in older adults.', 'Get a single RSV dose from age 75, or from 60 if you have a qualifying chronic condition.', ARRAY[]::text[]),
  ('rsv-infant-immunization', 'RSV immunization for newborns and infants', 'vaccination', 'low', 'Maternal dose or infant antibody dose', 'Protects newborns and infants against severe RSV illness and hospitalization in their first RSV season.', 'Get the maternal RSV vaccine in late pregnancy (Oct-Mar due dates), or have your infant receive a single monoclonal-antibody dose if maternal immunization was not given.', ARRAY[]::text[]),
  ('hepatitis-a-vaccine', 'Hepatitis A vaccine', 'vaccination', 'medium', 'Risk-based 2-dose series', 'Helps prevent acute hepatitis A liver infection, especially in higher-risk situations.', 'Complete the 2-dose series if indicated by travel, chronic liver disease, occupation, or other risk factors.', ARRAY[]::text[]),
  ('fsme-vaccine', 'Tick-borne encephalitis (FSME) vaccine', 'vaccination', 'high', '3-dose series, then boosters every 10 years', 'Protects against tick-borne encephalitis, which is present through most of Switzerland.', 'Complete the 3-dose series if you live in or visit a risk area, then boost every 10 years.', ARRAY[]::text[]),
  ('rabies-vaccine', 'Rabies vaccine (pre-exposure)', 'vaccination', 'medium', 'Risk-based 2-dose series', 'Reduces the risk of rabies for people with regular animal or bat exposure.', 'Complete a 2-dose pre-exposure series if your occupation or hobbies involve regular contact with animals, bats, or rabies specimens.', ARRAY[]::text[]),
  ('tuberculosis-bcg-vaccine', 'Tuberculosis (BCG) vaccine', 'vaccination', 'low', 'Single infant dose, risk-based', 'Reduces the risk of disseminated tuberculosis in infants at elevated exposure risk.', 'Give a single BCG dose in the first year of life if your infant is at elevated risk of tuberculosis exposure.', ARRAY[]::text[])
on conflict (item_id) do update set
  name = excluded.name, category = excluded.category, effort_level = excluded.effort_level,
  cadence_label = excluded.cadence_label, why_it_matters = excluded.why_it_matters,
  recommendation_text = excluded.recommendation_text, required_risk_flags = excluded.required_risk_flags,
  updated_at = now();

-- === Dose bands ===
-- population_type: general | risk_condition | exposure_group | pregnancy
-- Risk-flag rows use single-flag bands (OR semantics across bands, AND within a band's
-- required_risk_flags array) -- the same pattern the EviPrev migration used for
-- chlamydia-gonorrhea-screening's age-gated vs. risk-gated bands.

-- tdap-booster (Kapitel 1.1b/c/d, 1.2a, 1.3a, 1.4a, 1.5a, 2.1, 3.1g, 3.2.b, 3.3.b)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('tdap-booster', 'both', 2, 2, 2, 1, 1, 3, null, null, 'Dose 1 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1b/c/d', null),
  ('tdap-booster', 'both', 4, 4, 4, 1, 2, 3, 60, null, 'Dose 2 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1b/c/d', null),
  ('tdap-booster', 'both', 12, 12, 12, 1, 3, 3, 240, null, 'Dose 3 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1b/c/d', null),
  ('tdap-booster', 'both', 48, 95, 48, 1, 4, null, null, null, 'Booster (4-7 years)', 'general', ARRAY[]::text[], 'Kapitel 1.2a', null),
  ('tdap-booster', 'both', 132, 191, 132, 1, 5, null, null, null, 'Booster (11-15 years)', 'general', ARRAY[]::text[], 'Kapitel 1.3a', null),
  ('tdap-booster', 'both', 300, 300, 300, 1, 6, null, null, null, 'Booster (25 years)', 'general', ARRAY[]::text[], 'Kapitel 1.4a', null),
  ('tdap-booster', 'both', 540, 540, 540, 1, 7, null, null, null, 'Booster (45 years)', 'general', ARRAY[]::text[], 'Kapitel 1.4a', null),
  ('tdap-booster', 'both', 780, 780, 780, 1, 8, null, null, null, 'Booster (65 years)', 'general', ARRAY[]::text[], 'Kapitel 1.5a', null),
  ('tdap-booster', 'both', 781, 1440, 792, 1, null, null, null, 3650, 'Every 10 years after 65', 'general', ARRAY[]::text[], 'Kapitel 1.5a', null),
  ('tdap-booster', 'female', 216, 600, 216, 1, null, null, null, null, 'Once per pregnancy (2nd or 3rd trimester)', 'pregnancy', ARRAY['pregnant']::text[], 'Kapitel 3.1g/3.2.b', 'Passive protection for the newborn; recommended every pregnancy regardless of prior dose timing.'),
  ('tdap-booster', 'both', 216, 1440, 216, 2, null, null, null, 3650, 'Every 10 years, healthcare workers', 'exposure_group', ARRAY['healthcare_worker']::text[], 'Kapitel 3.3.b/Tabelle 9', null),
  ('tdap-booster', 'both', 216, 1440, 216, 2, null, null, null, 3650, 'Every 10 years if in regular contact with infants under 6 months', 'exposure_group', ARRAY['close_contact_infant_under_6mo']::text[], 'Kapitel 3.1g', null);

-- polio-vaccine (Kapitel 1.1d, 1.2a, 1.3a, 3.3.b)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('polio-vaccine', 'both', 2, 2, 2, 1, 1, 3, null, null, 'Dose 1 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1d', null),
  ('polio-vaccine', 'both', 4, 4, 4, 1, 2, 3, 60, null, 'Dose 2 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1d', null),
  ('polio-vaccine', 'both', 12, 12, 12, 1, 3, 3, 240, null, 'Dose 3 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1d', null),
  ('polio-vaccine', 'both', 48, 95, 48, 1, 4, null, null, null, 'Booster (4-7 years)', 'general', ARRAY[]::text[], 'Kapitel 1.2a', null),
  ('polio-vaccine', 'both', 132, 191, 132, 1, 5, null, null, null, 'Booster (11-15 years)', 'general', ARRAY[]::text[], 'Kapitel 1.3a', 'No further population-wide boosters are recommended after this unless there is ongoing exposure risk.'),
  ('polio-vaccine', 'both', 216, 1440, 216, 2, null, null, null, 3650, 'Every 10 years, polio laboratory workers', 'exposure_group', ARRAY['lab_personnel_pathogen_exposure']::text[], 'Kapitel 3.3.b/Tabelle 8', null);

-- hepatitis-b-vaccine (Kapitel 1.1f, 1.3b, 3.1c, 3.3.b)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('hepatitis-b-vaccine', 'both', 2, 2, 2, 1, 1, 3, null, null, 'Dose 1 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1f', null),
  ('hepatitis-b-vaccine', 'both', 4, 4, 4, 1, 2, 3, 60, null, 'Dose 2 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1f', null),
  ('hepatitis-b-vaccine', 'both', 12, 12, 12, 1, 3, 3, 240, null, 'Dose 3 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1f', null),
  ('hepatitis-b-vaccine', 'both', 132, 191, 132, 2, null, 2, null, null, '2-dose catch-up series (11-15 years) if not vaccinated in infancy', 'general', ARRAY[]::text[], 'Kapitel 1.3b', null),
  ('hepatitis-b-vaccine', 'both', 216, 1440, 216, 3, null, 3, null, null, '3-dose series if indicated by risk', 'risk_condition', ARRAY['chronic_liver_disease']::text[], 'Kapitel 3.1c/Tabelle 5', null),
  ('hepatitis-b-vaccine', 'both', 216, 1440, 216, 3, null, 3, null, null, '3-dose series if indicated by risk', 'exposure_group', ARRAY['msm']::text[], 'Kapitel 3.1c/Tabelle 8', null),
  ('hepatitis-b-vaccine', 'both', 216, 1440, 216, 3, null, 3, null, null, '3-dose series if indicated by risk', 'exposure_group', ARRAY['injection_drug_use']::text[], 'Kapitel 3.1c/Tabelle 8', null),
  ('hepatitis-b-vaccine', 'both', 216, 1440, 216, 3, null, 3, null, null, '3-dose series if indicated by risk', 'exposure_group', ARRAY['high_endemicity_hepb_origin_or_travel']::text[], 'Kapitel 3.1c/Tabelle 8', null),
  ('hepatitis-b-vaccine', 'both', 216, 1440, 216, 3, null, 3, null, null, '3-dose series, healthcare workers', 'exposure_group', ARRAY['healthcare_worker']::text[], 'Kapitel 3.3.b', null),
  ('hepatitis-b-vaccine', 'both', 216, 1440, 216, 3, null, 3, null, null, '3-dose series if you receive dialysis', 'risk_condition', ARRAY['chronic_kidney_dialysis']::text[], 'Kapitel 3.1c/Tabelle 8', null);

-- hib-vaccine (Kapitel 1.1e)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('hib-vaccine', 'both', 2, 2, 2, 1, 1, 3, null, null, 'Dose 1 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1e', null),
  ('hib-vaccine', 'both', 4, 4, 4, 1, 2, 3, 60, null, 'Dose 2 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1e', null),
  ('hib-vaccine', 'both', 12, 12, 12, 1, 3, 3, 240, null, 'Dose 3 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1e', 'Catch-up is recommended up to the 5th birthday.');

-- rotavirus-vaccine (Kapitel 1.1h)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('rotavirus-vaccine', 'both', 2, 2, 2, 1, 1, 2, null, null, 'Dose 1 of 2 (oral)', 'general', ARRAY[]::text[], 'Kapitel 1.1h', null),
  ('rotavirus-vaccine', 'both', 4, 4, 4, 1, 2, 2, 28, null, 'Dose 2 of 2 (oral)', 'general', ARRAY[]::text[], 'Kapitel 1.1h', 'Not given after 24 months.');

-- mmr-vaccine (Kapitel 1.1k, 2.1, 3.2.b, 3.3.b)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('mmr-vaccine', 'both', 9, 9, 9, 1, 1, 2, null, null, 'Dose 1 of 2 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1k', null),
  ('mmr-vaccine', 'both', 12, 12, 12, 1, 2, 2, 90, null, 'Dose 2 of 2 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1k', null),
  ('mmr-vaccine', 'both', 216, 1440, 216, 2, null, 2, null, null, '2-dose catch-up if born after 1963 without documented immunity', 'general', ARRAY[]::text[], 'Kapitel 2.1', 'Also the recommended pre-pregnancy immunity check (Kapitel 3.2.b).'),
  ('mmr-vaccine', 'both', 216, 1440, 216, 3, null, 2, null, null, '2-dose catch-up, healthcare workers', 'exposure_group', ARRAY['healthcare_worker']::text[], 'Kapitel 3.3.b', null);

-- varicella-vaccine (Kapitel 1.1l, 2.1, 3.1n, 3.3.b)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('varicella-vaccine', 'both', 9, 9, 9, 1, 1, 2, null, null, 'Dose 1 of 2 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1l', null),
  ('varicella-vaccine', 'both', 12, 12, 12, 1, 2, 2, 90, null, 'Dose 2 of 2 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1l', null),
  ('varicella-vaccine', 'both', 216, 479, 216, 2, null, 2, null, null, '2-dose catch-up if not immune, under 40', 'general', ARRAY[]::text[], 'Kapitel 2.1', null),
  ('varicella-vaccine', 'both', 480, 1440, 480, 3, null, 2, null, null, '2-dose catch-up if not immune and at elevated risk, 40+', 'risk_condition', ARRAY['hematologic_malignancy']::text[], 'Kapitel 3.1n', null),
  ('varicella-vaccine', 'both', 480, 1440, 480, 3, null, 2, null, null, '2-dose catch-up if not immune and at elevated risk, 40+', 'risk_condition', ARRAY['transplant_candidate_or_recipient']::text[], 'Kapitel 3.1n', null),
  ('varicella-vaccine', 'both', 480, 1440, 480, 3, null, 2, null, null, '2-dose catch-up if not immune and at elevated risk, 40+', 'risk_condition', ARRAY['immunosuppressive_medication']::text[], 'Kapitel 3.1n', null),
  ('varicella-vaccine', 'both', 216, 479, 216, 4, null, 2, null, null, '2-dose catch-up if not immune, healthcare workers under 40', 'exposure_group', ARRAY['healthcare_worker']::text[], 'Kapitel 3.3.b', null);

-- hpv-vaccine (Kapitel 1.3c, 1.4b, 2.1)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('hpv-vaccine', 'both', 132, 179, 132, 1, null, 2, null, null, '2-dose series (11-14 years)', 'general', ARRAY[]::text[], 'Kapitel 1.3c', null),
  ('hpv-vaccine', 'both', 180, 239, 180, 2, null, 3, null, null, '3-dose catch-up series (15-19 years)', 'general', ARRAY[]::text[], 'Kapitel 2.1', null),
  ('hpv-vaccine', 'both', 240, 311, 240, 3, null, 3, null, null, '3-dose series (20-26 years) if not previously vaccinated', 'general', ARRAY[]::text[], 'Kapitel 1.4b', null);

-- meningococcal-b-vaccine (Kapitel 1.1i, 1.4d, 3.1f)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('meningococcal-b-vaccine', 'both', 2, 4, 2, 2, 1, 3, null, null, 'Dose 1 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1i', null),
  ('meningococcal-b-vaccine', 'both', 4, 5, 4, 2, 2, 3, 60, null, 'Dose 2 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1i', null),
  ('meningococcal-b-vaccine', 'both', 12, 18, 12, 2, 3, 3, 180, null, 'Dose 3 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1i', null),
  ('meningococcal-b-vaccine', 'both', 132, 191, 132, 3, null, 2, null, null, '2-dose series (11-15 years)', 'general', ARRAY[]::text[], 'Kapitel 1.4d', null),
  ('meningococcal-b-vaccine', 'both', 0, 1440, 24, 2, null, null, null, null, 'Risk-based series if you have a qualifying immune risk factor', 'risk_condition', ARRAY['asplenia']::text[], 'Kapitel 3.1f/Tabelle 5', null),
  ('meningococcal-b-vaccine', 'both', 0, 1440, 24, 2, null, null, null, null, 'Risk-based series if you have a qualifying immune risk factor', 'risk_condition', ARRAY['congenital_immunodeficiency']::text[], 'Kapitel 3.1f/Tabelle 5', null),
  ('meningococcal-b-vaccine', 'both', 216, 1440, 216, 4, null, null, null, 1825, 'Every 5 years while occupational exposure continues', 'exposure_group', ARRAY['lab_personnel_pathogen_exposure']::text[], 'Kapitel 3.1f/Tabelle 8', null);

-- meningococcal-acwy-vaccine (Kapitel 1.1j, 1.4d, 3.1f)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('meningococcal-acwy-vaccine', 'both', 12, 18, 12, 2, 1, 1, null, null, '1 dose (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1j', null),
  ('meningococcal-acwy-vaccine', 'both', 132, 191, 132, 3, null, 1, null, null, '1 dose (11-15 years)', 'general', ARRAY[]::text[], 'Kapitel 1.4d', null),
  ('meningococcal-acwy-vaccine', 'both', 0, 1440, 24, 2, null, null, null, 1825, 'Risk-based series, boosted every 5 years while risk continues', 'risk_condition', ARRAY['asplenia']::text[], 'Kapitel 3.1f/Tabelle 5', null),
  ('meningococcal-acwy-vaccine', 'both', 0, 1440, 24, 2, null, null, null, 1825, 'Risk-based series, boosted every 5 years while risk continues', 'risk_condition', ARRAY['congenital_immunodeficiency']::text[], 'Kapitel 3.1f/Tabelle 5', null),
  ('meningococcal-acwy-vaccine', 'both', 216, 1440, 216, 4, null, null, null, 1825, 'Every 5 years while occupational exposure continues', 'exposure_group', ARRAY['lab_personnel_pathogen_exposure']::text[], 'Kapitel 3.1f/Tabelle 8', null);

-- shingles-vaccine (Kapitel 1.5b, 3.1d)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('shingles-vaccine', 'both', 780, 1440, 780, 1, null, 2, 60, null, '2-dose series from age 65', 'general', ARRAY[]::text[], 'Kapitel 1.5b', null),
  ('shingles-vaccine', 'both', 600, 779, 600, 2, null, 2, 60, null, '2-dose series from age 50 if you have an elevated immune risk', 'risk_condition', ARRAY['immunosuppressive_medication']::text[], 'Kapitel 3.1d', null),
  ('shingles-vaccine', 'both', 600, 779, 600, 2, null, 2, 60, null, '2-dose series from age 50 if you have an elevated immune risk', 'risk_condition', ARRAY['hiv']::text[], 'Kapitel 3.1d', null),
  ('shingles-vaccine', 'both', 600, 779, 600, 2, null, 2, 60, null, '2-dose series from age 50 if you have an elevated immune risk', 'risk_condition', ARRAY['chronic_kidney_disease']::text[], 'Kapitel 3.1d', null),
  ('shingles-vaccine', 'both', 216, 599, 216, 2, null, 2, 30, null, '2-dose series from age 18 if you have a severe or upcoming immunosuppression', 'risk_condition', ARRAY['active_chemotherapy']::text[], 'Kapitel 3.1d', null),
  ('shingles-vaccine', 'both', 216, 599, 216, 2, null, 2, 30, null, '2-dose series from age 18 if you have a severe or upcoming immunosuppression', 'risk_condition', ARRAY['transplant_candidate_or_recipient']::text[], 'Kapitel 3.1d', null);

-- pneumococcal-vaccine (Kapitel 1.1g, 1.5d, 3.1h, Tabelle 5)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('pneumococcal-vaccine', 'both', 2, 2, 2, 1, 1, 3, null, null, 'Dose 1 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1g', null),
  ('pneumococcal-vaccine', 'both', 4, 4, 4, 1, 2, 3, 60, null, 'Dose 2 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1g', null),
  ('pneumococcal-vaccine', 'both', 12, 12, 12, 1, 3, 3, 240, null, 'Dose 3 of 3 (infant series)', 'general', ARRAY[]::text[], 'Kapitel 1.1g', null),
  ('pneumococcal-vaccine', 'both', 780, 1440, 780, 1, null, 1, null, null, 'Single dose from age 65', 'general', ARRAY[]::text[], 'Kapitel 1.5d', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['cardiovascular_chronic']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['pulmonary_chronic']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['asplenia']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['chronic_kidney_disease']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['diabetes_with_organ_impact']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['hematologic_malignancy']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['transplant_candidate_or_recipient']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['immunosuppressive_medication']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['hiv']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['congenital_immunodeficiency']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['cochlear_implant_or_csf_leak']::text[], 'Kapitel 3.1h/Tabelle 5', null),
  ('pneumococcal-vaccine', 'both', 24, 1440, 24, 2, null, 1, null, null, 'Risk-based dose if you have a qualifying chronic condition', 'risk_condition', ARRAY['trisomy_21']::text[], 'Kapitel 3.1h/Tabelle 5', null);

-- influenza-vaccine (Kapitel 1.5c, 3.1e, Tabelle 5)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('influenza-vaccine', 'both', 780, 1440, 780, 1, null, null, null, 365, 'Every year from age 65 (high-dose from 75)', 'general', ARRAY[]::text[], 'Kapitel 1.5c', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['cardiovascular_chronic']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['pulmonary_chronic']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['diabetes_with_organ_impact']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['chronic_kidney_disease']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['chronic_liver_disease']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['asplenia']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['hematologic_malignancy']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['transplant_candidate_or_recipient']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['immunosuppressive_medication']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['hiv']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['congenital_immunodeficiency']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'both', 24, 1440, 24, 2, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['obesity_bmi35plus']::text[], 'Kapitel 3.1e/Tabelle 5', null),
  ('influenza-vaccine', 'female', 216, 600, 216, 2, null, null, null, 365, 'Every year during pregnancy (any trimester)', 'pregnancy', ARRAY['pregnant']::text[], 'Kapitel 3.1e', null),
  ('influenza-vaccine', 'both', 216, 1440, 216, 3, null, null, null, 365, 'Every year, healthcare workers', 'exposure_group', ARRAY['healthcare_worker']::text[], 'Kapitel 3.1e/Tabelle 8', null),
  ('influenza-vaccine', 'both', 216, 1440, 216, 3, null, null, null, 365, 'Every year if in regular contact with infants under 6 months', 'exposure_group', ARRAY['close_contact_infant_under_6mo']::text[], 'Kapitel 3.1e', null);

-- covid-19-booster (Kapitel 3.1k) -- risk-based only; the document does not give this a
-- general population recommendation the way it does for influenza.
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['cardiovascular_chronic']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['pulmonary_chronic']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['chronic_liver_disease']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['chronic_kidney_disease']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['diabetes_with_organ_impact']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['obesity_bmi35plus']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['hematologic_malignancy']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['transplant_candidate_or_recipient']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['immunosuppressive_medication']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['hiv']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have a qualifying chronic condition', 'risk_condition', ARRAY['congenital_immunodeficiency']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'both', 192, 1440, 192, 1, null, null, null, 365, 'Every year if you have Trisomy 21', 'risk_condition', ARRAY['trisomy_21']::text[], 'Kapitel 3.1k', null),
  ('covid-19-booster', 'female', 192, 600, 192, 1, null, null, null, 365, 'Every year during pregnancy (2nd or 3rd trimester)', 'pregnancy', ARRAY['pregnant']::text[], 'Kapitel 3.1k', null);

-- rsv-vaccine (adults) -- published separately from the core Impfplan (Sept 2025 BAG
-- guidance), not part of Tabelle 1; correcting both the age band and the source citation.
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('rsv-vaccine', 'both', 720, 899, 720, 2, null, 1, null, null, 'Single dose, ages 60-74 if at elevated risk', 'risk_condition', ARRAY['cardiovascular_chronic']::text[], 'Separately published BAG RSV-adult guidance, Sept 2025 (not part of the core Impfplan)', null),
  ('rsv-vaccine', 'both', 720, 899, 720, 2, null, 1, null, null, 'Single dose, ages 60-74 if at elevated risk', 'risk_condition', ARRAY['pulmonary_chronic']::text[], 'Separately published BAG RSV-adult guidance, Sept 2025 (not part of the core Impfplan)', null),
  ('rsv-vaccine', 'both', 900, 1440, 900, 1, null, 1, null, null, 'Single dose from age 75', 'general', ARRAY[]::text[], 'Separately published BAG RSV-adult guidance, Sept 2025 (not part of the core Impfplan)', null);

-- rsv-infant-immunization (Kapitel 1.1a, 3.1i, 3.2.b)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('rsv-infant-immunization', 'female', 216, 600, 216, 1, null, 1, null, null, 'Single maternal dose, weeks 32-36 of pregnancy (Oct-Mar due dates)', 'pregnancy', ARRAY['pregnant']::text[], 'Kapitel 1.1a', null),
  ('rsv-infant-immunization', 'both', 0, 2, 0, 1, null, 1, null, null, 'Single monoclonal-antibody dose in the first year of life (if maternal immunization was not given)', 'general', ARRAY[]::text[], 'Kapitel 1.1a', null),
  ('rsv-infant-immunization', 'both', 12, 24, 12, 2, null, 1, null, null, 'Single dose, ages 12-24 months if at elevated RSV complication risk', 'risk_condition', ARRAY['pulmonary_chronic']::text[], 'Kapitel 3.1i', null);

-- hepatitis-a-vaccine (Kapitel 3.1b, 3.3) -- risk-based only; removes the previous
-- unconditional 18-120 band entirely.
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('hepatitis-a-vaccine', 'both', 12, 1440, 216, 3, null, 2, 180, null, '2-dose series if you have chronic liver disease', 'risk_condition', ARRAY['chronic_liver_disease']::text[], 'Kapitel 3.1b/Tabelle 5', null),
  ('hepatitis-a-vaccine', 'both', 12, 1440, 216, 3, null, 2, 180, null, '2-dose series if traveling to or from a higher-endemicity region', 'exposure_group', ARRAY['high_endemicity_hepb_origin_or_travel']::text[], 'Kapitel 3.1b', 'This flag is shared with the Hepatitis B travel/origin indication -- the document treats both as the same "higher-endemicity region" population.'),
  ('hepatitis-a-vaccine', 'both', 216, 1440, 216, 3, null, 2, 180, null, '2-dose series if indicated by risk', 'exposure_group', ARRAY['msm']::text[], 'Kapitel 3.1b/Tabelle 8', null),
  ('hepatitis-a-vaccine', 'both', 216, 1440, 216, 3, null, 2, 180, null, '2-dose series if indicated by risk', 'exposure_group', ARRAY['injection_drug_use']::text[], 'Kapitel 3.1b/Tabelle 8', null),
  ('hepatitis-a-vaccine', 'both', 216, 1440, 216, 3, null, 2, 180, null, '2-dose series if indicated by occupational exposure', 'exposure_group', ARRAY['lab_personnel_pathogen_exposure']::text[], 'Kapitel 3.1b/Tabelle 8', null),
  ('hepatitis-a-vaccine', 'both', 216, 1440, 216, 3, null, 2, 180, null, '2-dose series, healthcare workers with a qualifying exposure', 'exposure_group', ARRAY['healthcare_worker']::text[], 'Kapitel 3.3.b', null);

-- fsme-vaccine (Kapitel 3.1a)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('fsme-vaccine', 'both', 36, 1440, 36, 1, null, 3, null, null, '3-dose series (0, 1, 6-12 months), if you live in or visit a risk area', 'exposure_group', ARRAY['tbe_risk_area_exposure']::text[], 'Kapitel 3.1a', 'Almost all of Switzerland except Ticino is classified as a risk area, so this is close to a general recommendation in practice, but the document still frames it as exposure-conditional.'),
  ('fsme-vaccine', 'both', 36, 1440, 36, 1, null, null, null, 3650, 'Booster every 10 years', 'exposure_group', ARRAY['tbe_risk_area_exposure']::text[], 'Kapitel 3.1a', null);

-- rabies-vaccine (Kapitel 3.1l)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('rabies-vaccine', 'both', 216, 1440, 216, 1, null, 2, 7, null, '2-dose pre-exposure series (days 0, 28), occupational animal/bat exposure', 'exposure_group', ARRAY['animal_or_bat_occupational_contact']::text[], 'Kapitel 3.1l', null),
  ('rabies-vaccine', 'both', 216, 1440, 216, 1, null, 2, 7, null, '2-dose pre-exposure series (days 0, 28), laboratory exposure', 'exposure_group', ARRAY['lab_personnel_pathogen_exposure']::text[], 'Kapitel 3.1l', null);

-- tuberculosis-bcg-vaccine (Kapitel 3.1m)
insert into public.preventive_catalog_vaccine_doses (item_id, gender, age_min_months, age_max_months, target_age_months, priority_order, dose_number, doses_in_series, min_interval_from_previous_dose_days, recurrence_interval_days, cadence_label, population_type, required_risk_flags, source_ref, evidence_note) values
  ('tuberculosis-bcg-vaccine', 'both', 0, 12, 0, 1, null, 1, null, null, 'Single BCG dose, infants under 12 months at elevated TB exposure risk', 'exposure_group', ARRAY['high_tb_incidence_country_exposure']::text[], 'Kapitel 3.1m', 'This flag was not in the original plan''s risk-flag list; added here following the same convention (one flag per document population group).');
