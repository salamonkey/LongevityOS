import React from 'react';
import { ProfileForm } from '../profile/ProfileForm.jsx';

export function OnboardingPage({ draft, onDraftChange, onSubmit, onBack }) {
  return (
    <main className="app-shell">
      <section className="panel hero">
        <p className="eyebrow">Personal onboarding</p>
        <h1>Build your first profile</h1>
        <p className="lede">
          Enter your age and gender to get a personalized preventive plan you can use right away.
        </p>
        <div className="microcopy">
          This takes about a minute and helps tailor your recommended next steps.
        </div>
      </section>

      <section className="panel">
        <header className="section-header">
          <h2>Profile details</h2>
          <p>After you continue, you&apos;ll see your first set of recommended health actions.</p>
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
