import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot, generateInitialPlanSnapshotAsync, resolveNonApplicableCatalogItems } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  TEST_CATALOG_IDS,
  TEST_CATALOG_OPTIONS,
  withTestCatalogOptions,
} from '../fixtures/catalogOptions.js';

const CATALOG_ITEM_IDS = TEST_CATALOG_IDS;

test('generated items come from locked catalog and have approved categories', () => {
  const profile = { profileId: 'self', age: 38, gender: 'female' };
  const snapshot = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }));

  assert.equal(snapshot.catalogVersion, TEST_CATALOG_OPTIONS.catalogVersion);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_ITEM_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination', 'counseling'].includes(item.category), true);
  }
});

test('plan generation is deterministic for same profile and generation timestamp', () => {
  const profile = { profileId: 'self', age: 52, gender: 'male' };
  const now = new Date('2026-05-05T08:00:00.000Z');

  const first = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now }));
  const second = generateInitialPlanSnapshot(profile, withTestCatalogOptions({ now }));

  assert.deepEqual(first, second);
});

test('female and male paths both generate at least one item', () => {
  const female = generateInitialPlanSnapshot({ profileId: 'self-f', age: 30, gender: 'female' }, withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }));
  const male = generateInitialPlanSnapshot({ profileId: 'self-m', age: 30, gender: 'male' }, withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }));

  assert.ok(female.items.length > 0);
  assert.ok(male.items.length > 0);
});

test('async generation completes within 5 seconds under normal conditions', async () => {
  const profile = { profileId: 'self', age: 30, gender: 'female' };
  const start = Date.now();

  await generateInitialPlanSnapshotAsync(profile, {
    delayMs: 100,
    now: new Date('2026-05-05T08:00:00.000Z'),
    ...TEST_CATALOG_OPTIONS,
  });

  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000);
});

test('hiv screening is not included by default without explicit risk context', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  assert.equal(
    snapshot.items.some((item) => item.catalogItemId === 'hiv-screening'),
    false,
  );
});

test('hiv screening is included when hiv risk context is explicitly present', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female', riskFlags: ['hiv'] },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  assert.equal(
    snapshot.items.some((item) => item.catalogItemId === 'hiv-screening'),
    true,
  );
});

test('a rule band cadence overrides the item-level cadence when present', () => {
  const catalog = [{
    itemId: 'synthetic-band-cadence-item',
    name: 'Synthetic band cadence item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'Every 3 years',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [{
      gender: 'female',
      minAge: 18,
      maxAge: 120,
      targetAge: 18,
      priorityOrder: 1,
      cadenceLabel: 'Every year',
      recurrenceIntervalDays: 365,
    }],
  }];

  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 30, gender: 'female' },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const item = snapshot.items.find((entry) => entry.catalogItemId === 'synthetic-band-cadence-item');
  assert.ok(item);
  assert.equal(item.cadenceLabel, 'Every year');
  assert.equal(item.recurrence.intervalDays, 365);
});

test('band-level required risk flags let one item auto-include for one band and stay risk-gated for another', () => {
  const catalog = [{
    itemId: 'synthetic-band-risk-item',
    name: 'Synthetic band risk item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'By recommendation',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [
      {
        gender: 'female', minAge: 18, maxAge: 24, targetAge: 18, priorityOrder: 1,
      },
      {
        gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 2, requiredRiskFlags: ['sti_risk_behavior'],
      },
      {
        gender: 'male', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 2, requiredRiskFlags: ['sti_risk_behavior'],
      },
    ],
  }];

  const hasItem = (profile) => generateInitialPlanSnapshot(
    profile,
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  ).items.some((entry) => entry.catalogItemId === 'synthetic-band-risk-item');

  assert.equal(hasItem({ profileId: 'a', age: 20, gender: 'female' }), true, 'young woman auto-includes with no risk flag');
  assert.equal(hasItem({ profileId: 'b', age: 30, gender: 'female' }), false, 'older woman without the risk flag is excluded');
  assert.equal(hasItem({ profileId: 'c', age: 30, gender: 'female', riskFlags: ['sti_risk_behavior'] }), true, 'older woman with the risk flag is included');
  assert.equal(hasItem({ profileId: 'd', age: 30, gender: 'male' }), false, 'man without the risk flag is excluded');
});

test('a generated item records which risk flag(s) actually justified its inclusion, for the detail page\'s "why is this on my list" copy', () => {
  const catalog = [{
    itemId: 'synthetic-matched-flags-item',
    name: 'Synthetic matched flags item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'By recommendation',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [
      {
        gender: 'female', minAge: 18, maxAge: 24, targetAge: 18, priorityOrder: 1,
      },
      {
        gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 2, requiredRiskFlags: ['sti_risk_behavior'],
      },
    ],
  }];

  const universalItem = generateInitialPlanSnapshot(
    { profileId: 'a', age: 20, gender: 'female' },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  ).items.find((entry) => entry.catalogItemId === 'synthetic-matched-flags-item');
  assert.deepEqual(universalItem.matchedRiskFlags, [], 'a band with no required flags records an empty array, not undefined');

  const riskGatedItem = generateInitialPlanSnapshot(
    { profileId: 'b', age: 30, gender: 'female', riskFlags: ['sti_risk_behavior'] },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  ).items.find((entry) => entry.catalogItemId === 'synthetic-matched-flags-item');
  assert.deepEqual(riskGatedItem.matchedRiskFlags, ['sti_risk_behavior']);
});

test('item-level required_risk_flags are recorded as matchedRiskFlags when no band-level override is present', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female', riskFlags: ['hiv'] },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  const item = snapshot.items.find((entry) => entry.catalogItemId === 'hiv-screening');
  assert.ok(item, 'fixture catalog must include hiv-screening for this assertion to be meaningful');
  assert.deepEqual(item.matchedRiskFlags, ['hiv']);
});

test('a rule band explicitly tagged for one guideline country only matches a profile that selected that country', () => {
  const catalog = [{
    itemId: 'synthetic-country-item',
    name: 'Synthetic country item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'By recommendation',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [{
      gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 1, countryCode: 'CH',
    }],
  }];

  const hasItem = (guidelineCountryCode) => generateInitialPlanSnapshot(
    { profileId: 'a', age: 30, gender: 'female', guidelineCountryCode },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  ).items.some((entry) => entry.catalogItemId === 'synthetic-country-item');

  assert.equal(hasItem('CH'), true, 'a profile following Swiss guidelines matches a CH-tagged band');
  assert.equal(hasItem('US'), false, 'a profile following a different guideline country does not match');
  assert.equal(hasItem(undefined), false, 'a profile with no guideline country selected does not match an explicitly-tagged band');
});

test('a rule band with no country_code declared is universal and matches regardless of the profile\'s selected guideline country', () => {
  const catalog = [{
    itemId: 'synthetic-universal-item',
    name: 'Synthetic universal item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'By recommendation',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [{
      gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 1,
    }],
  }];

  const hasItem = (guidelineCountryCode) => generateInitialPlanSnapshot(
    { profileId: 'a', age: 30, gender: 'female', guidelineCountryCode },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  ).items.some((entry) => entry.catalogItemId === 'synthetic-universal-item');

  assert.equal(hasItem('CH'), true);
  assert.equal(hasItem('US'), true);
  assert.equal(hasItem(undefined), true, 'untagged bands stay backward-compatible with profiles/fixtures that never set a guideline country');
});

test('resolveNonApplicableCatalogItems explains a risk-flag-only mismatch as "risk_flag", not age/gender', () => {
  const results = resolveNonApplicableCatalogItems(
    { profileId: 'self', age: 45, gender: 'female' },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  const hiv = results.find((entry) => entry.catalogItemId === 'hiv-screening');
  assert.ok(hiv, 'hiv-screening should be non-applicable without the hiv risk flag');
  assert.deepEqual(hiv.reasons, ['risk_flag']);
  assert.deepEqual(hiv.requiredRiskFlags, ['hiv']);
});

test('resolveNonApplicableCatalogItems never lists an item that IS in the generated plan', () => {
  const profile = { profileId: 'self', age: 45, gender: 'female', riskFlags: ['hiv'] };
  const options = withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') });

  const included = new Set(generateInitialPlanSnapshot(profile, options).items.map((item) => item.catalogItemId));
  const nonApplicable = resolveNonApplicableCatalogItems(profile, options);

  assert.equal(nonApplicable.some((entry) => included.has(entry.catalogItemId)), false);
});

test('resolveNonApplicableCatalogItems explains a gender mismatch and an age mismatch correctly', () => {
  const catalog = [
    {
      itemId: 'synthetic-female-only-item',
      name: 'Synthetic female-only item',
      category: 'checkup',
      effortLevel: 'low',
      cadenceLabel: 'By recommendation',
      whyItMatters: 'Test fixture.',
      requiredRiskFlags: [],
      ruleBands: [{
        gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 1,
      }],
    },
    {
      itemId: 'synthetic-65plus-item',
      name: 'Synthetic 65+ item',
      category: 'checkup',
      effortLevel: 'low',
      cadenceLabel: 'By recommendation',
      whyItMatters: 'Test fixture.',
      requiredRiskFlags: [],
      ruleBands: [{
        gender: 'male', minAge: 65, maxAge: 120, targetAge: 65, priorityOrder: 1,
      }],
    },
  ];

  const results = resolveNonApplicableCatalogItems(
    { profileId: 'a', age: 30, gender: 'male' },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const femaleOnly = results.find((entry) => entry.catalogItemId === 'synthetic-female-only-item');
  assert.deepEqual(femaleOnly.reasons, ['gender']);

  const sixtyFivePlus = results.find((entry) => entry.catalogItemId === 'synthetic-65plus-item');
  assert.deepEqual(sixtyFivePlus.reasons, ['age']);
});

test('resolveNonApplicableCatalogItems explains a guideline-country mismatch', () => {
  const catalog = [{
    itemId: 'synthetic-ch-only-item',
    name: 'Synthetic CH-only item',
    category: 'checkup',
    effortLevel: 'low',
    cadenceLabel: 'By recommendation',
    whyItMatters: 'Test fixture.',
    requiredRiskFlags: [],
    ruleBands: [{
      gender: 'female', minAge: 18, maxAge: 120, targetAge: 18, priorityOrder: 1, countryCode: 'CH',
    }],
  }];

  const results = resolveNonApplicableCatalogItems(
    { profileId: 'a', age: 30, gender: 'female', guidelineCountryCode: 'US' },
    { catalog, catalogVersion: 'test', now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const item = results.find((entry) => entry.catalogItemId === 'synthetic-ch-only-item');
  assert.deepEqual(item.reasons, ['country']);
});

test('items with recurrence longer than one year are not initialized in Today at onboarding', () => {
  const snapshot = generateInitialPlanSnapshot(
    { profileId: 'self', age: 45, gender: 'female' },
    withTestCatalogOptions({ now: new Date('2026-05-05T08:00:00.000Z') }),
  );

  const violatingItems = snapshot.items.filter((item) => (
    item.initialBucket === 'today'
    && Number.isFinite(Number(item?.recurrence?.intervalDays))
    && Number(item.recurrence.intervalDays) > 365
  ));

  assert.equal(violatingItems.length, 0);
});
