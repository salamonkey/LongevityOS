/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/App.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-04-23T14:36:26.434Z
 */
import React, { useMemo, useState } from 'react';
import { OnboardingPage } from './features/onboarding/OnboardingPage.jsx';
import { HealthPlanPage } from './routes/onboarding.jsx';

const seedPlan = {
  today: [
    'Take a 15-minute walk after your next meal.',
    'Schedule a blood pressure check this week.',
    'Set a hydration reminder for today.',
  ],
  soon: [
    'Book a dental cleaning within the next 2 months.',
    'Plan a preventive blood panel with your clinician.',
    'Review sleep routine and target 7-8 hours nightly.',
  ],
  later: [
    'Discuss age-appropriate screening timelines at your next annual visit.',
    'Review vaccination status before flu season.',
    'Set quarterly reminders to revisit your health plan.',
  ],
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState('onboarding');

  const generatedPlan = useMemo(() => {
    if (!profile) return null;
    return {
      today: [...seedPlan.today],
      soon: [...seedPlan.soon],
      later: [...seedPlan.later],
    };
  }, [profile]);

  return screen === 'onboarding' ? (
    <OnboardingPage
      title={"SL-001 Self-profile Onboarding to Generated Dashboard"}
      objective={"Enable a first-time user to enter age, gender, and planning context, generate a deterministic preventive plan on the server, persist one anonymous account with one active profile, and land on a mobile-first dashboard in the same session."}
      acceptanceCriteria={[
  "A new visitor can complete onboarding with valid age, gender, and planning context and reach the generated dashboard within 60 seconds in normal test conditions.",
  "Every generated dashboard shows either the first action from the earliest non-empty bucket in Now, Soon, Later order or a prominent all-clear state when all buckets are empty.",
  "The dashboard visibly includes a profile summary placeholder and three bucket sections labeled Now, Soon, and Later.",
  "Refreshing the page for the same anonymous account returns the same persisted profile summary and generated actions without creating a new profile or changing the plan.",
  "On common mobile viewport sizes, onboarding, loading, error recovery, and dashboard screens work without horizontal scrolling."
]}
      onComplete={(nextProfile) => {
        setProfile(nextProfile);
        setScreen('dashboard');
      }}
    />
  ) : (
    <HealthPlanPage
      profile={profile}
      plan={generatedPlan}
      onReset={() => {
        setProfile(null);
        setScreen('onboarding');
      }}
    />
  );
}
