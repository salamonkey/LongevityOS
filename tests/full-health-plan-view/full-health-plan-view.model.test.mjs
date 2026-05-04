import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHealthItemsFromProfile,
  groupHealthItemsForDashboard,
  markHealthItemDone,
} from '../../src/features/health-item-detail-and-completion/healthItemsModel.js';
import {
  calculatePlanTotals,
  hasUniqueHealthItemsById,
  sortHealthPlanItems,
} from '../../src/features/full-health-plan-view/fullHealthPlanModel.js';

function makeProfile() {
  return {
    profileId: 'profile-55-female',
    ageYears: 55,
    gender: 'female',
    generatedAt: '2026-05-02T10:00:00.000Z',
    planItems: [
      {
        itemCode: 'later-item',
        title: 'Review mammogram timing',
        whyItMatters: 'Keep age-based screening current.',
        frequencyLabel: 'At your next annual visit',
        priorityHorizon: 'Later',
        displayOrder: 3,
      },
      {
        itemCode: 'today-item',
        title: 'Check blood pressure',
        whyItMatters: 'Catch silent changes early.',
        frequencyLabel: 'This week',
        priorityHorizon: 'Today',
        displayOrder: 1,
      },
      {
        itemCode: 'soon-item',
        title: 'Book a dental cleaning',
        whyItMatters: 'Prevent cavities and gum disease.',
        frequencyLabel: 'Within 3 months',
        priorityHorizon: 'Soon',
        displayOrder: 2,
      },
    ],
  };
}

test('full-plan model sorts all items by horizon and display order', () => {
  const sorted = sortHealthPlanItems(createHealthItemsFromProfile(makeProfile()));
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['today-item', 'soon-item', 'later-item'],
  );
});

test('full-plan totals stay consistent with dashboard-open item counts', () => {
  const profile = makeProfile();
  const items = createHealthItemsFromProfile(profile);
  const afterDone = markHealthItemDone(profile.profileId, 'soon-item', items, new Date('2026-05-02T11:00:00.000Z'));
  const totals = calculatePlanTotals(afterDone);
  const grouped = groupHealthItemsForDashboard(afterDone);

  assert.equal(totals.totalCount, 3);
  assert.equal(totals.dashboardOpenCount, grouped.Today.length + grouped.Soon.length + grouped.Later.length);
  assert.equal(totals.doneCount, 1);
});

test('full-plan uniqueness guard detects duplicate item ids', () => {
  const items = createHealthItemsFromProfile(makeProfile());
  const duplicated = [...items, { ...items[0] }];

  assert.equal(hasUniqueHealthItemsById(items), true);
  assert.equal(hasUniqueHealthItemsById(duplicated), false);
});
