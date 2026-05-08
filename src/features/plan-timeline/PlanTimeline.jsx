import React, { useMemo } from 'react';
import {
  AppShell,
  StatusPill,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  PLAN_CATEGORIES,
} from '../health-plan-browsing-and-item-detail/model.js';
import {
  PREVENTIVE_ITEM_DEFINITION_INDEX,
} from '../health-plan-browsing-and-item-detail/definitions.js';

const STATUS_LABELS = Object.freeze({
  done: 'Done',
  due: 'Due now',
  pending: 'Pending',
  soon: 'Coming up',
  planned: 'Pending',
  overdue: 'Overdue',
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

function buildTimelineItems(planSnapshot, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const locale = options.locale ?? 'en-US';
  const sourceItems = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  return sourceItems
    .map((item) => {
      const definition = PREVENTIVE_ITEM_DEFINITION_INDEX[item.catalogItemId];
      const date = resolveTimelineDate(item);
      const status = item.status === 'planned' ? 'pending' : item.status;

      return {
        itemKey: item.catalogItemId,
        name: definition?.displayName || item.name || 'Preventive item',
        category: item.category,
        categoryLabel: item.category === PLAN_CATEGORIES.vaccination ? 'Vaccination' : 'Checkup',
        cadenceText: definition?.cadenceText || item.cadenceLabel || 'By recommendation',
        status,
        statusLabel: STATUS_LABELS[status] ?? 'Pending',
        date,
        dateIso: date ? toIsoDate(date) : '',
        dateLabel: date ? formatDateLabel(date, locale) : 'No date set',
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

function buildTimelineGroups(items) {
  const groupOrder = ['Completed and past', 'Today', 'Next 90 days', 'Later'];
  return groupOrder
    .map((label) => ({
      label,
      items: items.filter((item) => item.group === label),
    }))
    .filter((group) => group.items.length > 0);
}

function TimelineItem({ item, onOpenItem }) {
  const body = (
    <>
      <span className="sl007-timeline-point" aria-hidden="true" />
      <span className="sl007-timeline-date">
        <span>{item.dateLabel}</span>
        <small>{item.dateKind}</small>
      </span>
      <span className="sl007-timeline-card-copy">
        <span className="sl007-timeline-title">{item.name}</span>
        <span className="sl007-timeline-meta">{item.categoryLabel} - {item.cadenceText}</span>
      </span>
      <StatusPill status={item.status} label={item.statusLabel} />
    </>
  );

  if (typeof onOpenItem !== 'function') {
    return <article className="sl007-timeline-card">{body}</article>;
  }

  return (
    <article className="sl007-timeline-card">
      <button
        type="button"
        className="sl007-timeline-card-button"
        onClick={() => onOpenItem(item)}
        aria-label={`Open details for ${item.name}`}
      >
        {body}
      </button>
    </article>
  );
}

export default function PlanTimeline({
  planSnapshot,
  onOpenItem,
  clock = () => new Date(),
  locale = 'en-US',
}) {
  const items = useMemo(
    () => buildTimelineItems(planSnapshot, { today: clock(), locale }),
    [clock, locale, planSnapshot],
  );
  const groups = useMemo(() => buildTimelineGroups(items), [items]);

  return (
    <AppShell title={null}>
      {groups.length === 0 ? (
        <p className="sl001-empty">No plan items are available for the timeline.</p>
      ) : (
        <section className="sl007-timeline" aria-label="Plan timeline">
          {groups.map((group) => (
            <div className="sl007-timeline-group" key={group.label}>
              <div className="sl007-timeline-group-header">
                <h2>{group.label}</h2>
                <span>{group.items.length}</span>
              </div>
              <div className="sl007-timeline-list">
                {group.items.map((item) => (
                  <TimelineItem
                    key={item.itemKey}
                    item={item}
                    onOpenItem={onOpenItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}
