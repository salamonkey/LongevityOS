import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Icon, Button } from '../../design-system/components/index.js';
import Gantt from './Gantt.jsx';
import {
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from '../health-plan-browsing-and-item-detail/definitions.js';
import {
  getCategoryLabelKey,
  getStatusLabelKey,
} from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { resolveEffectiveItemStatus } from '../self-onboarding-to-first-dashboard/dashboard.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';
import { PLAN_CATEGORIES } from '../health-plan-browsing-and-item-detail/model.js';
import { BODY_REGIONS } from '../self-onboarding-to-first-dashboard/bodyRegions.js';

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function startOfDay(date) {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function resolveTimelineDate(item, status) {
  if (status === 'done') {
    return parseDateValue(item.completedOn || item.nextDueDate || item.initialDueDate);
  }

  return parseDateValue(
    item?.reminder?.scheduledFor
    || item?.nextDueDate
    || item?.initialDueDate,
  );
}

function resolveDateKind(item, status) {
  if (status === 'done') return 'Completed';
  if (status === 'overdue') return 'Overdue';
  if (item?.reminder?.scheduledFor) return 'Reminder';
  if (status === 'due') return 'Due';
  if (status === 'soon') return 'Coming up';
  return 'Target';
}

function resolveTimelineGroup(date, today) {
  const dateTime = startOfDay(date).getTime();
  const todayTime = startOfDay(today).getTime();
  const soonTime = addDays(today, 90).getTime();

  if (dateTime < todayTime) return 'Completed and past';
  if (dateTime === todayTime) return 'Today';
  if (dateTime <= soonTime) return 'Next 90 days';
  return 'Later';
}

export function buildTimelineItems(planSnapshot, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const locale = options.locale ?? 'en-US';
  const sourceItems = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  return sourceItems
    .map((item) => {
      const definition = PREVENTIVE_ITEM_DEFINITION_INDEX[item.catalogItemId];
      const liveCopy = resolveCatalogCopyForItemKey(item.catalogItemId);
      const status = resolveEffectiveItemStatus(item, { today });
      const date = resolveTimelineDate(item, status);

      return {
        itemKey: item.catalogItemId,
        name: liveCopy?.name || definition?.displayName || item.name || item.catalogItemId,
        category: item.category,
        categoryLabelKey: getCategoryLabelKey(item.category, 'singular'),
        cadenceText: liveCopy?.cadenceLabel || definition?.cadenceText || item.cadenceLabel || '',
        status,
        statusLabelKey: getStatusLabelKey(status),
        date,
        dateIso: date ? toIsoDate(date) : '',
        dateLabel: date ? formatDateLabel(date, locale) : '',
        dateKind: resolveDateKind(item, status),
        group: date ? resolveTimelineGroup(date, today) : 'Later',
        priorityOrder: Number(item.priorityOrder),
        targetAge: Number(item.targetAge),
      };
    })
    .sort((left, right) => {
      if (left.date && right.date && left.date.getTime() !== right.date.getTime()) {
        return left.date.getTime() - right.date.getTime();
      }
      if (left.date && !right.date) return -1;
      if (!left.date && right.date) return 1;
      if (Number.isFinite(left.targetAge) && Number.isFinite(right.targetAge) && left.targetAge !== right.targetAge) {
        return left.targetAge - right.targetAge;
      }
      if (Number.isFinite(left.priorityOrder) && Number.isFinite(right.priorityOrder) && left.priorityOrder !== right.priorityOrder) {
        return left.priorityOrder - right.priorityOrder;
      }
      return left.name.localeCompare(right.name);
    });
}

export function buildTimelineGroups(items) {
  const groupOrder = ['Completed and past', 'Today', 'Next 90 days', 'Later'];
  return groupOrder
    .map((label) => ({
      label,
      items: items.filter((item) => item.group === label),
    }))
    .filter((group) => group.items.length > 0);
}

function formatAgendaDate(dateValue, locale = 'en-US') {
  const parsed = parseDateValue(dateValue);
  if (!parsed) return { day: '--', month: '' };
  return {
    day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(parsed),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(parsed),
  };
}

function formatAgendaTime(dateValue, locale = 'en-US') {
  const parsed = parseDateValue(dateValue);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function AddAppointmentForm({ planItems, onSubmit, onCancel, pending, errorMessage, t }) {
  const [linkMode, setLinkMode] = useState(planItems.length > 0 ? 'linked' : 'standalone');
  const [catalogItemId, setCatalogItemId] = useState(planItems[0]?.catalogItemId ?? '');
  const [title, setTitle] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [provider, setProvider] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const selectedItem = linkMode === 'linked' ? planItems.find((item) => item.catalogItemId === catalogItemId) : null;
    const resolvedTitle = linkMode === 'linked' ? (selectedItem?.name ?? '') : title.trim();
    if (!resolvedTitle || !scheduledFor) {
      return;
    }

    onSubmit({
      title: resolvedTitle,
      scheduledFor,
      provider,
      location,
      catalogItemId: linkMode === 'linked' ? catalogItemId : '',
    });
  };

  return (
    <form className="vitalis-appt-form" onSubmit={handleSubmit}>
      {errorMessage ? <p className="vitalis-appt-form-error" role="alert">{errorMessage}</p> : null}

      <div className="vds-input">
        <span className="vds-input-label">{t('appointments.linkQuestion')}</span>
        <div className="vitalis-seg">
          <button
            type="button"
            className={linkMode === 'linked' ? 'is-active' : ''}
            disabled={planItems.length === 0}
            onClick={() => setLinkMode('linked')}
          >
            {t('appointments.linkedItem')}
          </button>
          <button
            type="button"
            className={linkMode === 'standalone' ? 'is-active' : ''}
            onClick={() => setLinkMode('standalone')}
          >
            {t('appointments.standalone')}
          </button>
        </div>
      </div>

      {linkMode === 'linked' ? (
        <label className="vds-input">
          <span className="vds-input-label">{t('appointments.item')}</span>
          <span className="vds-input-field">
            <Icon name="stethoscope" size={18} color="var(--text-muted)" />
            <select value={catalogItemId} onChange={(event) => setCatalogItemId(event.target.value)}>
              {planItems.map((item) => (
                <option key={item.catalogItemId} value={item.catalogItemId}>{item.name}</option>
              ))}
            </select>
          </span>
        </label>
      ) : (
        <label className="vds-input">
          <span className="vds-input-label">{t('appointments.title')}</span>
          <span className="vds-input-field">
            <Icon name="calendar-plus" size={18} color="var(--text-muted)" />
            <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </span>
        </label>
      )}

      <label className="vds-input">
        <span className="vds-input-label">{t('appointments.dateTime')}</span>
        <span className="vds-input-field">
          <Icon name="calendar" size={18} color="var(--text-muted)" />
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            required
          />
        </span>
      </label>

      <label className="vds-input">
        <span className="vds-input-label">{t('appointments.provider')}</span>
        <span className="vds-input-field">
          <Icon name="map-pin" size={18} color="var(--text-muted)" />
          <input type="text" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder={t('appointments.providerPlaceholder')} />
        </span>
      </label>

      <label className="vds-input">
        <span className="vds-input-label">{t('appointments.location')}</span>
        <span className="vds-input-field">
          <Icon name="map-pin" size={18} color="var(--text-muted)" />
          <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t('appointments.locationPlaceholder')} />
        </span>
      </label>

      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? t('appointments.saving') : t('appointments.save')}
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={pending}>
        {t('common.cancel')}
      </Button>
    </form>
  );
}

const RECURRENCE_PRESETS = Object.freeze([
  { key: 'one_time', days: null },
  { key: 'weekly', days: 7 },
  { key: 'biweekly', days: 14 },
  { key: 'monthly', days: 30 },
  { key: 'custom', days: null },
]);

function ConvertAppointmentPanel({ appointment, onSubmit, onCancel, pending, t }) {
  const [category, setCategory] = useState(PLAN_CATEGORIES.checkup);
  const [recurrenceKey, setRecurrenceKey] = useState('biweekly');
  const [customDays, setCustomDays] = useState('30');
  const [regionId, setRegionId] = useState(BODY_REGIONS[0]?.id ?? '');
  const [note, setNote] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const preset = RECURRENCE_PRESETS.find((option) => option.key === recurrenceKey);
    const recurrenceDays = recurrenceKey === 'custom' ? Number(customDays) : preset?.days ?? null;
    const cadenceLabel = recurrenceKey === 'custom'
      ? t('appointments.recurrenceCustomLabel', { days: recurrenceDays })
      : t(`appointments.recurrence.${recurrenceKey}`);

    onSubmit({
      name: appointment.title,
      category,
      recurrenceDays,
      cadenceLabel,
      clinicalRegion: regionId,
      note,
      startDate: String(appointment.scheduledFor).slice(0, 10),
    });
  };

  return (
    <form className="vitalis-appt-form vitalis-convert-form" onSubmit={handleSubmit}>
      <p className="vitalis-convert-title">{t('appointments.convertTitle', { name: appointment.title })}</p>

      <div className="vds-input">
        <span className="vds-input-label">{t('appointments.category')}</span>
        <div className="vitalis-chip-row">
          {[PLAN_CATEGORIES.checkup, PLAN_CATEGORIES.counseling, PLAN_CATEGORIES.vaccination].map((option) => (
            <button
              key={option}
              type="button"
              className={category === option ? 'is-active' : ''}
              onClick={() => setCategory(option)}
            >
              {t(getCategoryLabelKey(option, 'singular'))}
            </button>
          ))}
        </div>
      </div>

      <div className="vds-input">
        <span className="vds-input-label">{t('appointments.recurrence')}</span>
        <div className="vitalis-chip-row">
          {RECURRENCE_PRESETS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={recurrenceKey === option.key ? 'is-active' : ''}
              onClick={() => setRecurrenceKey(option.key)}
            >
              {t(`appointments.recurrence.${option.key}`)}
            </button>
          ))}
        </div>
        {recurrenceKey === 'custom' ? (
          <span className="vds-input-field" style={{ marginTop: 8 }}>
            <Icon name="clock" size={18} color="var(--text-muted)" />
            <input
              type="number"
              min="1"
              value={customDays}
              onChange={(event) => setCustomDays(event.target.value)}
            />
          </span>
        ) : null}
      </div>

      <label className="vds-input">
        <span className="vds-input-label">{t('appointments.clinicalRegion')}</span>
        <span className="vds-input-field">
          <Icon name="map-pin" size={18} color="var(--text-muted)" />
          <select value={regionId} onChange={(event) => setRegionId(event.target.value)}>
            {BODY_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>{t(region.labelKey)}</option>
            ))}
          </select>
        </span>
      </label>

      <label className="vds-input">
        <span className="vds-input-label">{t('appointments.noteOptional')}</span>
        <span className="vds-input-field">
          <Icon name="info" size={18} color="var(--text-muted)" />
          <input type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('appointments.notePlaceholder')} />
        </span>
      </label>

      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? t('appointments.saving') : t('appointments.convertSave')}
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={pending}>
        {t('common.cancel')}
      </Button>
    </form>
  );
}

export default function PlanTimeline({
  planSnapshot,
  onOpenItem,
  onBack,
  clock = () => new Date(),
  catalogGeneration = 0,
  appointments = [],
  appointmentsPending = false,
  onCreateAppointment,
  appointmentSaveError = '',
  onConvertAppointment,
}) {
  const { t, locale: uiLocale } = useTranslation();
  const [timelineTab, setTimelineTab] = useState('gantt');
  const [showAddForm, setShowAddForm] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [convertPending, setConvertPending] = useState(false);

  const planItems = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  const handleCreate = async (input) => {
    if (typeof onCreateAppointment !== 'function') return;
    setSavePending(true);
    const succeeded = await onCreateAppointment(input);
    setSavePending(false);
    if (succeeded) {
      setShowAddForm(false);
    }
  };

  const handleConvert = async (appointment, input) => {
    if (typeof onConvertAppointment !== 'function') return;
    setConvertPending(true);
    const succeeded = await onConvertAppointment(appointment, input);
    setConvertPending(false);
    if (succeeded) {
      setConvertingId(null);
    }
  };

  return (
    <AppShell
      title={t('dashboard.timelineTitle')}
      onBack={onBack}
      backLabel={t('common.back')}
      headerAction={(
        <button
          type="button"
          className="vitalis-appt-fab"
          onClick={() => setShowAddForm((previous) => !previous)}
          aria-label={t('appointments.add')}
        >
          <Icon name="plus" size={17} color="#fff" />
        </button>
      )}
    >
      {showAddForm ? (
        <AddAppointmentForm
          planItems={planItems}
          onSubmit={handleCreate}
          onCancel={() => setShowAddForm(false)}
          pending={savePending}
          errorMessage={appointmentSaveError}
          t={t}
        />
      ) : null}

      <div className="vitalis-seg vitalis-timeline-seg" role="tablist" aria-label={t('timeline.viewsAriaLabel')}>
        <button
          type="button"
          role="tab"
          className={timelineTab === 'gantt' ? 'is-active' : ''}
          aria-selected={timelineTab === 'gantt'}
          onClick={() => setTimelineTab('gantt')}
        >
          {t('timeline.tabGantt')}
        </button>
        <button
          type="button"
          role="tab"
          className={timelineTab === 'upcoming' ? 'is-active' : ''}
          aria-selected={timelineTab === 'upcoming'}
          onClick={() => setTimelineTab('upcoming')}
        >
          {t('timeline.tabUpcoming')}
        </button>
      </div>

      {timelineTab === 'gantt' ? (
        <Gantt
          key={catalogGeneration}
          planSnapshot={planSnapshot}
          onOpenItem={onOpenItem}
          clock={clock}
          uiLocale={uiLocale}
          t={t}
          appointments={appointments}
        />
      ) : appointmentsPending ? (
        <p className="sl001-summary-meta">{t('common.loading')}</p>
      ) : appointments.length === 0 ? (
        <div className="vitalis-timeline-upcoming-empty">
          <Icon name="calendar" size={26} color="var(--text-muted)" />
          <h3>{t('timeline.upcomingEmptyTitle')}</h3>
          <p>{t('timeline.upcomingEmptyBody')}</p>
        </div>
      ) : (
        <div className="vitalis-appt-agenda">
          {appointments.map((appointment) => {
            const { day, month } = formatAgendaDate(appointment.scheduledFor, uiLocale);
            const time = formatAgendaTime(appointment.scheduledFor, uiLocale);
            const isUnlinked = !appointment.catalogItemId;
            return (
              <React.Fragment key={appointment.id}>
                <div className="vitalis-appt-card">
                  <div className={`vitalis-appt-date${isUnlinked ? ' is-custom' : ''}`}>
                    <span className="vitalis-appt-date-d">{day}</span>
                    <span className="vitalis-appt-date-m">{month}</span>
                  </div>
                  <div className="vitalis-appt-main">
                    <div className="vitalis-appt-title">{appointment.title}</div>
                    <div className="vitalis-appt-sub">
                      {[time, appointment.provider, appointment.location].filter(Boolean).join(' · ')}
                    </div>
                    {isUnlinked && typeof onConvertAppointment === 'function' ? (
                      <button
                        type="button"
                        className="vitalis-convert-btn"
                        onClick={() => setConvertingId(convertingId === appointment.id ? null : appointment.id)}
                      >
                        <Icon name="rotate-ccw" size={11} />
                        {t('appointments.convert')}
                      </button>
                    ) : null}
                  </div>
                </div>
                {convertingId === appointment.id ? (
                  <ConvertAppointmentPanel
                    appointment={appointment}
                    onSubmit={(input) => handleConvert(appointment, input)}
                    onCancel={() => setConvertingId(null)}
                    pending={convertPending}
                    t={t}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
