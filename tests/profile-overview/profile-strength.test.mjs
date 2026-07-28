import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeProfileStrength,
  PROFILE_STRENGTH_EXPLANATION_THRESHOLD,
} from '../../src/components/profileStrength.js';
import { RISK_PROFILE_TOTAL_QUESTIONS } from '../../src/features/live-enrollment/riskProfile.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const RECENT = '2025-12-01T00:00:00.000Z'; // fresh under any real cadence

function everyQuestionKey(count) {
  return Array.from({ length: count }, (_, index) => `q${index}`);
}

test('a brand-new profile (nothing answered, no queue engagement) scores near zero and shows the explanation', () => {
  const result = computeProfileStrength({
    reviewedKeys: [],
    reviewedAt: null,
    cadenceMonths: 12,
    healthScore: 5,
    now: NOW,
  });
  assert.equal(result.strengthPercent, 2); // 0 * 0.6 + 5 * 0.4 = 2
  assert.equal(result.showExplanation, true);
  assert.equal(result.explanationKey, 'profileOverview.strengthExplainBoth');
});

test('fully reviewed, fresh, but a long unhandled queue still pulls the score down (risk alone caps at 60)', () => {
  const result = computeProfileStrength({
    reviewedKeys: everyQuestionKey(RISK_PROFILE_TOTAL_QUESTIONS),
    reviewedAt: RECENT,
    cadenceMonths: 12,
    healthScore: 15,
    now: NOW,
  });
  assert.equal(result.strengthPercent, 66); // 100 * 0.6 + 15 * 0.4 = 66
  assert.equal(result.showExplanation, true); // right at the threshold, still shown
  assert.equal(result.explanationKey, 'profileOverview.strengthExplainQueue');
});

test('fully reviewed, stale, long unhandled queue scores lower than the fresh equivalent', () => {
  const result = computeProfileStrength({
    reviewedKeys: everyQuestionKey(RISK_PROFILE_TOTAL_QUESTIONS),
    reviewedAt: '2024-06-01T00:00:00.000Z', // well past any cadence by NOW
    cadenceMonths: 6,
    healthScore: 15,
    now: NOW,
  });
  assert.equal(result.strengthPercent, 51); // (100 * 0.75) * 0.6 + 15 * 0.4 = 45 + 6
  assert.equal(result.showExplanation, true);
  assert.equal(result.explanationKey, 'profileOverview.strengthExplainBoth');
});

test('fully reviewed, fresh, and well-engaged clears the threshold and needs no explanation', () => {
  const result = computeProfileStrength({
    reviewedKeys: everyQuestionKey(RISK_PROFILE_TOTAL_QUESTIONS),
    reviewedAt: RECENT,
    cadenceMonths: 12,
    healthScore: 90,
    now: NOW,
  });
  assert.equal(result.strengthPercent, 96); // 60 + 36
  assert.equal(result.showExplanation, false);
  assert.equal(result.explanationKey, null);
});

test('crossing the explanation threshold is mathematically impossible with zero queue engagement', () => {
  const result = computeProfileStrength({
    reviewedKeys: everyQuestionKey(RISK_PROFILE_TOTAL_QUESTIONS),
    reviewedAt: RECENT,
    cadenceMonths: 12,
    healthScore: 0,
    now: NOW,
  });
  assert.equal(result.strengthPercent, 60); // risk-only ceiling
  assert.ok(result.strengthPercent <= PROFILE_STRENGTH_EXPLANATION_THRESHOLD);
  assert.equal(result.showExplanation, true);
});

test('a partially-answered but fresh risk profile with strong queue engagement names the risk profile as the weak link', () => {
  const result = computeProfileStrength({
    reviewedKeys: ['smoker_current_or_former'],
    reviewedAt: RECENT,
    cadenceMonths: 12,
    healthScore: 90,
    now: NOW,
  });
  assert.equal(result.showExplanation, true);
  assert.equal(result.explanationKey, 'profileOverview.strengthExplainRisk');
});

test('a missing health score (no applicable plan items) is treated as no penalty, not zero', () => {
  const result = computeProfileStrength({
    reviewedKeys: everyQuestionKey(RISK_PROFILE_TOTAL_QUESTIONS),
    reviewedAt: RECENT,
    cadenceMonths: 12,
    healthScore: null,
    now: NOW,
  });
  assert.equal(result.strengthPercent, 100); // 60 + 100 * 0.4
  assert.equal(result.showExplanation, false);
});
