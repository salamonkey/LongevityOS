import React from 'react';

const STATUS_CLASS_MAP = {
  done: 'status-done',
  due: 'status-due',
  soon: 'status-soon',
  planned: 'status-planned',
  overdue: 'status-overdue',
};

const PRIORITY_CLASS_MAP = {
  today: 'priority-today',
  soon: 'priority-soon',
  later: 'priority-later',
};

export function AppShell({ title, headerAction = null, children }) {
  return (
    <main className="app-shell">
      <section className="app-panel sl001-shell">
        <header className="sl001-header">
          <p className="sl001-kicker">Longevity Health OS</p>
          <div className="sl001-header-row">
            <h1>{title}</h1>
            {headerAction ? (
              <div className="sl001-header-action">{headerAction}</div>
            ) : null}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function StatusPill({ status, label }) {
  const className = STATUS_CLASS_MAP[status] ?? 'status-planned';

  return (
    <span className={`sl001-status-pill ${className}`} aria-label={`Status: ${label}`}>
      {label}
    </span>
  );
}

export function HealthPlanItem({ item, onOpenDetail }) {
  const body = (
    <>
      <div className="sl001-plan-topline">
        <h3>{item.name}</h3>
        <StatusPill status={item.status} label={item.statusLabel} />
      </div>
      <p className="sl001-plan-meta">{item.categoryLabel} - {item.cadenceLabel}</p>
      <p className="sl001-plan-why">{item.whyItMatters}</p>
      {item.category === 'vaccination' ? (
        <VaccinationStatusRow
          vaccine={item.name}
          status={item.status}
          statusLabel={item.statusLabel}
          lastDate={null}
        />
      ) : null}
    </>
  );

  if (typeof onOpenDetail !== 'function') {
    return (
      <article className="sl001-plan-item">
        {body}
      </article>
    );
  }

  return (
    <article className="sl001-plan-item">
      <button
        type="button"
        className="sl001-plan-item-button"
        aria-label={`Open details for ${item.name}`}
        onClick={() => onOpenDetail(item)}
      >
        {body}
      </button>
    </article>
  );
}

export function PrioritySection({ priority, title, items, onOpenDetail }) {
  const sectionClass = PRIORITY_CLASS_MAP[priority] ?? 'priority-later';

  return (
    <section className={`sl001-priority-section ${sectionClass}`} aria-labelledby={`priority-${priority}`}>
      <h2 id={`priority-${priority}`}>{title}</h2>
      {items.length === 0 ? (
        <p className="sl001-empty">No items in this section right now.</p>
      ) : (
        <div className="sl001-priority-list">
          {items.map((item) => (
            <HealthPlanItem item={item} key={item.catalogItemId} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HealthScoreCard({ score }) {
  const scoreText = Number.isFinite(score) ? `${score}%` : '0%';

  return (
    <section className="sl001-score-card sl001-summary-card" aria-label="Health summary">
      <p className="sl001-label">Health Score</p>
      <h2 className="sl001-summary-title">{scoreText}</h2>
      <p className="sl001-summary-meta">
        Use this score to track your progress as you complete today&apos;s and upcoming preventive care.
      </p>
    </section>
  );
}

export function NextRecommendedStepCard({ highlightedItem }) {
  return (
    <section className="sl001-next-step-card sl001-summary-card" aria-label="Next recommended step">
      <p className="sl001-label">Next recommended step</p>
      <h2 className="sl001-summary-title">{highlightedItem?.name ?? 'No next step available'}</h2>
      <p className="sl001-summary-meta">
        {highlightedItem ? `${highlightedItem.categoryLabel} - ${highlightedItem.cadenceLabel}` : 'Please return to onboarding and try again.'}
      </p>
    </section>
  );
}

function formatProfileDescriptor({ age, gender }) {
  const parts = [];
  if (Number.isFinite(Number(age))) {
    parts.push(`Age ${Number(age)}`);
  }
  const normalizedGender = String(gender || '').trim().toLowerCase();
  if (normalizedGender) {
    parts.push(normalizedGender[0].toUpperCase() + normalizedGender.slice(1));
  }
  return parts.join(' - ');
}

export function FamilyProfileCard({ name, age, gender, dueCount }) {
  const descriptor = formatProfileDescriptor({ age, gender });
  return (
    <section className="sl001-profile-card sl001-summary-card" aria-label="Profile summary">
      <p className="sl001-label">Profile</p>
      <h2 className="sl001-summary-title">{name}</h2>
      {descriptor ? <p className="sl001-summary-meta">{descriptor}</p> : null}
      <p className="sl001-summary-meta">{dueCount} due today</p>
    </section>
  );
}

export function VaccinationStatusRow({ vaccine, status, statusLabel, lastDate }) {
  const safeStatusLabel = statusLabel || status || 'Plan';
  return (
    <div className="sl001-vaccine-row" aria-label={`${vaccine} status`}>
      <span>{vaccine}</span>
      <span>
        <span className="sl001-vaccine-date">
          {safeStatusLabel} - Last dose: {lastDate || 'Not recorded yet'}
        </span>
      </span>
    </div>
  );
}
