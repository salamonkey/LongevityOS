import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Button, Icon, ProgressRing } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { getCategoryIcon } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { buildStatusQuoGroups, resolveDateLabelKey, resolveGroupQuestionKey } from './statusQuo.js';
import './live-enrollment.css';

export { buildStatusQuoGroups } from './statusQuo.js';

const AUTOSAVE_DEBOUNCE_MS = 600;

export default function StatusQuoStep({
  planSnapshot,
  onSave,
  onAutosave,
  onSkip,
  pending = false,
  errorMessage = '',
}) {
  const { t } = useTranslation();
  // Frozen at mount: autosaving marks items done as you go, which removes
  // them from the due/overdue set buildStatusQuoGroups filters on. Re-deriving
  // groups from the live planSnapshot mid-review would shrink the question
  // list under the user's feet and desync the step/answer indices below.
  const [groups] = useState(() => buildStatusQuoGroups(planSnapshot));
  const totalQuestions = useMemo(() => groups.reduce((sum, g) => sum + g.options.length, 0), [groups]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => new Map());
  const [dates, setDates] = useState({});
  const autosaveTimeoutRef = useRef(null);

  // Each step is its own scrollable list -- without this, opening the wizard
  // (or advancing/going back) keeps whatever scroll position was left over
  // from the page it was opened from, instead of starting at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  if (groups.length === 0) {
    return null;
  }

  const group = groups[Math.min(step, groups.length - 1)];
  const isLastStep = step === groups.length - 1;
  const answeredCount = answers.size;
  const percent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const groupAnsweredCount = group.options.filter((_, index) => answers.has(`${step}-${index}`)).length;

  const setAnswer = (groupIndex, optionIndex, value) => {
    setAnswers((previous) => {
      const next = new Map(previous);
      next.set(`${groupIndex}-${optionIndex}`, value);
      return next;
    });
  };

  // Shared by both the final save and every autosave point below, so "what
  // gets persisted" only has one definition.
  const collectSaveable = () => {
    const completions = [];
    groups.forEach((currentGroup, groupIndex) => {
      currentGroup.options.forEach((option, optionIndex) => {
        const key = `${groupIndex}-${optionIndex}`;
        if (answers.get(key) === 'yes') {
          completions.push({ itemKey: option.itemKey, date: dates[key] || '' });
        }
      });
    });
    return completions;
  };

  const flushAutosave = () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    if (typeof onAutosave !== 'function') {
      return;
    }
    const completions = collectSaveable();
    if (completions.length === 0) {
      return;
    }
    onAutosave(completions);
  };

  // Debounced background save: a burst of clicks settles into one request
  // ~600ms after the last one. Back/Continue/Später still flush this
  // immediately (see below) so navigating away never has to wait out the
  // debounce window. Skipped on the very first render so just opening the
  // wizard never fires a pointless save before anything has changed.
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
      const completions = collectSaveable();
      if (completions.length === 0) {
        return;
      }
      onAutosave(completions);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, dates]);

  const handleBack = () => {
    if (step === 0) return;
    flushAutosave();
    setStep(step - 1);
  };

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
    const completions = collectSaveable();
    onSave(completions);
  };

  const handleSkip = () => {
    flushAutosave();
    onSkip();
  };

  return (
    <AppShell title={null}>
      <div className="vitalis-enrollment-stack">
        <Card padding={20} className="vitalis-enrollment-form-card" aria-label={t('statusQuo.formAriaLabel')}>
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
                {t('riskProfile.stepLabel', { current: step + 1, total: groups.length })}
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
                <p className="t1">{t('statusQuo.heading')}</p>
                <p className="t2">{t('riskProfile.questionsAnsweredSummary', { answered: answeredCount, total: totalQuestions })}</p>
              </div>
            </div>
          </div>

          {errorMessage ? <p className="vitalis-form-error-banner" role="alert">{errorMessage}</p> : null}

          <form onSubmit={handleContinue} noValidate>
            <h2 className="riskwiz-group-title">{t(group.titleKey)}</h2>
            <p className="riskwiz-group-sub">
              {t(resolveGroupQuestionKey(group))} · {t('riskProfile.groupAnsweredSummary', { answered: groupAnsweredCount, total: group.options.length })}
            </p>

            <div role="group" aria-label={t(group.titleKey)}>
              {group.options.map((option, optionIndex) => {
                const key = `${step}-${optionIndex}`;
                const answer = answers.get(key);
                const isYes = answer === 'yes';
                return (
                  <div className="opt-card" key={option.itemKey}>
                    <div className={`opt-icon${isYes ? ' is-on' : ''}`}>
                      <Icon name={getCategoryIcon(option.category)} size={18} />
                      {!answer ? <span className="opt-icon-flag" title={t('riskProfile.notYetAnswered')} /> : null}
                    </div>
                    <div className="opt-body">
                      <div className="opt-text-row">
                        <div className="statusquo-opt-copy">
                          <div className="opt-text">{option.name}</div>
                          {option.cadenceLabel ? <div className="statusquo-opt-cadence">{option.cadenceLabel}</div> : null}
                        </div>
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
                      {isYes ? (
                        <div className="opt-subfield">
                          <label htmlFor={`statusquo-date-${key}`}>{t(resolveDateLabelKey(option))}</label>
                          <div className="opt-subfield-input">
                            <Icon name="calendar" size={14} color="var(--text-muted)" />
                            <input
                              id={`statusquo-date-${key}`}
                              type="date"
                              value={dates[key] || ''}
                              max={new Date().toISOString().slice(0, 10)}
                              onChange={(event) => setDates((previous) => ({ ...previous, [key]: event.target.value }))}
                              disabled={pending}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="vitalis-enrollment-dots" aria-hidden="true">
              {groups.map((_, index) => (
                <span key={index} className={index === step ? 'is-active' : ''} />
              ))}
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
              {pending ? t('statusQuo.saving') : (isLastStep ? t('common.save') : t('common.continue'))}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
