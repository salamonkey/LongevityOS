/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: tests/self-profile-onboarding-to-generated-dashboard/self-profile-onboarding-to-generated-dashboard.smoke.test.mjs
 * fabric_version: v1
 * generated_at_utc: 2026-04-23T14:36:26.434Z
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('generated self-profile-onboarding-to-generated-dashboard bridge artifacts exist', () => {
  assert.equal(fs.existsSync(new URL('../../src/features/self-profile-onboarding-to-generated-dashboard/SliceEntryBridge.jsx', import.meta.url)), true);
  assert.equal(fs.existsSync(new URL('../../src/routes/self-profile-onboarding-to-generated-dashboard.jsx', import.meta.url)), true);
});
