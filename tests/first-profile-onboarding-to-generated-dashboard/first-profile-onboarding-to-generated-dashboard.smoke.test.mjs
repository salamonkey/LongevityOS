import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const ONBOARDING_SOURCE = fs.readFileSync(
  new URL('../../src/features/onboarding/OnboardingPage.jsx', import.meta.url),
  'utf8',
);
const DASHBOARD_SOURCE = fs.readFileSync(
  new URL('../../src/routes/first-profile-onboarding-to-generated-dashboard.jsx', import.meta.url),
  'utf8',
);

test('the slice flow is wired from welcome to generating to dashboard', () => {
  assert.match(APP_SOURCE, /WelcomeScreen/);
  assert.match(APP_SOURCE, /GeneratingScreen/);
  assert.match(APP_SOURCE, /setScreen\('generating'\)/);
  assert.match(APP_SOURCE, /createProfileSnapshot/);
  assert.match(APP_SOURCE, /GeneratedDashboardPage/);
  assert.match(APP_SOURCE, /Start/);
  assert.match(APP_SOURCE, /Guidance to help you plan/);

  assert.match(ONBOARDING_SOURCE, /Build your first profile/);
  assert.match(ONBOARDING_SOURCE, /ProfileForm/);
  assert.match(ONBOARDING_SOURCE, /age and gender/);
  assert.match(ONBOARDING_SOURCE, /recommended next steps/);

  assert.match(DASHBOARD_SOURCE, /Health score/);
  assert.match(DASHBOARD_SOURCE, /Today/);
  assert.match(DASHBOARD_SOURCE, /Soon/);
  assert.match(DASHBOARD_SOURCE, /Later/);
  assert.match(DASHBOARD_SOURCE, /groupPlanItems/);
});
