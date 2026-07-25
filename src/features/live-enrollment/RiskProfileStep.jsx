import React, { useState } from 'react';
import { AppShell } from '../self-onboarding-to-first-dashboard/components.jsx';
import { Card, Button, Logo, ListRow } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import './live-enrollment.css';

export const RISK_PROFILE_OPTION_GROUPS = Object.freeze([
  {
    titleKey: 'riskProfile.groupGeneral',
    options: [
      { value: 'smoker_current_or_former', labelKey: 'riskProfile.smoker', icon: 'cigarette' },
      { value: 'sti_risk_behavior', labelKey: 'riskProfile.sti', icon: 'heart-pulse' },
      { value: 'hiv', labelKey: 'riskProfile.hiv', icon: 'droplet' },
      { value: 'born_or_family_in_high_prevalence_region', labelKey: 'riskProfile.hepatitisB', icon: 'map-pin' },
    ],
  },
  {
    titleKey: 'riskProfile.groupChronicConditions',
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
      { value: 'pregnant', labelKey: 'riskProfile.pregnant', icon: 'baby' },
      { value: 'postpartum_unvaccinated', labelKey: 'riskProfile.postpartumUnvaccinated', icon: 'baby' },
      { value: 'preterm_or_low_birthweight', labelKey: 'riskProfile.pretermOrLowBirthweight', icon: 'baby' },
    ],
  },
  {
    titleKey: 'riskProfile.groupOccupationalExposure',
    options: [
      { value: 'healthcare_worker', labelKey: 'riskProfile.healthcareWorker', icon: 'syringe' },
      { value: 'lab_personnel_pathogen_exposure', labelKey: 'riskProfile.labPersonnelPathogenExposure', icon: 'flask-conical' },
      { value: 'close_contact_infant_under_6mo', labelKey: 'riskProfile.closeContactInfantUnder6mo', icon: 'baby' },
      { value: 'injection_drug_use', labelKey: 'riskProfile.injectionDrugUse', icon: 'droplet' },
      { value: 'msm', labelKey: 'riskProfile.msm', icon: 'heart-pulse' },
      { value: 'incarcerated_or_correctional_staff', labelKey: 'riskProfile.incarceratedOrCorrectionalStaff', icon: 'lock' },
      { value: 'chronic_kidney_dialysis', labelKey: 'riskProfile.chronicKidneyDialysis', icon: 'droplet' },
      { value: 'high_endemicity_hepb_origin_or_travel', labelKey: 'riskProfile.highEndemicityHepbOriginOrTravel', icon: 'map-pin' },
      { value: 'tbe_risk_area_exposure', labelKey: 'riskProfile.tbeRiskAreaExposure', icon: 'map-pin' },
      { value: 'animal_or_bat_occupational_contact', labelKey: 'riskProfile.animalOrBatOccupationalContact', icon: 'briefcase' },
      { value: 'high_tb_incidence_country_exposure', labelKey: 'riskProfile.highTbIncidenceCountryExposure', icon: 'map-pin' },
    ],
  },
]);

// Flat list of every flag across all groups, for callers that just need the full set
// (e.g. tests) without caring about grouping.
export const RISK_PROFILE_OPTION_KEYS = Object.freeze(
  RISK_PROFILE_OPTION_GROUPS.flatMap((group) => group.options),
);

export default function RiskProfileStep({
  initialRiskFlags = [],
  onSave,
  onSkip,
  pending = false,
  errorMessage = '',
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(() => new Set(initialRiskFlags));

  const toggleFlag = (value) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(Array.from(selected));
  };

  return (
    <AppShell title={null}>
      <div className="vitalis-enrollment-stack">
        <Card padding={20} className="vitalis-enrollment-intro" aria-label="Risk profile overview">
          <Logo size={30} word={false} />
          <h1>{t('riskProfile.heading')}</h1>
          <p className="vitalis-enrollment-description">{t('riskProfile.description')}</p>
        </Card>

        <Card padding={20} className="vitalis-enrollment-form-card" aria-label="Risk profile form">
          <form className="vitalis-enrollment-form" onSubmit={handleSubmit} noValidate>
            {errorMessage ? <p className="vitalis-form-error-banner" role="alert">{errorMessage}</p> : null}

            <p className="vds-input-label" style={{ margin: '0 0 10px' }}>{t('riskProfile.question')}</p>
            {RISK_PROFILE_OPTION_GROUPS.map((group) => (
              <div role="group" aria-label={t(group.titleKey)} key={group.titleKey} style={{ marginBottom: 16 }}>
                <p className="vds-input-label" style={{ margin: '0 0 8px', opacity: 0.7 }}>{t(group.titleKey)}</p>
                <div className="rows">
                  {group.options.map((option) => (
                    <ListRow
                      key={option.value}
                      icon={option.icon}
                      tone="primary"
                      title={t(option.labelKey)}
                      selected={selected.has(option.value)}
                      trailingChevron={false}
                      onClick={pending ? undefined : () => toggleFlag(option.value)}
                      aria-pressed={selected.has(option.value)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
              {pending ? t('riskProfile.saving') : t('common.save')}
            </Button>
            <Button type="button" variant="ghost" size="lg" fullWidth onClick={onSkip} disabled={pending}>
              {t('common.skip')}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
