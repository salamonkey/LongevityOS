export const RULE_SET_VERSION = 'sl-001-2026-04-25';

export const PRIORITY_HORIZONS = ['Today', 'Soon', 'Later'];

const HORIZON_SCORE_WEIGHTS = {
  Today: 12,
  Soon: 8,
  Later: 5,
};

const AGE_BANDS = [
  { key: '30-39', min: 30, max: 39 },
  { key: '40-54', min: 40, max: 54 },
  { key: '55-65', min: 55, max: 65 },
];

function makeItem(itemCode, title, whyItMatters, frequencyLabel, priorityHorizon, displayOrder) {
  return {
    itemCode,
    title,
    whyItMatters,
    frequencyLabel,
    priorityHorizon,
    displayOrder,
  };
}

const RULE_CATALOG = {
  '30-39': {
    female: [
      makeItem(
        'bp-check-30-39-female',
        'Check blood pressure',
        'Early checks catch silent changes sooner.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'dental-cleaning-30-39-female',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        2,
      ),
      makeItem(
        'cervical-screening-review-30-39-female',
        'Review cervical screening timing',
        'Timelines shift with age and should be confirmed at your annual visit.',
        'At your next annual visit',
        'Later',
        3,
      ),
    ],
    male: [
      makeItem(
        'bp-check-30-39-male',
        'Check blood pressure',
        'Early checks catch silent changes sooner.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'dental-cleaning-30-39-male',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        2,
      ),
      makeItem(
        'cholesterol-screening-review-30-39-male',
        'Review cholesterol screening timing',
        'Age-based screening windows deserve a quick annual review.',
        'At your next annual visit',
        'Later',
        3,
      ),
    ],
  },
  '40-54': {
    female: [
      makeItem(
        'bp-check-40-54-female',
        'Check blood pressure',
        'A routine check helps catch trend changes early.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'blood-panel-40-54-female',
        'Plan a preventive blood panel',
        'Lab review gives a simple baseline for this age band.',
        'Within 2 months',
        'Soon',
        2,
      ),
      makeItem(
        'dental-cleaning-40-54-female',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        3,
      ),
      makeItem(
        'breast-screening-review-40-54-female',
        'Review breast screening timing',
        'Screening windows can change across this age band.',
        'At your next annual visit',
        'Later',
        4,
      ),
    ],
    male: [
      makeItem(
        'bp-check-40-54-male',
        'Check blood pressure',
        'A routine check helps catch trend changes early.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'blood-panel-40-54-male',
        'Plan a preventive blood panel',
        'Lab review gives a simple baseline for this age band.',
        'Within 2 months',
        'Soon',
        2,
      ),
      makeItem(
        'dental-cleaning-40-54-male',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        3,
      ),
      makeItem(
        'colorectal-screening-review-40-54-male',
        'Review colorectal screening timing',
        'Screening windows can change across this age band.',
        'At your next annual visit',
        'Later',
        4,
      ),
    ],
  },
  '55-65': {
    female: [
      makeItem(
        'bp-check-55-65-female',
        'Check blood pressure',
        'A quick check helps keep the highest-priority items visible.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'annual-visit-55-65-female',
        'Schedule an annual preventive visit',
        'This age band benefits from a regular planning touchpoint.',
        'Within 1 month',
        'Today',
        2,
      ),
      makeItem(
        'bone-health-review-55-65-female',
        'Review bone health screening timing',
        'Bone health planning is easier when it is reviewed on a schedule.',
        'Within 2 months',
        'Soon',
        3,
      ),
      makeItem(
        'dental-cleaning-55-65-female',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        4,
      ),
      makeItem(
        'mammogram-timeline-55-65-female',
        'Review mammogram timing',
        'Age-based screening timelines deserve a clear annual review.',
        'At your next annual visit',
        'Later',
        5,
      ),
    ],
    male: [
      makeItem(
        'bp-check-55-65-male',
        'Check blood pressure',
        'A quick check helps keep the highest-priority items visible.',
        'This week',
        'Today',
        1,
      ),
      makeItem(
        'annual-visit-55-65-male',
        'Schedule an annual preventive visit',
        'This age band benefits from a regular planning touchpoint.',
        'Within 1 month',
        'Today',
        2,
      ),
      makeItem(
        'lab-review-55-65-male',
        'Review cholesterol and glucose labs',
        'A simple lab review keeps next steps easy to prioritize.',
        'Within 2 months',
        'Soon',
        3,
      ),
      makeItem(
        'dental-cleaning-55-65-male',
        'Book a dental cleaning',
        'Routine care keeps preventive visits predictable.',
        'Within 3 months',
        'Soon',
        4,
      ),
      makeItem(
        'prostate-screening-review-55-65-male',
        'Discuss prostate screening timing',
        'Age-based screening timelines deserve a clear annual review.',
        'At your next annual visit',
        'Later',
        5,
      ),
    ],
  },
};

function parseAgeYears(value) {
  const ageText = String(value ?? '').trim();
  if (!/^\d+$/.test(ageText)) {
    return null;
  }

  const ageYears = Number(ageText);
  return Number.isInteger(ageYears) ? ageYears : null;
}

function getAgeBand(ageYears) {
  return AGE_BANDS.find((band) => ageYears >= band.min && ageYears <= band.max) ?? null;
}

function getPlanItemsForDraft(ageYears, gender) {
  const ageBand = getAgeBand(ageYears);
  if (!ageBand) {
    throw new Error('No rule set is available for this age.');
  }

  const bandCatalog = RULE_CATALOG[ageBand.key];
  const bandItems = bandCatalog?.[gender];
  if (!bandItems) {
    throw new Error('No rule set is available for this gender.');
  }

  return bandItems.map((item) => ({ ...item }));
}

export function validateOnboardingDraft(draft) {
  const errors = {};
  const ageYears = parseAgeYears(draft?.ageYears);

  if (ageYears === null || ageYears < 30 || ageYears > 65) {
    errors.ageYears = 'Enter your age in whole years between 30 and 65.';
  }

  if (draft?.gender !== 'female' && draft?.gender !== 'male') {
    errors.gender = 'Select a gender.';
  }

  return errors;
}

export function calculateHealthScore(planItems) {
  const penalty = planItems.reduce((sum, item) => {
    const weight = HORIZON_SCORE_WEIGHTS[item.priorityHorizon];
    if (typeof weight !== 'number') {
      throw new Error(`Unsupported priority horizon: ${item.priorityHorizon}`);
    }

    return sum + weight;
  }, 0);

  return Math.max(0, 100 - penalty);
}

export function generatePersonalHealthPlan(draft) {
  const errors = validateOnboardingDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error('Cannot generate a plan from invalid onboarding data.');
  }

  const ageYears = parseAgeYears(draft.ageYears);
  const gender = draft.gender;
  const planItems = getPlanItemsForDraft(ageYears, gender);

  if (planItems.length === 0) {
    throw new Error('Generated plan must not be empty.');
  }

  return {
    planItems,
    healthScore: calculateHealthScore(planItems),
  };
}

export function createProfileSnapshot(draft) {
  const { planItems, healthScore } = generatePersonalHealthPlan(draft);
  const ageYears = parseAgeYears(draft.ageYears);

  return {
    profileId: `profile-${ageYears}-${draft.gender}`,
    ageYears,
    gender: draft.gender,
    ruleSetVersion: RULE_SET_VERSION,
    generatedAt: new Date().toISOString(),
    healthScore,
    planItems,
  };
}

export function groupPlanItems(planItems) {
  const grouped = Object.fromEntries(PRIORITY_HORIZONS.map((horizon) => [horizon, []]));

  for (const item of planItems) {
    if (!grouped[item.priorityHorizon]) {
      throw new Error(`Unsupported priority horizon: ${item.priorityHorizon}`);
    }

    grouped[item.priorityHorizon].push({ ...item });
  }

  for (const horizon of PRIORITY_HORIZONS) {
    grouped[horizon].sort((left, right) => left.displayOrder - right.displayOrder);
  }

  return grouped;
}
