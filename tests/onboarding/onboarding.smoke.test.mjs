import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIORITY_HORIZONS,
  calculateHealthScore,
  createProfileSnapshot,
  generatePersonalHealthPlan,
  groupPlanItems,
  validateOnboardingDraft,
} from '../../src/features/profile/profilePlan.js';

test('valid onboarding inputs generate a deterministic, non-empty plan', () => {
  const draft = { ageYears: '42', gender: 'female' };

  assert.deepEqual(validateOnboardingDraft(draft), {});

  const firstPlan = generatePersonalHealthPlan(draft);
  const secondPlan = generatePersonalHealthPlan(draft);

  assert.deepEqual(firstPlan, secondPlan);
  assert.ok(firstPlan.planItems.length > 0);
  assert.equal(firstPlan.healthScore, calculateHealthScore(firstPlan.planItems));

  const grouped = groupPlanItems(firstPlan.planItems);
  assert.deepEqual(Object.keys(grouped), PRIORITY_HORIZONS);

  const flattened = Object.values(grouped).flat();
  assert.equal(flattened.length, firstPlan.planItems.length);
  assert.equal(new Set(flattened.map((item) => item.itemCode)).size, firstPlan.planItems.length);
  assert.ok(flattened.every((item) => PRIORITY_HORIZONS.includes(item.priorityHorizon)));
});

test('boundary inputs at 30 and 65 still generate plans', () => {
  for (const draft of [
    { ageYears: '30', gender: 'female' },
    { ageYears: '30', gender: 'male' },
    { ageYears: '65', gender: 'female' },
    { ageYears: '65', gender: 'male' },
  ]) {
    const plan = generatePersonalHealthPlan(draft);
    assert.ok(plan.planItems.length > 0);
  }
});

test('invalid onboarding inputs are rejected', () => {
  assert.ok(validateOnboardingDraft({ ageYears: '', gender: '' }).ageYears);
  assert.ok(validateOnboardingDraft({ ageYears: '29', gender: 'female' }).ageYears);
  assert.ok(validateOnboardingDraft({ ageYears: '40.5', gender: 'female' }).ageYears);
  assert.ok(validateOnboardingDraft({ ageYears: '40', gender: 'other' }).gender);
});

test('profile snapshots are generated from the validated draft only', () => {
  const snapshot = createProfileSnapshot({ ageYears: '55', gender: 'male' });

  assert.equal(snapshot.ageYears, 55);
  assert.equal(snapshot.gender, 'male');
  assert.equal(snapshot.ruleSetVersion, 'sl-001-2026-04-25');
  assert.ok(snapshot.generatedAt.includes('T'));
  assert.ok(snapshot.planItems.length > 0);
  assert.equal(snapshot.healthScore, calculateHealthScore(snapshot.planItems));
});
