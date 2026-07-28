// Pure logic for the Profile Overview "Profilstärke" card, split out of
// ProfileOverviewScreen.jsx (which contains JSX) so it can be unit-tested
// directly with the plain Node test runner, which can't parse JSX.
//
// The score blends two otherwise-separate signals: how complete/current the
// risk profile is (dominant, 60%), and the existing Vorsorge-Score /
// calculateHealthScore queue-engagement number already shown on the
// dashboard (minor, 40%) -- a long, untouched plan queue should pull this
// down even for someone who has fully answered their risk factors.
import { RISK_PROFILE_TOTAL_QUESTIONS, computeRiskProfileReviewStatus } from '../features/live-enrollment/riskProfile.js';

const RISK_WEIGHT = 0.6;
const QUEUE_WEIGHT = 0.4;
const RECENCY_FACTOR_BY_STATE = Object.freeze({
  fresh: 1,
  due: 0.9,
  overdue: 0.75,
  unreviewed: 0,
});
const QUEUE_WEAK_THRESHOLD = 50;

// Deliberately set a few points above the 60 that risk-only could reach
// (100 x 0.6 weight) -- crossing it always requires some queue engagement
// too, with a bit of buffer rather than the bare mathematical minimum.
export const PROFILE_STRENGTH_EXPLANATION_THRESHOLD = 66;

export function computeProfileStrength({ reviewedKeys, reviewedAt, cadenceMonths, healthScore, now } = {}) {
  const reviewStatus = computeRiskProfileReviewStatus({ reviewedKeys, reviewedAt, cadenceMonths, now });
  const completenessFraction = Math.min(
    1,
    (Array.isArray(reviewedKeys) ? reviewedKeys.length : 0) / RISK_PROFILE_TOTAL_QUESTIONS,
  );
  const recencyFactor = RECENCY_FACTOR_BY_STATE[reviewStatus.state] ?? 0;
  const riskComponent = completenessFraction * recencyFactor * 100;
  // No applicable plan items to engage with is treated as nothing held
  // back, not as a penalty -- same principle as the status-quo doorway only
  // appearing when there's actually something to confirm.
  const queueComponent = Number.isFinite(healthScore) ? healthScore : 100;

  const strengthPercent = Math.round(riskComponent * RISK_WEIGHT + queueComponent * QUEUE_WEIGHT);
  const riskWeak = riskComponent < 100;
  const queueWeak = queueComponent < QUEUE_WEAK_THRESHOLD;
  const showExplanation = strengthPercent <= PROFILE_STRENGTH_EXPLANATION_THRESHOLD;

  let explanationKey = null;
  if (showExplanation) {
    if (riskWeak && queueWeak) {
      explanationKey = 'profileOverview.strengthExplainBoth';
    } else if (riskWeak) {
      explanationKey = 'profileOverview.strengthExplainRisk';
    } else if (queueWeak) {
      explanationKey = 'profileOverview.strengthExplainQueue';
    }
  }

  return {
    strengthPercent,
    reviewStatus,
    showExplanation,
    explanationKey,
  };
}
