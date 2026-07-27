import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Button, Icon, ProgressRing, Sheet } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import './live-enrollment.css';

export const RISK_PROFILE_OPTION_GROUPS = Object.freeze([
  {
    titleKey: 'riskProfile.groupGeneral',
    options: [
      { value: 'smoker_current_or_former', labelKey: 'riskProfile.smoker', icon: 'cigarette' },
      { value: 'sti_risk_behavior', labelKey: 'riskProfile.sti', icon: 'heart-pulse' },
      { value: 'hiv', labelKey: 'riskProfile.hiv', icon: 'droplet' },
      { value: 'born_or_family_in_high_prevalence_region', labelKey: 'riskProfile.hepatitisB', icon: 'map-pin', info: 'hepatitisRegions' },
    ],
  },
  {
    titleKey: 'riskProfile.groupChronicConditions',
    collapseAfter: 6,
    options: [
      { value: 'cardiovascular_chronic', labelKey: 'riskProfile.cardiovascularChronic', icon: 'heart-pulse' },
      { value: 'pulmonary_chronic', labelKey: 'riskProfile.pulmonaryChronic', icon: 'activity' },
      { value: 'chronic_liver_disease', labelKey: 'riskProfile.chronicLiverDisease', icon: 'stethoscope' },
      { value: 'chronic_kidney_disease', labelKey: 'riskProfile.chronicKidneyDisease', icon: 'droplet' },
      { value: 'diabetes_with_organ_impact', labelKey: 'riskProfile.diabetesWithOrganImpact', icon: 'activity' },
      { value: 'obesity_bmi35plus', labelKey: 'riskProfile.obesityBmi35Plus', icon: 'scale' },
      { value: 'asplenia', labelKey: 'riskProfile.asplenia', icon: 'shield-check' },
      { value: 'hematologic_malignancy', labelKey: 'riskProfile.hematologicMalignancy', icon: 'activity' },
      { value: 'active_chemotherapy', labelKey: 'riskProfile.activeChemotherapy', icon: 'stethoscope' },
      { value: 'transplant_candidate_or_recipient', labelKey: 'riskProfile.transplantCandidateOrRecipient', icon: 'stethoscope' },
      { value: 'immunosuppressive_medication', labelKey: 'riskProfile.immunosuppressiveMedication', icon: 'shield-check' },
      { value: 'congenital_immunodeficiency', labelKey: 'riskProfile.congenitalImmunodeficiency', icon: 'shield-check' },
      { value: 'cochlear_implant_or_csf_leak', labelKey: 'riskProfile.cochlearImplantOrCsfLeak', icon: 'info' },
      { value: 'trisomy_21', labelKey: 'riskProfile.trisomy21', icon: 'info' },
    ],
  },
  {
    titleKey: 'riskProfile.groupPregnancyPerinatal',
    options: [
      { value: 'pregnant', labelKey: 'riskProfile.pregnant', icon: 'baby', dueDate: true },
      { value: 'postpartum_unvaccinated', labelKey: 'riskProfile.postpartumUnvaccinated', icon: 'baby' },
      { value: 'preterm_or_low_birthweight', labelKey: 'riskProfile.pretermOrLowBirthweight', icon: 'baby' },
    ],
  },
  {
    titleKey: 'riskProfile.groupOccupationalExposure',
    collapseAfter: 5,
    options: [
      { value: 'healthcare_worker', labelKey: 'riskProfile.healthcareWorker', icon: 'syringe' },
      { value: 'lab_personnel_pathogen_exposure', labelKey: 'riskProfile.labPersonnelPathogenExposure', icon: 'flask-conical' },
      { value: 'close_contact_infant_under_6mo', labelKey: 'riskProfile.closeContactInfantUnder6mo', icon: 'baby' },
      { value: 'injection_drug_use', labelKey: 'riskProfile.injectionDrugUse', icon: 'droplet' },
      { value: 'msm', labelKey: 'riskProfile.msm', icon: 'heart-pulse' },
      { value: 'incarcerated_or_correctional_staff', labelKey: 'riskProfile.incarceratedOrCorrectionalStaff', icon: 'lock' },
      { value: 'chronic_kidney_dialysis', labelKey: 'riskProfile.chronicKidneyDialysis', icon: 'droplet' },
      { value: 'high_endemicity_hepb_origin_or_travel', labelKey: 'riskProfile.highEndemicityHepbOriginOrTravel', icon: 'map-pin', info: 'hepatitisRegions' },
      { value: 'tbe_risk_area_exposure', labelKey: 'riskProfile.tbeRiskAreaExposure', icon: 'map-pin', info: 'tbe' },
      { value: 'animal_or_bat_occupational_contact', labelKey: 'riskProfile.animalOrBatOccupationalContact', icon: 'briefcase' },
      { value: 'high_tb_incidence_country_exposure', labelKey: 'riskProfile.highTbIncidenceCountryExposure', icon: 'map-pin', info: 'tb' },
    ],
  },
]);

// Flat list of every flag across all groups, for callers that just need the full set
// (e.g. tests, or ProfileOverviewScreen's tag labels) without caring about grouping.
export const RISK_PROFILE_OPTION_KEYS = Object.freeze(
  RISK_PROFILE_OPTION_GROUPS.flatMap((group) => group.options),
);

const TOTAL_QUESTIONS = RISK_PROFILE_OPTION_GROUPS.reduce((sum, group) => sum + group.options.length, 0);

const RISK_INFO_CONTENT = Object.freeze({
  hepatitisRegions: {
    titleKey: 'riskProfile.infoHepatitisRegionsTitle',
    bodyKey: 'riskProfile.infoHepatitisRegionsBody',
    sourceKey: 'riskProfile.infoHepatitisRegionsSource',
  },
  tbe: {
    titleKey: 'riskProfile.infoTbeTitle',
    bodyKey: 'riskProfile.infoTbeBody',
    sourceKey: 'riskProfile.infoTbeSource',
  },
  tb: {
    titleKey: 'riskProfile.infoTbTitle',
    bodyKey: 'riskProfile.infoTbBody',
    sourceKey: 'riskProfile.infoTbSource',
  },
});

// A previously-reviewed profile (riskFlags non-empty) seeds every question as
// explicitly answered (yes for flagged values, no for the rest) so re-opening
// this step doesn't relitigate everything from scratch. A never-reviewed
// profile starts fully blank — nothing defaults to "no", per the explicit-
// answers design: the ring only moves when you actually decide.
function buildInitialAnswers(initialRiskFlags) {
  const answers = new Map();
  if (!Array.isArray(initialRiskFlags) || initialRiskFlags.length === 0) {
    return answers;
  }
  const flagSet = new Set(initialRiskFlags);
  RISK_PROFILE_OPTION_GROUPS.forEach((group, groupIndex) => {
    group.options.forEach((option, optionIndex) => {
      answers.set(`${groupIndex}-${optionIndex}`, flagSet.has(option.value) ? 'yes' : 'no');
    });
  });
  return answers;
}

export default function RiskProfileStep({
  initialRiskFlags = [],
  initialPregnancyDueDate = '',
  onSave,
  onSkip,
  pending = false,
  errorMessage = '',
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => buildInitialAnswers(initialRiskFlags));
  const [dueDate, setDueDate] = useState(initialPregnancyDueDate || '');
  const [expanded, setExpanded] = useState(() => new Set());
  const [infoSheet, setInfoSheet] = useState(null);

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

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // Continue always advances, even with unanswered questions left in this
  // step — the ring stays honest about what's actually been answered
  // instead of silently treating "left the step" as "done".
  const handleContinue = (event) => {
    event.preventDefault();
    if (!isLastStep) {
      setStep(step + 1);
      return;
    }

    const flags = [];
    let pregnantIsYes = false;
    RISK_PROFILE_OPTION_GROUPS.forEach((currentGroup, groupIndex) => {
      currentGroup.options.forEach((option, optionIndex) => {
        if (answers.get(`${groupIndex}-${optionIndex}`) === 'yes') {
          flags.push(option.value);
          if (option.dueDate) pregnantIsYes = true;
        }
      });
    });

    onSave(flags, { pregnancyDueDate: pregnantIsYes ? (dueDate || null) : null });
  };

  return (
    <AppShell title={null}>
      <div className="vitalis-enrollment-stack">
        <Card padding={20} className="vitalis-enrollment-form-card" aria-label={t('riskProfile.formAriaLabel')}>
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
            <button type="button" className="riskwiz-skip" onClick={onSkip} disabled={pending}>
              {t('common.skip')}
            </button>
          </div>

          {errorMessage ? <p className="vitalis-form-error-banner" role="alert">{errorMessage}</p> : null}

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
              <p className="t2">{t('riskProfile.questionsAnsweredSummary', { answered: answeredCount, total: TOTAL_QUESTIONS })}</p>
            </div>
          </div>

          <form onSubmit={handleContinue} noValidate>
            <h2 className="riskwiz-group-title">{t(group.titleKey)}</h2>
            <p className="riskwiz-group-sub">
              {t('riskProfile.question')} · {t('riskProfile.groupAnsweredSummary', { answered: groupAnsweredCount, total: group.options.length })}
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

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
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
