import React from 'react';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : '0.0.0';

const STATUS_CLASS_MAP = {
  done: 'status-done',
  due: 'status-due',
  pending: 'status-pending',
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
  const hasHeaderRow = Boolean(title) || Boolean(headerAction);

  return (
    <main className="app-shell">
      <section className="app-panel sl001-shell">
        <header className="sl001-header">
          <p className="sl001-kicker">Longevity Health OS v.{APP_VERSION}</p>
          {hasHeaderRow ? (
            <div className="sl001-header-row">
              {title ? <h1>{title}</h1> : null}
              {headerAction ? (
                <div className="sl001-header-action">{headerAction}</div>
              ) : null}
            </div>
          ) : null}
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

export function HealthPlanItem({ item, onOpenDetail, showWhyItMatters = true }) {
  const body = (
    <>
      <div className="sl001-plan-topline">
        <h3>{item.name}</h3>
        <StatusPill status={item.status} label={item.statusLabel} />
      </div>
      <p className="sl001-plan-meta">{item.interventionTypeLabel ?? item.categoryLabel} - {item.cadenceLabel}</p>
      {showWhyItMatters ? <p className="sl001-plan-why">{item.whyItMatters}</p> : null}
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
  const itemCount = items.length;

  return (
    <section className={`sl001-priority-section ${sectionClass}`} aria-labelledby={`priority-${priority}`}>
      <div className="sl001-priority-section-header">
        <h2 id={`priority-${priority}`}>{title}</h2>
        <span className="sl001-priority-count" aria-label={`${itemCount} cards in ${title}`}>
          {itemCount}
        </span>
      </div>
      {itemCount === 0 ? (
        <p className="sl001-empty">No items in this section right now.</p>
      ) : (
        <div className="sl001-priority-list">
          {items.map((item) => (
            <HealthPlanItem
              item={item}
              key={item.catalogItemId}
              onOpenDetail={onOpenDetail}
              showWhyItMatters={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function resolveReadiness(score) {
  const numericScore = Number(score);
  const hasScore = score !== null && score !== undefined && Number.isFinite(numericScore);
  const normalizedScore = hasScore ? Math.max(0, Math.min(100, Math.round(numericScore))) : 0;
  const scoreText = `${normalizedScore}%`;
  const arcSpanDegrees = 240;
  const arcStartDegrees = -90;
  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (circumference * arcSpanDegrees) / 360;
  const progressLength = (arcLength * normalizedScore) / 100;

  let readinessLabel = 'not available';
  if (!hasScore) {
    readinessLabel = 'not available';
  } else if (normalizedScore >= 70) {
    readinessLabel = 'up to date';
  } else if (normalizedScore >= 40) {
    readinessLabel = 'in progress';
  } else {
    readinessLabel = 'needs attention';
  }

  return {
    hasScore,
    normalizedScore,
    scoreText: hasScore ? scoreText : 'N/A',
    arcStartDegrees,
    radius,
    circumference,
    arcLength,
    progressLength: hasScore ? progressLength : 0,
    readinessLabel,
  };
}

function HealthScoreGauge({ score, compact = false }) {
  const {
    hasScore,
    scoreText,
    arcStartDegrees,
    radius,
    circumference,
    arcLength,
    progressLength,
    readinessLabel,
  } = resolveReadiness(score);

  return (
    <div className={`sl001-score-gauge${compact ? ' is-compact' : ''}${hasScore ? '' : ' is-unavailable'}`} aria-hidden="true">
      <svg viewBox="0 0 240 240" role="presentation" focusable="false">
        <circle
          className="sl001-score-arc-track"
          cx="120"
          cy="120"
          r={radius}
          transform={`rotate(${arcStartDegrees} 120 120)`}
          strokeDasharray={`${arcLength} ${circumference}`}
        />
        <circle
          className="sl001-score-arc-progress"
          cx="120"
          cy="120"
          r={radius}
          transform={`rotate(${arcStartDegrees} 120 120)`}
          strokeDasharray={`${progressLength} ${circumference}`}
        />
      </svg>
      <div className="sl001-score-gauge-inner">
        <h2 className="sl001-score-value">{scoreText}</h2>
        <p className="sl001-score-caption">{readinessLabel}</p>
      </div>
    </div>
  );
}

export function HealthScoreCard({ score }) {
  const { scoreText, readinessLabel } = resolveReadiness(score);

  return (
    <section className="sl001-score-card sl001-summary-card" aria-label="Health summary">
      <p className="sl001-label">Health Readiness</p>
      <HealthScoreGauge score={score} />
      <p className="sl001-sr-only">Health readiness score: {scoreText}, {readinessLabel}.</p>
    </section>
  );
}

export function NextRecommendedStepCard({ highlightedItem }) {
  return (
    <section className="sl001-next-step-card sl001-summary-card" aria-label="Next recommended step">
      <p className="sl001-label">Next recommended step</p>
      <h2 className="sl001-summary-title">{highlightedItem?.name ?? 'No next step available'}</h2>
      <p className="sl001-summary-meta">
        {highlightedItem ? `${highlightedItem.interventionTypeLabel ?? highlightedItem.categoryLabel} - ${highlightedItem.cadenceLabel}` : 'You are all set for now. Check back soon for your next recommended item.'}
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

export function FamilyProfileCard({
  name,
  age,
  gender,
  dueCount,
  showDueCount = true,
  showNextStep = true,
  showCardLabel = true,
  nextStepVariant = 'default',
  healthScore = undefined,
  highlightedItem = null,
  onOpenNextStep = null,
  cardLabel = 'Profile',
  showHealthTileLabel = true,
}) {
  const descriptor = formatProfileDescriptor({ age, gender });
  const canOpenNextStep = showNextStep && highlightedItem && typeof onOpenNextStep === 'function';
  const hasNumericHealthScore = healthScore !== null
    && healthScore !== undefined
    && Number.isFinite(Number(healthScore));

  return (
    <section className="sl001-profile-card sl001-summary-card" aria-label="Profile summary">
      <div className="sl001-profile-card-layout">
        <div className="sl001-profile-card-main">
          {showCardLabel ? <p className="sl001-label">{cardLabel}</p> : null}
          <h2 className="sl001-summary-title">{name}</h2>
          {descriptor ? <p className="sl001-summary-meta sl001-profile-descriptor">{descriptor}</p> : null}
          {showDueCount ? <p className="sl001-summary-meta">{dueCount} due today</p> : null}
        </div>
        {healthScore !== undefined ? (
          <div
            className={`sl001-profile-health-tile${showHealthTileLabel ? '' : ' no-title'}${hasNumericHealthScore ? '' : ' is-unavailable'}`}
            aria-label="Health readiness"
          >
            {showHealthTileLabel ? <p className="sl001-profile-health-label">Health readiness</p> : null}
            <HealthScoreGauge score={healthScore} compact />
          </div>
        ) : null}
      </div>
      {showNextStep ? (
        canOpenNextStep ? (
          <button
            type="button"
            className={`sl001-profile-next-step sl001-profile-next-step-button${nextStepVariant === 'health-cta' ? ' is-health-cta' : ''}`}
            onClick={() => onOpenNextStep(highlightedItem)}
            aria-label={`Open details for ${highlightedItem.name}`}
          >
            <p className="sl001-label">NEXT STEP</p>
            <p className="sl001-profile-next-step-title">{highlightedItem.name}</p>
          </button>
        ) : (
          <div className="sl001-profile-next-step">
            <p className="sl001-label">NEXT STEP</p>
            <p className="sl001-profile-next-step-title">{highlightedItem?.name ?? 'No next step available'}</p>
          </div>
        )
      ) : null}
    </section>
  );
}

export function VaccinationStatusRow({
  vaccine,
  status,
  statusLabel,
  lastDate,
  showVaccineLabel = true,
}) {
  const safeStatusLabel = statusLabel || status || 'Pending';
  const normalizedLastDate = typeof lastDate === 'string' ? lastDate.trim() : '';
  let statusContext = 'Review this item';

  if (normalizedLastDate) {
    statusContext = `Last dose: ${normalizedLastDate}`;
  } else if (status === 'done') {
    statusContext = 'Marked as done';
  } else if (status === 'planned') {
    statusContext = 'Reminder set';
  } else if (status === 'pending') {
    statusContext = 'No date set';
  } else if (status === 'due' || status === 'overdue') {
    statusContext = 'Action needed';
  } else if (status === 'soon') {
    statusContext = 'Coming up';
  }

  return (
    <div className="sl001-vaccine-row" aria-label={`${vaccine} status`}>
      {showVaccineLabel ? <span>{vaccine}</span> : null}
      <span>
        <span className="sl001-vaccine-date">
          {safeStatusLabel} - {statusContext}
        </span>
      </span>
    </div>
  );
}
