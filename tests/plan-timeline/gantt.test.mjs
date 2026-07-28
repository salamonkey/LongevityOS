import test from 'node:test';
import assert from 'node:assert/strict';

import { isRowRelevantForRange, filterRelevantRows, buildGanttRows } from '../../src/features/plan-timeline/gantt.js';

function makeRow(overrides = {}) {
  return {
    itemKey: 'test-item',
    status: 'pending',
    optOutUntil: null,
    kind: 'upcoming',
    startDate: null,
    endDate: null,
    pointDate: null,
    ...overrides,
  };
}

const rangeStart = new Date('2026-01-01T00:00:00.000Z');
const rangeEnd = new Date('2027-01-01T00:00:00.000Z');

test('a permanently skipped item ("opted out forever") is never relevant, even if its stale point date sits inside the range', () => {
  const row = makeRow({
    status: 'opted_out',
    optOutUntil: null,
    kind: 'upcoming',
    pointDate: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(isRowRelevantForRange(row, rangeStart, rangeEnd), false);
});

test('a temporarily skipped item is relevant when its underlying due date still falls in range', () => {
  const row = makeRow({
    status: 'opted_out',
    optOutUntil: '2026-10-01',
    kind: 'upcoming',
    pointDate: new Date('2026-06-01T00:00:00.000Z'),
  });
  assert.equal(isRowRelevantForRange(row, rangeStart, rangeEnd), true);
});

test('a temporarily skipped item is not relevant once its underlying due date falls outside the range', () => {
  const row = makeRow({
    status: 'opted_out',
    optOutUntil: '2026-10-01',
    kind: 'upcoming',
    pointDate: new Date('2030-06-01T00:00:00.000Z'),
  });
  assert.equal(isRowRelevantForRange(row, rangeStart, rangeEnd), false);
});

test('a due item is always relevant, even years overdue and long before the visible range', () => {
  const row = makeRow({
    status: 'overdue',
    kind: 'due',
    pointDate: new Date('2020-01-01T00:00:00.000Z'),
  });
  assert.equal(isRowRelevantForRange(row, rangeStart, rangeEnd), true);
});

test('an age-gated item due far in the future is excluded from a narrow range but included once the range is wide enough', () => {
  const farFutureDue = makeRow({
    status: 'pending',
    kind: 'upcoming',
    pointDate: new Date('2038-01-01T00:00:00.000Z'),
  });
  const twelveMonthEnd = new Date('2027-01-01T00:00:00.000Z');
  const fiveYearEnd = new Date('2040-01-01T00:00:00.000Z');

  assert.equal(isRowRelevantForRange(farFutureDue, rangeStart, twelveMonthEnd), false);
  assert.equal(isRowRelevantForRange(farFutureDue, rangeStart, fiveYearEnd), true);
});

test('a point row with no date at all is not relevant (nothing to place it by)', () => {
  const row = makeRow({ status: 'pending', kind: 'upcoming', pointDate: null });
  assert.equal(isRowRelevantForRange(row, rangeStart, rangeEnd), false);
});

test('a bar is relevant when it overlaps the range, even just partially from either edge', () => {
  const overlapsFromBefore = makeRow({
    status: 'done',
    kind: 'bar',
    startDate: new Date('2025-06-01T00:00:00.000Z'),
    endDate: new Date('2026-03-01T00:00:00.000Z'),
  });
  const overlapsIntoAfter = makeRow({
    status: 'done',
    kind: 'bar',
    startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDate: new Date('2027-06-01T00:00:00.000Z'),
  });
  const fullyInside = makeRow({
    status: 'done',
    kind: 'bar',
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-09-01T00:00:00.000Z'),
  });

  assert.equal(isRowRelevantForRange(overlapsFromBefore, rangeStart, rangeEnd), true);
  assert.equal(isRowRelevantForRange(overlapsIntoAfter, rangeStart, rangeEnd), true);
  assert.equal(isRowRelevantForRange(fullyInside, rangeStart, rangeEnd), true);
});

test('a bar entirely before or entirely after the range is not relevant', () => {
  const entirelyBefore = makeRow({
    status: 'done',
    kind: 'bar',
    startDate: new Date('2023-01-01T00:00:00.000Z'),
    endDate: new Date('2023-06-01T00:00:00.000Z'),
  });
  const entirelyAfter = makeRow({
    status: 'done',
    kind: 'bar',
    startDate: new Date('2028-01-01T00:00:00.000Z'),
    endDate: new Date('2028-06-01T00:00:00.000Z'),
  });

  assert.equal(isRowRelevantForRange(entirelyBefore, rangeStart, rangeEnd), false);
  assert.equal(isRowRelevantForRange(entirelyAfter, rangeStart, rangeEnd), false);
});

test('filterRelevantRows keeps only the relevant subset, preserving order', () => {
  const relevant = makeRow({ itemKey: 'a', status: 'pending', kind: 'upcoming', pointDate: new Date('2026-06-01') });
  const irrelevant = makeRow({ itemKey: 'b', status: 'pending', kind: 'upcoming', pointDate: new Date('2040-06-01') });
  const alwaysDue = makeRow({ itemKey: 'c', status: 'due', kind: 'due', pointDate: new Date('2010-01-01') });

  const result = filterRelevantRows([relevant, irrelevant, alwaysDue], rangeStart, rangeEnd);
  assert.deepEqual(result.map((row) => row.itemKey), ['a', 'c']);
});

test('buildGanttRows threads the raw opt-out until date through onto the row, independent of status', () => {
  const planSnapshot = {
    items: [
      {
        catalogItemId: 'forever-skip',
        category: 'checkup',
        status: 'opted_out',
        optOut: { preset: 'forever', until: null, decidedOn: '2026-01-01' },
        nextDueDate: '2026-06-01',
      },
      {
        catalogItemId: 'season-skip',
        category: 'checkup',
        status: 'opted_out',
        optOut: { preset: 'one_season', until: '2026-10-01', decidedOn: '2026-01-01' },
        nextDueDate: '2026-06-01',
      },
    ],
  };

  const rows = buildGanttRows(planSnapshot, { today: new Date('2026-07-01T00:00:00.000Z') });
  const forever = rows.find((row) => row.itemKey === 'forever-skip');
  const season = rows.find((row) => row.itemKey === 'season-skip');

  assert.equal(forever.status, 'opted_out');
  assert.equal(forever.optOutUntil, null);
  assert.equal(season.status, 'opted_out');
  assert.equal(season.optOutUntil, '2026-10-01');
});
