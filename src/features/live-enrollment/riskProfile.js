// Pure data + logic for the risk-profile wizard, split out of
// RiskProfileStep.jsx (which contains JSX) so it can be unit-tested
// directly with the plain Node test runner, which can't parse JSX.

export const RISK_PROFILE_OPTION_GROUPS = Object.freeze([
  {
    titleKey: 'riskProfile.groupGeneral',
    options: [
      { value: 'smoker_current_or_former', labelKey: 'riskProfile.smoker', icon: 'cigarette' },
      { value: 'sti_risk_behavior', labelKey: 'riskProfile.sti', icon: 'heart-pulse' },
      { value: 'hiv', labelKey: 'riskProfile.hiv', icon: 'droplet', info: 'hiv' },
      { value: 'born_or_family_in_high_prevalence_region', labelKey: 'riskProfile.hepatitisB', icon: 'map-pin', info: 'hepatitisRegions' },
    ],
  },
  {
    titleKey: 'riskProfile.groupChronicConditions',
    collapseAfter: 6,
    // No severe-obesity checkbox here on purpose: 'obesity_bmi35plus' (the
    // BAG Impfplan's own risk-group threshold) is computed from the
    // profile's real height/weight in plan.js's normalizeProfileRiskFlags
    // instead of self-reported, so it can't drift from the actual data.
    options: [
      { value: 'cardiovascular_chronic', labelKey: 'riskProfile.cardiovascularChronic', icon: 'heart-pulse' },
      { value: 'pulmonary_chronic', labelKey: 'riskProfile.pulmonaryChronic', icon: 'activity' },
      { value: 'chronic_liver_disease', labelKey: 'riskProfile.chronicLiverDisease', icon: 'stethoscope' },
      { value: 'chronic_kidney_disease', labelKey: 'riskProfile.chronicKidneyDisease', icon: 'droplet' },
      { value: 'diabetes_with_organ_impact', labelKey: 'riskProfile.diabetesWithOrganImpact', icon: 'activity' },
      { value: 'asplenia', labelKey: 'riskProfile.asplenia', icon: 'shield-check' },
      { value: 'hematologic_malignancy', labelKey: 'riskProfile.hematologicMalignancy', icon: 'activity' },
      { value: 'active_chemotherapy', labelKey: 'riskProfile.activeChemotherapy', icon: 'stethoscope' },
      { value: 'transplant_candidate_or_recipient', labelKey: 'riskProfile.transplantCandidateOrRecipient', icon: 'stethoscope' },
      { value: 'immunosuppressive_medication', labelKey: 'riskProfile.immunosuppressiveMedication', icon: 'shield-check' },
      { value: 'congenital_immunodeficiency', labelKey: 'riskProfile.congenitalImmunodeficiency', icon: 'shield-check' },
      { value: 'cochlear_implant_or_csf_leak', labelKey: 'riskProfile.cochlearImplantOrCsfLeak', icon: 'info' },
      { value: 'trisomy_21', labelKey: 'riskProfile.trisomy21', icon: 'info' },
    ],
  },
  {
    titleKey: 'riskProfile.groupPregnancyPerinatal',
    options: [
      { value: 'pregnant', labelKey: 'riskProfile.pregnant', icon: 'baby', dueDate: true },
      { value: 'postpartum_unvaccinated', labelKey: 'riskProfile.postpartumUnvaccinated', icon: 'baby' },
      { value: 'preterm_or_low_birthweight', labelKey: 'riskProfile.pretermOrLowBirthweight', icon: 'baby' },
    ],
  },
  {
    titleKey: 'riskProfile.groupOccupationalExposure',
    collapseAfter: 5,
    options: [
      { value: 'healthcare_worker', labelKey: 'riskProfile.healthcareWorker', icon: 'syringe' },
      { value: 'lab_personnel_pathogen_exposure', labelKey: 'riskProfile.labPersonnelPathogenExposure', icon: 'flask-conical' },
      { value: 'close_contact_infant_under_6mo', labelKey: 'riskProfile.closeContactInfantUnder6mo', icon: 'baby' },
      { value: 'injection_drug_use', labelKey: 'riskProfile.injectionDrugUse', icon: 'droplet' },
      { value: 'msm', labelKey: 'riskProfile.msm', icon: 'heart-pulse' },
      { value: 'incarcerated_or_correctional_staff', labelKey: 'riskProfile.incarceratedOrCorrectionalStaff', icon: 'lock' },
      { value: 'chronic_kidney_dialysis', labelKey: 'riskProfile.chronicKidneyDialysis', icon: 'droplet' },
      { value: 'high_endemicity_hepb_origin_or_travel', labelKey: 'riskProfile.highEndemicityHepbOriginOrTravel', icon: 'map-pin', info: 'hepatitisRegions' },
      { value: 'tbe_risk_area_exposure', labelKey: 'riskProfile.tbeRiskAreaExposure', icon: 'map-pin', info: 'tbe' },
      { value: 'animal_or_bat_occupational_contact', labelKey: 'riskProfile.animalOrBatOccupationalContact', icon: 'briefcase' },
      { value: 'high_tb_incidence_country_exposure', labelKey: 'riskProfile.highTbIncidenceCountryExposure', icon: 'map-pin', info: 'tb' },
    ],
  },
]);

// Flags that are computed rather than answered in the wizard -- not part of
// RISK_PROFILE_OPTION_GROUPS (so they never render as a clickable question),
// but still need a human label wherever a matched risk flag is displayed
// (the item detail page's "why is this on my list" line, and the ghosted
// "not applicable" list's reason text both look labels up by value here).
export const COMPUTED_RISK_PROFILE_OPTION_KEYS = Object.freeze([
  { value: 'obesity_bmi35plus', labelKey: 'riskProfile.obesityBmi35Plus' },
]);

// Flat list of every flag across all groups, for callers that just need the full set
// (e.g. tests, or ProfileOverviewScreen's tag labels) without caring about grouping.
export const RISK_PROFILE_OPTION_KEYS = Object.freeze([
  ...RISK_PROFILE_OPTION_GROUPS.flatMap((group) => group.options),
  ...COMPUTED_RISK_PROFILE_OPTION_KEYS,
]);

export const RISK_PROFILE_TOTAL_QUESTIONS = RISK_PROFILE_OPTION_GROUPS.reduce(
  (sum, group) => sum + group.options.length,
  0,
);

export const RISK_INFO_CONTENT = Object.freeze({
  hiv: {
    titleKey: 'riskProfile.infoHivTitle',
    bodyKey: 'riskProfile.infoHivBody',
    sourceKey: 'riskProfile.infoHivSource',
  },
  hepatitisRegions: {
    titleKey: 'riskProfile.infoHepatitisRegionsTitle',
    bodyKey: 'riskProfile.infoHepatitisRegionsBody',
    sourceKey: 'riskProfile.infoHepatitisRegionsSource',
  },
  tbe: {
    titleKey: 'riskProfile.infoTbeTitle',
    bodyKey: 'riskProfile.infoTbeBody',
    sourceKey: 'riskProfile.infoTbeSource',
  },
  tb: {
    titleKey: 'riskProfile.infoTbTitle',
    bodyKey: 'riskProfile.infoTbBody',
    sourceKey: 'riskProfile.infoTbSource',
  },
});

// A previously-reviewed profile seeds every explicitly-answered question
// back in (yes for flagged values, no for questions in the reviewed set but
// not flagged) so re-opening this step doesn't relitigate everything from
// scratch or, worse, forget answers that happened to all be "no" (riskFlags
// alone can't tell "explicitly no" apart from "never asked" -- that's what
// initialReviewedKeys is for). A never-reviewed question starts fully
// blank -- nothing defaults to "no", per the explicit-answers design: the
// ring only moves when you actually decide.
// Lands the wizard on the first section that still has an unanswered
// question, so a returning user isn't sent back through sections they
// already finished. A fully-reviewed profile has nowhere left to jump to,
// so it starts over at the first section instead.
export function findFirstIncompleteStep(initialReviewedKeys) {
  const reviewedSet = new Set(Array.isArray(initialReviewedKeys) ? initialReviewedKeys : []);
  const incompleteIndex = RISK_PROFILE_OPTION_GROUPS.findIndex(
    (group) => !group.options.every((option) => reviewedSet.has(option.value)),
  );
  return incompleteIndex === -1 ? 0 : incompleteIndex;
}

export function buildInitialAnswers(initialRiskFlags, initialReviewedKeys) {
  const answers = new Map();
  const flagSet = new Set(Array.isArray(initialRiskFlags) ? initialRiskFlags : []);
  const reviewedSet = new Set(Array.isArray(initialReviewedKeys) ? initialReviewedKeys : []);
  if (flagSet.size === 0 && reviewedSet.size === 0) {
    return answers;
  }
  RISK_PROFILE_OPTION_GROUPS.forEach((group, groupIndex) => {
    group.options.forEach((option, optionIndex) => {
      if (flagSet.has(option.value)) {
        answers.set(`${groupIndex}-${optionIndex}`, 'yes');
      } else if (reviewedSet.has(option.value)) {
        answers.set(`${groupIndex}-${optionIndex}`, 'no');
      }
    });
  });
  return answers;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;

// Allowed cadence choices for the Settings segmented control; 0 means "Nie"
// (never remind, always reads as fresh regardless of how old the review is).
export const RISK_PROFILE_REVIEW_CADENCE_OPTIONS = Object.freeze([0, 6, 12]);
export const DEFAULT_RISK_PROFILE_REVIEW_CADENCE_MONTHS = 12;

// Reduces reviewedKeys/reviewedAt/cadence down to one of four states driving
// the dashboard pill and profile-strength card. A profile with zero answered
// questions is "unreviewed" regardless of cadence -- there's nothing to go
// stale yet, and the existing "Risikoprofil erfassen" CTA already covers it.
// Once at least one question has been answered (including partially --
// per product decision, staleness applies to partially-reviewed profiles
// too, not just fully-completed ones), cadence takes over: "fresh" inside
// the cadence window, "due" once past it, "overdue" once past 2x the
// cadence (the point where the dashboard nudge banner joins the pill).
export function computeRiskProfileReviewStatus({ reviewedKeys, reviewedAt, cadenceMonths, now } = {}) {
  const reviewedSet = Array.isArray(reviewedKeys) ? reviewedKeys : [];
  const nowDate = now instanceof Date ? now : new Date(now ?? Date.now());

  if (reviewedSet.length === 0) {
    return { state: 'unreviewed', monthsSinceReview: null };
  }

  const normalizedCadence = Number(cadenceMonths);
  const cadence = RISK_PROFILE_REVIEW_CADENCE_OPTIONS.includes(normalizedCadence)
    ? normalizedCadence
    : DEFAULT_RISK_PROFILE_REVIEW_CADENCE_MONTHS;

  if (cadence === 0) {
    return { state: 'fresh', monthsSinceReview: null };
  }

  const reviewedDate = reviewedAt ? new Date(reviewedAt) : null;
  if (!reviewedDate || Number.isNaN(reviewedDate.getTime())) {
    // A reviewed profile with no timestamp (shouldn't happen after the
    // backfill migration, but defensive) reads as due rather than crashing
    // or silently reading as fresh.
    return { state: 'due', monthsSinceReview: null };
  }

  const elapsedDays = Math.max(0, (nowDate.getTime() - reviewedDate.getTime()) / MS_PER_DAY);
  const monthsSinceReview = Math.floor(elapsedDays / DAYS_PER_MONTH);
  const cadenceDays = cadence * DAYS_PER_MONTH;

  if (elapsedDays < cadenceDays) {
    return { state: 'fresh', monthsSinceReview };
  }
  if (elapsedDays < cadenceDays * 2) {
    return { state: 'due', monthsSinceReview };
  }
  return { state: 'overdue', monthsSinceReview };
}
