import React, { useEffect, useRef, useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Button, Icon, ProgressRing, Sheet } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import {
  RISK_PROFILE_OPTION_GROUPS,
  RISK_PROFILE_TOTAL_QUESTIONS,
  RISK_INFO_CONTENT,
  buildInitialAnswers,
  findFirstIncompleteStep,
} from './riskProfile.js';
import './live-enrollment.css';

const TOTAL_QUESTIONS = RISK_PROFILE_TOTAL_QUESTIONS;

// How long to wait after the last click before autosaving in the
// background. Short enough to feel like "saves as you go", long enough to
// coalesce a quick burst of clicks into a single request instead of firing
// one per click.
const AUTOSAVE_DEBOUNCE_MS = 600;

export default function RiskProfileStep({
  initialRiskFlags = [],
  initialReviewedKeys = [],
  initialPregnancyDueDate = '',
  onSave,
  onAutosave,
  onSkip,
  pending = false,
  errorMessage = '',
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(() => findFirstIncompleteStep(initialReviewedKeys));
  const [answers, setAnswers] = useState(() => buildInitialAnswers(initialRiskFlags, initialReviewedKeys));
  const [dueDate, setDueDate] = useState(initialPregnancyDueDate || '');
  const [expanded, setExpanded] = useState(() => new Set());
  const [infoSheet, setInfoSheet] = useState(null);
  const autosaveTimeoutRef = useRef(null);

  const group = RISK_PROFILE_OPTION_GROUPS[step];
  const isLastStep = step === RISK_PROFILE_OPTION_GROUPS.length - 1;
  const isExpanded = expanded.has(step);
  const limit = group.collapseAfter && !isExpanded ? group.collapseAfter : group.options.length;
  const visibleOptions = group.options.slice(0, limit);
  const groupAnsweredCount = group.options.filter((_, index) => answers.has(`${step}-${index}`)).length;

  const answeredCount = answers.size;
  const percent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const setAnswer = (groupIndex, optionIndex, value) => {
    setAnswers((previous) => {
      const next = new Map(previous);
      next.set(`${groupIndex}-${optionIndex}`, value);
      return next;
    });
  };

  // Shared by both the final save and every autosave point below, so
  // "what gets persisted" only has one definition.
  const collectSaveable = () => {
    const flags = [];
    const reviewedKeys = [];
    let pregnantIsYes = false;
    RISK_PROFILE_OPTION_GROUPS.forEach((currentGroup, groupIndex) => {
      currentGroup.options.forEach((option, optionIndex) => {
        const answer = answers.get(`${groupIndex}-${optionIndex}`);
        if (answer === 'yes') {
          flags.push(option.value);
          if (option.dueDate) pregnantIsYes = true;
        }
        if (answer === 'yes' || answer === 'no') {
          reviewedKeys.push(option.value);
        }
      });
    });

    return { flags, reviewedKeys, pregnancyDueDate: pregnantIsYes ? (dueDate || null) : null };
  };

  const flushAutosave = () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    if (typeof onAutosave !== 'function') {
      return;
    }
    const { flags, reviewedKeys, pregnancyDueDate } = collectSaveable();
    if (reviewedKeys.length === 0) {
      return;
    }
    onAutosave(flags, { pregnancyDueDate, reviewedKeys });
  };

  // Debounced background save: a burst of clicks settles into one request
  // ~600ms after the last one, instead of firing on every single click, or
  // making the user wait until "Speichern"/"Später" to persist anything.
  // Back/Continue/Später still flush this immediately (see below) so
  // navigating away never has to wait out the debounce window. Skipped on
  // the very first render so just opening (or reopening) the wizard never
  // fires a pointless save before anything has actually changed.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return undefined;
    }

    if (typeof onAutosave !== 'function') {
      return undefined;
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      autosaveTimeoutRef.current = null;
      const { flags, reviewedKeys, pregnancyDueDate } = collectSaveable();
      if (reviewedKeys.length === 0) {
        return;
      }
      onAutosave(flags, { pregnancyDueDate, reviewedKeys });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, dueDate]);

  // Each step is its own long scrollable list -- without this, advancing
  // (or going back) keeps whatever scroll position the previous step was
  // left at, which can drop the next step's question list in mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const handleBack = () => {
    if (step === 0) return;
    flushAutosave();
    setStep(step - 1);
  };

  // Continue always advances, even with unanswered questions left in this
  // step — the ring stays honest about what's actually been answered
  // instead of silently treating "left the step" as "done".
  const handleContinue = (event) => {
    event.preventDefault();
    if (!isLastStep) {
      flushAutosave();
      setStep(step + 1);
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const { flags, reviewedKeys, pregnancyDueDate } = collectSaveable();
    onSave(flags, { pregnancyDueDate, reviewedKeys });
  };

  const handleSkip = () => {
    flushAutosave();
    onSkip();
  };

  return (
    <AppShell title={null}>
      <div className="vitalis-enrollment-stack">
        <Card padding={20} className="vitalis-enrollment-form-card" aria-label={t('riskProfile.formAriaLabel')}>
          <div className="riskwiz-sticky-header">
            <div className="riskwiz-top">
              <button
                type="button"
                className="riskwiz-back"
                onClick={handleBack}
                disabled={step === 0}
                aria-label={t('common.back')}
              >
                <Icon name="chevron-left" size={18} />
              </button>
              <span className="riskwiz-step-label">
                {t('riskProfile.stepLabel', { current: step + 1, total: RISK_PROFILE_OPTION_GROUPS.length })}
              </span>
              <button type="button" className="riskwiz-skip" onClick={handleSkip} disabled={pending}>
                {t('common.skip')}
              </button>
            </div>

            <div className="riskwiz-hero">
              <ProgressRing
                value={percent}
                size={56}
                stroke={6}
                color="var(--color-secondary)"
                label={<span style={{ fontSize: 13, fontWeight: 800 }}>{percent}%</span>}
              />
              <div className="riskwiz-hero-copy">
                <p className="t1">{t('riskProfile.heading')}</p>
                <p className="t2">
                  {t('riskProfile.question')} · {t('riskProfile.questionsAnsweredSummary', { answered: answeredCount, total: TOTAL_QUESTIONS })}
                </p>
              </div>
            </div>
          </div>

          {errorMessage ? <p className="vitalis-form-error-banner" role="alert">{errorMessage}</p> : null}

          <form onSubmit={handleContinue} noValidate>
            <h2 className="riskwiz-group-title">{t(group.titleKey)}</h2>
            <p className="riskwiz-group-sub">
              {t('riskProfile.groupAnsweredSummary', { answered: groupAnsweredCount, total: group.options.length })}
            </p>

            <div role="group" aria-label={t(group.titleKey)}>
              {visibleOptions.map((option, optionIndex) => {
                const key = `${step}-${optionIndex}`;
                const answer = answers.get(key);
                const isYes = answer === 'yes';
                return (
                  <div className="opt-card" key={option.value}>
                    <div className={`opt-icon${isYes ? ' is-on' : ''}`}>
                      <Icon name={option.icon} size={18} />
                      {!answer ? <span className="opt-icon-flag" title={t('riskProfile.notYetAnswered')} /> : null}
                    </div>
                    <div className="opt-body">
                      <div className="opt-text-row">
                        <div className="opt-text">{t(option.labelKey)}</div>
                        {option.info ? (
                          <button
                            type="button"
                            className="opt-info-btn"
                            aria-label={t('riskProfile.moreInfo')}
                            onClick={() => setInfoSheet(RISK_INFO_CONTENT[option.info])}
                          >
                            <Icon name="info" size={12} />
                          </button>
                        ) : null}
                      </div>
                      <div className="yn-seg">
                        <button
                          type="button"
                          className={answer === 'no' ? 'is-active-no' : ''}
                          disabled={pending}
                          onClick={() => setAnswer(step, optionIndex, 'no')}
                        >
                          {t('riskProfile.no')}
                        </button>
                        <button
                          type="button"
                          className={answer === 'yes' ? 'is-active-yes' : ''}
                          disabled={pending}
                          onClick={() => setAnswer(step, optionIndex, 'yes')}
                        >
                          {t('riskProfile.yes')}
                        </button>
                      </div>
                      {option.dueDate && isYes ? (
                        <div className="opt-subfield">
                          <label htmlFor={`riskwiz-due-date-${key}`}>{t('riskProfile.dueDateLabel')}</label>
                          <div className="opt-subfield-input">
                            <Icon name="calendar" size={14} color="var(--text-muted)" />
                            <input
                              id={`riskwiz-due-date-${key}`}
                              type="date"
                              value={dueDate}
                              onChange={(event) => setDueDate(event.target.value)}
                              disabled={pending}
                            />
                          </div>
                          <p className="opt-subfield-note">{t('riskProfile.dueDateNote')}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {group.collapseAfter && !isExpanded ? (
              <button
                type="button"
                className="riskwiz-showmore"
                onClick={() => setExpanded((previous) => new Set(previous).add(step))}
              >
                <Icon name="chevron-right" size={13} />
                {t('riskProfile.showMore', { count: group.options.length - group.collapseAfter })}
              </button>
            ) : null}

            <div className="vitalis-enrollment-dots" aria-hidden="true">
              {RISK_PROFILE_OPTION_GROUPS.map((_, index) => (
                <span key={index} className={index === step ? 'is-active' : ''} />
              ))}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending} className="riskwiz-submit">
              {pending ? t('riskProfile.saving') : (isLastStep ? t('common.save') : t('common.continue'))}
            </Button>
          </form>
        </Card>
      </div>

      <Sheet
        open={Boolean(infoSheet)}
        onClose={() => setInfoSheet(null)}
        title={infoSheet ? t(infoSheet.titleKey) : ''}
        closeLabel={t('common.close')}
      >
        {infoSheet ? (
          <>
            <p className="riskwiz-sheet-body">{t(infoSheet.bodyKey)}</p>
            <p className="riskwiz-sheet-source">{t(infoSheet.sourceKey)}</p>
          </>
        ) : null}
      </Sheet>
    </AppShell>
  );
}
