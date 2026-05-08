import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateInitialPlanSnapshot,
} from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  FAMILY_ACCOUNT_ERRORS,
} from '../../src/features/family-onboarding-and-family-overview/model.js';
import {
  FAMILY_SURFACES,
  createFamilyAccountSession,
} from '../../src/features/family-onboarding-and-family-overview/service.js';

function createSession() {
  return createFamilyAccountSession({
    now: () => new Date('2026-05-05T08:00:00.000Z'),
    planGenerator: (profile, options = {}) => generateInitialPlanSnapshot(profile, options),
  });
}

test('onboarding keeps self flow unblocked while allowing optional family profile creation', async () => {
  const session = createSession();

  const selfResult = await session.createSelfProfile({ age: '42', gender: 'female' });
  assert.equal(selfResult.isValid, true);
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.onboardingFamily);

  const completeWithoutFamily = session.completeOnboarding();
  assert.equal(completeWithoutFamily.surface, FAMILY_SURFACES.dashboard);
  assert.equal(session.getState().profiles.length, 1);

  session.openFamilyOverview();

  const secondProfile = await session.addFamilyProfile({
    displayLabel: 'Alex',
    age: '10',
    gender: 'male',
  }, {
    profileId: 'profile-alex',
  });

  assert.equal(secondProfile.isValid, true);
  assert.equal(session.getState().profiles.length, 2);
});

test('account cannot exceed five profiles across onboarding and post-onboarding creation', async () => {
  const session = createSession();

  await session.createSelfProfile({ age: '40', gender: 'female' });

  for (let index = 1; index <= 4; index += 1) {
    const result = await session.addFamilyProfile({
      displayLabel: `Child ${index}`,
      age: `${index + 5}`,
      gender: index % 2 === 0 ? 'female' : 'male',
    }, {
      profileId: `profile-child-${index}`,
    });

    assert.equal(result.isValid, true);
  }

  assert.equal(session.getState().profiles.length, 5);

  await assert.rejects(
    session.addFamilyProfile({ displayLabel: 'Extra', age: '7', gender: 'female' }),
    new RegExp(FAMILY_ACCOUNT_ERRORS.profileLimitReached, 'i'),
  );
});

test('each profile receives a separate plan, overview score, and due summary', async () => {
  const session = createSession();

  await session.createSelfProfile({ age: '52', gender: 'female' });
  await session.addFamilyProfile({ displayLabel: 'Sam', age: '14', gender: 'male' }, { profileId: 'profile-sam' });

  const state = session.getState();
  const selfPlan = state.plansByProfileId.self;
  const samPlan = state.plansByProfileId['profile-sam'];

  assert.ok(selfPlan);
  assert.ok(samPlan);
  assert.notDeepEqual(selfPlan.items, samPlan.items);

  const overview = session.getFamilyOverview();
  assert.equal(overview.length, 2);

  const selfOverview = overview.find((item) => item.profileId === 'self');
  const samOverview = overview.find((item) => item.profileId === 'profile-sam');

  assert.ok(selfOverview);
  assert.ok(samOverview);
  assert.equal(Number.isFinite(selfOverview.healthScore), true);
  assert.equal(samOverview.healthScore, null);
  assert.ok(selfOverview.dueSummary.length > 0);
  assert.ok(samOverview.dueSummary.length > 0);
});

test('family overview navigation opens profile-scoped dashboard, plan, and vaccinations', async () => {
  const session = createSession();

  await session.createSelfProfile({ age: '48', gender: 'female' });
  await session.addFamilyProfile({ displayLabel: 'Noah', age: '16', gender: 'male' }, { profileId: 'profile-noah' });

  session.completeOnboarding();
  session.openFamilyOverview();

  session.openProfileDashboard('profile-noah');
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.dashboard);
  assert.equal(session.getState().activeProfileId, 'profile-noah');
  assert.equal(session.getPlanSnapshot().profileId, 'profile-noah');

  session.openProfilePlan('profile-noah');
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.plan);
  assert.equal(session.getState().activeProfileId, 'profile-noah');

  session.openProfileVaccinations('profile-noah');
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.vaccinations);
  assert.equal(session.getState().activeProfileId, 'profile-noah');
});

test('profile ownership is enforced for profile-scoped destinations', async () => {
  const session = createSession();

  await session.createSelfProfile({ age: '38', gender: 'male' });

  assert.throws(
    () => session.openProfileDashboard('profile-does-not-exist'),
    new RegExp(FAMILY_ACCOUNT_ERRORS.profileNotFound, 'i'),
  );

  assert.throws(
    () => session.openProfilePlan('profile-does-not-exist'),
    new RegExp(FAMILY_ACCOUNT_ERRORS.profileNotFound, 'i'),
  );

  assert.throws(
    () => session.openProfileVaccinations('profile-does-not-exist'),
    new RegExp(FAMILY_ACCOUNT_ERRORS.profileNotFound, 'i'),
  );
});
