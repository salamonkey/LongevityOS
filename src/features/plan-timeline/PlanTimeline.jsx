import React, { useMemo } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Badge, Icon } from '../../design-system/components/index.js';
import {
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from '../health-plan-browsing-and-item-detail/definitions.js';
import {
  getCategoryIcon,
  getCategoryLabelKey,
  getStatusBadgeStatus,
  getStatusLabelKey,
  getStatusTone,
  getToneColors,
} from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';

const DATE_KIND_KEY = Object.freeze({
  Completed: 'timeline.dateKindCompleted',
  Reminder: 'timeline.dateKindReminder',
  Due: 'timeline.dateKindDue',
  'Coming up': 'timeline.dateKindComingUp',
  Target: 'timeline.dateKindTarget',
});

const GROUP_KEY = Object.freeze({
  'Completed and past': 'timeline.groupCompletedPast',
  Today: 'timeline.groupToday',
  'Next 90 days': 'timeline.groupNext90Days',
  Later: 'timeline.groupLater',
});

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

function resolveTimelineDate(item) {
  if (item?.status === 'done') {
    return parseDateValue(item.completedOn || item.nextDueDate || item.initialDueDate);
  }

  return parseDateValue(
    item?.reminder?.scheduledFor
    || item?.nextDueDate
    || item?.initialDueDate,
  );
}

function resolveDateKind(item) {
  if (item?.status === 'done') return 'Completed';
  if (item?.reminder?.scheduledFor) return 'Reminder';
  if (item?.status === 'due') return 'Due';
  if (item?.status === 'soon') return 'Coming up';
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
      const date = resolveTimelineDate(item);
      const status = item.status === 'planned' ? 'pending' : item.status;

      return {
        itemKey: item.catalogItemId,
        name: liveCopy?.name || definition?.displayName || item.name || 'Preventive item',
        category: item.category,
        categoryLabelKey: getCategoryLabelKey(item.category, 'singular'),
        cadenceText: liveCopy?.cadenceLabel || definition?.cadenceText || item.cadenceLabel || 'By recommendation',
        status,
        statusLabelKey: getStatusLabelKey(status),
        date,
        dateIso: date ? toIsoDate(date) : '',
        dateLabel: date ? formatDateLabel(date, locale) : '',
        dateKind: resolveDateKind(item),
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

function TimelineNode({ item, past, onOpenItem, t }) {
  const [chipBg, chipFg] = getToneColors(getStatusTone(item.status));
  const dateKindLabel = t(DATE_KIND_KEY[item.dateKind] ?? 'timeline.dateKindTarget');

  return (
    <div className="vitalis-timeline-node">
      <div className="vitalis-timeline-node-rail">
        <span
          className="vitalis-timeline-node-dot"
          style={{
            background: past ? 'var(--surface-card)' : chipBg,
            color: chipFg,
            borderColor: past ? 'var(--status-done)' : chipFg,
          }}
        >
          <Icon name={past ? 'check' : getCategoryIcon(item.category)} size={18} />
        </span>
      </div>
      <Card
        padding={13}
        className={`vitalis-timeline-node-card${past ? ' is-past' : ''}`}
        onClick={typeof onOpenItem === 'function' ? () => onOpenItem(item) : undefined}
        aria-label={`Open details for ${item.name}`}
      >
        <div className="vitalis-timeline-node-copy">
          <p className="vitalis-timeline-node-date" style={{ color: chipFg }}>
            {item.dateLabel || t('timeline.noDateSet')} · {dateKindLabel}
          </p>
          <p className="vitalis-timeline-node-title">{item.name}</p>
          <p className="vitalis-timeline-node-sub">{item.cadenceText}</p>
        </div>
        <Badge status={getStatusBadgeStatus(item.status)}>{t(item.statusLabelKey)}</Badge>
      </Card>
    </div>
  );
}

function TimelineTodayRow({ label }) {
  return (
    <div className="vitalis-timeline-today-row">
      <div className="vitalis-timeline-node-rail">
        <span className="vitalis-timeline-today-halo" aria-hidden="true" />
        <span className="vitalis-timeline-today-core" aria-hidden="true" />
      </div>
      <div className="vitalis-timeline-today-banner">{label}</div>
    </div>
  );
}

export default function PlanTimeline({
  planSnapshot,
  onOpenItem,
  onBack,
  clock = () => new Date(),
  locale = 'en-US',
  catalogGeneration = 0,
}) {
  const { t, locale: uiLocale } = useTranslation();
  const items = useMemo(
    () => buildTimelineItems(planSnapshot, { today: clock(), locale }),
    [clock, locale, planSnapshot, uiLocale, catalogGeneration],
  );
  const groups = useMemo(() => buildTimelineGroups(items), [items]);

  const pastItems = groups.find((group) => group.label === 'Completed and past')?.items ?? [];
  const upcomingItems = groups
    .filter((group) => group.label !== 'Completed and past')
    .flatMap((group) => group.items);

  const todayLabel = useMemo(() => {
    const now = clock();
    return `${t('dashboard.timelineToday')} · ${new Intl.DateTimeFormat(uiLocale, { month: 'long', day: 'numeric' }).format(now)}`;
  }, [clock, t, uiLocale]);

  return (
    <AppShell title={t('dashboard.timelineTitle')} onBack={onBack} backLabel={t('common.back')}>
      {groups.length === 0 ? (
        <p className="vitalis-timeline-empty">{t('timeline.empty')}</p>
      ) : (
        <section className="vitalis-timeline" aria-label="Plan timeline">
          <div className="vitalis-timeline-line" aria-hidden="true" />
          {pastItems.length > 0 ? (
            <>
              <p className="sec-label vitalis-timeline-section-label">{t('timeline.groupCompletedPast')}</p>
              {pastItems.map((item) => (
                <TimelineNode key={item.itemKey} item={item} past onOpenItem={onOpenItem} t={t} />
              ))}
            </>
          ) : null}

          <TimelineTodayRow label={todayLabel} />

          {upcomingItems.length > 0 ? (
            <>
              <p className="sec-label vitalis-timeline-section-label">{t('timeline.groupUpcoming')}</p>
              {upcomingItems.map((item) => (
                <TimelineNode key={item.itemKey} item={item} past={false} onOpenItem={onOpenItem} t={t} />
              ))}
            </>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}
