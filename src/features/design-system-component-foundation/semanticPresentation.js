export const STATUS_SEMANTICS = Object.freeze({
  done: {
    key: 'done',
    label: 'Done',
    toneClassName: 'status-done',
    token: 'color.status.done',
  },
  due: {
    key: 'due',
    label: 'Due',
    toneClassName: 'status-due',
    token: 'color.status.due',
  },
  soon: {
    key: 'soon',
    label: 'Soon',
    toneClassName: 'status-soon',
    token: 'color.status.soon',
  },
  planned: {
    key: 'planned',
    label: 'Planned',
    toneClassName: 'status-planned',
    token: 'color.status.planned',
  },
  overdue: {
    key: 'overdue',
    label: 'Overdue',
    toneClassName: 'status-overdue',
    token: 'color.status.overdue',
  },
  unknown: {
    key: 'unknown',
    label: 'Status unavailable',
    toneClassName: 'status-planned',
    token: 'color.status.planned',
  },
});

const DOMAIN_STATUS_TO_KEY = Object.freeze({
  done: 'done',
  due: 'due',
  soon: 'soon',
  planned: 'planned',
  overdue: 'overdue',
});

export const PRIORITY_SEMANTICS = Object.freeze({
  today: {
    key: 'today',
    label: 'Today',
    toneClassName: 'priority-today',
    token: 'color.priority.today',
  },
  soon: {
    key: 'soon',
    label: 'Soon',
    toneClassName: 'priority-soon',
    token: 'color.priority.soon',
  },
  later: {
    key: 'later',
    label: 'Later',
    toneClassName: 'priority-later',
    token: 'color.priority.later',
  },
  unknown: {
    key: 'unknown',
    label: 'Priority unavailable',
    toneClassName: 'priority-later',
    token: 'color.priority.later',
  },
});

const DOMAIN_PRIORITY_TO_KEY = Object.freeze({
  today: 'today',
  soon: 'soon',
  later: 'later',
});

export function resolveStatusSemantics(domainStatus) {
  const normalized = String(domainStatus ?? '').trim().toLowerCase();
  const key = DOMAIN_STATUS_TO_KEY[normalized] ?? 'unknown';
  return STATUS_SEMANTICS[key];
}

export function resolvePrioritySemantics(domainPriority) {
  const normalized = String(domainPriority ?? '').trim().toLowerCase();
  const key = DOMAIN_PRIORITY_TO_KEY[normalized] ?? 'unknown';
  return PRIORITY_SEMANTICS[key];
}

export function toPriorityKey(priorityHorizon) {
  const normalized = String(priorityHorizon ?? '').trim().toLowerCase();

  if (normalized === 'today') {
    return 'today';
  }

  if (normalized === 'soon') {
    return 'soon';
  }

  return 'later';
}
