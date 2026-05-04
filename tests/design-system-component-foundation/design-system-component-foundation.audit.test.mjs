import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const FILES = [
  '../../src/routes/design-system-component-foundation.jsx',
  '../../src/features/design-system-component-foundation/semanticPresentation.js',
  '../../src/features/design-system-component-foundation/components/StatusPill.jsx',
  '../../src/features/design-system-component-foundation/components/HealthPlanItem.jsx',
  '../../src/features/design-system-component-foundation/components/PrioritySection.jsx',
  '../../src/features/design-system-component-foundation/components/HealthScoreCard.jsx',
  '../../src/features/design-system-component-foundation/components/ReminderSelector.jsx',
  '../../src/features/design-system-component-foundation/components/FamilyProfileCard.jsx',
];

const SOURCES = FILES.map((path) => ({
  path,
  source: fs.readFileSync(new URL(path, import.meta.url), 'utf8'),
}));

test('migrated SL-004B UI path avoids new raw color literals and inline style objects', () => {
  for (const { source, path } of SOURCES) {
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}/, `${path} contains raw hex color`);
    assert.doesNotMatch(source, /\brgb\s*\(/i, `${path} contains raw rgb color`);
    assert.doesNotMatch(source, /\bhsl\s*\(/i, `${path} contains raw hsl color`);
    assert.doesNotMatch(source, /style=\{\{/, `${path} contains inline visual style`);
  }
});
