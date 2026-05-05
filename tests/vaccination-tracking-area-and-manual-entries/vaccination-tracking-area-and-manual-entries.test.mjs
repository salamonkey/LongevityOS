import test from 'node:test';
import assert from 'node:assert/strict';

import { generateInitialPlanSnapshot } from '../../src/features/self-onboarding-to-first-dashboard/plan.js';
import {
  MANUAL_ENTRY_STATUS_CONTEXT,
  buildManualVaccinationCatalogOptions,
  buildManualVaccinationRows,
  buildVaccinationDueGuidance,
  sortManualVaccinationEntries,
  validateManualVaccinationEntryInput,
} from '../../src/features/vaccination-tracking-area-and-manual-entries/model.js';
import {
  createVaccinationTrackingSession,
} from '../../src/features/vaccination-tracking-area-and-manual-entries/service.js';

function createProfile() {
  return {
    profileId: 'self',
    age: 52,
    gender: 'female',
    name: 'You',
  };
}

function createPlanSnapshot() {
  return generateInitialPlanSnapshot(createProfile(), {
    now: new Date('2026-05-05T08:00:00.000Z'),
  });
}

test('due guidance renders from vaccination plan items and remains independent from manual records', () => {
  const snapshot = createPlanSnapshot();
  const dueGuidance = buildVaccinationDueGuidance(snapshot);

  assert.ok(dueGuidance.length > 0);
  for (const item of dueGuidance) {
    assert.equal(item.category, 'vaccination');
    assert.ok(item.statusLabel.length > 0);
    assert.ok(item.cadenceLabel.length > 0);
  }

  const rowsWhenEmpty = buildManualVaccinationRows([], snapshot);
  assert.equal(rowsWhenEmpty.length, 0);

  const rowsWithManual = buildManualVaccinationRows([
    {
      id: 'entry-1',
      profileId: 'self',
      vaccinationKey: dueGuidance[0].itemKey,
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
      entryDate: '2026-05-01',
      createdAt: '2026-05-05T09:00:00.000Z',
    },
  ], snapshot);

  assert.equal(rowsWithManual.length, 1);
  assert.equal(rowsWithManual[0].relatedItemKey, dueGuidance[0].itemKey);

  const dueGuidanceAfterManual = buildVaccinationDueGuidance(snapshot);
  assert.equal(dueGuidanceAfterManual.length, dueGuidance.length);
});

test('manual entry validation requires vaccination item, status context, and date', () => {
  const snapshot = createPlanSnapshot();
  const allowedKeys = buildManualVaccinationCatalogOptions(snapshot).map((option) => option.value);

  const validation = validateManualVaccinationEntryInput(
    { vaccinationKey: '', statusContext: '', entryDate: '' },
    { allowedVaccinationKeys: allowedKeys, now: new Date('2026-05-05T08:00:00.000Z') },
  );

  assert.equal(validation.isValid, false);
  assert.equal(Boolean(validation.errors.vaccinationKey), true);
  assert.equal(Boolean(validation.errors.statusContext), true);
  assert.equal(Boolean(validation.errors.entryDate), true);
});

test('completed manual entries reject future dates while planned entries require a future date', () => {
  const snapshot = createPlanSnapshot();
  const allowedKeys = buildManualVaccinationCatalogOptions(snapshot).map((option) => option.value);

  const completedFuture = validateManualVaccinationEntryInput(
    {
      vaccinationKey: allowedKeys[0],
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
      entryDate: '2026-06-01',
    },
    { allowedVaccinationKeys: allowedKeys, now: new Date('2026-05-05T08:00:00.000Z') },
  );

  const plannedFuture = validateManualVaccinationEntryInput(
    {
      vaccinationKey: allowedKeys[0],
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.planned,
      entryDate: '2026-06-01',
    },
    { allowedVaccinationKeys: allowedKeys, now: new Date('2026-05-05T08:00:00.000Z') },
  );

  assert.equal(completedFuture.isValid, false);
  assert.match(completedFuture.errors.entryDate, /future date/i);
  assert.equal(plannedFuture.isValid, true);

  const plannedToday = validateManualVaccinationEntryInput(
    {
      vaccinationKey: allowedKeys[0],
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.planned,
      entryDate: '2026-05-05',
    },
    { allowedVaccinationKeys: allowedKeys, now: new Date('2026-05-05T08:00:00.000Z') },
  );

  assert.equal(plannedToday.isValid, false);
  assert.match(plannedToday.errors.entryDate, /future date/i);
});

test('manual entries appear in the same session immediately after save', () => {
  const snapshot = createPlanSnapshot();
  const session = createVaccinationTrackingSession({
    profileId: 'self',
    planSnapshot: snapshot,
    now: () => new Date('2026-05-05T10:30:00.000Z'),
    idFactory: () => 'entry-100',
  });

  const allowedKeys = session.getAllowedVaccinationKeys();
  assert.ok(allowedKeys.length > 0);

  const result = session.addManualEntry({
    vaccinationKey: allowedKeys[0],
    statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
    entryDate: '2026-05-01',
  });

  assert.equal(result.entry.id, 'entry-100');
  assert.equal(result.entries.length, 1);
  assert.equal(session.getManualEntries().length, 1);
  assert.equal(session.getManualEntries()[0].vaccinationKey, allowedKeys[0]);
});

test('manual entries sort by most recent entry date then newest created time', () => {
  const entries = [
    {
      id: 'entry-old',
      vaccinationKey: 'influenza-vaccine',
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
      entryDate: '2026-05-01',
      createdAt: '2026-05-01T08:00:00.000Z',
    },
    {
      id: 'entry-newer-date',
      vaccinationKey: 'influenza-vaccine',
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.completed,
      entryDate: '2026-05-02',
      createdAt: '2026-05-01T07:00:00.000Z',
    },
    {
      id: 'entry-same-date-newer-created',
      vaccinationKey: 'influenza-vaccine',
      statusContext: MANUAL_ENTRY_STATUS_CONTEXT.planned,
      entryDate: '2026-05-01',
      createdAt: '2026-05-01T09:00:00.000Z',
    },
  ];

  const sorted = sortManualVaccinationEntries(entries);
  assert.deepEqual(sorted.map((entry) => entry.id), [
    'entry-newer-date',
    'entry-same-date-newer-created',
    'entry-old',
  ]);
});
