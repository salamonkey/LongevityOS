/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/App.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-04-25T08:33:51.954Z
 */
import React, { useMemo, useState } from 'react';
import { OnboardingPage } from './features/onboarding/OnboardingPage.jsx';
import { HealthPlanPage } from './routes/onboarding.jsx';

const seedPlan = {
  today: [
  "Check your blood pressure.",
  "Review when your last cholesterol screening was done."
],
  soon: [
  "Schedule routine preventive blood work for your age group.",
  "Ask about the screening schedule that fits your age and sex."
],
  later: [
  "Discuss age-appropriate screening timelines at your next annual visit.",
  "Review vaccination status before flu season.",
  "Set quarterly reminders to revisit your health plan."
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
      title={"Longevity Health OS"}
      objective={"Let a first-time user enter age and gender, generate a deterministic rule-based personal health plan, and land on a read-only dashboard with a stored health score in under 60 seconds."}
      acceptanceCriteria={[
  "Starting from the welcome screen, a user can enter a valid age from 30 to 65 and a gender of Female or Male, submit once, and reach a dashboard only after a non-empty plan is created.",
  "The happy path from tapping Start to seeing the dashboard completes within 60 seconds on a mobile viewport.",
  "Each health item appears exactly once under one section only: Today, Soon, or Later.",
  "The dashboard shows a visible read-only health score for the active profile above the grouped items.",
  "Entering the same age, gender, and rule set again produces the same dashboard items, order, priority groups, and health score."
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
