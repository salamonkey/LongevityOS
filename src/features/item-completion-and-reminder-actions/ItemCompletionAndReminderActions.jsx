import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AppShell,
  StatusPill,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  DETAIL_ORIGIN,
  PLAN_STATUSES,
  PLAN_CATEGORIES,
  getCategoryLabel,
  getStatusLabel,
} from '../health-plan-browsing-and-item-detail/model.js';
import {
  resolveDetailBackTarget,
  resolveItemDetail,
} from '../health-plan-browsing-and-item-detail/projection.js';
import {
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from '../health-plan-browsing-and-item-detail/definitions.js';
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
import {
  ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS,
  MANUAL_ENTRY_STATUS_LABELS,
  MANUAL_ENTRY_VALIDATION_ERRORS,
  buildManualVaccinationCatalogOptions,
  buildManualVaccinationRows,
  createManualVaccinationEntry,
  createInitialManualEntryForm,
  validateManualVaccinationEntryInput,
} from '../vaccination-tracking-area-and-manual-entries/model.js';

const DONE_COMPLETION_TIMING_TYPES = Object.freeze({
  today: 'today',
  custom_date: 'custom_date',
});
const EMPTY_REMINDER_TIMING = '';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseCadenceIntervalDays(cadenceText) {
  const normalized = String(cadenceText || '').trim().toLowerCase();
  if (!normalized) return null;

  const rangeYears = /every\s+(\d+)\s*(?:to|-)\s*(\d+)\s*years?/.exec(normalized);
  if (rangeYears) {
    return Number(rangeYears[1]) * 365;
  }

  const fixedYears = /every\s+(\d+)\s*years?/.exec(normalized);
  if (fixedYears) {
    return Number(fixedYears[1]) * 365;
  }

  const fixedMonths = /every\s+(\d+)\s*months?/.exec(normalized);
  if (fixedMonths) {
    return Number(fixedMonths[1]) * 30;
  }

  if (normalized.includes('every year') || normalized.includes('at least every year') || normalized.includes('seasonal')) {
    return 365;
  }

  return null;
}

function parseIsoDateToUtcDate(isoDate) {
  const parts = String(isoDate || '').split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildTimeToGoState({ completedOn, cadenceText, now = new Date() }) {
  const intervalDays = parseCadenceIntervalDays(cadenceText);
  if (!intervalDays) return null;

  const completedDate = parseIsoDateToUtcDate(completedOn);
  if (!completedDate) return null;

  const nowDate = new Date(now);
  const currentUtc = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()));
  const nextDueDate = new Date(completedDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const elapsedDays = Math.floor((currentUtc.getTime() - completedDate.getTime()) / (24 * 60 * 60 * 1000));
  const remainingDays = Math.ceil((nextDueDate.getTime() - currentUtc.getTime()) / (24 * 60 * 60 * 1000));
  const progressRatio = clamp(elapsedDays / intervalDays, 0, 1);
  const progressPercent = Math.round(progressRatio * 100);
  const overdueDays = Math.max(0, Math.abs(remainingDays));

  return {
    nextDueLabel: formatDateForConfirmation(nextDueDate.toISOString().slice(0, 10)),
    progressPercent,
    remainingText: remainingDays >= 0
      ? `${remainingDays} day${remainingDays === 1 ? '' : 's'} left`
      : `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
    isOverdue: remainingDays < 0,
  };
}

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
  onCancel,
  pending,
  validationMessage,
}) {
  const customDateInputRef = useRef(null);

  useEffect(() => {
    if (selectedTiming !== REMINDER_TIMING_TYPES.custom_date) {
      return;
    }

    const input = customDateInputRef.current;
    if (!input) {
      return;
    }

    input.focus();

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Some browsers block programmatic picker open; focus is a safe fallback.
      }
    }
  }, [selectedTiming]);

  return (
    <div className="sl003-reminder-form" role="group" aria-label="Set a reminder">
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
              ref={customDateInputRef}
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
        <button className="sl003-quiet-button" type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DoneForm({
  selectedTiming,
  customDate,
  onTimingChange,
  onCustomDateChange,
  onSubmit,
  onCancel,
  pending,
  validationMessage,
}) {
  const customDateInputRef = useRef(null);

  useEffect(() => {
    if (selectedTiming !== DONE_COMPLETION_TIMING_TYPES.custom_date) {
      return;
    }

    const input = customDateInputRef.current;
    if (!input) {
      return;
    }

    input.focus();

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Some browsers block programmatic picker open; focus is a safe fallback.
      }
    }
  }, [selectedTiming]);

  return (
    <form className="sl003-reminder-form" onSubmit={onSubmit} noValidate>
      <fieldset className="sl003-reminder-fieldset" disabled={pending}>
        <legend>Mark as done</legend>
        <label>
          <input
            type="radio"
            name="done-timing"
            value={DONE_COMPLETION_TIMING_TYPES.today}
            checked={selectedTiming === DONE_COMPLETION_TIMING_TYPES.today}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          Today
        </label>
        <label>
          <input
            type="radio"
            name="done-timing"
            value={DONE_COMPLETION_TIMING_TYPES.custom_date}
            checked={selectedTiming === DONE_COMPLETION_TIMING_TYPES.custom_date}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          Choose date
        </label>
        {selectedTiming === DONE_COMPLETION_TIMING_TYPES.custom_date ? (
          <div className="sl003-custom-date">
            <label htmlFor="sl003-done-custom-date">Completion date</label>
            <input
              ref={customDateInputRef}
              id="sl003-done-custom-date"
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
          {pending ? 'Saving...' : 'Save completion'}
        </button>
        <button className="sl003-quiet-button" type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ManualEntryForm({
  form,
  options,
  errors,
  saveError,
  pending,
  onFieldChange,
  onSubmit,
  onCancel,
}) {
  const visibleDateInputRef = useRef(null);
  const lastValidDateRef = useRef('');
  const [forceDateFieldVisible, setForceDateFieldVisible] = useState(false);
  const showDateField = Boolean(form.entryDate) || forceDateFieldVisible;
  const canSave = Boolean(String(form.vaccinationKey || '').trim())
    && Boolean(String(form.entryDate || '').trim());
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dateMin = form.statusContext === 'planned' ? todayIso : undefined;
  const dateMax = form.statusContext === 'completed' ? todayIso : undefined;

  const handleEntryDateChange = (nextDate, inputElement) => {
    if (!nextDate) {
      onFieldChange('entryDate', '');
      lastValidDateRef.current = '';
      if (inputElement) inputElement.setCustomValidity('');
      return;
    }

    const isFutureForCompleted = form.statusContext === 'completed' && nextDate > todayIso;
    const isPastForPlanned = form.statusContext === 'planned' && nextDate < todayIso;

    if (isFutureForCompleted || isPastForPlanned) {
      const fallbackDate = lastValidDateRef.current || '';
      onFieldChange('entryDate', fallbackDate);
      if (inputElement) {
        inputElement.value = fallbackDate;
        inputElement.setCustomValidity('');
      }
      return;
    }

    if (inputElement) {
      inputElement.setCustomValidity('');
    }
    lastValidDateRef.current = nextDate;
    onFieldChange('entryDate', nextDate);
  };

  const handleStatusContextChange = (statusContext) => {
    flushSync(() => {
      onFieldChange('statusContext', statusContext);
      onFieldChange('entryDate', '');
      setForceDateFieldVisible(true);
    });

    const input = visibleDateInputRef.current;
    if (!input) return;

    // Apply constraints directly before opening the native picker so iOS
    // receives min/max in the same user interaction.
    if (statusContext === 'completed') {
      input.min = '';
      input.max = todayIso;
    } else if (statusContext === 'planned') {
      input.min = todayIso;
      input.max = '';
    } else {
      input.min = '';
      input.max = '';
    }

    input.value = '';
    lastValidDateRef.current = '';

    input.focus();

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Some browsers block programmatic picker open.
      }
    }

    try {
      input.click();
    } catch {
      // Focus-only fallback remains.
    }
  };

  return (
    <form className="sl003-manual-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="sl003-manual-vaccination-item">Vaccination record</label>
      <select
        id="sl003-manual-vaccination-item"
        value={form.vaccinationKey}
        onChange={(event) => onFieldChange('vaccinationKey', event.target.value)}
        disabled={pending}
        aria-invalid={Boolean(errors.vaccinationKey)}
      >
        <option value="">Choose a vaccination</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {errors.vaccinationKey ? <p className="sl001-field-error" role="alert">{errors.vaccinationKey}</p> : null}

      <fieldset className="sl003-manual-status-group" disabled={pending}>
        <legend>Status</legend>
        {ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS.map((statusContext) => (
          <label key={statusContext}>
            <input
              type="radio"
              name="sl003-manual-status-context"
              value={statusContext}
              checked={form.statusContext === statusContext}
              onChange={(event) => handleStatusContextChange(event.target.value)}
            />
            {MANUAL_ENTRY_STATUS_LABELS[statusContext]}
          </label>
        ))}
      </fieldset>
      {errors.statusContext ? <p className="sl001-field-error" role="alert">{errors.statusContext}</p> : null}

      {showDateField ? <label htmlFor="sl003-manual-entry-date">Date</label> : null}
      {showDateField ? (
        <input
          ref={visibleDateInputRef}
          id="sl003-manual-entry-date"
          type="date"
          value={form.entryDate}
          min={dateMin}
          max={dateMax}
          onChange={(event) => {
            handleEntryDateChange(event.target.value, event.target);
            if (event.target.value) {
              setForceDateFieldVisible(true);
            }
          }}
          disabled={pending}
          aria-invalid={Boolean(errors.entryDate)}
        />
      ) : null}
      {errors.entryDate ? <p className="sl001-field-error" role="alert">{errors.entryDate}</p> : null}

      {saveError ? <p className="sl001-error-banner" role="alert">{saveError}</p> : null}

      <div className="sl003-manual-form-actions">
        <button type="submit" className="sl001-primary-action" disabled={pending || !canSave}>
          {pending ? 'Saving entry...' : 'Save record'}
        </button>
        <button type="button" className="sl003-quiet-button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DetailView({
  item,
  readOnly = false,
  donePending,
  showDoneForm,
  onOpenDone,
  onDoneSubmit,
  onDoneCancel,
  onDoneTimingChange,
  onCustomDoneDateChange,
  selectedDoneTiming,
  customDoneDate,
  reminderPending,
  showReminderForm,
  onOpenReminder,
  onReminderCancel,
  onReminderTimingChange,
  onCustomReminderDateChange,
  selectedReminderTiming,
  customReminderDate,
  actionError,
  confirmationMessage,
}) {
  const actionAreaRef = useRef(null);
  const actionsDisabled = donePending || reminderPending;
  const doneTimeToGo = item.status === 'done' && item.completedOn
    ? buildTimeToGoState({
      completedOn: item.completedOn,
      cadenceText: item.cadenceText,
    })
    : null;

  useEffect(() => {
    if (!showDoneForm && !showReminderForm) {
      return;
    }

    const section = actionAreaRef.current;
    if (!section) {
      return;
    }

    const scrollToActionArea = () => {
      section.scrollIntoView({ block: 'start', behavior: 'auto' });
    };

    scrollToActionArea();
    requestAnimationFrame(scrollToActionArea);
  }, [showDoneForm, showReminderForm]);

  return (
    <section className="sl002-detail-view" aria-label={`${item.displayName} details`}>
      <div className="sl002-detail-topline">
        <StatusPill status={item.status} label={item.statusLabel} />
        <span className="sl002-detail-category">{item.interventionTypeLabel ?? item.categoryLabel}</span>
      </div>
      {item.reminderDateLabel ? (
        <p className="sl003-reminder-note">Planned for {item.reminderDateLabel}</p>
      ) : null}

      <section className="sl002-detail-section" aria-label="Cadence">
        <h3>Cadence</h3>
        <p>{item.cadenceText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Recommendation">
        <h3>Recommendation</h3>
        <p>{item.recommendationText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Why it matters">
        <h3>Why it matters</h3>
        <p>{item.whyItMattersText}</p>
      </section>

      <section ref={actionAreaRef} className="sl003-action-area" aria-label="Item actions">
        <h3>{doneTimeToGo ? 'Time to go' : 'Next step'}</h3>
        {readOnly ? (
          <p className="sl003-complete-message">This item is not currently in your active plan list.</p>
        ) : item.status === 'done' ? (
          <>
            <p className="sl003-complete-message">
              {item.completedOnLabel
                ? `This item was marked as done on ${item.completedOnLabel}.`
                : 'This item is marked as done.'}
            </p>
            {doneTimeToGo ? (
              <section className="sl003-time-to-go" aria-label="Time until next due checkup">
                <div className="sl003-time-to-go-row">
                  <span className="sl003-time-to-go-due">Next due by {doneTimeToGo.nextDueLabel}</span>
                  <span className={doneTimeToGo.isOverdue ? 'sl003-time-to-go-remaining is-overdue' : 'sl003-time-to-go-remaining'}>
                    {doneTimeToGo.remainingText}
                  </span>
                </div>
                <div className="sl003-time-to-go-track" role="presentation">
                  <div className="sl003-time-to-go-fill" style={{ width: `${doneTimeToGo.progressPercent}%` }} />
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            {!showDoneForm ? (
              <button
                type="button"
                className="sl001-primary-action"
                onClick={onOpenDone}
                disabled={actionsDisabled}
              >
                Mark as done
              </button>
            ) : null}
            {showDoneForm ? (
              <DoneForm
                selectedTiming={selectedDoneTiming}
                customDate={customDoneDate}
                onTimingChange={onDoneTimingChange}
                onCustomDateChange={onCustomDoneDateChange}
                onSubmit={onDoneSubmit}
                onCancel={onDoneCancel}
                pending={donePending}
                validationMessage={actionError}
              />
            ) : null}
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
                onCancel={onReminderCancel}
                pending={reminderPending}
                validationMessage={actionError}
              />
            ) : null}
          </>
        )}

        {!showReminderForm && !showDoneForm && actionError ? <p className="sl001-field-error" role="alert">{actionError}</p> : null}
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
  profile = { profileId: 'self', name: 'Me' },
  initialPlanSnapshot,
  initialManualEntries = [],
  initialCategory = PLAN_CATEGORIES.checkup,
  initialItemKey,
  initialOrigin = DETAIL_ORIGIN.direct,
  initialReturnToVaccinationTracker = false,
  onNavigate,
  saveManualEntry,
  onManualEntriesChange,
  onPlanSnapshotChange,
  clock = () => new Date(),
  locale = 'en-US',
}) {
  const [planSnapshot, setPlanSnapshot] = useState(initialPlanSnapshot);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [detailState, setDetailState] = useState(initialItemKey ? {
    itemKey: initialItemKey,
    origin: initialOrigin,
    returnToVaccinationTracker: Boolean(initialReturnToVaccinationTracker),
  } : null);

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showDoneForm, setShowDoneForm] = useState(false);
  const [selectedDoneTiming, setSelectedDoneTiming] = useState(DONE_COMPLETION_TIMING_TYPES.today);
  const [customDoneDate, setCustomDoneDate] = useState('');
  const [selectedReminderTiming, setSelectedReminderTiming] = useState(EMPTY_REMINDER_TIMING);
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [showManualEntryForm, setShowManualEntryForm] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState(createInitialManualEntryForm());
  const [manualEntryErrors, setManualEntryErrors] = useState({});
  const [manualEntrySaveError, setManualEntrySaveError] = useState('');
  const [manualEntryPending, setManualEntryPending] = useState(false);
  const [manualEntries, setManualEntries] = useState(initialManualEntries);
  const [pendingListScrollRestoreY, setPendingListScrollRestoreY] = useState(null);
  const manualEntryFormShellRef = useRef(null);
  const planListScrollYRef = useRef(0);

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
  const manualEntryOptions = useMemo(
    () => buildManualVaccinationCatalogOptions(planSnapshot),
    [planSnapshot],
  );
  const manualEntryRows = useMemo(
    () => buildManualVaccinationRows(manualEntries, planSnapshot, { locale }),
    [manualEntries, planSnapshot, locale],
  );

  const detailItem = detailState ? resolveItemDetail(readModel, detailState.itemKey) : null;
  const fallbackDefinition = detailState?.itemKey
    ? PREVENTIVE_ITEM_DEFINITION_INDEX[detailState.itemKey]
    : null;
  const detailItemView = detailItem ?? (fallbackDefinition ? {
    itemKey: fallbackDefinition.itemKey,
    displayName: fallbackDefinition.displayName,
    category: fallbackDefinition.category,
    categoryLabel: getCategoryLabel(fallbackDefinition.category, 'singular'),
    interventionType: fallbackDefinition.interventionType,
    interventionTypeLabel: fallbackDefinition.interventionTypeLabel,
    cadenceText: fallbackDefinition.cadenceText,
    recommendationText: fallbackDefinition.recommendationText,
    whyItMattersText: fallbackDefinition.whyItMattersText,
    status: PLAN_STATUSES.pending,
    statusLabel: getStatusLabel(PLAN_STATUSES.pending),
    reminderDate: null,
    reminderDateLabel: null,
  } : null);
  const detailReadOnly = Boolean(detailItemView && !detailItem);
  const activeItems = activeCategory === PLAN_CATEGORIES.vaccination ? readModel.vaccinations : readModel.checkups;

  useEffect(() => {
    if (!showManualEntryForm || activeCategory !== PLAN_CATEGORIES.vaccination) {
      return;
    }

    const node = manualEntryFormShellRef.current;
    if (!node) {
      return;
    }

    const scrollToForm = () => {
      node.scrollIntoView({ block: 'start', behavior: 'auto' });
    };

    scrollToForm();
    requestAnimationFrame(scrollToForm);
  }, [activeCategory, showManualEntryForm]);

  const handleOpenDetailFromPlan = (itemKey) => {
    if (typeof window !== 'undefined') {
      planListScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    }

    const item = readModel.byItemKey[itemKey];
    const categoryForOrigin = item?.category ?? activeCategory;

    setDetailState({
      itemKey,
      origin: resolveOriginForCategory(categoryForOrigin),
      returnToVaccinationTracker: false,
    });
    setShowReminderForm(false);
    setShowDoneForm(false);
    setActionError('');
    setConfirmationMessage('');
  };

  useEffect(() => {
    if (!detailState) {
      return;
    }

    const scrollToTop = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };

    // iOS Safari can retain prior scroll when surface switches to detail.
    scrollToTop();
    requestAnimationFrame(scrollToTop);
    setTimeout(scrollToTop, 0);
  }, [detailState]);

  useEffect(() => {
    if (detailState || pendingListScrollRestoreY === null) {
      return;
    }

    const restoreY = Math.max(0, Number(pendingListScrollRestoreY) || 0);
    const restoreScroll = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: restoreY, left: 0, behavior: 'auto' });
      }
    };

    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 0);
    setPendingListScrollRestoreY(null);
  }, [detailState, pendingListScrollRestoreY]);

  const handleBackFromDetail = () => {
    const target = resolveDetailBackTarget({
      origin: detailState?.origin,
      detailItem: detailItemView,
    });

    if (target.destination === DETAIL_ORIGIN.dashboard) {
      if (typeof onNavigate === 'function') {
        onNavigate(target);
      } else if (detailItem) {
        setActiveCategory(detailItem.category);
      }

      setDetailState(null);
      setShowReminderForm(false);
      setShowDoneForm(false);
      setActionError('');
      return;
    }

    if (target.destination === DETAIL_ORIGIN.vaccinations) {
      if (detailState?.returnToVaccinationTracker && typeof onNavigate === 'function') {
        onNavigate(target);
        setDetailState(null);
        setShowReminderForm(false);
        setShowDoneForm(false);
        setActionError('');
        return;
      }

      setActiveCategory(PLAN_CATEGORIES.vaccination);
    } else {
      setActiveCategory(PLAN_CATEGORIES.checkup);
    }

    setDetailState(null);
    setShowReminderForm(false);
    setShowDoneForm(false);
    setActionError('');
    setPendingListScrollRestoreY(planListScrollYRef.current);
  };

  const handleDoneSubmit = async (event) => {
    event.preventDefault();

    if (!detailItem || pendingAction) {
      return;
    }

    setPendingAction('done');
    setActionError('');
    setConfirmationMessage('');

    try {
      const result = service.markItemDone(profile.profileId, detailItem.itemKey, {
        customDate: selectedDoneTiming === DONE_COMPLETION_TIMING_TYPES.custom_date
          ? customDoneDate
          : '',
      });
      if (typeof onPlanSnapshotChange === 'function') {
        onPlanSnapshotChange(result.planSnapshot);
      }

      if (detailState?.origin === DETAIL_ORIGIN.dashboard) {
        setDetailState(null);
        setShowDoneForm(false);
        setShowReminderForm(false);
        setActionError('');
        setConfirmationMessage('');

        if (typeof onNavigate === 'function') {
          onNavigate({ destination: DETAIL_ORIGIN.dashboard });
        }
        return;
      }

      setShowDoneForm(false);
      setShowReminderForm(false);
      if (result.item?.completedOn) {
        setConfirmationMessage(`Marked done on ${formatDateForConfirmation(result.item.completedOn)}.`);
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : DETAIL_ACTION_ERRORS.action_failed;
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const saveReminderSelection = async ({ timingType, customDate }) => {
    if (!detailItem || pendingAction) {
      return false;
    }

    setPendingAction('reminder');
    setActionError('');
    setConfirmationMessage('');

    try {
      const result = service.scheduleItemReminder(profile.profileId, detailItem.itemKey, {
        timingType,
        customDate,
      });

      if (typeof onPlanSnapshotChange === 'function') {
        onPlanSnapshotChange(result.planSnapshot);
      }

      if (detailState?.origin === DETAIL_ORIGIN.dashboard) {
        setDetailState(null);
        setShowReminderForm(false);
        setShowDoneForm(false);
        setActionError('');
        setConfirmationMessage('');

        if (typeof onNavigate === 'function') {
          onNavigate({ destination: DETAIL_ORIGIN.dashboard });
        }
        return true;
      }

      setShowReminderForm(false);
      setConfirmationMessage(`Reminder set for ${formatDateForConfirmation(result.reminder.scheduledFor)}.`);
      return true;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : DETAIL_ACTION_ERRORS.action_failed;
      setActionError(message);
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  if (!planSnapshot) {
    return (
      <AppShell title="Your preventive plan">
        <p className="sl001-support-copy">Loading your preventive plan...</p>
        <div className="sl002-loading-block" aria-hidden="true" />
        <div className="sl002-loading-block" aria-hidden="true" />
      </AppShell>
    );
  }

  if (detailState && !detailItemView) {
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

  if (detailItemView) {
    return (
      <AppShell
        title={detailItemView.displayName}
        headerAction={(
          <button type="button" className="sl002-back-button" onClick={handleBackFromDetail}>
            Back
          </button>
        )}
      >
        <DetailView
          item={detailItemView}
          readOnly={detailReadOnly}
          donePending={pendingAction === 'done'}
          showDoneForm={showDoneForm}
          onOpenDone={() => {
            setShowDoneForm(true);
            setShowReminderForm(false);
            setActionError('');
            setConfirmationMessage('');
          }}
          onDoneSubmit={handleDoneSubmit}
          onDoneCancel={() => {
            setShowDoneForm(false);
            setActionError('');
          }}
          onDoneTimingChange={(timingType) => {
            setSelectedDoneTiming(timingType);
            setActionError('');
            setConfirmationMessage('');
          }}
          onCustomDoneDateChange={(value) => {
            setCustomDoneDate(value);
            setActionError('');
            setConfirmationMessage('');
          }}
          selectedDoneTiming={selectedDoneTiming}
          customDoneDate={customDoneDate}
          reminderPending={pendingAction === 'reminder'}
          showReminderForm={showReminderForm}
          onOpenReminder={() => {
            setShowReminderForm(true);
            setShowDoneForm(false);
            setSelectedReminderTiming(EMPTY_REMINDER_TIMING);
            setCustomReminderDate('');
            setActionError('');
            setConfirmationMessage('');
          }}
          onReminderCancel={() => {
            setShowReminderForm(false);
            setSelectedReminderTiming(EMPTY_REMINDER_TIMING);
            setCustomReminderDate('');
            setActionError('');
          }}
          onReminderTimingChange={async (timingType) => {
            setSelectedReminderTiming(timingType);
            setActionError('');
            setConfirmationMessage('');
            if (timingType !== REMINDER_TIMING_TYPES.custom_date) {
              await saveReminderSelection({ timingType, customDate: customReminderDate });
            }
          }}
          onCustomReminderDateChange={async (value) => {
            setCustomReminderDate(value);
            setActionError('');
            setConfirmationMessage('');
            if (selectedReminderTiming === REMINDER_TIMING_TYPES.custom_date && value) {
              await saveReminderSelection({
                timingType: REMINDER_TIMING_TYPES.custom_date,
                customDate: value,
              });
            }
          }}
          selectedReminderTiming={selectedReminderTiming}
          customReminderDate={customReminderDate}
          actionError={actionError}
          confirmationMessage={confirmationMessage}
        />
      </AppShell>
    );
  }

  const openManualEntryForm = () => {
    setShowManualEntryForm(true);
    setManualEntrySaveError('');
    setManualEntryErrors({});
    setManualEntryForm(createInitialManualEntryForm());
  };

  const closeManualEntryForm = () => {
    setShowManualEntryForm(false);
    setManualEntryPending(false);
    setManualEntrySaveError('');
    setManualEntryErrors({});
  };

  const handleManualFieldChange = (field, value) => {
    setManualEntryForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setManualEntryErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      return {
        ...previous,
        [field]: undefined,
      };
    });

    setManualEntrySaveError('');
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    const validation = validateManualVaccinationEntryInput(manualEntryForm, {
      allowedVaccinationKeys: manualEntryOptions.map((option) => option.value),
      now: clock(),
    });

    if (!validation.isValid) {
      setManualEntryErrors(validation.errors);
      return;
    }

    const entry = createManualVaccinationEntry(manualEntryForm, {
      profileId: profile.profileId,
      allowedVaccinationKeys: manualEntryOptions.map((option) => option.value),
      now: clock(),
    });

    setManualEntryPending(true);
    setManualEntryErrors({});
    setManualEntrySaveError('');

    try {
      let savedEntry = entry;

      if (typeof saveManualEntry === 'function') {
        const maybeSaved = await saveManualEntry(entry);
        if (maybeSaved && typeof maybeSaved === 'object') {
          savedEntry = maybeSaved;
        }
      }

      setManualEntries((previous) => {
        const next = [...previous, savedEntry];
        if (typeof onManualEntriesChange === 'function') {
          onManualEntriesChange(next);
        }
        return next;
      });

      closeManualEntryForm();
    } catch {
      setManualEntryPending(false);
      setManualEntrySaveError(MANUAL_ENTRY_VALIDATION_ERRORS.saveFailed);
    }
  };

  return (
    <AppShell title={null}>
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
        {activeCategory === PLAN_CATEGORIES.vaccination ? (
          <section className="sl003-vaccination-guidance sl001-summary-card" aria-label="Due guidance">
            <p className="sl001-label">Due guidance</p>
            <p className="sl001-summary-meta">
              Guidance is based on your preventive plan profile and helps you spot what may need attention next.
            </p>
            {activeItems.length === 0 ? (
              <p className="sl001-summary-meta">No vaccination guidance is available right now.</p>
            ) : (
              <ul className="sl002-plan-list sl003-guidance-list" aria-label="Vaccination guidance list">
                {activeItems.map((item) => (
                  <PlanRow key={item.itemKey} item={item} onOpen={handleOpenDetailFromPlan} />
                ))}
              </ul>
            )}
          </section>
        ) : null}
        {activeCategory !== PLAN_CATEGORIES.vaccination && activeItems.length === 0 ? (
          <ListEmptyState activeCategory={activeCategory} onSwitchCategory={setActiveCategory} />
        ) : null}
        {activeCategory !== PLAN_CATEGORIES.vaccination && activeItems.length > 0 ? (
          <ul className="sl002-plan-list" aria-label={`${getCategoryLabel(activeCategory)} list`}>
            {activeItems.map((item) => (
              <PlanRow key={item.itemKey} item={item} onOpen={handleOpenDetailFromPlan} />
            ))}
          </ul>
        ) : null}
        {activeCategory === PLAN_CATEGORIES.vaccination ? (
          <>
            <section className="sl003-manual-entry-box sl002-empty-state" aria-label="Manual vaccination records">
              <h3>Your vaccination records</h3>
              {manualEntryRows.length === 0 ? (
                <p className="sl003-manual-empty">No manual vaccination entries yet.</p>
              ) : (
                <ul className="sl002-plan-list sl003-manual-list" aria-label="Manual vaccination entries">
                  {manualEntryRows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="sl002-plan-row sl003-manual-plan-row"
                        onClick={() => handleOpenDetailFromPlan(row.relatedItemKey ?? row.vaccinationKey)}
                      >
                        <span className="sl002-plan-row-copy">
                          <span className="sl002-plan-row-title">{row.vaccineName}</span>
                          <span className="sl002-plan-row-cadence">Date: {row.entryDateLabel}</span>
                        </span>
                        <StatusPill status={row.planStatus} label={row.statusLabel} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="sl001-primary-action sl003-manual-entry-cta sl003-manual-entry-cta-inbox"
                onClick={openManualEntryForm}
              >
                Add record
              </button>
            </section>
            {showManualEntryForm ? (
              <section
                ref={manualEntryFormShellRef}
                className="sl003-manual-entry-form-shell sl002-empty-state"
                aria-label="Add vaccination entry"
              >
                <ManualEntryForm
                  form={manualEntryForm}
                  options={manualEntryOptions}
                  errors={manualEntryErrors}
                  saveError={manualEntrySaveError}
                  pending={manualEntryPending}
                  onFieldChange={handleManualFieldChange}
                  onSubmit={handleManualSubmit}
                  onCancel={closeManualEntryForm}
                />
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
