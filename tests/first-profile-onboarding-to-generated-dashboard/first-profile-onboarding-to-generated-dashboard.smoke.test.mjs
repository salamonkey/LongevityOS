/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: tests/first-profile-onboarding-to-generated-dashboard/first-profile-onboarding-to-generated-dashboard.smoke.test.mjs
 * fabric_version: v1
 * generated_at_utc: 2026-04-25T08:33:51.954Z
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('generated first-profile-onboarding-to-generated-dashboard bridge artifacts exist', () => {
  assert.equal(fs.existsSync(new URL('../../src/features/first-profile-onboarding-to-generated-dashboard/SliceEntryBridge.jsx', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../src/routes/first-profile-onboarding-to-generated-dashboard.jsx', import.meta.url)), true);
});
