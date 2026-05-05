import React, { useMemo, useRef, useState } from 'react';
import {
  AppShell,
  StatusPill,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  getCategoryLabel,
} from '../health-plan-browsing-and-item-detail/model.js';
import {
  resolveDetailBackTarget,
  resolveItemDetail,
} from '../health-plan-browsing-and-item-detail/projection.js';
import {
  createItemActionService,
} from './actions.js';
import {
  DETAIL_ACTION_ERRORS,
  REMINDER_OPTION_LABELS,
  REMINDER_TIMING_TYPES,
  formatDateForConfirmation,
} from './model.js';
import {
  buildPlanReadModelForSlice,
  resolveOriginForCategory,
} from './selectors.js';

function PlanRow({ item, onOpen }) {
  return (
    <li>
      <button type="button" className="sl002-plan-row" onClick={() => onOpen(item.itemKey)}>
        <span className="sl002-plan-row-copy">
          <span className="sl002-plan-row-title">{item.displayName}</span>
          <span className="sl002-plan-row-cadence">{item.cadenceText}</span>
        </span>
        <StatusPill status={item.status} label={item.statusLabel} />
      </button>
    </li>
  );
}

function ListEmptyState({ activeCategory, onSwitchCategory }) {
  const nextCategory = activeCategory === PLAN_CATEGORIES.checkup
    ? PLAN_CATEGORIES.vaccination
    : PLAN_CATEGORIES.checkup;

  return (
    <section className="sl002-empty-state" role="status" aria-live="polite">
      <h3>No {getCategoryLabel(activeCategory).toLowerCase()} in your plan right now</h3>
      <p>There are no {getCategoryLabel(activeCategory).toLowerCase()} to show yet.</p>
      <button
        type="button"
        className="sl001-primary-action"
        onClick={() => onSwitchCategory(nextCategory)}
      >
        View {getCategoryLabel(nextCategory)}
      </button>
    </section>
  );
}

function ReminderForm({
  selectedTiming,
  customDate,
  onTimingChange,
  onCustomDateChange,
  onSubmit,
  onCancel,
  pending,
  validationMessage,
}) {
  return (
    <form className="sl003-reminder-form" onSubmit={onSubmit} noValidate>
      <fieldset className="sl003-reminder-fieldset" disabled={pending}>
        <legend>Set a reminder</legend>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.one_month}
            checked={selectedTiming === REMINDER_TIMING_TYPES.one_month}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.one_month]}
        </label>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.three_months}
            checked={selectedTiming === REMINDER_TIMING_TYPES.three_months}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.three_months]}
        </label>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.custom_date}
            checked={selectedTiming === REMINDER_TIMING_TYPES.custom_date}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {REMINDER_OPTION_LABELS[REMINDER_TIMING_TYPES.custom_date]}
        </label>
        {selectedTiming === REMINDER_TIMING_TYPES.custom_date ? (
          <div className="sl003-custom-date">
            <label htmlFor="sl003-custom-date">Reminder date</label>
            <input
              id="sl003-custom-date"
              type="date"
              value={customDate}
              onChange={(event) => onCustomDateChange(event.target.value)}
              aria-invalid={Boolean(validationMessage)}
            />
          </div>
        ) : null}
      </fieldset>
      {validationMessage ? <p className="sl001-field-error" role="alert">{validationMessage}</p> : null}
      <div className="sl003-reminder-actions">
        <button className="sl001-primary-action" type="submit" disabled={pending}>
          {pending ? 'Saving reminder...' : 'Save reminder'}
        </button>
        <button className="sl003-quiet-button" type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailView({
  item,
  onMarkDone,
  donePending,
  reminderPending,
  showReminderForm,
  onOpenReminder,
  onReminderSubmit,
  onReminderCancel,
  onReminderTimingChange,
  onCustomReminderDateChange,
  selectedReminderTiming,
  customReminderDate,
  actionError,
  confirmationMessage,
}) {
  const actionsDisabled = donePending || reminderPending;

  return (
    <section className="sl002-detail-view" aria-label={`${item.displayName} details`}>
      <div className="sl002-detail-topline">
        <StatusPill status={item.status} label={item.statusLabel} />
        <span className="sl002-detail-category">{item.categoryLabel}</span>
      </div>
      <p className="sl002-detail-cadence">Recommended cadence: {item.cadenceText}</p>
      {item.reminderDateLabel ? (
        <p className="sl003-reminder-note">Planned for {item.reminderDateLabel}</p>
      ) : null}

      <section className="sl002-detail-section" aria-label="Recommendation">
        <h3>Recommendation</h3>
        <p>{item.recommendationText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Why it matters">
        <h3>Why it matters</h3>
        <p>{item.whyItMattersText}</p>
      </section>

      <section className="sl003-action-area" aria-label="Item actions">
        <h3>Next step</h3>
        {item.status === 'done' ? (
          <p className="sl003-complete-message">This item is marked as done.</p>
        ) : (
          <>
            <button
              type="button"
              className="sl001-primary-action"
              onClick={onMarkDone}
              disabled={actionsDisabled}
            >
              {donePending ? 'Saving...' : 'Mark as done'}
            </button>
            {!showReminderForm ? (
              <button
                type="button"
                className="sl003-secondary-action"
                onClick={onOpenReminder}
                disabled={actionsDisabled}
              >
                Set reminder
              </button>
            ) : null}
            {showReminderForm ? (
              <ReminderForm
                selectedTiming={selectedReminderTiming}
                customDate={customReminderDate}
                onTimingChange={onReminderTimingChange}
                onCustomDateChange={onCustomReminderDateChange}
                onSubmit={onReminderSubmit}
                onCancel={onReminderCancel}
                pending={reminderPending}
                validationMessage={actionError}
              />
            ) : null}
          </>
        )}

        {!showReminderForm && actionError ? <p className="sl001-field-error" role="alert">{actionError}</p> : null}
        {confirmationMessage ? <p className="sl003-confirmation" role="status">{confirmationMessage}</p> : null}
      </section>
    </section>
  );
}

function NotFoundState({ onRecover }) {
  return (
    <section className="sl002-not-found" role="alert">
      <h2>This item is not available in your current plan</h2>
      <p>It may no longer be part of this plan. You can return to your plan list.</p>
      <button type="button" className="sl001-primary-action" onClick={onRecover}>Return to your plan</button>
    </section>
  );
}

export default function ItemCompletionAndReminderActions({
  profile = { profileId: 'self', name: 'You' },
  initialPlanSnapshot,
  initialCategory = PLAN_CATEGORIES.checkup,
  initialItemKey,
  initialOrigin = DETAIL_ORIGIN.direct,
  onNavigate,
  onPlanSnapshotChange,
  clock = () => new Date(),
}) {
  const [planSnapshot, setPlanSnapshot] = useState(initialPlanSnapshot);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [detailState, setDetailState] = useState(initialItemKey ? {
    itemKey: initialItemKey,
    origin: initialOrigin,
  } : null);

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [selectedReminderTiming, setSelectedReminderTiming] = useState(REMINDER_TIMING_TYPES.one_month);
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const latestSnapshotRef = useRef(planSnapshot);
  latestSnapshotRef.current = planSnapshot;

  const service = useMemo(() => createItemActionService({
    profileId: profile.profileId,
    getPlanSnapshot: () => latestSnapshotRef.current,
    setPlanSnapshot,
    clock,
  }), [clock, profile.profileId]);

  const readModel = useMemo(
    () => buildPlanReadModelForSlice(planSnapshot),
    [planSnapshot],
  );

  const detailItem = detailState ? resolveItemDetail(readModel, detailState.itemKey) : null;
  const activeItems = activeCategory === PLAN_CATEGORIES.vaccination ? readModel.vaccinations : readModel.checkups;

  if (!planSnapshot) {
    return (
      <AppShell title="Your preventive plan">
        <p className="sl001-support-copy">Loading your preventive plan...</p>
        <div className="sl002-loading-block" aria-hidden="true" />
        <div className="sl002-loading-block" aria-hidden="true" />
      </AppShell>
    );
  }

  const handleOpenDetailFromPlan = (itemKey) => {
    const item = readModel.byItemKey[itemKey];

    setDetailState({
      itemKey,
      origin: resolveOriginForCategory(item?.category),
    });
    setShowReminderForm(false);
    setActionError('');
    setConfirmationMessage('');
  };

  const handleBackFromDetail = () => {
    const target = resolveDetailBackTarget({
      origin: detailState?.origin,
      detailItem,
    });

    if (target.destination === DETAIL_ORIGIN.dashboard) {
      if (typeof onNavigate === 'function') {
        onNavigate(target);
      } else if (detailItem) {
        setActiveCategory(detailItem.category);
      }

      setDetailState(null);
      setShowReminderForm(false);
      setActionError('');
      return;
    }

    if (target.destination === DETAIL_ORIGIN.vaccinations) {
      setActiveCategory(PLAN_CATEGORIES.vaccination);
    } else {
      setActiveCategory(PLAN_CATEGORIES.checkup);
    }

    setDetailState(null);
    setShowReminderForm(false);
    setActionError('');
  };

  const handleMarkDone = async () => {
    if (!detailItem || pendingAction) {
      return;
    }

    setPendingAction('done');
    setActionError('');
    setConfirmationMessage('');

    try {
      const result = service.markItemDone(profile.profileId, detailItem.itemKey);
      if (typeof onPlanSnapshotChange === 'function') {
        onPlanSnapshotChange(result.planSnapshot);
      }
      setShowReminderForm(false);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : DETAIL_ACTION_ERRORS.action_failed;
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleReminderSubmit = async (event) => {
    event.preventDefault();

    if (!detailItem || pendingAction) {
      return;
    }

    setPendingAction('reminder');
    setActionError('');
    setConfirmationMessage('');

    try {
      const result = service.scheduleItemReminder(profile.profileId, detailItem.itemKey, {
        timingType: selectedReminderTiming,
        customDate: customReminderDate,
      });

      if (typeof onPlanSnapshotChange === 'function') {
        onPlanSnapshotChange(result.planSnapshot);
      }

      setShowReminderForm(false);
      setConfirmationMessage(`Reminder set for ${formatDateForConfirmation(result.reminder.scheduledFor)}.`);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : DETAIL_ACTION_ERRORS.action_failed;
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  if (detailState && !detailItem) {
    return (
      <AppShell title="Plan item unavailable">
        <NotFoundState
          onRecover={() => {
            setDetailState(null);
            setActiveCategory(PLAN_CATEGORIES.checkup);
          }}
        />
      </AppShell>
    );
  }

  if (detailItem) {
    return (
      <AppShell
        title={detailItem.displayName}
        headerAction={(
          <button type="button" className="sl002-back-button" onClick={handleBackFromDetail}>
            Back
          </button>
        )}
      >
        <DetailView
          item={detailItem}
          onMarkDone={handleMarkDone}
          donePending={pendingAction === 'done'}
          reminderPending={pendingAction === 'reminder'}
          showReminderForm={showReminderForm}
          onOpenReminder={() => {
            setShowReminderForm(true);
            setActionError('');
            setConfirmationMessage('');
          }}
          onReminderSubmit={handleReminderSubmit}
          onReminderCancel={() => {
            setShowReminderForm(false);
            setActionError('');
          }}
          onReminderTimingChange={(timingType) => {
            setSelectedReminderTiming(timingType);
            setActionError('');
          }}
          onCustomReminderDateChange={(value) => {
            setCustomReminderDate(value);
            setActionError('');
          }}
          selectedReminderTiming={selectedReminderTiming}
          customReminderDate={customReminderDate}
          actionError={actionError}
          confirmationMessage={confirmationMessage}
        />
      </AppShell>
    );
  }

  const planHeaderAction = typeof onNavigate === 'function' ? (
    <button
      type="button"
      className="sl002-back-to-dashboard"
      onClick={() => onNavigate({ destination: DETAIL_ORIGIN.dashboard })}
    >
      Back to dashboard
    </button>
  ) : undefined;

  return (
    <AppShell title={getCategoryLabel(activeCategory)} headerAction={planHeaderAction}>
      <section className="sl003-plan-browser" aria-label="Browse your plan">
        <div className="sl002-category-switch" role="tablist" aria-label="Plan categories">
          {[PLAN_CATEGORIES.checkup, PLAN_CATEGORIES.vaccination].map((category) => {
            const isActive = activeCategory === category;
            const label = getCategoryLabel(category);

            return (
              <button
                key={category}
                type="button"
                role="tab"
                className={isActive ? 'sl002-tab is-active' : 'sl002-tab'}
                aria-selected={isActive}
                onClick={() => setActiveCategory(category)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeItems.length === 0 ? (
          <ListEmptyState activeCategory={activeCategory} onSwitchCategory={setActiveCategory} />
        ) : (
          <ul className="sl002-plan-list" aria-label={`${getCategoryLabel(activeCategory)} list`}>
            {activeItems.map((item) => (
              <PlanRow key={item.itemKey} item={item} onOpen={handleOpenDetailFromPlan} />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
