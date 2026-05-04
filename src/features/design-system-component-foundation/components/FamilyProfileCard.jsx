import React from 'react';

export function FamilyProfileCard({ name, score, dueCount, onOpenProfile }) {
  const safeName = toDisplayText(name, 'Family profile');
  const parsedScore = Number(score);
  const safeScore = Number.isFinite(parsedScore) ? Math.max(0, Math.round(parsedScore)) : null;
  const safeDueCount = Number.isFinite(Number(dueCount)) ? Math.max(0, Math.trunc(Number(dueCount))) : 0;

  return (
    <section className="panel family-profile-card" aria-label={`Profile summary for ${safeName}`}>
      <p className="eyebrow">Family profile</p>
      <h2>{safeName}</h2>
      <p className="helper">
        Health score: {safeScore === null ? 'Unavailable' : safeScore} · {renderDueSummary(safeDueCount)}
      </p>
      {typeof onOpenProfile === 'function' ? (
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              onOpenProfile();
            }}
          >
            Open profile
          </button>
        </div>
      ) : null}
    </section>
  );
}

function toDisplayText(value, fallback) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

function renderDueSummary(dueCount) {
  if (dueCount === 0) {
    return 'No items due right now';
  }

  if (dueCount === 1) {
    return '1 item due now';
  }

  return `${dueCount} items due now`;
}

export default FamilyProfileCard;
