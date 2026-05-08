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

test('[SL-001] generated plan remains locked to MVP catalog and approved categories', () => {
  const snapshot = createSnapshot();

  assert.equal(snapshot.catalogVersion, MVP_CATALOG_VERSION);
  assert.ok(snapshot.items.length > 0);

  for (const item of snapshot.items) {
    assert.equal(CATALOG_IDS.has(item.catalogItemId), true);
    assert.equal(['checkup', 'vaccination'].includes(item.category), true);
  }
});

test('[SL-001] first plan generation remains under 5 seconds', async () => {
  const startedAt = Date.now();

  await generateInitialPlanSnapshotAsync(createProfile(), {
    delayMs: 200,
    now: new Date('2026-05-05T08:00:00.000Z'),
  });

  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed < 5000, `Plan generation took ${elapsed}ms`);
});

test('[SL-001] dashboard keeps Today/Soon/Later sections, highlighted item, and health score', async () => {
  const session = createFamilyAccountSession({
    now: () => new Date('2026-05-05T08:00:00.000Z'),
  });

  await session.createSelfProfile({ age: '52', gender: 'female' });

  const projection = buildDashboardProjection(session.getPlanSnapshot('self'), {
    profileId: 'self',
    name: 'You',
    age: 52,
    gender: 'female',
  });

  assert.deepEqual(projection.sections.map((section) => section.priority), ['today', 'soon', 'later']);
  assert.equal(Boolean(projection.highlightedItem), true);
  assert.equal(Number.isFinite(projection.healthScore), true);
});

test('[SL-002] every generated item remains visible and navigable with stable detail back behavior', () => {
  const snapshot = createSnapshot();
  const readModel = buildHealthPlanReadModel(snapshot);

  assert.equal(readModel.allItems.length, snapshot.items.length);

  for (const generated of snapshot.items) {
    const detail = resolveItemDetail(readModel, generated.catalogItemId);

    assert.ok(detail, `Detail missing for ${generated.catalogItemId}`);
    assert.equal(ALLOWED_PLAN_STATUSES.includes(detail.status), true);
    assert.ok(detail.cadenceText.length > 0);
    assert.ok(detail.whyItMattersText.length > 0);
    assert.deepEqual(
      resolveDetailBackTarget({ origin: DETAIL_ORIGIN.dashboard, detailItem: detail }),
      { destination: DETAIL_ORIGIN.dashboard },
    );
  }
});

test('[SL-003] mark done and reminder actions still update status and highlighted item rules', () => {
  const profile = createProfile();
  const base = createSnapshot();
  const todayItem = base.items.find((item) => item.status === 'due') ?? base.items[0];

  const doneResult = markItemDoneInSnapshot(base, profile.profileId, todayItem.catalogItemId);
  assert.equal(doneResult.item.status, 'done');

  const reminderResult = scheduleItemReminderInSnapshot(
    base,
    profile.profileId,
    todayItem.catalogItemId,
    { timingType: REMINDER_TIMING_TYPES.one_month },
    () => new Date('2026-05-05T10:00:00.000Z'),
  );

  assert.equal(reminderResult.item.status, 'pending');

  const highlightedBefore = selectHighlightedItemTodayThenSoon(base);
  const highlightedAfterDone = selectHighlightedItemTodayThenSoon(doneResult.planSnapshot);

  assert.ok(highlightedBefore);
  assert.ok(highlightedAfterDone);

  const dashboardAfterDone = buildDashboardProjectionForSlice(doneResult.planSnapshot, profile);
  assert.equal(Boolean(dashboardAfterDone.highlightedItem), true);
});

test('[SL-004] manual vaccination entry still appears immediately and does not rewrite due guidance', () => {
  const snapshot = createSnapshot();
  const dueBefore = buildVaccinationDueGuidance(snapshot);

  const session = createVaccinationTrackingSession({
    profileId: 'self',
    planSnapshot: snapshot,
    now: () => new Date('2026-05-05T09:45:00.000Z'),
    idFactory: () => 'manual-1',
  });

  const vaccinationKey = session.getAllowedVaccinationKeys()[0];
  const addResult = session.addManualEntry({
    vaccinationKey,
    statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
    entryDate: '2026-05-01',
  });

  assert.equal(addResult.entries.length, 1);
  assert.equal(session.getManualEntries().length, 1);

  const dueAfter = buildVaccinationDueGuidance(snapshot);
  assert.equal(dueAfter.length, dueBefore.length);
  assert.deepEqual(
    dueAfter.map((item) => item.itemKey),
    dueBefore.map((item) => item.itemKey),
  );
});
