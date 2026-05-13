import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REMINDER_TIMING_TYPES,
} from '../../src/features/item-completion-and-reminder-actions/model.js';
import {
  markItemDoneInSnapshot,
  scheduleItemReminderInSnapshot,
} from '../../src/features/item-completion-and-reminder-actions/actions.js';
import {
  generateInitialPlanSnapshot,
} from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  PROFILE_AREA_ERRORS,
} from '../../src/features/profile-area-and-household-preferences/model.js';
import {
  createProfileAreaAndHouseholdPreferencesSession,
} from '../../src/features/profile-area-and-household-preferences/service.js';

function createSession() {
  return createProfileAreaAndHouseholdPreferencesSession({
    now: () => new Date('2026-05-05T10:00:00.000Z'),
    planGenerator: (profile, options = {}) => generateInitialPlanSnapshot(profile, options),
  });
}

test('profile area supports create, view, and edit for household profiles', async () => {
  const session = createSession();

  const selfResult = await session.createProfile({
    displayLabel: 'You',
    age: '45',
    gender: 'female',
  }, { profileId: 'self' });

  assert.equal(selfResult.isValid, true);

  const profileResult = await session.createProfile({
    displayLabel: 'Ava',
    age: '8',
    gender: 'female',
  }, { profileId: 'profile-ava' });

  assert.equal(profileResult.isValid, true);
  assert.equal(profileResult.plan.items.length, 0);

  const overview = session.getHouseholdOverview();
  assert.equal(overview.length, 2);

  const avaCard = overview.find((card) => card.profileId === 'profile-ava');
  assert.ok(avaCard);
  assert.equal(avaCard.displayLabel, 'Ava');
  assert.equal(avaCard.descriptor, 'Age 8 - Female');
  assert.equal(avaCard.healthScore, null);
  assert.equal(avaCard.healthScoreLabel, 'N/A');
  assert.equal(session.getState().activeProfileId, 'profile-ava');
  assert.deepEqual(avaCard.destinations.map((target) => target.label), ['Dashboard', 'Plan', 'Vaccinations']);

  const beforeEditPlan = session.getPlanSnapshot('profile-ava');
  const editResult = await session.updateProfileBasics('profile-ava', {
    displayLabel: 'Ava M.',
    age: '8',
    gender: 'female',
  });

  assert.equal(editResult.isValid, true);
  assert.equal(editResult.planRegenerated, false);

  const afterEditPlan = session.getPlanSnapshot('profile-ava');
  assert.deepEqual(afterEditPlan.items, beforeEditPlan.items);
  assert.equal(session.getProfile('profile-ava').displayLabel, 'Ava M.');
});

test('editing age or gender regenerates only the selected profile plan and dashboard in-session', async () => {
  const session = createSession();

  await session.createProfile({
    displayLabel: 'You',
    age: '52',
    gender: 'female',
  }, { profileId: 'self' });

  await session.createProfile({
    displayLabel: 'Sam',
    age: '45',
    gender: 'male',
  }, { profileId: 'profile-sam' });

  const selfPlanBefore = session.getPlanSnapshot('self');

  session.setManualEntries('profile-sam', [{
    id: 'manual-1',
    profileId: 'profile-sam',
    vaccinationKey: 'influenza-vaccine',
    statusContext: 'completed',
    entryDate: '2026-05-01',
    createdAt: '2026-05-01T00:00:00.000Z',
  }]);

  const samBasePlan = session.getPlanSnapshot('profile-sam');
  const doneResult = markItemDoneInSnapshot(samBasePlan, 'profile-sam', 'annual-wellness-visit');
  const reminderResult = scheduleItemReminderInSnapshot(
    doneResult.planSnapshot,
    'profile-sam',
    'blood-pressure-check',
    { timingType: REMINDER_TIMING_TYPES.one_month },
    () => new Date('2026-05-05T10:00:00.000Z'),
  );

  session.setPlanSnapshot('profile-sam', reminderResult.planSnapshot);

  const updateResult = await session.updateProfileBasics('profile-sam', {
    displayLabel: 'Sam',
    age: '45',
    gender: 'female',
  });

  assert.equal(updateResult.isValid, true);
  assert.equal(updateResult.planRegenerated, true);

  const updatedSamPlan = session.getPlanSnapshot('profile-sam');
  const annual = updatedSamPlan.items.find((item) => item.catalogItemId === 'annual-wellness-visit');
  const pressure = updatedSamPlan.items.find((item) => item.catalogItemId === 'blood-pressure-check');

  assert.ok(annual);
  assert.equal(annual.status, 'done');
  assert.ok(pressure);
  assert.equal(pressure.status, 'pending');
  assert.ok(pressure.reminder?.scheduledFor);

  assert.equal(
    updatedSamPlan.items.some((item) => item.catalogItemId === 'prostate-health-discussion'),
    false,
  );
  assert.equal(
    updatedSamPlan.items.some((item) => item.catalogItemId === 'cervical-cancer-screening'),
    true,
  );

  assert.equal(session.getManualEntries('profile-sam').length, 1);
  assert.deepEqual(session.getPlanSnapshot('self'), selfPlanBefore);
  assert.equal(Number.isFinite(updateResult.dashboardProjection.healthScore), true);
});

test('preferences surface includes reminder settings only', async () => {
  const session = createSession();

  await session.createProfile({
    displayLabel: 'You',
    age: '40',
    gender: 'male',
  }, { profileId: 'self' });

  const viewModel = session.getPreferencesViewModel();
  assert.deepEqual(viewModel.sectionIds, ['reminder_settings']);
  assert.equal(viewModel.sections.length, 1);

  const invalidSettings = session.updateReminderSettings({
    remindersEnabled: true,
    defaultTiming: REMINDER_TIMING_TYPES.custom_date,
  });

  assert.equal(invalidSettings.isValid, false);
  assert.ok(invalidSettings.errors.defaultTiming);

  const validSettings = session.updateReminderSettings({
    remindersEnabled: false,
    defaultTiming: REMINDER_TIMING_TYPES.three_months,
  });

  assert.equal(validSettings.isValid, true);
  assert.deepEqual(session.getState().reminderSettings, {
    remindersEnabled: false,
    defaultTiming: REMINDER_TIMING_TYPES.three_months,
  });

  const capabilities = session.getProfileManagementCapabilities();
  assert.deepEqual(capabilities.profileActions, ['create', 'view', 'edit']);
  assert.equal(capabilities.profileActions.includes('delete'), false);
  assert.equal(capabilities.profileActions.includes('archive'), false);
});

test('household creation enforces the five-profile maximum without delete or archive fallback', async () => {
  const session = createSession();

  await session.createProfile({ displayLabel: 'You', age: '40', gender: 'female' }, { profileId: 'self' });
  await session.createProfile({ displayLabel: 'P1', age: '9', gender: 'male' }, { profileId: 'profile-1' });
  await session.createProfile({ displayLabel: 'P2', age: '10', gender: 'female' }, { profileId: 'profile-2' });
  await session.createProfile({ displayLabel: 'P3', age: '11', gender: 'male' }, { profileId: 'profile-3' });
  await session.createProfile({ displayLabel: 'P4', age: '12', gender: 'female' }, { profileId: 'profile-4' });

  await assert.rejects(
    session.createProfile({ displayLabel: 'Extra', age: '5', gender: 'male' }),
    new RegExp(PROFILE_AREA_ERRORS.profileLimitReached, 'i'),
  );
});

test('profile-area family creation matches self baseline for 14-year-old male inputs', async () => {
  const now = new Date('2026-05-05T10:00:00.000Z');
  const baselineSelf = generateInitialPlanSnapshot({
    profileId: 'self',
    age: 14,
    gender: 'male',
  }, { now });

  const session = createSession();
  await session.createProfile({ displayLabel: 'You', age: '40', gender: 'female' }, { profileId: 'self' });

  const result = await session.createProfile(
    { displayLabel: 'Teen', age: '14', gender: 'male' },
    { profileId: 'profile-teen' },
  );

  assert.equal(result.isValid, true);
  assert.deepEqual(
    result.plan.items.map((item) => item.catalogItemId),
    baselineSelf.items.map((item) => item.catalogItemId),
  );
  assert.equal(result.plan.items.length, 0);
});
