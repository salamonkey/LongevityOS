import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEALTH_ITEM_STATUS,
  calculateDisplayedHealthScore,
  createHealthItemsFromProfile,
  getHealthItemStatusContext,
  groupHealthItemsForDashboard,
  markHealthItemDone,
  mergePersistedHealthItems,
} from '../../src/features/health-item-detail-and-completion/healthItemsModel.js';

function makeProfile() {
  return {
    profileId: 'profile-42-female',
    ageYears: 42,
    gender: 'female',
    ruleSetVersion: 'sl-001-2026-04-25',
    generatedAt: '2026-04-30T08:00:00.000Z',
    planItems: [
      {
        itemCode: 'due-item',
        title: 'Check blood pressure',
        whyItMatters: 'Catch trend changes early.',
        frequencyLabel: 'This week',
        priorityHorizon: 'Today',
        displayOrder: 1,
      },
      {
        itemCode: 'planned-item',
        title: 'Plan a blood panel',
        whyItMatters: 'Creates a prevention baseline.',
        frequencyLabel: 'Within 2 months',
        priorityHorizon: 'Soon',
        displayOrder: 2,
      },
      {
        itemCode: 'later-item',
        title: 'Review annual screening',
        whyItMatters: 'Confirms timing for this age band.',
        frequencyLabel: 'At your next annual visit',
        priorityHorizon: 'Later',
        displayOrder: 3,
      },
    ],
  };
}

test('profile plan items map into unified health-item records', () => {
  const items = createHealthItemsFromProfile(makeProfile());

  assert.equal(items.length, 3);
  assert.equal(items[0].status, HEALTH_ITEM_STATUS.DUE);
  assert.equal(items[1].status, HEALTH_ITEM_STATUS.PLANNED);
  assert.equal(items[2].status, HEALTH_ITEM_STATUS.PLANNED);
  assert.ok(items[0].nextDueDate);
  assert.ok(items[1].plannedForDate);
  assert.equal(items[0].actionLabel, items[0].title);
  assert.ok(items.every((item) => item.updatedAt));
});

test('completion updates status and dashboard grouping while excluding done items', () => {
  const profile = makeProfile();
  const baseItems = createHealthItemsFromProfile(profile);
  const completedAt = new Date('2026-04-30T12:00:00.000Z');

  const afterDone = markHealthItemDone(profile.profileId, 'planned-item', baseItems, completedAt);
  const updated = afterDone.find((item) => item.id === 'planned-item');

  assert.equal(updated.status, HEALTH_ITEM_STATUS.DONE);
  assert.equal(updated.lastCompletedAt, completedAt.toISOString());
  assert.equal(updated.plannedForDate, null);

  const grouped = groupHealthItemsForDashboard(afterDone);
  assert.equal(grouped.Soon.some((item) => item.id === 'planned-item'), false);
  assert.equal(grouped.Today.length + grouped.Soon.length + grouped.Later.length, 2);
});

test('completion rejects already done items', () => {
  const profile = makeProfile();
  const baseItems = createHealthItemsFromProfile(profile);
  const onceDone = markHealthItemDone(profile.profileId, 'due-item', baseItems, new Date('2026-04-30T09:00:00.000Z'));

  assert.throws(() => {
    markHealthItemDone(profile.profileId, 'due-item', onceDone, new Date('2026-04-30T10:00:00.000Z'));
  }, /already done/);
});

test('displayed health score updates through shared score calculator after completion', () => {
  const profile = makeProfile();
  const baseItems = createHealthItemsFromProfile(profile);
  const scoreBefore = calculateDisplayedHealthScore(baseItems);
  const afterDone = markHealthItemDone(profile.profileId, 'due-item', baseItems, new Date('2026-04-30T12:00:00.000Z'));
  const scoreAfter = calculateDisplayedHealthScore(afterDone);

  assert.ok(scoreAfter > scoreBefore);
});

test('status context is derived from status timestamps', () => {
  const profile = makeProfile();
  const baseItems = createHealthItemsFromProfile(profile);
  const doneItems = markHealthItemDone(profile.profileId, 'due-item', baseItems, new Date('2026-04-30T12:00:00.000Z'));

  assert.match(getHealthItemStatusContext(baseItems[0]), /Due/);
  assert.match(getHealthItemStatusContext(baseItems[1]), /Planned/);
  assert.match(getHealthItemStatusContext(doneItems[0]), /Completed/);
});

test('persisted item statuses are merged into the profile-derived base records', () => {
  const profile = makeProfile();
  const completedAt = '2026-04-30T12:00:00.000Z';

  const merged = mergePersistedHealthItems(profile, [
    {
      id: 'planned-item',
      profileId: profile.profileId,
      status: HEALTH_ITEM_STATUS.DONE,
      nextDueDate: null,
      plannedForDate: null,
      lastCompletedAt: completedAt,
      updatedAt: completedAt,
    },
  ]);

  const persisted = merged.find((item) => item.id === 'planned-item');
  assert.equal(persisted.status, HEALTH_ITEM_STATUS.DONE);
  assert.equal(persisted.lastCompletedAt, completedAt);
});
