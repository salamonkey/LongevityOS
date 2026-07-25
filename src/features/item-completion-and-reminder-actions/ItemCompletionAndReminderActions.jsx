import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AppShell,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  DETAIL_ORIGIN,
  PLAN_STATUSES,
  PLAN_CATEGORIES,
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
  REMINDER_TIMING_TYPES,
  formatDateForConfirmation,
} from './model.js';
import {
  buildPlanReadModelForSlice,
  resolveOriginForCategory,
} from './selectors.js';
import {
  ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS,
  MANUAL_ENTRY_STATUS_CONTEXT,
  MANUAL_ENTRY_VALIDATION_ERRORS,
  buildManualVaccinationCatalogOptions,
  buildManualVaccinationRows,
  createManualVaccinationEntry,
  createInitialManualEntryForm,
  validateManualVaccinationEntryInput,
} from '../vaccination-tracking-area-and-manual-entries/model.js';
import { Sheet, ListRow, IconButton, Card, Badge, Button, Icon, ProgressRing } from '../../design-system/components/index.js';
import { getCategoryIcon, getCategoryLabelKey, getInterventionTypeLabelKey, getStatusBadgeStatus, getStatusLabelKey, getStatusTone, getToneColors } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';

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
    remainingDays,
    overdueDays,
    isOverdue: remainingDays < 0,
  };
}

function PlanRow({ item, onOpen }) {
  const { t } = useTranslation();
  return (
    <ListRow
      icon={getCategoryIcon(item.category)}
      tone={getStatusTone(item.status)}
      title={item.displayName}
      subtitle={item.requiresSharedDecision ? `${item.cadenceText} · Discuss with clinician` : item.cadenceText}
      badge={t(getStatusLabelKey(item.status))}
      badgeStatus={getStatusBadgeStatus(item.status)}
      onClick={() => onOpen(item.itemKey)}
    />
  );
}

const EMPTY_STATE_NEXT_CATEGORY = Object.freeze({
  [PLAN_CATEGORIES.checkup]: PLAN_CATEGORIES.vaccination,
  [PLAN_CATEGORIES.vaccination]: PLAN_CATEGORIES.counseling,
  [PLAN_CATEGORIES.counseling]: PLAN_CATEGORIES.checkup,
});

function ListEmptyState({ activeCategory, onSwitchCategory, visibleCategories }) {
  const { t } = useTranslation();
  const nextCategory = EMPTY_STATE_NEXT_CATEGORY[activeCategory] ?? PLAN_CATEGORIES.checkup;
  const canSwitchCategory = visibleCategories.includes(nextCategory) && nextCategory !== activeCategory;
  const categoryLabel = t(getCategoryLabelKey(activeCategory));
  const nextCategoryLabel = t(getCategoryLabelKey(nextCategory));

  return (
    <section className="sl002-empty-state" role="status" aria-live="polite">
      <h3>{t('checkups.noItemsInCategory', { category: categoryLabel.toLowerCase() })}</h3>
      <p>{t('checkups.noItemsInCategoryBody', { category: categoryLabel.toLowerCase() })}</p>
      {canSwitchCategory ? (
      <Button type="button" variant="primary" onClick={() => onSwitchCategory(nextCategory)}>
        {t('checkups.viewCategory', { category: nextCategoryLabel })}
      </Button>
      ) : null}
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
  const { t } = useTranslation();
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
        <legend>{t('reminderForm.legend')}</legend>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.one_month}
            checked={selectedTiming === REMINDER_TIMING_TYPES.one_month}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {t('reminderForm.inOneMonth')}
        </label>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.three_months}
            checked={selectedTiming === REMINDER_TIMING_TYPES.three_months}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {t('reminderForm.inThreeMonths')}
        </label>
        <label>
          <input
            type="radio"
            name="reminder-timing"
            value={REMINDER_TIMING_TYPES.custom_date}
            checked={selectedTiming === REMINDER_TIMING_TYPES.custom_date}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {t('reminderForm.chooseDate')}
        </label>
        {selectedTiming === REMINDER_TIMING_TYPES.custom_date ? (
          <div className="sl003-custom-date">
            <label htmlFor="sl003-custom-date">{t('reminderForm.reminderDate')}</label>
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
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
  const { t } = useTranslation();
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
        <legend>{t('doneForm.legend')}</legend>
        <label>
          <input
            type="radio"
            name="done-timing"
            value={DONE_COMPLETION_TIMING_TYPES.today}
            checked={selectedTiming === DONE_COMPLETION_TIMING_TYPES.today}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {t('doneForm.today')}
        </label>
        <label>
          <input
            type="radio"
            name="done-timing"
            value={DONE_COMPLETION_TIMING_TYPES.custom_date}
            checked={selectedTiming === DONE_COMPLETION_TIMING_TYPES.custom_date}
            onChange={(event) => onTimingChange(event.target.value)}
          />
          {t('doneForm.chooseDate')}
        </label>
        {selectedTiming === DONE_COMPLETION_TIMING_TYPES.custom_date ? (
          <div className="sl003-custom-date">
            <label htmlFor="sl003-done-custom-date">{t('doneForm.completionDate')}</label>
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
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? t('doneForm.saving') : t('doneForm.saveCompletion')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
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
  const { t } = useTranslation();
  const manualEntryStatusLabelKeys = {
    completed: 'manualEntry.statusCompleted',
    planned: 'manualEntry.statusPlanned',
  };

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
      <label htmlFor="sl003-manual-vaccination-item">{t('manualEntry.vaccinationRecord')}</label>
      <select
        id="sl003-manual-vaccination-item"
        value={form.vaccinationKey}
        onChange={(event) => onFieldChange('vaccinationKey', event.target.value)}
        disabled={pending}
        aria-invalid={Boolean(errors.vaccinationKey)}
      >
        <option value="">{t('manualEntry.chooseVaccination')}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {errors.vaccinationKey ? <p className="sl001-field-error" role="alert">{errors.vaccinationKey}</p> : null}

      <fieldset className="sl003-manual-status-group" disabled={pending}>
        <legend>{t('manualEntry.status')}</legend>
        {ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS.map((statusContext) => (
          <label key={statusContext}>
            <input
              type="radio"
              name="sl003-manual-status-context"
              value={statusContext}
              checked={form.statusContext === statusContext}
              onChange={(event) => handleStatusContextChange(event.target.value)}
            />
            {t(manualEntryStatusLabelKeys[statusContext] ?? 'manualEntry.statusPlanned')}
          </label>
        ))}
      </fieldset>
      {errors.statusContext ? <p className="sl001-field-error" role="alert">{errors.statusContext}</p> : null}

      {showDateField ? <label htmlFor="sl003-manual-entry-date">{t('manualEntry.date')}</label> : null}
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
        <Button type="submit" variant="primary" disabled={pending || !canSave}>
          {pending ? t('manualEntry.savingEntry') : t('manualEntry.saveRecord')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
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
  const { t } = useTranslation();
  const actionAreaRef = useRef(null);
  const actionsDisabled = donePending || reminderPending;
  const showActionCtas = !showDoneForm && !showReminderForm;
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

  const [heroChipBg, heroChipFg] = getToneColors(getStatusTone(item.status));

  return (
    <section className="sl002-detail-view" aria-label={`${item.displayName} details`}>
      <Card padding={16} className="vitalis-detail-hero">
        <span className="vitalis-detail-hero-icon" style={{ background: heroChipBg, color: heroChipFg }}>
          <Icon name={getCategoryIcon(item.category)} size={26} />
        </span>
        <div className="vitalis-detail-hero-copy">
          <p className="vitalis-detail-hero-title">{item.displayName}</p>
          <p className="vitalis-detail-hero-sub">{t(getInterventionTypeLabelKey(item.interventionType))}</p>
        </div>
        <Badge status={getStatusBadgeStatus(item.status)}>{t(getStatusLabelKey(item.status))}</Badge>
      </Card>
      {item.reminderDateLabel ? (
        <p className="sl003-reminder-note">Planned for {item.reminderDateLabel}</p>
      ) : null}
      {item.requiresSharedDecision ? (
        <p className="sl003-shared-decision-note" role="note">
          Worth discussing with your clinician — this is a personal choice, not something you're behind on.
        </p>
      ) : null}

      <Card className="sl002-detail-section" aria-label="Cadence">
        <h3>{t('detail.cadence')}</h3>
        <p>{item.cadenceText}</p>
      </Card>

      <Card className="sl002-detail-section" aria-label="Recommendation">
        <h3>{t('detail.recommendation')}</h3>
        <p>{item.recommendationText}</p>
      </Card>

      <Card className="sl002-detail-section" aria-label="Why it matters">
        <h3>{t('detail.whyItMatters')}</h3>
        <p>{item.whyItMattersText}</p>
      </Card>

      <section ref={actionAreaRef} className="sl003-action-area vds-card vds-card--elevated" aria-label="Item actions">
        <h3>{doneTimeToGo ? t('detail.timeToGo') : t('detail.nextStep')}</h3>
        {readOnly ? (
          <p className="sl003-complete-message">{t('detail.notInPlan')}</p>
        ) : item.status === 'done' ? (
          <>
            <p className="sl003-complete-message">
              {item.completedOnLabel
                ? t('detail.markedDoneOn', { date: item.completedOnLabel })
                : t('detail.markedDone')}
            </p>
            {doneTimeToGo ? (
              <section className="sl003-time-to-go" aria-label={t('detail.timeToGoLabel')}>
                <ProgressRing value={doneTimeToGo.progressPercent} size={56} stroke={6} />
                <div className="sl003-time-to-go-copy">
                  <span className="sl003-time-to-go-due">{t('detail.nextDueBy', { date: doneTimeToGo.nextDueLabel })}</span>
                  <span className={doneTimeToGo.isOverdue ? 'sl003-time-to-go-remaining is-overdue' : 'sl003-time-to-go-remaining'}>
                    {doneTimeToGo.isOverdue
                      ? t('detail.daysOverdue', { count: doneTimeToGo.overdueDays })
                      : t('detail.daysLeft', { count: doneTimeToGo.remainingDays })}
                  </span>
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            {showActionCtas ? (
              <div className="sl003-action-cta-row">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onOpenDone}
                  disabled={actionsDisabled}
                >
                  {t('detail.markAsDone')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onOpenReminder}
                  disabled={actionsDisabled}
                >
                  {t('detail.setReminder')}
                </Button>
              </div>
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
  const { t } = useTranslation();
  return (
    <section className="sl002-not-found" role="alert">
      <h2>{t('plan.itemUnavailableHeading')}</h2>
      <p>{t('plan.itemUnavailableBody')}</p>
      <Button type="button" variant="primary" fullWidth onClick={onRecover}>{t('plan.returnToPlan')}</Button>
    </section>
  );
}

export default function ItemCompletionAndReminderActions({
  profile = { profileId: 'self', name: 'Me' },
  initialPlanSnapshot,
  initialManualEntries = [],
  initialCategory = PLAN_CATEGORIES.checkup,
  visibleCategories = [PLAN_CATEGORIES.checkup, PLAN_CATEGORIES.vaccination, PLAN_CATEGORIES.counseling],
  initialItemKey,
  initialOrigin = DETAIL_ORIGIN.direct,
  initialReturnToVaccinationTracker = false,
  onNavigate,
  saveManualEntry,
  onManualEntriesChange,
  onPlanSnapshotChange,
  clock = () => new Date(),
  locale = 'en-US',
  catalogGeneration = 0,
}) {
  const { t, locale: uiLocale } = useTranslation();
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
    [planSnapshot, uiLocale, catalogGeneration],
  );
  const manualEntryOptions = useMemo(
    () => buildManualVaccinationCatalogOptions(planSnapshot),
    [planSnapshot, uiLocale, catalogGeneration],
  );
  const manualEntryRows = useMemo(
    () => buildManualVaccinationRows(manualEntries, planSnapshot, { locale }),
    [manualEntries, planSnapshot, locale, uiLocale, catalogGeneration],
  );

  const detailItem = detailState ? resolveItemDetail(readModel, detailState.itemKey) : null;
  const fallbackDefinition = detailState?.itemKey
    ? PREVENTIVE_ITEM_DEFINITION_INDEX[detailState.itemKey]
    : null;
  const fallbackLiveCopy = fallbackDefinition ? resolveCatalogCopyForItemKey(fallbackDefinition.itemKey) : null;
  const detailItemView = detailItem ?? (fallbackDefinition ? {
    itemKey: fallbackDefinition.itemKey,
    displayName: fallbackLiveCopy?.name ?? fallbackDefinition.displayName,
    category: fallbackDefinition.category,
    interventionType: fallbackDefinition.interventionType,
    cadenceText: fallbackLiveCopy?.cadenceLabel ?? fallbackDefinition.cadenceText,
    recommendationText: fallbackLiveCopy?.recommendationText ?? fallbackDefinition.recommendationText,
    whyItMattersText: fallbackLiveCopy?.whyItMatters ?? fallbackDefinition.whyItMattersText,
    status: PLAN_STATUSES.pending,
    reminderDate: null,
    reminderDateLabel: null,
  } : null);
  const detailReadOnly = Boolean(detailItemView && !detailItem);
  const activeItems = activeCategory === PLAN_CATEGORIES.vaccination
    ? readModel.vaccinations
    : (activeCategory === PLAN_CATEGORIES.counseling ? readModel.counseling : readModel.checkups);

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
      <AppShell title={t('plan.loadingTitle')}>
        <p className="sl001-support-copy">{t('plan.loadingBody')}</p>
        <div className="sl002-loading-block" aria-hidden="true" />
        <div className="sl002-loading-block" aria-hidden="true" />
      </AppShell>
    );
  }

  if (detailState && !detailItemView) {
    return (
      <AppShell title={t('plan.itemUnavailableTitle')}>
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
        onBack={handleBackFromDetail}
        backLabel={t('common.back')}
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

      if (savedEntry.statusContext === MANUAL_ENTRY_STATUS_CONTEXT.completed) {
        try {
          const doneResult = service.markItemDone(profile.profileId, savedEntry.vaccinationKey, {
            customDate: savedEntry.entryDate,
          });
          if (typeof onPlanSnapshotChange === 'function') {
            onPlanSnapshotChange(doneResult.planSnapshot);
          }
        } catch (doneError) {
          console.warn('Failed to recompute booster due date for logged vaccination.', doneError);
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
        <div className="vitalis-seg" role="tablist" aria-label="Plan categories">
          {[PLAN_CATEGORIES.checkup, PLAN_CATEGORIES.vaccination, PLAN_CATEGORIES.counseling]
            .filter((category) => visibleCategories.includes(category))
            .map((category) => {
            const isActive = activeCategory === category;
            const label = t(getCategoryLabelKey(category));

            return (
              <button
                key={category}
                type="button"
                role="tab"
                className={isActive ? 'is-active' : ''}
                aria-selected={isActive}
                onClick={() => setActiveCategory(category)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {activeCategory === PLAN_CATEGORIES.vaccination ? (
          <Card className="sl003-vaccination-guidance" aria-label="Due guidance">
            <p className="sl001-label">{t('vaccinations.dueGuidanceTitle')}</p>
            <p className="sl001-summary-meta">{t('vaccinations.dueGuidanceBody')}</p>
            {activeItems.length === 0 ? (
              <p className="sl001-summary-meta">{t('vaccinations.noGuidance')}</p>
            ) : (
              <div className="rows" aria-label="Vaccination guidance list">
                {activeItems.map((item) => (
                  <PlanRow key={item.itemKey} item={item} onOpen={handleOpenDetailFromPlan} />
                ))}
              </div>
            )}
          </Card>
        ) : null}
        {activeCategory !== PLAN_CATEGORIES.vaccination && activeItems.length === 0 ? (
          <ListEmptyState activeCategory={activeCategory} onSwitchCategory={setActiveCategory} visibleCategories={visibleCategories} />
        ) : null}
        {activeCategory !== PLAN_CATEGORIES.vaccination && activeItems.length > 0 ? (
          <div className="rows" aria-label={`${t(getCategoryLabelKey(activeCategory))} list`}>
            {activeItems.map((item) => (
              <PlanRow key={item.itemKey} item={item} onOpen={handleOpenDetailFromPlan} />
            ))}
          </div>
        ) : null}
        {activeCategory !== PLAN_CATEGORIES.vaccination ? (
          <Card elevated={false} className="sl003-guidance-disclaimer">
            <p>{t('checkups.disclaimer')}</p>
          </Card>
        ) : null}
        {activeCategory === PLAN_CATEGORIES.vaccination ? (
          <>
            <Card className="sl003-manual-entry-box" aria-label="Manual vaccination records">
              <h3>{t('vaccinations.recordsTitle')}</h3>
              {manualEntryRows.length === 0 ? (
                <p className="sl003-manual-empty">{t('vaccinations.noRecords')}</p>
              ) : (
                <div className="rows" aria-label="Manual vaccination entries">
                  {manualEntryRows.map((row) => (
                    <ListRow
                      key={row.id}
                      icon="syringe"
                      tone={getStatusTone(row.planStatus)}
                      title={row.vaccineName}
                      subtitle={`Date: ${row.entryDateLabel}`}
                      badge={t(getStatusLabelKey(row.planStatus))}
                      badgeStatus={getStatusBadgeStatus(row.planStatus)}
                      onClick={() => handleOpenDetailFromPlan(row.relatedItemKey ?? row.vaccinationKey)}
                    />
                  ))}
                </div>
              )}
            </Card>
            <IconButton
              icon="plus"
              variant="solid"
              size="lg"
              label={t('vaccinations.addRecordLabel')}
              className="sl003-manual-entry-fab"
              onClick={openManualEntryForm}
            />
            <Sheet open={showManualEntryForm} onClose={closeManualEntryForm} title={t('vaccinations.sheetTitle')} closeLabel={t('common.close')}>
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
            </Sheet>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
