/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: tests/onboarding/onboarding.smoke.test.mjs
 * fabric_version: v1
 * generated_at_utc: 2026-04-25T08:33:51.954Z
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const APP_SOURCE = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const LEAK_PATTERN = /\b(first[-\s]?run|routing|acceptance criteria|coverage|smoke walkthrough|idempotent|read model|status fields|cadenceLabel|rationaleShort|bucket rules|deterministic plan generator)\b/i;

test('generated onboarding app shell exists', () => {
  assert.equal(fs.existsSync(new URL('../../src/App.jsx', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../src/features/onboarding/OnboardingPage.jsx', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../src/routes/onboarding.jsx', import.meta.url)), true);
});

test('dashboard seed items do not leak internal implementation text', () => {
  assert.equal(LEAK_PATTERN.test(APP_SOURCE), false);
});
