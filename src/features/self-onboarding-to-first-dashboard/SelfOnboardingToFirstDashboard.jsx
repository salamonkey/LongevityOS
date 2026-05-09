import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppShell,
  FamilyProfileCard,
  PrioritySection,
} from './components';
import { buildDashboardProjection } from './dashboard';
import { generateInitialPlanSnapshotAsync } from './plan';
import { normalizeSelfProfileInput, validateSelfProfileInput } from './validation';

export default function SelfOnboardingToFirstDashboard({
  planGenerator = generateInitialPlanSnapshotAsync,
  initialProfile = null,
  initialPlanSnapshot = null,
  onOpenHealthPlan,
  onOnboardingCompleted,
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
  const hadProjectionRef = useRef(Boolean(initialProfile && initialPlanSnapshot));

  useEffect(() => {
    setProfile(initialProfile);
    setPlanSnapshot(initialPlanSnapshot);
    if (initialProfile && initialPlanSnapshot) {
      setFatalIntegrityError(false);
    }
  }, [initialPlanSnapshot, initialProfile]);

  const projection = useMemo(() => {
    if (!planSnapshot || !profile) {
      return null;
    }

    return buildDashboardProjection(planSnapshot, profile);
  }, [planSnapshot, profile]);

  useEffect(() => {
    if (!projection) {
      hadProjectionRef.current = false;
      return;
    }

    if (hadProjectionRef.current) {
      return;
    }

    const scrollToTop = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };

    // iOS Safari can preserve previous scroll offset during same-view surface swaps.
    scrollToTop();
    requestAnimationFrame(scrollToTop);
    setTimeout(scrollToTop, 0);
    hadProjectionRef.current = true;
  }, [projection]);

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
      name: 'Me',
      age: normalized.age,
      gender: normalized.gender,
      createdAt: new Date().toISOString(),
      onboardingCompletedAt: new Date().toISOString(),
    };

    try {
      const generatedPlan = await planGenerator(profileData);

      setProfile(profileData);
      setPlanSnapshot(generatedPlan);
      if (typeof onOnboardingCompleted === 'function') {
        onOnboardingCompleted({
          profile: profileData,
          planSnapshot: generatedPlan,
        });
      }
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

  if (projection) {
    const dueTodayCount = projection.sections.find((section) => section.priority === 'today')?.items.length ?? 0;

    return (
      <AppShell title={null} shellClassName="sl001-dashboard-tight-top">
        <div className="sl001-dashboard-summary-cards">
          <FamilyProfileCard
            name={projection.profileName}
            age={projection.profileAge}
            gender={projection.profileGender}
            dueCount={dueTodayCount}
            showDueCount={false}
            healthScore={projection.healthScore}
            highlightedItem={projection.highlightedItem}
            onOpenNextStep={typeof onOpenHealthPlan === 'function' ? openHealthPlanFromDashboardItem : undefined}
            nextStepVariant="health-cta"
            cardLabel="Health readiness"
            showHealthTileLabel={false}
          />
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
    <AppShell title={null}>
      <div className="sl001-onboarding-stack">
        <section className="sl001-summary-card sl001-onboarding-intro" aria-label="Onboarding overview">
          <h1 className="sl001-summary-title">Build your preventive plan</h1>
          <p className="sl001-summary-meta">
            Share your age and gender so we can create a personalized plan with clear next steps.
          </p>
        </section>

        <section className="sl001-summary-card sl001-onboarding-form-card" aria-label="Profile input">
          <form className="sl001-form sl001-onboarding-form" onSubmit={handleSubmit} noValidate>
            {submissionError && (
              <p className="sl001-error-banner" role="alert">{submissionError}</p>
            )}

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
              aria-describedby="sl001-age-error"
            />
            {errors.age && (
              <p className="sl001-field-error" id="sl001-age-error" role="alert">{errors.age}</p>
            )}

            <div
              ref={genderRef}
              role="radiogroup"
              aria-labelledby="sl001-gender-label"
              aria-describedby="sl001-gender-error"
              aria-disabled={isSubmitting ? 'true' : undefined}
              className="sl001-gender-field"
              tabIndex={-1}
            >
              <p id="sl001-gender-label" className="sl001-form-field-title">Gender</p>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={form.gender === 'male'}
                  onChange={(event) => handleFieldChange('gender', event.target.value)}
                  disabled={isSubmitting}
                />
                Male
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={form.gender === 'female'}
                  onChange={(event) => handleFieldChange('gender', event.target.value)}
                  disabled={isSubmitting}
                />
                Female
              </label>
            </div>
            {errors.gender && (
              <p className="sl001-field-error" id="sl001-gender-error" role="alert">{errors.gender}</p>
            )}

            <div className="sl001-onboarding-actions">
              <button
                type="submit"
                className="sl001-primary-action sl001-onboarding-submit-action"
                disabled={!canSubmit}
              >
                {isSubmitting ? 'Generating your plan...' : 'Generate my plan'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
