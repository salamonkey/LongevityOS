/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/features/onboarding/OnboardingPage.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-04-23T14:36:26.434Z
 */
import React, { useState } from 'react';
import { ProfileForm } from '../profile/ProfileForm.jsx';

export function OnboardingPage({ title, objective, acceptanceCriteria, onComplete }) {
  const [familyMode, setFamilyMode] = useState(false);

  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Longevity Health OS MVP</p>
        <h1>{title}</h1>
        <p className="lede">{objective}</p>
        <div className="callout">
          <strong>Slice promise</strong>
          <ul>
            {acceptanceCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <header className="section-header">
          <h2>Tell us a little about you</h2>
          <p>We use this to generate an immediate health plan and dashboard priorities.</p>
        </header>

        <div className="toggle-row">
          <button type="button" className={familyMode ? '' : 'active'} onClick={() => setFamilyMode(false)}>Only for me</button>
          <button type="button" className={familyMode ? 'active' : ''} onClick={() => setFamilyMode(true)}>Family mode</button>
        </div>

        <ProfileForm familyMode={familyMode} onSubmit={onComplete} />
      </section>
    </main>
  );
}
