// Pure data-shaping logic for the Gantt timeline, split out of Gantt.jsx (which
// contains JSX) so it can be unit-tested directly with the plain Node test
// runner, which can't parse JSX.

import { PREVENTIVE_ITEM_DEFINITION_INDEX } from '../health-plan-browsing-and-item-detail/definitions.js';
import { PLAN_CATEGORIES } from '../health-plan-browsing-and-item-detail/model.js';
import { getCategoryIcon, getStatusTone } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { resolveEffectiveItemStatus } from '../self-onboarding-to-first-dashboard/dashboard.js';
import { resolveCatalogCopyForItemKey } from '../../lib/catalog/runtimeCatalog.js';

export function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Maps raw plan-snapshot items to Gantt rows. Bars express real coverage windows
 * (a completed, recurring item's completedOn -> recomputed nextDueDate); everything
 * else — one-time completions, and anything not yet done — is a single-moment marker,
 * per the spec's own bar-vs-marker distinction. */
export function buildGanttRows(planSnapshot, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today.getTime()) : new Date();
  const items = Array.isArray(planSnapshot?.items) ? planSnapshot.items : [];

  return items.map((item) => {
    const definition = PREVENTIVE_ITEM_DEFINITION_INDEX[item.catalogItemId];
    const liveCopy = resolveCatalogCopyForItemKey(item.catalogItemId);
    const name = liveCopy?.name || definition?.displayName || item.name || item.catalogItemId;
    const status = resolveEffectiveItemStatus(item, { today });
    const intervalDays = Number(item.recurrence?.intervalDays);
    const isRecurring = Number.isFinite(intervalDays) && intervalDays > 0;
    const completedOn = parseDateValue(item.completedOn);
    const nextDue = parseDateValue(item.nextDueDate || item.initialDueDate);

    let kind;
    let startDate = null;
    let endDate = null;
    let pointDate = null;

    if (completedOn && isRecurring && nextDue) {
      // A real coverage window exists (completed once, recurs) — always show
      // it as a bar, whether that window is still active (status 'done') or
      // has since lapsed (status due/soon/overdue): the bar is a historical
      // fact; the marker at its end reflects the item's current live status.
      kind = 'bar';
      startDate = completedOn;
      endDate = nextDue;
    } else if (status === 'done') {
      kind = 'done-point';
      pointDate = completedOn || nextDue;
    } else if (status === 'due' || status === 'overdue') {
      kind = 'due';
      pointDate = nextDue;
    } else {
      kind = 'upcoming';
      pointDate = nextDue;
    }

    return {
      itemKey: item.catalogItemId,
      name,
      category: item.category,
      lane: item.category === PLAN_CATEGORIES.vaccination ? 'vaccination' : 'preventive',
      status,
      // Raw opt-out end date (null = "opted out forever"), independent of
      // status: needed by isRowRelevantForRange to tell a permanent skip
      // (never relevant again) apart from a temporary one (still anchored
      // to its real due date, and worth showing once that falls in view).
      optOutUntil: item?.optOut?.until ?? null,
      tone: getStatusTone(status),
      icon: getCategoryIcon(item.category),
      kind,
      startDate,
      endDate,
      pointDate,
      isRecurring,
    };
  });
}

// Unlinked appointments (no matching plan item) get their own synthetic row
// in a dedicated lane, rendered as a simple point marker at their scheduled
// date -- same visual language as a plan item's due marker, teal-toned so it
// reads as "a real-world event" rather than a plan status.
export function buildStandaloneAppointmentRows(appointments) {
  return appointments
    .filter((appointment) => !appointment.catalogItemId)
    .map((appointment) => ({
      itemKey: `appt-${appointment.id}`,
      name: appointment.title,
      lane: 'appointments',
      status: 'planned',
      optOutUntil: null,
      tone: 'teal',
      icon: 'calendar',
      kind: 'appointment-point',
      pointDate: parseDateValue(appointment.scheduledFor),
      isRecurring: false,
      isAppointment: true,
    }));
}

// A row earns a place in the current view when it's actually relevant to that
// timeframe -- not just "does it happen to have a date somewhere". Three rules,
// in priority order:
//
// 1. Opted out forever (until === null) means "never relevant again" -- it
//    would otherwise sit at its old due date and clutter every view forever,
//    even though the person has explicitly said they're never doing it.
// 2. Something currently due or overdue needs action *right now*, regardless
//    of how far outside the visible window its original due date sits (an
//    item overdue by three years is still relevant to a 12-month view).
// 3. Otherwise, relevance is purely "does this item's date actually fall
//    inside the window" -- a bar needs to overlap it, a point needs to sit
//    inside it. This is what keeps an age-gated item (e.g. due at 65) out of
//    a 53-year-old's 12-month *and* 5-year view, but lets it appear once
//    it's within 5 years out.
export function isRowRelevantForRange(row, rangeStart, rangeEnd) {
  if (row.status === 'opted_out' && row.optOutUntil == null) {
    return false;
  }

  if (row.status === 'due' || row.status === 'overdue') {
    return true;
  }

  if (row.kind === 'bar') {
    if (!row.startDate || !row.endDate) {
      return false;
    }
    return row.startDate.getTime() < rangeEnd.getTime() && row.endDate.getTime() > rangeStart.getTime();
  }

  if (!row.pointDate) {
    return false;
  }

  const time = row.pointDate.getTime();
  return time >= rangeStart.getTime() && time < rangeEnd.getTime();
}

export function filterRelevantRows(rows, rangeStart, rangeEnd) {
  return rows.filter((row) => isRowRelevantForRange(row, rangeStart, rangeEnd));
}
