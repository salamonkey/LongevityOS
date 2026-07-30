import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBmi,
  isSeverelyObeseBmi,
  resolveBmiCategory,
} from '../../src/lib/health/bmi.js';

test('calculateBmi computes weight over height-in-meters squared, rounded to 1 decimal', () => {
  assert.equal(calculateBmi(168, 62), 22);
  assert.equal(calculateBmi(180, 100), 30.9);
});

test('calculateBmi returns null for missing or non-positive inputs', () => {
  assert.equal(calculateBmi(undefined, 70), null);
  assert.equal(calculateBmi(170, undefined), null);
  assert.equal(calculateBmi(0, 70), null);
  assert.equal(calculateBmi(170, -5), null);
});

test('resolveBmiCategory buckets at the standard clinical thresholds', () => {
  assert.equal(resolveBmiCategory(17), 'underweight');
  assert.equal(resolveBmiCategory(18.5), 'normal');
  assert.equal(resolveBmiCategory(24.9), 'normal');
  assert.equal(resolveBmiCategory(25), 'overweight');
  assert.equal(resolveBmiCategory(29.9), 'overweight');
  assert.equal(resolveBmiCategory(30), 'obese');
  assert.equal(resolveBmiCategory(NaN), null);
});

test('isSeverelyObeseBmi matches the BAG Impfplan severe-obesity threshold', () => {
  assert.equal(isSeverelyObeseBmi(34.9), false);
  assert.equal(isSeverelyObeseBmi(35), true);
  assert.equal(isSeverelyObeseBmi(null), false);
});
