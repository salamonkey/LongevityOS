-- Reconciles the preventive catalog against the Unisanté EviPrev 2024
-- guideline: backfills recommendation_text for every existing item, corrects
-- age bands/cadence/evidence metadata on items EviPrev also covers, and adds
-- the EviPrev items that didn't exist in the catalog yet (counseling items,
-- and several screening items). See the EviPrev model review for the full
-- source extraction this migration implements.

-- === Backfill recommendation_text for existing items EviPrev does not change ===

update public.preventive_catalog_items set recommendation_text = 'Schedule a yearly wellness visit so you and your clinician can review your preventive plan and update it as your needs change.' where item_id = 'annual-wellness-visit';
update public.preventive_catalog_items set recommendation_text = 'A short conversation about mood and anxiety can surface concerns early; mention persistent worry or low mood at any visit.' where item_id = 'anxiety-screening';
update public.preventive_catalog_items set recommendation_text = 'Get a flu vaccine every year, ideally before each flu season begins.' where item_id = 'influenza-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Get a tetanus, diphtheria, and pertussis booster every 10 years to keep protection current.' where item_id = 'tdap-booster';
update public.preventive_catalog_items set recommendation_text = 'Complete the 2-dose shingles vaccine series after age 50, spaced according to your clinician''s timing guidance.' where item_id = 'shingles-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Follow current booster guidance with your clinician to maintain protection against severe COVID-19 outcomes.' where item_id = 'covid-19-booster';
update public.preventive_catalog_items set recommendation_text = 'Complete the hepatitis B vaccination series when indicated by your age, history, or risk profile.' where item_id = 'hepatitis-b-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Ask about the pneumococcal vaccine once you reach the recommended age or risk profile.' where item_id = 'pneumococcal-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Discuss a single-season RSV dose with your clinician based on your age and risk.' where item_id = 'rsv-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Complete the HPV vaccine series at the recommended age to lower long-term cancer risk.' where item_id = 'hpv-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Catch up on MMR vaccination if your immunity status is unclear.' where item_id = 'mmr-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Complete the varicella vaccine series if you are not already immune.' where item_id = 'varicella-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Complete the hepatitis A vaccine series when indicated by travel, occupation, or other risk factors.' where item_id = 'hepatitis-a-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Discuss meningococcal vaccination with your clinician if your risk factors or exposure warrant it.' where item_id = 'meningococcal-vaccine';
update public.preventive_catalog_items set recommendation_text = 'Complete a polio catch-up series if your childhood immunization history is incomplete.' where item_id = 'polio-vaccine';

-- === Existing items EviPrev also covers: correct bands/cadence/evidence metadata ===

-- Zervix: 21-29 cytology q3y, then 30-70 cytology-or-HPV q3y (EviPrev: strong, Grad A)
update public.preventive_catalog_items set
  cadence_label = 'Every 3 years',
  recommendation_text = 'Follow routine cervical screening on the recommended interval for your age group: cytology every 3 years, switching to cytology or an HPV test every 3 years from age 30.',
  why_it_matters = 'Routine screening can detect cell changes early and support effective follow-up.'
where item_id = 'cervical-cancer-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'cervical-cancer-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade) values
  ('cervical-cancer-screening', 'female', 21, 29, 21, 1, 'Every 3 years (cytology)', 1095, 'strong', 'A'),
  ('cervical-cancer-screening', 'female', 30, 70, 30, 1, 'Every 3 years (cytology or HPV test)', 1095, 'strong', 'A');

-- Kolon und Rektum: 50-75, FIT q2y or colonoscopy q10y (EviPrev: strong, Grad A)
update public.preventive_catalog_items set
  cadence_label = 'Every 2 years (FIT) or every 10 years (colonoscopy)',
  recommendation_text = 'Screen for colorectal cancer starting at 50, either a stool test (FIT) every 2 years or a colonoscopy every 10 years.',
  why_it_matters = 'Routine colorectal screening helps detect precancerous changes and cancer earlier.'
where item_id = 'colorectal-cancer-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'colorectal-cancer-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade) values
  ('colorectal-cancer-screening', 'female', 50, 75, 50, 1, 'Every 2 years (FIT) or every 10 years (colonoscopy)', 730, 'strong', 'A'),
  ('colorectal-cancer-screening', 'male', 50, 75, 50, 1, 'Every 2 years (FIT) or every 10 years (colonoscopy)', 730, 'strong', 'A');

-- Brust: 50-75, mammography q2y, only after shared decision-making (EviPrev: conditional/SDM)
update public.preventive_catalog_items set
  cadence_label = 'Every 2 years (mammography)',
  recommendation_text = 'Talk with your clinician about the benefits and risks of mammography, then screen every 2 years between ages 50 and 75 if you decide together it is right for you.',
  why_it_matters = 'Regular mammography can lower the risk of dying from breast cancer through earlier detection, alongside a real chance of over-diagnosis worth weighing with your clinician.'
where item_id = 'breast-cancer-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'breast-cancer-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, requires_shared_decision) values
  ('breast-cancer-screening', 'female', 50, 75, 50, 1, 'Every 2 years (mammography)', 730, 'conditional', true);

-- Prostata: 50-70, PSA discussion, only after shared decision-making (EviPrev: conditional/SDM, Grad C)
update public.preventive_catalog_items set
  cadence_label = 'Every 1 to 3 years (PSA), after shared decision-making',
  recommendation_text = 'Start a prostate health conversation around age 50 so screening decisions can match your values and personal risk; PSA testing frequency then depends on your result.',
  why_it_matters = 'A timely discussion helps you decide with your clinician which screening path fits you.'
where item_id = 'prostate-health-discussion';
delete from public.preventive_catalog_rule_bands where item_id = 'prostate-health-discussion';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade, requires_shared_decision) values
  ('prostate-health-discussion', 'male', 50, 70, 50, 1, 'Every 1 to 3 years (PSA), after shared decision-making', 365, 'conditional', 'C', true);

-- Lunge: 50-75, low-dose CT, smoker/ex-smoker only, shared decision-making (EviPrev: conditional/SDM, Grad B)
update public.preventive_catalog_items set
  cadence_label = 'Every 1 to 2 years (low-dose CT)',
  recommendation_text = 'If you are a current or former heavy smoker (roughly 15+ pack-years, quit within the last 10 years), talk with your clinician about annual low-dose CT screening between ages 50 and 75.',
  why_it_matters = 'For people at high risk, low-dose CT screening can detect lung cancer earlier, though it also carries a real chance of a false-positive result.',
  required_risk_flags = ARRAY['smoker_current_or_former']::text[]
where item_id = 'lung-cancer-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'lung-cancer-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade, requires_shared_decision) values
  ('lung-cancer-screening', 'female', 50, 75, 50, 2, 'Every 1 to 2 years (low-dose CT)', 365, 'conditional', 'B', true),
  ('lung-cancer-screening', 'male', 50, 75, 50, 2, 'Every 1 to 2 years (low-dose CT)', 365, 'conditional', 'B', true);

-- Arterielle Hypertonie: every 3 years under 40 (no other CV risk factor), then annually (EviPrev: strong, Grad A)
update public.preventive_catalog_items set
  cadence_label = 'Every 3 years, then every year from 40',
  recommendation_text = 'Check your blood pressure at least every 3 years before 40, then every year from 40 on, or sooner if your clinician recommends closer follow-up.',
  why_it_matters = 'Blood pressure checks can identify heart risk factors before symptoms appear.'
where item_id = 'blood-pressure-check';
delete from public.preventive_catalog_rule_bands where item_id = 'blood-pressure-check';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade) values
  ('blood-pressure-check', 'female', 18, 39, 18, 2, 'Every 3 years (if no other cardiovascular risk factors)', 1095, 'strong', 'A'),
  ('blood-pressure-check', 'male', 18, 39, 18, 2, 'Every 3 years (if no other cardiovascular risk factors)', 1095, 'strong', 'A'),
  ('blood-pressure-check', 'female', 40, 120, 40, 2, 'Every year', 365, 'strong', 'A'),
  ('blood-pressure-check', 'male', 40, 120, 40, 2, 'Every year', 365, 'strong', 'A');

-- Dyslipidämie: male from 40, female from 50 (or postmenopause), q2-5y by AGLA score (EviPrev: conditional)
update public.preventive_catalog_items set
  cadence_label = 'Every 2 to 5 years, based on cardiovascular risk score',
  recommendation_text = 'Have your cardiovascular risk and cholesterol assessed starting at 40 (men) or 50 (women), then repeat every 2 to 5 years depending on your risk score.',
  why_it_matters = 'This screening helps track cardiovascular risk and guide timely prevention.'
where item_id = 'cholesterol-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'cholesterol-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier) values
  ('cholesterol-screening', 'female', 50, 120, 50, 1, 'Every 2 to 5 years, based on cardiovascular risk score', 1095, 'conditional'),
  ('cholesterol-screening', 'male', 40, 120, 40, 1, 'Every 2 to 5 years, based on cardiovascular risk score', 1095, 'conditional');

-- Diabetes: male from 40, female from 50, q1-3y by risk (EviPrev: moderate, Grad B)
update public.preventive_catalog_items set
  cadence_label = 'Every 1 to 3 years, based on diabetes risk',
  recommendation_text = 'Plan diabetes screening starting at 40 (men) or 50 (women), repeating every 1 to 3 years depending on your risk factors.',
  why_it_matters = 'Screening can catch blood sugar changes early and support prevention decisions.'
where item_id = 'diabetes-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'diabetes-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade) values
  ('diabetes-screening', 'female', 50, 120, 50, 2, 'Every 1 to 3 years, based on diabetes risk', 730, 'moderate', 'B'),
  ('diabetes-screening', 'male', 40, 120, 40, 2, 'Every 1 to 3 years, based on diabetes risk', 730, 'moderate', 'B');

-- HIV: risk-gated across the full adult range (EviPrev: strong once risk factors present, Grad A)
update public.preventive_catalog_items set
  cadence_label = 'Repeat based on ongoing risk',
  recommendation_text = 'If you have an HIV risk factor, get tested and repeat testing periodically based on ongoing risk.',
  why_it_matters = 'HIV screening supports early diagnosis and treatment, improving health outcomes.'
where item_id = 'hiv-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'hiv-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade) values
  ('hiv-screening', 'female', 18, 75, 18, 4, 'Repeat based on ongoing risk', 365, 'strong', 'A'),
  ('hiv-screening', 'male', 18, 75, 18, 4, 'Repeat based on ongoing risk', 365, 'strong', 'A');

-- Hepatitis C: cap age at 75 to match EviPrev's adult scope (EviPrev: moderate, Grad B)
update public.preventive_catalog_items set
  cadence_label = 'Once, then based on risk factors',
  recommendation_text = 'Get a one-time hepatitis C screening; repeat if you have ongoing risk factors.',
  why_it_matters = 'One-time hepatitis C screening can find silent infection and prevent long-term liver harm.'
where item_id = 'hepatitis-c-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'hepatitis-c-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, evidence_tier, uspstf_grade) values
  ('hepatitis-c-screening', 'female', 18, 75, 18, 4, 'Once, then based on risk factors', 'moderate', 'B'),
  ('hepatitis-c-screening', 'male', 18, 75, 18, 4, 'Once, then based on risk factors', 'moderate', 'B');

-- Osteoporose: individualized at every age, not a blanket recommendation at 65+ (EviPrev: conditional both bands)
update public.preventive_catalog_items set
  cadence_label = 'Individualized, based on fracture-risk assessment',
  recommendation_text = 'Between 50 and 65, ask your clinician to estimate your fracture risk (FRAX); from 65 on, a bone-density scan is individualized based on your personal risk factors rather than routine for everyone.',
  why_it_matters = 'Bone-density screening helps identify fracture risk early and supports prevention, weighed against the risk of over-screening low-risk patients.'
where item_id = 'osteoporosis-screening';
delete from public.preventive_catalog_rule_bands where item_id = 'osteoporosis-screening';
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, evidence_tier, uspstf_grade) values
  ('osteoporosis-screening', 'female', 50, 64, 50, 2, 'Individualized, based on fracture-risk score (FRAX)', 'conditional', 'B'),
  ('osteoporosis-screening', 'female', 65, 120, 65, 2, 'Individualized, based on personal risk factors', 'conditional', 'B');

-- Bauchaortenaneurysma: smoker/ex-smoker only (EviPrev: conditional, Grad B)
update public.preventive_catalog_items set
  cadence_label = 'One-time ultrasound',
  recommendation_text = 'If you are a current or former smoker, get a one-time abdominal ultrasound between ages 65 and 75 to check for an aortic aneurysm.',
  why_it_matters = 'A one-time ultrasound can detect aneurysms before rupture in eligible adults.',
  required_risk_flags = ARRAY['smoker_current_or_former']::text[]
where item_id = 'abdominal-aortic-aneurysm-screening';
update public.preventive_catalog_rule_bands set evidence_tier = 'conditional', uspstf_grade = 'B', cadence_label = 'One-time ultrasound'
where item_id = 'abdominal-aortic-aneurysm-screening';

-- Depression: ongoing 2-question screen, all adults (EviPrev: strong, Grad B)
update public.preventive_catalog_items set
  cadence_label = 'Ongoing, revisited yearly',
  recommendation_text = 'A brief two-question check-in ("little interest or pleasure" / "feeling down") at routine visits can surface depression early, when treatment tends to work best.',
  why_it_matters = 'Routine screening can identify depression earlier so treatment can start sooner.'
where item_id = 'depression-screening';
update public.preventive_catalog_rule_bands set cadence_label = 'Ongoing, revisited yearly', recurrence_interval_days = 365, evidence_tier = 'strong', uspstf_grade = 'B'
where item_id = 'depression-screening';

-- Tabak / Alkohol: recategorize into counseling with an annual revisit cadence
-- (EviPrev "ask at every visit" approximated as yearly to avoid an item with no
-- decay interval permanently squatting in Today — see the model review's New finding 2)
update public.preventive_catalog_items set
  category = 'counseling',
  cadence_label = 'Ongoing, revisited yearly',
  recommendation_text = 'If you smoke or vape, talk with your clinician about quitting support — nicotine replacement and other treatments meaningfully improve your odds.',
  why_it_matters = 'Asking about tobacco use and offering support increases successful quitting.'
where item_id = 'tobacco-cessation-support';
update public.preventive_catalog_rule_bands set cadence_label = 'Ongoing, revisited yearly', recurrence_interval_days = 365, evidence_tier = 'strong', uspstf_grade = 'A'
where item_id = 'tobacco-cessation-support';

update public.preventive_catalog_items set
  category = 'counseling',
  cadence_label = 'Ongoing, revisited yearly',
  recommendation_text = 'A brief conversation about alcohol use can help spot risky drinking early and connect you to support if needed.',
  why_it_matters = 'Screening can identify risky alcohol use early and guide brief counseling.'
where item_id = 'alcohol-use-screening';
update public.preventive_catalog_rule_bands set cadence_label = 'Ongoing, revisited yearly', recurrence_interval_days = 365, evidence_tier = 'strong', uspstf_grade = 'B'
where item_id = 'alcohol-use-screening';

-- === New EviPrev items: counseling ===

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('illicit-drug-use-counseling', 'Substance use screening', 'counseling', 'low', 'Ongoing, revisited yearly', 'Screening for substance use, paired with access to effective treatment, supports earlier help when it is needed.', 'A brief conversation about drug use, in a setting with real treatment options available, can open the door to support.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('physical-activity-counseling', 'Physical activity counseling', 'counseling', 'low', 'Ongoing, revisited yearly', 'Regular movement lowers cardiovascular risk and, for adults 65 and up, meaningfully reduces fall risk.', 'Aim for at least 150 minutes of moderate activity a week; talk with your clinician about a plan that fits your routine.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('nutrition-counseling', 'Nutrition counseling', 'counseling', 'low', 'Ongoing, revisited yearly', 'A balanced diet supports cardiovascular health and helps manage weight-related risk factors.', 'A Mediterranean-style eating pattern is a reasonable default; ask your clinician for guidance tailored to your risk factors.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('sexual-behavior-counseling', 'Sexual health counseling', 'counseling', 'low', 'Ongoing, revisited yearly', 'Counseling on safer sex practices lowers the risk of sexually transmitted infections.', 'If you have multiple partners or a recent STI, a short conversation about prevention (including condom use) can lower your risk going forward.', ARRAY['sti_risk_behavior']::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('sun-exposure-counseling', 'Sun protection counseling', 'counseling', 'low', 'Ongoing, revisited yearly', 'Minimizing UV exposure lowers the long-term risk of skin cancer, especially for fair-skinned adults.', 'Avoid sunburn, prefer shade between 11am and 3pm, and use SPF 20+ sunscreen regularly.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, recurrence_interval_days, evidence_tier, uspstf_grade) values
  ('illicit-drug-use-counseling', 'female', 18, 120, 18, 1, 'Ongoing, revisited yearly', 365, 'strong', 'B'),
  ('illicit-drug-use-counseling', 'male', 18, 120, 18, 1, 'Ongoing, revisited yearly', 365, 'strong', 'B'),
  ('physical-activity-counseling', 'female', 18, 120, 18, 3, 'Ongoing, revisited yearly', 365, 'conditional', null),
  ('physical-activity-counseling', 'male', 18, 120, 18, 3, 'Ongoing, revisited yearly', 365, 'conditional', null),
  ('nutrition-counseling', 'female', 18, 120, 18, 3, 'Ongoing, revisited yearly', 365, 'conditional', null),
  ('nutrition-counseling', 'male', 18, 120, 18, 3, 'Ongoing, revisited yearly', 365, 'conditional', null),
  ('sexual-behavior-counseling', 'female', 18, 120, 18, 4, 'Ongoing, revisited yearly', 365, 'moderate', 'B'),
  ('sexual-behavior-counseling', 'male', 18, 120, 18, 4, 'Ongoing, revisited yearly', 365, 'moderate', 'B'),
  ('sun-exposure-counseling', 'female', 18, 24, 18, 4, 'Ongoing, revisited yearly', 365, 'moderate', 'B'),
  ('sun-exposure-counseling', 'male', 18, 24, 18, 4, 'Ongoing, revisited yearly', 365, 'moderate', 'B'),
  ('sun-exposure-counseling', 'female', 25, 120, 25, 4, 'Ongoing, revisited yearly', 365, 'conditional', null),
  ('sun-exposure-counseling', 'male', 25, 120, 25, 4, 'Ongoing, revisited yearly', 365, 'conditional', null)
on conflict (item_id, gender, min_age, max_age, target_age, priority_order) do update set
  cadence_label = excluded.cadence_label,
  recurrence_interval_days = excluded.recurrence_interval_days,
  evidence_tier = excluded.evidence_tier,
  uspstf_grade = excluded.uspstf_grade,
  updated_at = now();

-- === New EviPrev items: checkup ===

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('weight-bmi-screening', 'Weight (BMI) screening', 'checkup', 'low', 'Every 3 years', 'Tracking weight over time helps catch trends linked to cardiovascular disease, diabetes, and other conditions early.', 'Have your weight and BMI checked every 3 years as part of routine care.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('syphilis-screening', 'Syphilis screening', 'checkup', 'low', 'Repeat based on ongoing risk', 'Syphilis screening catches infection early, when treatment is most straightforward.', 'If you have a syphilis risk factor, get tested and repeat periodically based on ongoing risk.', ARRAY['sti_risk_behavior']::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('chlamydia-gonorrhea-screening', 'Chlamydia and gonorrhea screening', 'checkup', 'low', 'Repeat based on ongoing risk', 'Both infections are often symptomless; screening catches them before complications develop.', 'Women 24 and under are screened routinely; beyond that age, screening is based on your risk factors.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('hepatitis-b-screening', 'Hepatitis B screening', 'checkup', 'low', 'Repeat based on ongoing risk', 'Hepatitis B screening identifies chronic infection that can otherwise go unnoticed for years.', 'If you were born in (or have close family from) a region with higher hepatitis B prevalence, or have another risk factor, get tested.', ARRAY['born_or_family_in_high_prevalence_region']::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_items (item_id, name, category, effort_level, cadence_label, why_it_matters, recommendation_text, required_risk_flags) values
  ('domestic-violence-screening', 'Domestic violence screening', 'checkup', 'low', 'Ongoing, revisited yearly', 'Domestic violence often goes unrecognized; routine screening opens a door to support and safety resources.', 'If anything about your relationship feels unsafe, your clinician can connect you with confidential support.', ARRAY[]::text[])
on conflict (item_id) do update set name=excluded.name, category=excluded.category, effort_level=excluded.effort_level, cadence_label=excluded.cadence_label, why_it_matters=excluded.why_it_matters, recommendation_text=excluded.recommendation_text, required_risk_flags=excluded.required_risk_flags, updated_at=now();

insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, evidence_tier, uspstf_grade) values
  ('weight-bmi-screening', 'female', 18, 120, 18, 2, 'Every 3 years', 'strong', null),
  ('weight-bmi-screening', 'male', 18, 120, 18, 2, 'Every 3 years', 'strong', null),
  ('syphilis-screening', 'female', 18, 75, 18, 4, 'Repeat based on ongoing risk', 'strong', 'A'),
  ('syphilis-screening', 'male', 18, 75, 18, 4, 'Repeat based on ongoing risk', 'strong', 'A'),
  ('hepatitis-b-screening', 'female', 18, 75, 18, 4, 'Repeat based on ongoing risk', 'moderate', 'B'),
  ('hepatitis-b-screening', 'male', 18, 75, 18, 4, 'Repeat based on ongoing risk', 'moderate', 'B'),
  ('domestic-violence-screening', 'female', 18, 50, 18, 5, 'Ongoing, revisited yearly', 'conditional', 'B')
on conflict (item_id, gender, min_age, max_age, target_age, priority_order) do update set
  cadence_label = excluded.cadence_label,
  evidence_tier = excluded.evidence_tier,
  uspstf_grade = excluded.uspstf_grade,
  updated_at = now();

-- Chlamydia/Gonorrhea: women 18-24 auto-include, everyone else risk-gated
-- (band-level required_risk_flags — see the model review's New finding 1)
insert into public.preventive_catalog_rule_bands (item_id, gender, min_age, max_age, target_age, priority_order, cadence_label, evidence_tier, uspstf_grade, required_risk_flags) values
  ('chlamydia-gonorrhea-screening', 'female', 18, 24, 18, 1, 'Repeat based on ongoing risk', 'moderate', 'B', ARRAY[]::text[]),
  ('chlamydia-gonorrhea-screening', 'female', 18, 75, 18, 2, 'Repeat based on ongoing risk', 'moderate', 'B', ARRAY['sti_risk_behavior']::text[]),
  ('chlamydia-gonorrhea-screening', 'male', 18, 75, 18, 2, 'Repeat based on ongoing risk', 'moderate', 'B', ARRAY['sti_risk_behavior']::text[])
on conflict (item_id, gender, min_age, max_age, target_age, priority_order) do update set
  cadence_label = excluded.cadence_label,
  evidence_tier = excluded.evidence_tier,
  uspstf_grade = excluded.uspstf_grade,
  required_risk_flags = excluded.required_risk_flags,
  updated_at = now();

-- === Finalize: every item now has recommendation copy ===

alter table public.preventive_catalog_items alter column recommendation_text set not null;
