/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: tests/onboarding/onboarding.smoke.test.mjs
 * fabric_version: v1
 * generated_at_utc: 2026-04-23T14:36:26.434Z
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('generated onboarding app shell exists', () => {
  assert.equal(fs.existsSync(new URL('../../src/App.jsx', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../src/features/onboarding/OnboardingPage.jsx', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../src/routes/onboarding.jsx', import.meta.url)), true);
});
