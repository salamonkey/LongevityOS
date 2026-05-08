import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MVP_CATALOG_VERSION,
  MVP_PREVENTIVE_CATALOG,
} from '../../src/features/self-onboarding-to-first-dashboard/catalog.js';
import {
  buildDashboardProjection,
} from '../../src/features/self-onboarding-to-first-dashboard/dashboard.js';
import {
  generateInitialPlanSnapshot,
  generateInitialPlanSnapshotAsync,
} from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  ALLOWED_PLAN_STATUSES,
  DETAIL_ORIGIN,
} from '../../src/features/health-plan-browsing-and-item-detail/model.js';
import {
  buildHealthPlanReadModel,
  resolveDetailBackTarget,
  resolveItemDetail,
} from '../../src/features/health-plan-browsing-and-item-detail/projection.js';
import {
  REMINDER_TIMING_TYPES,
} from '../../src/features/item-completion-and-reminder-actions/model.js';
import {
  markItemDoneInSnapshot,
  scheduleItemReminderInSnapshot,
} from '../../src/features/item-completion-and-reminder-actions/actions.js';
import {
  buildDashboardProjectionForSlice,
  selectHighlightedItemTodayThenSoon,
} from '../../src/features/item-completion-and-reminder-actions/selectors.js';
import {
  MANUAL_ENTRY_STATUS_CONTEXT,
  buildVaccinationDueGuidance,
} from '../../src/features/vaccination-tracking-area-and-manual-entries/model.js';
import {
  createVaccinationTrackingSession,
} from '../../src/features/vaccination-tracking-area-and-manual-entries/service.js';
import {
  FAMILY_ACCOUNT_ERRORS,
} from '../../src/features/family-onboarding-and-family-overview/model.js';
import {
  FAMILY_SURFACES,
  createFamilyAccountSession,
} from '../../src/features/family-onboarding-and-family-overview/service.js';

const CATALOG_IDS = new Set(MVP_PREVENTIVE_CATALOG.map((item) => item.itemId));

function createProfile() {
  return {
    profileId: 'self',
    age: 52,
    gender: 'female',
    name: 'You',
  };
}

function createSnapshot() {
  return generateInitialPlanSnapshot(createProfile(), {
    now: new Date('2026-05-05T08:00:00.000Z'),
  });
}

test('[SL-001] plan generation remains bounded to catalog and timing expectations', async () => {
  const snapshot = createSnapshot();

  assert.equal(snapshot.catalogVersion, MVP_CATALOG_VERSION);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination'].includes(item.category), true);
  }

  const startedAt = Date.now();
  await generateInitialPlanSnapshotAsync(createProfile(), {
    delayMs: 180,
    now: new Date('2026-05-05T08:00:00.000Z'),
  });
  assert.ok(Date.now() - startedAt < 5000);

  const dashboard = buildDashboardProjection(snapshot, createProfile());
  assert.deepEqual(dashboard.sections.map((section) => section.priority), ['today', 'soon', 'later']);
  assert.equal(Boolean(dashboard.highlightedItem), true);
  assert.equal(Number.isFinite(dashboard.healthScore), true);
});

test('[SL-002] plan list and detail visibility invariants remain stable', () => {
  const snapshot = createSnapshot();
  const readModel = buildHealthPlanReadModel(snapshot);

  assert.equal(readModel.allItems.length, snapshot.items.length);

  for (const generatedItem of snapshot.items) {
    const detail = resolveItemDetail(readModel, generatedItem.catalogItemId);

    assert.ok(detail, `Detail missing for ${generatedItem.catalogItemId}`);
    assert.equal(ALLOWED_PLAN_STATUSES.includes(detail.status), true);
    assert.ok(detail.cadenceText.length > 0);
    assert.ok(detail.whyItMattersText.length > 0);

    const backTarget = resolveDetailBackTarget({
      origin: DETAIL_ORIGIN.dashboard,
      detailItem: detail,
    });

    assert.deepEqual(backTarget, { destination: DETAIL_ORIGIN.dashboard });
  }
});

test('[SL-003] done/reminder actions still update status and highlighted-item behavior', () => {
  const baseSnapshot = createSnapshot();
  const todayItem = baseSnapshot.items.find((item) => item.status === 'due') ?? baseSnapshot.items[0];

  const doneResult = markItemDoneInSnapshot(baseSnapshot, 'self', todayItem.catalogItemId);
  assert.equal(doneResult.item.status, 'done');

  const reminderResult = scheduleItemReminderInSnapshot(
    baseSnapshot,
    'self',
    todayItem.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.one_month },
    () => new Date('2026-05-05T10:00:00.000Z'),
  );
  assert.equal(reminderResult.item.status, 'pending');

  const highlightedBefore = selectHighlightedItemTodayThenSoon(baseSnapshot);
  const highlightedAfterDone = selectHighlightedItemTodayThenSoon(doneResult.planSnapshot);

  assert.ok(highlightedBefore);
  assert.ok(highlightedAfterDone);

  const dashboardAfterDone = buildDashboardProjectionForSlice(doneResult.planSnapshot, createProfile());
  assert.equal(Boolean(dashboardAfterDone.highlightedItem), true);
});

test('[SL-004] manual vaccination entry remains immediate and keeps due guidance intact', () => {
  const snapshot = createSnapshot();
  const dueBefore = buildVaccinationDueGuidance(snapshot);

  const vaccinationSession = createVaccinationTrackingSession({
    profileId: 'self',
    planSnapshot: snapshot,
    now: () => new Date('2026-05-05T09:45:00.000Z'),
    idFactory: () => 'manual-1',
  });

  const vaccinationKey = vaccinationSession.getAllowedVaccinationKeys()[0];
  const addResult = vaccinationSession.addManualEntry({
    vaccinationKey,
    statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
    entryDate: '2026-05-01',
  });

  assert.equal(addResult.entries.length, 1);
  assert.equal(vaccinationSession.getManualEntries().length, 1);

  const dueAfter = buildVaccinationDueGuidance(snapshot);
  assert.equal(dueAfter.length, dueBefore.length);
  assert.deepEqual(
    dueAfter.map((item) => item.itemKey),
    dueBefore.map((item) => item.itemKey),
  );
});

test('[SL-005] family account profile boundaries and limits remain unchanged', async () => {
  const session = createFamilyAccountSession({
    now: () => new Date('2026-05-05T10:00:00.000Z'),
  });

  await session.createSelfProfile({ age: '42', gender: 'female' });
  await session.addFamilyProfile({ displayLabel: 'Noah', age: '12', gender: 'male' }, { profileId: 'profile-noah' });

  session.completeOnboarding();
  session.openFamilyOverview();

  session.openProfileDashboard('profile-noah');
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.dashboard);
  assert.equal(session.getPlanSnapshot().profileId, 'profile-noah');

  session.openProfilePlan('profile-noah');
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.plan);

  session.openProfileVaccinations('profile-noah');
  assert.equal(session.getState().currentSurface, FAMILY_SURFACES.vaccinations);

  await session.addFamilyProfile({ displayLabel: 'P1', age: '7', gender: 'female' }, { profileId: 'profile-1' });
  await session.addFamilyProfile({ displayLabel: 'P2', age: '8', gender: 'male' }, { profileId: 'profile-2' });
  await session.addFamilyProfile({ displayLabel: 'P3', age: '9', gender: 'female' }, { profileId: 'profile-3' });

  assert.equal(session.getState().profiles.length, 5);

  await assert.rejects(
    session.addFamilyProfile({ displayLabel: 'Extra', age: '6', gender: 'male' }),
    new RegExp(FAMILY_ACCOUNT_ERRORS.profileLimitReached, 'i'),
  );
});
