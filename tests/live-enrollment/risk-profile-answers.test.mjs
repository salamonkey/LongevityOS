import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RISK_PROFILE_OPTION_GROUPS,
  buildInitialAnswers,
  findFirstIncompleteStep,
} from '../../src/features/live-enrollment/riskProfile.js';

function keyFor(optionValue) {
  for (let groupIndex = 0; groupIndex < RISK_PROFILE_OPTION_GROUPS.length; groupIndex += 1) {
    const optionIndex = RISK_PROFILE_OPTION_GROUPS[groupIndex].options.findIndex((option) => option.value === optionValue);
    if (optionIndex !== -1) {
      return `${groupIndex}-${optionIndex}`;
    }
  }
  throw new Error(`unknown option value: ${optionValue}`);
}

test('a never-reviewed profile restores to a fully blank answer map', () => {
  const answers = buildInitialAnswers([], []);
  assert.equal(answers.size, 0);
});

test('a "yes" answer restores as yes even with no other reviewed questions', () => {
  const answers = buildInitialAnswers(['smoker_current_or_former'], []);
  assert.equal(answers.get(keyFor('smoker_current_or_former')), 'yes');
  assert.equal(answers.size, 1);
});

// This is the exact bug report: answering a couple of questions "no" (never
// "yes"), then saving, then reopening the wizard. Before the fix, riskFlags
// (the yes-only list) was the sole source of truth, so an all-no session
// produced an empty riskFlags array and the whole answer set -- including
// those very "no" answers -- came back as if it had never been touched.
test('questions explicitly answered "no" are restored as no, not forgotten, even when nothing was ever answered "yes"', () => {
  const reviewedKeys = ['smoker_current_or_former', 'sti_risk_behavior'];
  const answers = buildInitialAnswers([], reviewedKeys);

  assert.equal(answers.get(keyFor('smoker_current_or_former')), 'no');
  assert.equal(answers.get(keyFor('sti_risk_behavior')), 'no');
  assert.equal(answers.size, 2);
});

test('a mix of yes and no answers restores each question to its own answer, leaving everything else untouched', () => {
  const riskFlags = ['hiv'];
  const reviewedKeys = ['hiv', 'smoker_current_or_former', 'sti_risk_behavior'];
  const answers = buildInitialAnswers(riskFlags, reviewedKeys);

  assert.equal(answers.get(keyFor('hiv')), 'yes');
  assert.equal(answers.get(keyFor('smoker_current_or_former')), 'no');
  assert.equal(answers.get(keyFor('sti_risk_behavior')), 'no');
  // A question nobody has touched (present in neither list) must stay
  // completely absent from the map -- not defaulted to "no" just because
  // some other question in the profile was answered "yes". This was the
  // second half of the same bug: a single "yes" anywhere used to make
  // every untouched question look like an explicit "no".
  assert.equal(answers.has(keyFor('msm')), false);
});

test('a never-reviewed profile jumps straight to the first section', () => {
  assert.equal(findFirstIncompleteStep([]), 0);
});

test('a fully-reviewed first section skips ahead to the next section with an unanswered question', () => {
  const firstSectionKeys = RISK_PROFILE_OPTION_GROUPS[0].options.map((option) => option.value);
  assert.equal(findFirstIncompleteStep(firstSectionKeys), 1);
});

test('a fully-reviewed profile has nowhere left to jump to, so it restarts at the first section', () => {
  const everyKey = RISK_PROFILE_OPTION_GROUPS.flatMap((group) => group.options.map((option) => option.value));
  assert.equal(findFirstIncompleteStep(everyKey), 0);
});
