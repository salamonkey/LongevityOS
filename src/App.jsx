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
  "Scaffold the React/Vite app with a mobile-first shell and routes for start, onboarding, loading or submit state, and dashboard.",
  "Build the single onboarding form with required age, gender, and planning context inputs, disabled submit until valid, and inline validation for missing, non-in1",
  "Hook the form to a POST /api/onboarding/complete endpoint that lazily creates the anonymous account, stores the httpOnly cookie, creates one active profile, and",
  "Implement the deterministic in-repo rule service with a fixed rule_version that maps age and gender to ordered generated actions in Now, Soon, and Later buckets",
  "Persist only account, active_profile, and generated_action records needed for reload and return a dashboard payload with summary, next_action or all_clear, and",
  "Add GET /api/dashboard to load the existing active profile and persisted generated actions for the same cookie without re-running generation on refresh or revis"
],
  soon: [
  "Render the dashboard with a summary placeholder, a primary next-action card chosen from the earliest non-empty bucket, and explicit empty messaging in each bu",
  "Add the loading state, duplicate-submit prevention, retry action, and back-to-edit recovery path that preserves entered values after a failed submit.",
  "Create rule-engine fixture tests covering supported age and gender combinations, fixed bucket assignment, fixed sort order, and the zero-action all-clear case.",
  "Add API and integration tests for invalid onboarding input, successful onboarding persistence, dashboard reload persistence, and next-action priority order."
],
  later: [
  "Tighten responsive spacing, wrapping, and typography so common phone widths remain readable without horizontal scrolling.",
  "Add internal server logging with anonymous account identifiers for onboarding failures and dashboard fetch failures.",
  "Document the onboarding and dashboard API contracts plus the rule catalog behavior used in this slice so the scaffold stays deterministic and testable."
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
