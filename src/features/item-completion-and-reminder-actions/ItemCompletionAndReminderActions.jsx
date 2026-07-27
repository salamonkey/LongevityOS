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
  OPT_OUT_PRESETS,
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
import { ListRow, IconButton, Card, Badge, Button, Icon, ProgressRing } from '../../design-system/components/index.js';
import { getCategoryIcon, getCategoryLabelKey, getInterventionTypeLabelKey, getStatusBadgeStatus, getStatusLabelKey, getStatusTone, getToneColors } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';
import { BODY_REGIONS, resolveRegionIdForItemKey } from '../self-onboarding-to-first-dashboard/bodyRegions.js';

const DONE_COMPLETION_TIMING_TYPES = Object.freeze({
  today: 'today',
  custom_date: 'custom_date',
});
const EMPTY_REMINDER_TIMING = '';

const OPT_OUT_OPTION_ORDER = Object.freeze([
  OPT_OUT_PRESETS.one_season,
  OPT_OUT_PRESETS.two_seasons,
  OPT_OUT_PRESETS.one_year,
  OPT_OUT_PRESETS.forever,
]);

const OPT_OUT_OPTION_LABEL_KEYS = Object.freeze({
  [OPT_OUT_PRESETS.one_season]: 'optOutForm.oneSeason',
  [OPT_OUT_PRESETS.two_seasons]: 'optOutForm.twoSeasons',
  [OPT_OUT_PRESETS.one_year]: 'optOutForm.oneYear',
  [OPT_OUT_PRESETS.forever]: 'optOutForm.forever',
});

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

function formatDetailDate(isoDate, locale) {
  if (!isoDate) return '';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
}

// Real citation, not written copy: USPSTF grade / evidence tier for
// checkups & counseling comes from the matched rule band; the Swiss BAG
// vaccination-schedule chapter reference comes from the matched dose row.
// Only one of the two is ever populated, depending on category.
function resolveSourceText(item, t) {
  if (item.sourceRef) {
    return t('detail.sourceVaccinationPlan', { ref: item.sourceRef });
  }
  if (item.uspstfGrade) {
    return t('detail.sourceUspstf', { grade: item.uspstfGrade });
  }
  return '';
}

// The one real, always-available "why is this on my list" signal is the
// age this recommendation targets (from the matched rule band/dose) — not
// invented copy about the user's specific risk factors, which the plan
// snapshot doesn't carry through to individual items. Phrasing must track
// whether that age has actually arrived yet: "pending"/"soon" mean the
// target age is still ahead, so "you've reached it" would be false.
function resolveReasonForListText(item, t) {
  if (!Number.isFinite(item.targetAge)) {
    return '';
  }

  const ageStillAhead = item.status === 'pending' || item.status === 'soon';
  return ageStillAhead
    ? t('detail.recommendedFromAge', { age: item.targetAge })
    : t('detail.includedForAge', { age: item.targetAge });
}

function resolveStatusReasonText(item, t, locale) {
  if (item.status === 'planned' && item.reminderDateLabel) {
    return t('detail.plannedFor', { date: item.reminderDateLabel });
  }

  const dueLabel = formatDetailDate(item.nextDueDate, locale);
  if (!dueLabel) return '';

  if (item.status === 'overdue') return t('detail.dueSince', { date: dueLabel });
  if (item.status === 'due') return t('detail.dueSince', { date: dueLabel });
  if (item.status === 'soon' || item.status === 'pending') return t('detail.recommendedFrom', { date: dueLabel });
  return '';
}

const DUE_BUCKET_STATUSES = new Set(['due', 'overdue']);
// A conscious opt-out is grouped with "done" for this summary bar -- it no
// longer needs action, which is what this bar communicates.
const DONE_BUCKET_STATUSES = new Set(['done', 'opted_out']);

function groupPlanItemsByStatus(items) {
  const due = [];
  const upcoming = [];
  const done = [];

  items.forEach((item) => {
    if (DONE_BUCKET_STATUSES.has(item.status)) {
      done.push(item);
    } else if (DUE_BUCKET_STATUSES.has(item.status)) {
      due.push(item);
    } else {
      upcoming.push(item);
    }
  });

  return { due, upcoming, done };
}

// Percent of the way through the current recurrence cycle (previous due date
// -> next due date), so a row can show "how soon" at a glance rather than
// just a status word. One-time items (no recurrence) have no cycle to show
// progress through, so this returns null for them.
function resolveCoverageProgressPercent(item, today = new Date()) {
  const recurrenceDays = Number(item?.recurrenceIntervalDays);
  const nextDue = item?.nextDueDate ? new Date(item.nextDueDate) : null;

  if (!Number.isFinite(recurrenceDays) || recurrenceDays <= 0 || !nextDue || Number.isNaN(nextDue.getTime())) {
    return null;
  }

  const cycleStart = new Date(nextDue.getTime() - recurrenceDays * 24 * 60 * 60 * 1000);
  const totalMs = nextDue.getTime() - cycleStart.getTime();
  const elapsedMs = today.getTime() - cycleStart.getTime();
  const ratio = totalMs > 0 ? elapsedMs / totalMs : 1;

  return Math.round(clamp(ratio, 0, 1) * 100);
}

function PlanRowWithProgress({ item, onOpen }) {
  const { t } = useTranslation();
  const progressPercent = item.status === 'opted_out' ? null : resolveCoverageProgressPercent(item);
  const [, toneColor] = getToneColors(getStatusTone(item.status));

  return (
    <ListRow
      icon={getCategoryIcon(item.category)}
      tone={getStatusTone(item.status)}
      title={item.displayName}
      subtitle={item.requiresSharedDecision ? t('detail.sharedDecisionSubtitle', { cadence: item.cadenceText }) : item.cadenceText}
      badge={t(getStatusLabelKey(item.status))}
      badgeStatus={getStatusBadgeStatus(item.status)}
      beforeBadge={progressPercent === null ? null : (
        <span className="vitalis-row-progress" aria-hidden="true">
          <span className="vitalis-row-progress-track">
            <span className="vitalis-row-progress-fill" style={{ width: `${progressPercent}%`, background: toneColor }} />
          </span>
        </span>
      )}
      onClick={() => onOpen(item.itemKey)}
    />
  );
}

const URGENCY_RANK_BY_STATUS = Object.freeze({
  overdue: 0,
  due: 0,
  soon: 1,
  pending: 2,
  planned: 2,
  done: 3,
  opted_out: 3,
});

function sortItemsByUrgency(a, b) {
  const rankA = URGENCY_RANK_BY_STATUS[a.status] ?? 2;
  const rankB = URGENCY_RANK_BY_STATUS[b.status] ?? 2;
  if (rankA !== rankB) return rankA - rankB;
  return String(a.displayName).localeCompare(String(b.displayName));
}

function RegionGroupedList({ items, onOpen, t }) {
  const groups = useMemo(() => {
    const byRegion = new Map();
    for (const item of items) {
      const regionId = item.clinicalRegion || resolveRegionIdForItemKey(item.itemKey);
      if (!byRegion.has(regionId)) {
        byRegion.set(regionId, []);
      }
      byRegion.get(regionId).push(item);
    }

    return BODY_REGIONS
      .map((region) => ({
        region,
        items: (byRegion.get(region.id) ?? []).slice().sort(sortItemsByUrgency),
      }))
      .filter((group) => group.items.length > 0);
  }, [items]);

  return (
    <>
      {groups.map(({ region, items: regionItems }) => (
        <div key={region.id} className="vitalis-region-block">
          <p className="vitalis-region-head">
            <Icon name={region.icon} size={14} color="var(--text-secondary)" />
            <span>{t(region.labelKey)}</span>
          </p>
          <div className="rows">
            {regionItems.map((item) => (
              <PlanRowWithProgress key={item.itemKey} item={item} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function PlanStatusSummary({ title, groups, t }) {
  const { due, upcoming, done } = groups;
  const total = due.length + upcoming.length + done.length;
  if (total === 0) {
    return null;
  }

  const pct = (count) => `${(count / total) * 100}%`;

  return (
    <div className="sl003-status-summary">
      <div className="sl003-status-summary-top">
        <span className="sl003-status-summary-title">{title}</span>
        <span className="sl003-status-summary-count">
          {due.length > 0
            ? t('plan.summaryDueCount', { count: due.length, total })
            : t('plan.summaryAllCovered')}
        </span>
      </div>
      <div className="sl003-status-summary-bar" role="presentation">
        {due.length > 0 ? <span className="is-due" style={{ width: pct(due.length) }} /> : null}
        {upcoming.length > 0 ? <span className="is-upcoming" style={{ width: pct(upcoming.length) }} /> : null}
        {done.length > 0 ? <span className="is-done" style={{ width: pct(done.length) }} /> : null}
      </div>
      <div className="sl003-status-summary-legend">
        <span><i className="is-due" />{t('status.due')}</span>
        <span><i className="is-upcoming" />{t('status.pending')}</span>
        <span><i className="is-done" />{t('status.done')}</span>
      </div>
    </div>
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
    <div className="sl003-reminder-form" role="group" aria-label={t('reminderForm.ariaLabel')}>
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

function OptOutForm({
  selectedPreset,
  onPresetChange,
  onCancel,
  pending,
  validationMessage,
}) {
  const { t } = useTranslation();

  return (
    <div className="sl003-reminder-form" role="group" aria-label={t('optOutForm.ariaLabel')}>
      <fieldset className="sl003-reminder-fieldset" disabled={pending}>
        <legend>{t('optOutForm.legend')}</legend>
        {OPT_OUT_OPTION_ORDER.map((preset) => (
          <label key={preset}>
            <input
              type="radio"
              name="opt-out-preset"
              value={preset}
              checked={selectedPreset === preset}
              onChange={(event) => onPresetChange(event.target.value)}
            />
            {t(OPT_OUT_OPTION_LABEL_KEYS[preset])}
          </label>
        ))}
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
  optOutPending,
  showOptOutForm,
  onOpenOptOut,
  onOptOutCancel,
  onOptOutPresetChange,
  selectedOptOutPreset,
  onClearOptOut,
  actionError,
  confirmationMessage,
  locale,
}) {
  const { t } = useTranslation();
  const actionAreaRef = useRef(null);
  const actionsDisabled = donePending || reminderPending || optOutPending;
  const showActionCtas = !showDoneForm && !showReminderForm && !showOptOutForm;
  const doneTimeToGo = item.status === 'done' && item.completedOn
    ? buildTimeToGoState({
      completedOn: item.completedOn,
      cadenceText: item.cadenceText,
    })
    : null;

  useEffect(() => {
    if (!showDoneForm && !showReminderForm && !showOptOutForm) {
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
  }, [showDoneForm, showReminderForm, showOptOutForm]);

  const [heroChipBg, heroChipFg] = getToneColors(getStatusTone(item.status));
  const sourceText = resolveSourceText(item, t);
  const reasonForListText = resolveReasonForListText(item, t);
  const statusReasonText = resolveStatusReasonText(item, t, locale);

  return (
    <section className="sl002-detail-view" aria-label={t('detail.viewAriaLabel', { name: item.displayName })}>
      <div className="vitalis-detail-hero">
        <span className="vitalis-detail-hero-icon" style={{ background: heroChipBg, color: heroChipFg }}>
          <Icon name={getCategoryIcon(item.category)} size={26} />
        </span>
        <div className="vitalis-detail-hero-copy">
          <p className="vitalis-detail-hero-title">{item.displayName}</p>
          <p className="vitalis-detail-hero-sub">{t(getInterventionTypeLabelKey(item.interventionType))}</p>
        </div>
      </div>
      {sourceText || reasonForListText ? (
        <p className="vitalis-detail-source-note">
          {[sourceText, reasonForListText].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <div className="vitalis-detail-status-row">
        <Badge status={getStatusBadgeStatus(item.status)}>{t(getStatusLabelKey(item.status))}</Badge>
        {statusReasonText ? <span className="vitalis-detail-status-reason">{statusReasonText}</span> : null}
      </div>
      {item.requiresSharedDecision ? (
        <p className="sl003-shared-decision-note" role="note">
          {t('detail.sharedDecisionNote')}
        </p>
      ) : null}

      <Card className="sl002-detail-section" aria-label={t('detail.cadence')}>
        <h3>{t('detail.cadence')}</h3>
        <p>{item.cadenceText}</p>
      </Card>

      <Card className="sl002-detail-section" aria-label={t('detail.recommendation')}>
        <h3>{t('detail.recommendation')}</h3>
        <p>{item.recommendationText}</p>
      </Card>

      <Card className="sl002-detail-section" aria-label={t('detail.whyItMatters')}>
        <h3>{t('detail.whyItMatters')}</h3>
        <p>{item.whyItMattersText}</p>
      </Card>

      {item.category !== PLAN_CATEGORIES.vaccination ? (
        <Card elevated={false} className="sl003-guidance-disclaimer">
          <p>{t('checkups.disclaimer')}</p>
        </Card>
      ) : null}

      <section ref={actionAreaRef} className="sl003-action-area vds-card vds-card--elevated" aria-label={t('detail.itemActionsAriaLabel')}>
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
        ) : item.status === 'opted_out' ? (
          <>
            <p className="sl003-complete-message">
              {item.optOut?.until
                ? t('detail.optedOutUntil', { date: formatDetailDate(item.optOut.until, locale) })
                : t('detail.optedOutForever')}
            </p>
            <p className="sl003-opted-out-note" role="note">{t('detail.optedOutScoreNote')}</p>
            <div className="sl003-action-cta-row">
              <Button
                variant="secondary"
                size="md"
                onClick={onClearOptOut}
                disabled={actionsDisabled}
              >
                {t('detail.reactivateItem')}
              </Button>
            </div>
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
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onOpenOptOut}
                  disabled={actionsDisabled}
                >
                  {t('detail.skipItem')}
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
            {showOptOutForm ? (
              <OptOutForm
                selectedPreset={selectedOptOutPreset}
                onPresetChange={onOptOutPresetChange}
                onCancel={onOptOutCancel}
                pending={optOutPending}
                validationMessage={actionError}
              />
            ) : null}
          </>
        )}

        {!showReminderForm && !showDoneForm && !showOptOutForm && actionError ? <p className="sl001-field-error" role="alert">{actionError}</p> : null}
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
  const [showOptOutForm, setShowOptOutForm] = useState(false);
  const [selectedOptOutPreset, setSelectedOptOutPreset] = useState('');
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
  const activeItems = activeCategory === null
    ? [...readModel.checkups, ...readModel.vaccinations, ...readModel.counseling]
    : (activeCategory === PLAN_CATEGORIES.vaccination
      ? readModel.vaccinations
      : (activeCategory === PLAN_CATEGORIES.counseling ? readModel.counseling : readModel.checkups));
  const activeItemsGrouped = useMemo(() => groupPlanItemsByStatus(activeItems), [activeItems]);

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
    setShowOptOutForm(false);
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

    if (target.destination === DETAIL_ORIGIN.dashboard || target.destination === DETAIL_ORIGIN.timeline) {
      if (typeof onNavigate === 'function') {
        onNavigate(target);
      } else if (detailItem) {
        setActiveCategory(detailItem.category);
      }

      setDetailState(null);
      setShowReminderForm(false);
      setShowDoneForm(false);
      setShowOptOutForm(false);
      setActionError('');
      return;
    }

    if (target.destination === DETAIL_ORIGIN.vaccinations) {
      if (detailState?.returnToVaccinationTracker && typeof onNavigate === 'function') {
        onNavigate(target);
        setDetailState(null);
        setShowReminderForm(false);
        setShowDoneForm(false);
        setShowOptOutForm(false);
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
    setShowOptOutForm(false);
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
        setShowOptOutForm(false);
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
        setShowOptOutForm(false);
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

  const saveOptOutSelection = async (preset) => {
    if (!detailItem || pendingAction) {
      return;
    }

    setSelectedOptOutPreset(preset);
    setPendingAction('optOut');
    setActionError('');
    setConfirmationMessage('');

    try {
      const result = service.setItemOptOut(profile.profileId, detailItem.itemKey, { preset });
      if (typeof onPlanSnapshotChange === 'function') {
        onPlanSnapshotChange(result.planSnapshot);
      }

      setShowOptOutForm(false);

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

      setConfirmationMessage(t('detail.skippedConfirmation'));
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : DETAIL_ACTION_ERRORS.action_failed;
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleClearOptOut = async () => {
    if (!detailItem || pendingAction) {
      return;
    }

    setPendingAction('clearOptOut');
    setActionError('');
    setConfirmationMessage('');

    try {
      const result = service.clearItemOptOut(profile.profileId, detailItem.itemKey);
      if (typeof onPlanSnapshotChange === 'function') {
        onPlanSnapshotChange(result.planSnapshot);
      }
      setConfirmationMessage(t('detail.reactivatedConfirmation'));
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : DETAIL_ACTION_ERRORS.action_failed;
      setActionError(message);
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
          locale={uiLocale}
          readOnly={detailReadOnly}
          donePending={pendingAction === 'done'}
          showDoneForm={showDoneForm}
          onOpenDone={() => {
            setShowDoneForm(true);
            setShowReminderForm(false);
            setShowOptOutForm(false);
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
            setShowOptOutForm(false);
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
          optOutPending={pendingAction === 'optOut' || pendingAction === 'clearOptOut'}
          showOptOutForm={showOptOutForm}
          onOpenOptOut={() => {
            setShowOptOutForm(true);
            setShowDoneForm(false);
            setShowReminderForm(false);
            setSelectedOptOutPreset('');
            setActionError('');
            setConfirmationMessage('');
          }}
          onOptOutCancel={() => {
            setShowOptOutForm(false);
            setSelectedOptOutPreset('');
            setActionError('');
          }}
          onOptOutPresetChange={(preset) => {
            saveOptOutSelection(preset);
          }}
          selectedOptOutPreset={selectedOptOutPreset}
          onClearOptOut={handleClearOptOut}
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

  if (showManualEntryForm) {
    return (
      <AppShell title={t('vaccinations.sheetTitle')} onBack={closeManualEntryForm} backLabel={t('common.back')}>
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
      </AppShell>
    );
  }

  return (
    <AppShell title={null}>
      <section className="sl003-plan-browser" aria-label={t('plan.browseAriaLabel')}>
        <div className="vitalis-seg vitalis-seg--with-icons" role="tablist" aria-label={t('plan.categoriesAriaLabel')}>
          <button
            type="button"
            role="tab"
            className={activeCategory === null ? 'is-active' : ''}
            aria-selected={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          >
            {t('plan.categoryAll')}
          </button>
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
                <Icon name={getCategoryIcon(category)} size={14} />
                {label}
              </button>
            );
          })}
        </div>
        {activeItems.length === 0 ? (
          <ListEmptyState activeCategory={activeCategory} onSwitchCategory={setActiveCategory} visibleCategories={visibleCategories} />
        ) : (
          <div aria-label={t('plan.categoryListAriaLabel', { category: activeCategory === null ? t('plan.categoryAll') : t(getCategoryLabelKey(activeCategory)) })}>
            <PlanStatusSummary
              title={activeCategory === null ? t('plan.categoryAll') : t(getCategoryLabelKey(activeCategory))}
              groups={activeItemsGrouped}
              t={t}
            />
            <RegionGroupedList items={activeItems} onOpen={handleOpenDetailFromPlan} t={t} />
          </div>
        )}
        <Card elevated={false} className="sl003-guidance-disclaimer">
          <p>{t('checkups.disclaimer')}</p>
        </Card>
        {activeCategory === PLAN_CATEGORIES.vaccination ? (
          <>
            <Card className="sl003-manual-entry-box" aria-label={t('vaccinations.recordsAriaLabel')}>
              <h3>{t('vaccinations.recordsTitle')}</h3>
              {manualEntryRows.length === 0 ? (
                <p className="sl003-manual-empty">{t('vaccinations.noRecords')}</p>
              ) : (
                <div className="rows" aria-label={t('vaccinations.entriesAriaLabel')}>
                  {manualEntryRows.map((row) => (
                    <ListRow
                      key={row.id}
                      icon="syringe"
                      tone={getStatusTone(row.planStatus)}
                      title={row.vaccineName}
                      subtitle={t('vaccinations.entryDateSubtitle', { date: row.entryDateLabel })}
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
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
