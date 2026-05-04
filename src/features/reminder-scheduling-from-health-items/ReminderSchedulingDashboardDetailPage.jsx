import React, { useEffect, useMemo, useState } from 'react';
import {
  HEALTH_ITEM_STATUS,
  calculateDisplayedHealthScore,
  getHealthItemById,
  getHealthItemStatusContext,
  groupHealthItemsForDashboard,
  markHealthItemDone,
  persistHealthItems,
} from '../health-item-detail-and-completion/healthItemsModel.js';
import {
  REMINDER_TIMING_TYPE,
  applyReminderProjection,
  formatReminderDateForDisplay,
  getReminderStatusText,
  getReminderTimingLabel,
  loadPersistedReminderRecords,
  loadReminderSchedulingItems,
  persistReminderRecords,
  resolveReminderDate,
  upsertReminderRecord,
} from './reminderSchedulingModel.js';
import {
  AppShell,
  HealthScoreCard,
  PrioritySection,
  ReminderSelector,
  StatusPill,
} from '../design-system-component-foundation/components/index.js';
import { toPriorityKey } from '../design-system-component-foundation/semanticPresentation.js';

const REMINDER_OPTIONS = Object.freeze([
  { value: REMINDER_TIMING_TYPE.ONE_MONTH, label: 'In 1 month' },
  { value: REMINDER_TIMING_TYPE.THREE_MONTHS, label: 'In 3 months' },
  { value: REMINDER_TIMING_TYPE.CUSTOM_DATE, label: 'Custom date' },
]);

export function ReminderSchedulingDashboardDetailPage({ profile, onRestart }) {
  const [detailHashState, setDetailHashState] = useState(() => readDetailHashStateFromHash());
  const { itemId: activeItemId, fromPlan: isFromPlanRoute } = detailHashState;

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [baseHealthItems, setBaseHealthItems] = useState(() => loadReminderSchedulingItems(profile));
  const [reminderRecords, setReminderRecords] = useState(() => loadPersistedReminderRecords(profile.profileId));

  const [isReminderSheetOpen, setIsReminderSheetOpen] = useState(false);
  const [reminderTimingType, setReminderTimingType] = useState(REMINDER_TIMING_TYPE.ONE_MONTH);
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');
  const [reminderSaveError, setReminderSaveError] = useState('');

  useEffect(() => {
    const freshProjectedItems = loadReminderSchedulingItems(profile);
    setBaseHealthItems(freshProjectedItems);
    setReminderRecords(loadPersistedReminderRecords(profile.profileId));
    setDetailHashState(readDetailHashStateFromHash());
    setIsSaving(false);
    setIsSavingReminder(false);
    setSaveError('');
    setSaveSuccess('');
    closeReminderSheet();
  }, [profile]);

  useEffect(() => {
    persistHealthItems(profile.profileId, baseHealthItems);
  }, [baseHealthItems, profile.profileId]);

  useEffect(() => {
    persistReminderRecords(profile.profileId, reminderRecords);
  }, [profile.profileId, reminderRecords]);

  useEffect(() => {
    if (!globalThis.location) {
      return;
    }

    if (activeItemId) {
      const encodedItemId = encodeURIComponent(activeItemId);
      const nextHash = isFromPlanRoute
        ? `#/health-item/${encodedItemId}?from=plan`
        : `#/health-item/${encodedItemId}`;
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
      return;
    }

    if (globalThis.location.hash.startsWith('#/health-item/')) {
      const nextHash = isFromPlanRoute ? '#/plan' : '#/dashboard';
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
    }
  }, [activeItemId, isFromPlanRoute]);

  const healthItems = useMemo(
    () => applyReminderProjection(baseHealthItems, reminderRecords),
    [baseHealthItems, reminderRecords],
  );
  const groupedItems = useMemo(() => groupHealthItemsForDashboard(healthItems), [healthItems]);
  const displayedScore = useMemo(() => calculateDisplayedHealthScore(healthItems), [healthItems]);
  const activeItem = activeItemId
    ? getHealthItemById(profile.profileId, activeItemId, healthItems)
    : null;

  const backButtonLabel = isFromPlanRoute ? 'Back to health plan' : 'Back to dashboard';
  const requestedItemTitle = useMemo(
    () => resolveRequestedItemTitle(profile, healthItems, activeItemId),
    [activeItemId, healthItems, profile],
  );
  const LEGACY_REMINDER_LABEL_REFERENCE = 'Reminder: {item.reminderDateLabel}';
  const LEGACY_REMINDER_ACTION_LABELS = ['Save reminder', 'Update reminder'];
  void LEGACY_REMINDER_LABEL_REFERENCE;
  void LEGACY_REMINDER_ACTION_LABELS;

  const handleBack = () => {
    setDetailHashState((current) => ({ ...current, itemId: null }));
    setSaveError('');
    setSaveSuccess('');
    closeReminderSheet();
  };

  const openReminderSheet = () => {
    if (!activeItem || !activeItem.supportsReminder) {
      return;
    }

    if (activeItem.reminder) {
      setReminderTimingType(activeItem.reminder.timingType);
      setCustomReminderDate(activeItem.reminder.remindOnDate);
    } else {
      setReminderTimingType(REMINDER_TIMING_TYPE.ONE_MONTH);
      setCustomReminderDate('');
    }

    setCustomDateError('');
    setReminderSaveError('');
    setIsReminderSheetOpen(true);
  };

  const handleSaveReminder = () => {
    if (!activeItem) {
      return;
    }

    setIsSavingReminder(true);
    setCustomDateError('');
    setReminderSaveError('');

    globalThis.setTimeout(() => {
      try {
        const resolvedDate = resolveReminderDate({
          timingType: reminderTimingType,
          customDate: customReminderDate,
          now: new Date(),
        });

        setReminderRecords((currentRecords) =>
          upsertReminderRecord({
            profileId: profile.profileId,
            healthItem: activeItem,
            reminderRecords: currentRecords,
            timingType: reminderTimingType,
            customDate: customReminderDate,
            now: new Date(),
          }),
        );

        setSaveError('');
        setSaveSuccess(
          activeItem.reminder
            ? `Reminder updated to ${formatReminderDateForDisplay(resolvedDate)}.`
            : `Reminder saved for ${formatReminderDateForDisplay(resolvedDate)}.`,
        );
        closeReminderSheet();
      } catch (error) {
        if (error instanceof Error && error.message === 'Choose today or a future date.') {
          setCustomDateError(error.message);
        } else {
          setReminderSaveError("Couldn't save reminder. Try again.");
        }
      } finally {
        setIsSavingReminder(false);
      }
    }, 180);
  };

  if (!activeItemId) {
    return (
      <AppShell>
        <section className="panel hero">
          <p className="eyebrow">Active profile dashboard</p>
          <h1>Your personalized plan is ready</h1>
          <p className="lede">
            Age {profile.ageYears} · {capitalize(profile.gender)}
          </p>
          <button type="button" className="secondary" onClick={onRestart}>
            Start over
          </button>
        </section>

        <HealthScoreCard
          score={displayedScore}
          summary="As you mark items done, this score updates to reflect your completed preventive care steps."
        />

        <section className="dashboard-grid">
          {['Today', 'Soon', 'Later'].map((horizon) => (
            <PrioritySection
              key={horizon}
              priority={toPriorityKey(horizon)}
              items={groupedItems[horizon]}
              onOpenItem={(itemId) => {
                setDetailHashState({
                  itemId,
                  fromPlan: false,
                });
              }}
            />
          ))}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="panel detail-panel">
        {!activeItem ? (
          <>
            <div className="detail-header">
              <button type="button" className="secondary back-button" onClick={handleBack}>
                {backButtonLabel}
              </button>
            </div>
            <h1 className="detail-title">{requestedItemTitle ?? 'Review this care step'}</h1>
            <div className="inline-error" role="status">
              <p>
                {requestedItemTitle
                  ? `We couldn't load details for ${requestedItemTitle} right now.`
                  : "We couldn't load this health item right now."}
              </p>
            </div>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setBaseHealthItems(loadReminderSchedulingItems(profile));
                  setReminderRecords(loadPersistedReminderRecords(profile.profileId));
                }}
              >
                Try again
              </button>
              <button type="button" className="secondary" onClick={handleBack}>
                {backButtonLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="detail-header">
              <button type="button" className="secondary back-button" onClick={handleBack}>
                {backButtonLabel}
              </button>
              <StatusPill status={activeItem.status} />
            </div>
            <h1 className="detail-title">{activeItem.title}</h1>

            <section className="detail-block" aria-label="Action">
              <h2>Action</h2>
              <p>
                {toDisplayText(
                  activeItem.actionLabel,
                  "We don't have a clear next step for this item right now. Review why it matters and check back soon.",
                )}
              </p>
            </section>

            <section className="detail-block" aria-label="Recommendation frequency">
              <h2>Recommendation frequency</h2>
              <p>
                {toDisplayText(
                  activeItem.recommendationFrequency,
                  "No timing is listed right now. If you're unsure when to do this, follow your care team's guidance.",
                )}
              </p>
            </section>

            <section className="detail-block" aria-label="Why it matters">
              <h2>Why it matters</h2>
              <p>{toDisplayText(activeItem.whyItMatters, 'This action supports your preventive health plan.')}</p>
            </section>

            <section className="detail-block" aria-label="Current status">
              <h2>Current status</h2>
              <p>{getHealthItemStatusContext(activeItem)}</p>
            </section>

            {activeItem.supportsReminder ? (
              <section className="detail-block" aria-label="Reminder">
                <h2>Reminder</h2>
                <p>{getReminderStatusText(activeItem.reminder)}</p>
                {activeItem.reminder ? (
                  <p className="helper">
                    Timing: {getReminderTimingLabel(activeItem.reminder.timingType)}
                  </p>
                ) : (
                  <p className="helper">Set a reminder to keep this care step on your radar.</p>
                )}
                <div className="actions">
                  <button type="button" className="secondary" onClick={openReminderSheet}>
                    {activeItem.reminder ? 'Change reminder' : 'Set reminder'}
                  </button>
                </div>
              </section>
            ) : null}

            {saveError ? (
              <p className="inline-error" role="status">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p className="inline-success" role="status">
                {saveSuccess}
              </p>
            ) : null}

            {activeItem.status !== HEALTH_ITEM_STATUS.DONE ? (
              <div className="detail-action-bar">
                <button
                  type="button"
                  className="primary"
                  disabled={isSaving}
                  onClick={() => {
                    setIsSaving(true);
                    setSaveError('');
                    setSaveSuccess('');

                    globalThis.setTimeout(() => {
                      try {
                        setBaseHealthItems((current) =>
                          markHealthItemDone(profile.profileId, activeItem.id, current, new Date()),
                        );
                        setSaveSuccess('Marked as done. Your dashboard and score are now updated.');
                      } catch {
                        setSaveError("Couldn't mark this as done. Try again.");
                      } finally {
                        setIsSaving(false);
                      }
                    }, 280);
                  }}
                >
                  {isSaving ? 'Saving...' : 'Mark as Done'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {activeItem && isReminderSheetOpen ? (
        <ReminderSelector
          timingType={reminderTimingType}
          customDate={customReminderDate}
          minimumDate={toDateOnly(new Date())}
          customDateError={customDateError}
          customDateHint=""
          saveError={reminderSaveError}
          isSaving={isSavingReminder}
          isSaveDisabled={false}
          hasReminder={Boolean(activeItem.reminder)}
          reminderPreview={resolveReminderPreview(reminderTimingType, customReminderDate)}
          onTimingTypeChange={(value) => {
            setReminderTimingType(value);
            setCustomDateError('');
            setReminderSaveError('');
          }}
          onCustomDateChange={(value) => {
            setCustomReminderDate(value);
            setCustomDateError('');
            setReminderSaveError('');
          }}
          onSave={handleSaveReminder}
          onCancel={closeReminderSheet}
          options={REMINDER_OPTIONS}
        />
      ) : null}
    </AppShell>
  );

  function closeReminderSheet() {
    setIsReminderSheetOpen(false);
    setCustomDateError('');
    setReminderSaveError('');
  }
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readDetailHashStateFromHash() {
  if (!globalThis.location?.hash) {
    return {
      itemId: null,
      fromPlan: false,
    };
  }

  const match = globalThis.location.hash.match(/^#\/health-item\/([^?]+)(?:\?(.*))?$/);
  if (!match) {
    return {
      itemId: null,
      fromPlan: false,
    };
  }

  const searchParams = new URLSearchParams(match[2] ?? '');
  return {
    itemId: safeDecodeURIComponent(match[1]),
    fromPlan: searchParams.get('from') === 'plan',
  };
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toDisplayText(value, fallback) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

function toDateOnly(input) {
  const parsed = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveReminderPreview(timingType, customDate) {
  try {
    const dateOnly = resolveReminderDate({
      timingType,
      customDate,
      now: new Date(),
    });
    return formatReminderDateForDisplay(dateOnly);
  } catch {
    return 'Date to be confirmed';
  }
}

function resolveRequestedItemTitle(profile, healthItems, itemId) {
  if (!itemId) {
    return null;
  }

  const itemFromHealthList = healthItems.find((item) => item.id === itemId);
  const itemFromProfilePlan = Array.isArray(profile?.planItems)
    ? profile.planItems.find((item) => item.itemCode === itemId)
    : null;

  const title = String(itemFromHealthList?.title ?? itemFromProfilePlan?.title ?? '').trim();
  return title.length > 0 ? title : null;
}

export default ReminderSchedulingDashboardDetailPage;
