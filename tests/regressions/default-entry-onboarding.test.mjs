import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(process.cwd(), 'src/App.jsx');

test('default app entry keeps onboarding as fallback surface', () => {
  const text = fs.readFileSync(appPath, 'utf8');

  assert.match(
    text,
    /from\s+['"]\.\/routes\/self-onboarding-to-first-dashboard\.jsx['"];/,
    'App must import the onboarding route surface',
  );

  assert.match(
    text,
    /function\s+normalizeView\(value\)[\s\S]*return\s+'onboarding';/,
    'normalizeView should fallback to onboarding',
  );

  assert.match(
    text,
    /return\s*\(\s*<SelfOnboardingToFirstDashboardRoute\b[\s\S]*\)\s*;\s*\}/,
    'App default return should render onboarding route',
  );
});
