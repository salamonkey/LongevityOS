/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/routes/onboarding.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-04-23T14:36:26.434Z
 */
import React from 'react';

export function HealthPlanPage({ profile, plan, onReset }) {
  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Customer test mode</p>
        <h1>Hello {profile?.name || 'there'} — here is your health overview</h1>
        <p className="lede">Age {profile?.age} · {profile?.gender} · {profile?.familyMode ? 'family mode' : 'single profile'}</p>
        <button type="button" className="secondary" onClick={onReset}>Restart onboarding</button>
      </section>

      <section className="dashboard-grid">
        <PriorityColumn title="Today" items={plan?.today || []} />
        <PriorityColumn title="Soon" items={plan?.soon || []} />
        <PriorityColumn title="Later" items={plan?.later || []} />
      </section>
    </main>
  );
}

function PriorityColumn({ title, items }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="priority-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
