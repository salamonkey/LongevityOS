import React from 'react';
import { ProfileForm } from '../profile/ProfileForm.jsx';

export function OnboardingPage({ draft, onDraftChange, onSubmit, onBack }) {
  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Self-only onboarding</p>
        <h1>Build your first profile</h1>
        <p className="lede">
          Enter age and gender. The plan is generated locally from rule-based guidance before the dashboard opens.
        </p>
        <div className="microcopy">
          Only age and gender are collected in this slice. No family mode, reminders, or item editing are included.
        </div>
      </section>

      <section className="panel">
        <header className="section-header">
          <h2>Profile details</h2>
          <p>The generated dashboard will appear only after the first profile plan is built.</p>
        </header>

        <ProfileForm
          draft={draft}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onBack={onBack}
        />
      </section>
    </main>
  );
}
