import React from 'react';

export function HealthScoreCard({ score, summary }) {
  const parsedScore = Number(score);
  const hasValidScore = Number.isFinite(parsedScore);
  const safeScore = hasValidScore ? Math.max(0, Math.round(parsedScore)) : null;
  const scoreLabel = hasValidScore ? safeScore : 'Score unavailable';
  const safeSummary = String(summary ?? '').trim() || 'Keep going. Every completed step improves your preventive progress.';

  return (
    <section className="panel score-card" aria-label="Health progress score">
      <div>
        <p className="eyebrow">Health progress score</p>
        <h2>{scoreLabel}</h2>
      </div>
      <p className="helper">{safeSummary}</p>
    </section>
  );
}

export default HealthScoreCard;
