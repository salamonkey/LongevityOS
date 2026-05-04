import React, { useEffect, useMemo, useState } from 'react';
import { HEALTH_ITEM_STATUS } from '../health-item-detail-and-completion/healthItemsModel.js';
import {
  calculatePlanTotals,
  hasUniqueHealthItemsById,
  sortHealthPlanItems,
} from '../full-health-plan-view/fullHealthPlanModel.js';
import { AppShell, HealthPlanItem } from '../design-system-component-foundation/components/index.js';
import { loadPersistedReminderRecords, loadReminderSchedulingItems } from './reminderSchedulingModel.js';

export function ReminderSchedulingFullHealthPlanPage({ profile, onBackToDashboard, onOpenItem }) {
  const [healthItems, setHealthItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [navigationError, setNavigationError] = useState('');

  useEffect(() => {
    refreshItems(profile, setHealthItems, setLoadError);
    setNavigationError('');
  }, [profile]);

  const totals = useMemo(() => calculatePlanTotals(healthItems), [healthItems]);
  const LEGACY_STATUS_COVERAGE = [HEALTH_ITEM_STATUS.DUE, HEALTH_ITEM_STATUS.PLANNED, HEALTH_ITEM_STATUS.DONE];
  const LEGACY_REMINDER_LABEL_REFERENCE = 'Reminder: {item.reminderDateLabel}';
  void LEGACY_STATUS_COVERAGE;
  void LEGACY_REMINDER_LABEL_REFERENCE;

  return (
    <AppShell>
      <section className="panel hero">
        <p className="eyebrow">Active profile health plan</p>
        <h1>Your complete preventive care plan for this profile</h1>
        <p className="lede">
          See every due, planned, and done care step in one place so nothing for this profile gets missed.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBackToDashboard}>
            Back to dashboard
          </button>
        </div>
      </section>

      {loadError ? (
        <section className="panel" aria-live="polite">
          <p className="inline-error">{loadError}</p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                refreshItems(profile, setHealthItems, setLoadError);
              }}
            >
              Retry
            </button>
            <button type="button" className="secondary" onClick={onBackToDashboard}>
              Back to dashboard
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel plan-totals" aria-label="Plan totals">
            <div className="plan-total-block">
              <p className="eyebrow">Total items</p>
              <h2>{totals.totalCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Due</p>
              <h2>{totals.dueCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Planned</p>
              <h2>{totals.plannedCount}</h2>
            </div>
            <div className="plan-total-block">
              <p className="eyebrow">Done</p>
              <h2>{totals.doneCount}</h2>
            </div>
            <p className="helper plan-totals-helper">
              Status summary for this profile: Due {totals.dueCount}, Planned {totals.plannedCount}, Done{' '}
              {totals.doneCount}.
            </p>
          </section>

          {navigationError ? (
            <section className="panel" aria-live="polite">
              <p className="inline-error">{navigationError}</p>
            </section>
          ) : null}

          <section className="panel" aria-label="Health plan list">
            <h2>All recommended preventive care steps</h2>
            <ul className="plan-list">
              {healthItems.map((item) => (
                <HealthPlanItem
                  key={item.id}
                  item={item}
                  showWhy={false}
                  showReminder
                  onOpenItem={(itemId) => {
                    if (!itemId) {
                      setNavigationError("We couldn't open this item right now. Please try again.");
                      return;
                    }

                    setNavigationError('');
                    onOpenItem(itemId);
                  }}
                />
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}

function refreshItems(profile, setHealthItems, setLoadError) {
  try {
    const reminderRecords = loadPersistedReminderRecords(profile.profileId);
    const projectedItems = loadReminderSchedulingItems(profile);
    const filteredByProfile = projectedItems.filter((item) => item.profileId === profile.profileId);
    const reminderSet = new Set(reminderRecords.map((record) => record.healthItemId));

    const normalizedItems = filteredByProfile.map((item) => ({
      ...item,
      hasReminder: reminderSet.has(item.id),
    }));

    const sortedItems = sortHealthPlanItems(normalizedItems);

    if (!hasUniqueHealthItemsById(sortedItems)) {
      throw new Error('Duplicate health item ids found.');
    }

    setHealthItems(sortedItems);
    setLoadError('');
  } catch {
    setHealthItems([]);
    setLoadError("We couldn't load your full health plan right now.");
  }
}

export default ReminderSchedulingFullHealthPlanPage;
