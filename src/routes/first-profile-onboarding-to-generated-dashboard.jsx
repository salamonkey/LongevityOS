import React from 'react';
import { groupPlanItems } from '../features/profile/profilePlan.js';

export function GeneratedDashboardPage({ profile, onRestart }) {
  const groupedItems = groupPlanItems(profile.planItems);

  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Active profile dashboard</p>
        <h1>Your personalized plan is ready</h1>
        <p className="lede">
          Age {profile.ageYears} · {capitalize(profile.gender)} · rule set {profile.ruleSetVersion}
        </p>
        <button type="button" className="secondary" onClick={onRestart}>
          Start over
        </button>
      </section>

      <section className="panel score-card" aria-label="Read-only health score">
        <div>
          <p className="eyebrow">Read-only health score</p>
          <h2>{profile.healthScore}</h2>
        </div>
        <p className="helper">This score comes only from the generated age and gender rules for this profile.</p>
      </section>

      <section className="dashboard-grid">
        {['Today', 'Soon', 'Later'].map((horizon) => (
          <PrioritySection key={horizon} title={horizon} items={groupedItems[horizon]} />
        ))}
      </section>
    </main>
  );
}

function PrioritySection({ title, items }) {
  return (
    <section className="panel section-card">
      <h2>{title}</h2>
      <ul className="priority-list">
        {items.map((item) => (
          <li key={item.itemCode} className="health-item">
            <div className="health-item-header">
              <span className="health-item-title">{item.title}</span>
              <span className="badge">{item.frequencyLabel}</span>
            </div>
            <p>{item.whyItMatters}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default GeneratedDashboardPage;
