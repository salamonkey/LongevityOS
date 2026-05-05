import React, { useMemo, useRef, useState } from 'react';
import {
  AppShell,
  FamilyProfileCard,
  HealthScoreCard,
  NextRecommendedStepCard,
  PrioritySection,
} from './components';
import { buildDashboardProjection, hasPopulatedDashboard } from './dashboard';
import { generateInitialPlanSnapshotAsync } from './plan';
import { normalizeSelfProfileInput, validateSelfProfileInput } from './validation';

export default function SelfOnboardingToFirstDashboard({
  planGenerator = generateInitialPlanSnapshotAsync,
  initialProfile = null,
  initialPlanSnapshot = null,
  onOpenHealthPlan,
}) {
  const ageRef = useRef(null);
  const genderRef = useRef(null);

  const [form, setForm] = useState({ age: '', gender: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const [profile, setProfile] = useState(initialProfile);
  const [planSnapshot, setPlanSnapshot] = useState(initialPlanSnapshot);
  const [fatalIntegrityError, setFatalIntegrityError] = useState(false);

  const projection = useMemo(() => {
    if (!planSnapshot || !profile) {
      return null;
    }

    return buildDashboardProjection(planSnapshot, profile);
  }, [planSnapshot, profile]);

  const isDashboardReady = Boolean(projection && hasPopulatedDashboard(projection));

  const handleFieldChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      return {
        ...previous,
        [field]: undefined,
      };
    });
  };

  const focusFirstInvalidField = (fieldErrors) => {
    if (fieldErrors.age) {
      ageRef.current?.focus();
      return;
    }

    if (fieldErrors.gender) {
      genderRef.current?.focus();
    }
  };

  const canSubmit = form.age.toString().trim().length > 0 && (form.gender === 'female' || form.gender === 'male') && !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmissionError('');

    const validation = validateSelfProfileInput(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      focusFirstInvalidField(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const normalized = normalizeSelfProfileInput(form);
    const profileData = {
      profileId: 'self',
      name: 'You',
      age: normalized.age,
      gender: normalized.gender,
      createdAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
    };

    try {
      const generatedPlan = await planGenerator(profileData);
      const generatedProjection = buildDashboardProjection(generatedPlan, profileData);

      if (!hasPopulatedDashboard(generatedProjection)) {
        setFatalIntegrityError(true);
        return;
      }

      setProfile(profileData);
      setPlanSnapshot(generatedPlan);
    } catch {
      setSubmissionError("We couldn't create your plan right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetToOnboarding = () => {
    setFatalIntegrityError(false);
    setPlanSnapshot(null);
    setProfile(null);
  };

  const openHealthPlan = () => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile) return;
    onOpenHealthPlan({ planSnapshot, profile });
  };

  const openHealthPlanFromDashboardItem = (item) => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile || !item?.catalogItemId) return;
    onOpenHealthPlan({
      planSnapshot,
      profile,
      initialItemKey: item.catalogItemId,
      initialOrigin: 'dashboard',
      initialCategory: item.category,
    });
  };

  if (fatalIntegrityError) {
    return (
      <AppShell title="Let's set up your first plan">
        <div className="sl001-blocking-error" role="alert">
          <h2>We couldn't load your dashboard.</h2>
          <p>Please return to onboarding and try again.</p>
          <button type="button" className="sl001-primary-action" onClick={resetToOnboarding}>
            Return to onboarding
          </button>
        </div>
      </AppShell>
    );
  }

  if (isDashboardReady && projection) {
    const dueTodayCount = projection.sections.find((section) => section.priority === 'today')?.items.length ?? 0;
    const dashboardHeaderAction = typeof onOpenHealthPlan === 'function' ? (
      <button type="button" className="sl001-primary-action sl001-dashboard-plan-cta" onClick={openHealthPlan}>
        Browse full plan
      </button>
    ) : null;

    return (
      <AppShell title="Your preventive dashboard" headerAction={dashboardHeaderAction}>
        <div className="sl001-dashboard-summary-cards">
          <FamilyProfileCard
            name={projection.profileName}
            age={projection.profileAge}
            gender={projection.profileGender}
            dueCount={dueTodayCount}
          />
          <HealthScoreCard score={projection.healthScore} />
          <NextRecommendedStepCard highlightedItem={projection.highlightedItem} />
        </div>
        <div className="sl001-dashboard-sections">
          {projection.sections.map((section) => (
            <PrioritySection
              key={section.priority}
              priority={section.priority}
              title={section.title}
              items={section.items}
              onOpenDetail={typeof onOpenHealthPlan === 'function' ? openHealthPlanFromDashboardItem : undefined}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Build your first preventive plan">
      <p className="sl001-support-copy">
        Share your age and gender so we can create a personalized plan with clear next steps.
      </p>
      <form className="sl001-form" onSubmit={handleSubmit} noValidate>
        {submissionError ? (
          <p className="sl001-error-banner" role="alert">{submissionError}</p>
        ) : null}

        <label htmlFor="sl001-age">Age</label>
        <input
          ref={ageRef}
          id="sl001-age"
          name="age"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={form.age}
          onChange={(event) => handleFieldChange('age', event.target.value)}
          readOnly={isSubmitting}
          aria-invalid={Boolean(errors.age)}
          aria-describedby="sl001-age-help sl001-age-error"
        />
        <p className="sl001-helper" id="sl001-age-help">We use your age to generate your first plan.</p>
        {errors.age ? (
          <p className="sl001-field-error" id="sl001-age-error" role="alert">{errors.age}</p>
        ) : null}

        <fieldset ref={genderRef} aria-describedby="sl001-gender-error" className="sl001-gender-field" disabled={isSubmitting}>
          <legend>Gender</legend>
          <label>
            <input
              type="radio"
              name="gender"
              value="female"
              checked={form.gender === 'female'}
              onChange={(event) => handleFieldChange('gender', event.target.value)}
            />
            Female
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="male"
              checked={form.gender === 'male'}
              onChange={(event) => handleFieldChange('gender', event.target.value)}
            />
            Male
          </label>
        </fieldset>
        {errors.gender ? (
          <p className="sl001-field-error" id="sl001-gender-error" role="alert">{errors.gender}</p>
        ) : null}

        <button
          type="submit"
          className="sl001-primary-action"
          disabled={!canSubmit}
        >
          {isSubmitting ? 'Generating your plan...' : 'Generate my plan'}
        </button>
      </form>
    </AppShell>
  );
}
