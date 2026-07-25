import React from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import Gantt from './Gantt.jsx';
import {
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from '../health-plan-browsing-and-item-detail/definitions.js';
import {
  getCategoryLabelKey,
  getStatusLabelKey,
} from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';

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
        name: liveCopy?.name || definition?.displayName || item.name || item.catalogItemId,
        category: item.category,
        categoryLabelKey: getCategoryLabelKey(item.category, 'singular'),
        cadenceText: liveCopy?.cadenceLabel || definition?.cadenceText || item.cadenceLabel || '',
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

export default function PlanTimeline({
  planSnapshot,
  onOpenItem,
  onBack,
  clock = () => new Date(),
  catalogGeneration = 0,
}) {
  const { t, locale: uiLocale } = useTranslation();

  return (
    <AppShell title={t('dashboard.timelineTitle')} onBack={onBack} backLabel={t('common.back')}>
      <Gantt
        key={catalogGeneration}
        planSnapshot={planSnapshot}
        onOpenItem={onOpenItem}
        clock={clock}
        uiLocale={uiLocale}
        t={t}
      />
    </AppShell>
  );
}
