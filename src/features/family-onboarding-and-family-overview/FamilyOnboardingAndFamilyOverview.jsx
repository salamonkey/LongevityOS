import React, { useMemo, useRef, useState } from 'react';
import {
  AppShell,
  FamilyProfileCard,
  HealthScoreCard,
  NextRecommendedStepCard,
  PrioritySection,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  ItemCompletionAndReminderActions,
} from '../item-completion-and-reminder-actions/index.js';
import {
  PLAN_CATEGORIES,
} from '../health-plan-browsing-and-item-detail/model.js';
import {
  buildDashboardProjectionForSlice,
} from '../item-completion-and-reminder-actions/selectors.js';
import {
  VaccinationTrackingAreaAndManualEntries,
} from '../vaccination-tracking-area-and-manual-entries/index.js';
import {
  FAMILY_ACCOUNT_ERRORS,
  FAMILY_PROFILE_LIMIT,
  canCreateAnotherProfile,
  formatProfileCountText,
  toProfileDescriptor,
} from './model.js';
import {
  buildProfileOverview,
} from './projection.js';
import {
  FAMILY_SURFACES,
  createFamilyAccountSession,
} from './service.js';

function CreateProfileForm({
  form,
  errors,
  pending,
  submitLabel,
  cancelLabel,
  createError,
  onFieldChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form className="sl005-profile-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="sl005-display-label">Name</label>
      <input
        id="sl005-display-label"
        name="displayLabel"
        type="text"
        value={form.displayLabel}
        onChange={(event) => onFieldChange('displayLabel', event.target.value)}
        disabled={pending}
        aria-invalid={Boolean(errors.displayLabel)}
      />
      {errors.displayLabel ? <p className="sl001-field-error" role="alert">{errors.displayLabel}</p> : null}

      <label htmlFor="sl005-age">Age</label>
      <input
        id="sl005-age"
        name="age"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={form.age}
        onChange={(event) => onFieldChange('age', event.target.value)}
        disabled={pending}
        aria-invalid={Boolean(errors.age)}
      />
      {errors.age ? <p className="sl001-field-error" role="alert">{errors.age}</p> : null}

      <fieldset className="sl005-gender-field" disabled={pending} aria-invalid={Boolean(errors.gender)}>
        <legend>Gender</legend>
        <label>
          <input
            type="radio"
            name="sl005-gender"
            value="female"
            checked={form.gender === 'female'}
            onChange={(event) => onFieldChange('gender', event.target.value)}
          />
          Female
        </label>
        <label>
          <input
            type="radio"
            name="sl005-gender"
            value="male"
            checked={form.gender === 'male'}
            onChange={(event) => onFieldChange('gender', event.target.value)}
          />
          Male
        </label>
      </fieldset>
      {errors.gender ? <p className="sl001-field-error" role="alert">{errors.gender}</p> : null}

      {createError ? <p className="sl001-error-banner" role="alert">{createError}</p> : null}

      <div className="sl005-form-actions">
        <button type="submit" className="sl001-primary-action" disabled={pending}>
          {pending ? 'Creating profile...' : submitLabel}
        </button>
        <button type="button" className="sl003-quiet-button" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}

function ProfileContext({ activeProfile }) {
  if (!activeProfile) {
    return null;
  }

  return (
    <p className="sl005-active-profile" aria-live="polite">
      Viewing profile: <strong>{activeProfile.displayLabel || activeProfile.name || 'Profile'}</strong>
    </p>
  );
}

export default function FamilyOnboardingAndFamilyOverview({
  sessionFactory = createFamilyAccountSession,
  planGenerator,
  clock = () => new Date(),
}) {
  const sessionRef = useRef(null);
  if (!sessionRef.current) {
    sessionRef.current = sessionFactory({
      now: clock,
      planGenerator,
    });
  }

  const [sessionState, setSessionState] = useState(() => sessionRef.current.getState());

  const [selfForm, setSelfForm] = useState({ age: '', gender: '' });
  const [selfErrors, setSelfErrors] = useState({});
  const [selfPending, setSelfPending] = useState(false);
  const [selfError, setSelfError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayLabel: '', age: '', gender: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profilePending, setProfilePending] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [planEntry, setPlanEntry] = useState({
    initialItemKey: undefined,
    initialOrigin: undefined,
    initialCategory: PLAN_CATEGORIES.checkup,
    initialReturnToVaccinationTracker: false,
  });

  const [routeError, setRouteError] = useState('');

  const session = sessionRef.current;

  const refreshSessionState = () => {
    setSessionState(session.getState());
  };

  const profiles = sessionState.profiles;
  const currentSurface = sessionState.currentSurface;
  const canAddAnotherProfile = canCreateAnotherProfile(profiles, FAMILY_PROFILE_LIMIT);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.profileId === sessionState.activeProfileId) ?? null,
    [profiles, sessionState.activeProfileId],
  );

  const activePlanSnapshot = activeProfile
    ? sessionState.plansByProfileId[activeProfile.profileId] ?? null
    : null;

  const activeManualEntries = activeProfile
    ? sessionState.manualEntriesByProfileId[activeProfile.profileId] ?? []
    : [];

  const familyOverview = useMemo(
    () => session.getFamilyOverview(),
    [session, sessionState.plansByProfileId, profiles],
  );

  const activeDashboardProjection = useMemo(() => {
    if (!activeProfile || !activePlanSnapshot) {
      return null;
    }

    return buildDashboardProjectionForSlice(activePlanSnapshot, {
      name: activeProfile.displayLabel || activeProfile.name,
    });
  }, [activePlanSnapshot, activeProfile]);

  const activeOverview = useMemo(() => {
    if (!activeProfile || !activePlanSnapshot) {
      return null;
    }

    return buildProfileOverview(activeProfile, activePlanSnapshot);
  }, [activePlanSnapshot, activeProfile]);

  const resetProfileForm = () => {
    setShowCreateForm(false);
    setProfilePending(false);
    setProfileError('');
    setProfileErrors({});
    setProfileForm({ displayLabel: '', age: '', gender: '' });
  };

  const handleSelfFieldChange = (field, value) => {
    setSelfForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSelfErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      return {
        ...previous,
        [field]: undefined,
      };
    });

    setSelfError('');
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setProfileErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      return {
        ...previous,
        [field]: undefined,
      };
    });

    setProfileError('');
  };

  const handleCreateSelfProfile = async (event) => {
    event.preventDefault();
    setSelfPending(true);
    setSelfError('');
    setSelfErrors({});

    try {
      const result = await session.createSelfProfile(selfForm);
      if (!result.isValid) {
        setSelfErrors(result.errors);
        return;
      }

      refreshSessionState();
      setSelfForm({ age: '', gender: '' });
    } catch (error) {
      setSelfError(error instanceof Error ? error.message : FAMILY_ACCOUNT_ERRORS.profileCreateFailed);
    } finally {
      setSelfPending(false);
    }
  };

  const handleCreateFamilyProfile = async (event) => {
    event.preventDefault();
    setProfilePending(true);
    setProfileError('');
    setProfileErrors({});

    try {
      const result = await session.addFamilyProfile(profileForm);
      if (!result.isValid) {
        setProfileErrors(result.errors);
        return;
      }

      refreshSessionState();
      resetProfileForm();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : FAMILY_ACCOUNT_ERRORS.profileCreateFailed);
    } finally {
      setProfilePending(false);
    }
  };

  const handleCompleteOnboarding = () => {
    session.completeOnboarding();
    refreshSessionState();
  };

  const safelyOpenSurface = (openSurface) => {
    setRouteError('');

    try {
      openSurface();
      refreshSessionState();
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : FAMILY_ACCOUNT_ERRORS.profileNotFound);
      session.openFamilyOverview();
      refreshSessionState();
    }
  };

  const handleOpenDashboardFromCard = (profileId) => {
    safelyOpenSurface(() => {
      session.openProfileDashboard(profileId);
      setPlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
    });
  };

  const handleOpenPlanFromCard = (profileId) => {
    safelyOpenSurface(() => {
      session.openProfilePlan(profileId);
      setPlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.checkup,
        initialReturnToVaccinationTracker: false,
      });
    });
  };

  const handleOpenVaccinationsFromCard = (profileId) => {
    safelyOpenSurface(() => {
      session.openProfileVaccinations(profileId);
      setPlanEntry({
        initialItemKey: undefined,
        initialOrigin: undefined,
        initialCategory: PLAN_CATEGORIES.vaccination,
        initialReturnToVaccinationTracker: false,
      });
    });
  };

  const handleBackToFamilyOverview = () => {
    session.openFamilyOverview();
    refreshSessionState();
  };

  const handlePlanSnapshotChange = (nextPlanSnapshot) => {
    if (!activeProfile || !nextPlanSnapshot) {
      return;
    }

    session.setPlanSnapshot(activeProfile.profileId, nextPlanSnapshot);
    refreshSessionState();
  };

  const handleManualEntriesChange = (nextEntries) => {
    if (!activeProfile) {
      return;
    }

    session.setManualEntries(activeProfile.profileId, nextEntries);
    refreshSessionState();
  };

  const handleSaveManualEntry = async (entry) => {
    if (!activeProfile) {
      throw new Error(FAMILY_ACCOUNT_ERRORS.profileNotFound);
    }

    const nextEntries = [...(session.getManualEntries(activeProfile.profileId) ?? []), entry];
    session.setManualEntries(activeProfile.profileId, nextEntries);
    refreshSessionState();
    return entry;
  };

  const handleOpenPlanDetailFromDashboard = (item) => {
    if (!activeProfile || !item?.catalogItemId) {
      return;
    }

    safelyOpenSurface(() => {
      session.openProfilePlan(activeProfile.profileId);
      setPlanEntry({
        initialItemKey: item.catalogItemId,
        initialOrigin: 'dashboard',
        initialCategory: item.category,
        initialReturnToVaccinationTracker: false,
      });
    });
  };

  if (currentSurface === FAMILY_SURFACES.onboardingSelf) {
    const canSubmitSelf = selfForm.age.toString().trim().length > 0
      && (selfForm.gender === 'female' || selfForm.gender === 'male')
      && !selfPending;

    return (
      <AppShell title="Build your first preventive plan">
        <p className="sl001-support-copy">
          Share your age and gender so we can create a personalized plan with clear next steps.
        </p>
        <form className="sl005-self-form" onSubmit={handleCreateSelfProfile} noValidate>
          {selfError ? <p className="sl001-error-banner" role="alert">{selfError}</p> : null}

          <label htmlFor="sl005-self-age">Age</label>
          <input
            id="sl005-self-age"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={selfForm.age}
            onChange={(event) => handleSelfFieldChange('age', event.target.value)}
            disabled={selfPending}
            aria-invalid={Boolean(selfErrors.age)}
          />
          {selfErrors.age ? <p className="sl001-field-error" role="alert">{selfErrors.age}</p> : null}

          <fieldset className="sl005-gender-field" disabled={selfPending}>
            <legend>Gender</legend>
            <label>
              <input
                type="radio"
                name="sl005-self-gender"
                value="female"
                checked={selfForm.gender === 'female'}
                onChange={(event) => handleSelfFieldChange('gender', event.target.value)}
              />
              Female
            </label>
            <label>
              <input
                type="radio"
                name="sl005-self-gender"
                value="male"
                checked={selfForm.gender === 'male'}
                onChange={(event) => handleSelfFieldChange('gender', event.target.value)}
              />
              Male
            </label>
          </fieldset>
          {selfErrors.gender ? <p className="sl001-field-error" role="alert">{selfErrors.gender}</p> : null}

          <button className="sl001-primary-action" type="submit" disabled={!canSubmitSelf}>
            {selfPending ? 'Generating your plan...' : 'Generate my plan'}
          </button>
        </form>
      </AppShell>
    );
  }

  if (currentSurface === FAMILY_SURFACES.onboardingFamily) {
    return (
      <AppShell title="Add family profiles (optional)">
        <p className="sl001-support-copy">
          Manage preventive care for up to five people in one account. You can skip this step and add profiles later.
        </p>

        <div className="sl005-summary-strip" role="status" aria-live="polite">
          <p>{formatProfileCountText(profiles.length, FAMILY_PROFILE_LIMIT)}</p>
          {!canAddAnotherProfile ? <p>{FAMILY_ACCOUNT_ERRORS.profileLimitReached}</p> : null}
        </div>

        <section className="sl005-added-profiles" aria-label="Added profiles">
          <h2>Added profiles</h2>
          {profiles.length === 0 ? (
            <p className="sl001-empty">No profiles added yet.</p>
          ) : (
            <ul className="sl005-profile-list">
              {profiles.map((profile) => (
                <li key={profile.profileId}>
                  <strong>{profile.displayLabel || profile.name || 'Profile'}</strong>
                  <span>{toProfileDescriptor(profile)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {showCreateForm ? (
          <CreateProfileForm
            form={profileForm}
            errors={profileErrors}
            pending={profilePending}
            submitLabel="Save profile"
            cancelLabel="Cancel"
            createError={profileError}
            onFieldChange={handleProfileFieldChange}
            onSubmit={handleCreateFamilyProfile}
            onCancel={resetProfileForm}
          />
        ) : (
          <button
            type="button"
            className="sl003-secondary-action"
            onClick={() => setShowCreateForm(true)}
            disabled={!canAddAnotherProfile}
          >
            Add family profile
          </button>
        )}

        <button
          type="button"
          className="sl001-primary-action"
          onClick={handleCompleteOnboarding}
        >
          Continue without adding anyone else
        </button>
      </AppShell>
    );
  }

  if (currentSurface === FAMILY_SURFACES.familyOverview) {
    return (
      <AppShell title="Family overview">
        <p className="sl001-support-copy">
          See each profile&apos;s health score and what needs attention next.
        </p>

        <div className="sl005-summary-strip" role="status" aria-live="polite">
          <p>{formatProfileCountText(profiles.length, FAMILY_PROFILE_LIMIT)}</p>
          {!canAddAnotherProfile ? <p>{FAMILY_ACCOUNT_ERRORS.profileLimitReached}</p> : null}
        </div>

        {routeError ? <p className="sl001-error-banner" role="alert">{routeError}</p> : null}

        {showCreateForm ? (
          <CreateProfileForm
            form={profileForm}
            errors={profileErrors}
            pending={profilePending}
            submitLabel="Create profile"
            cancelLabel="Cancel"
            createError={profileError}
            onFieldChange={handleProfileFieldChange}
            onSubmit={handleCreateFamilyProfile}
            onCancel={resetProfileForm}
          />
        ) : (
          <button
            type="button"
            className="sl001-primary-action"
            onClick={() => setShowCreateForm(true)}
            disabled={!canAddAnotherProfile}
          >
            Add family profile
          </button>
        )}

        <section className="sl005-overview-list" aria-label="Family profile summaries">
          {familyOverview.map((overview) => {
            const sourceProfile = profiles.find((profile) => profile.profileId === overview.profileId);

            return (
              <article className="sl005-overview-card" key={overview.profileId}>
                <FamilyProfileCard
                  name={overview.displayLabel}
                  age={sourceProfile?.age}
                  gender={sourceProfile?.gender}
                  dueCount={overview.dueTodayCount}
                />
                <div className="sl005-overview-meta">
                  <p><strong>Health Score:</strong> {Number.isFinite(Number(overview.healthScore)) ? `${Math.round(Number(overview.healthScore))}%` : 'N/A'}</p>
                  <p>{overview.dueSummary}. {overview.soonSummary}.</p>
                </div>
                <div className="sl005-overview-actions">
                  <button
                    type="button"
                    className="sl003-quiet-button"
                    onClick={() => handleOpenDashboardFromCard(overview.profileId)}
                  >
                    Open dashboard
                  </button>
                  <button
                    type="button"
                    className="sl003-quiet-button"
                    onClick={() => handleOpenPlanFromCard(overview.profileId)}
                  >
                    Open checkup plan
                  </button>
                  <button
                    type="button"
                    className="sl003-quiet-button"
                    onClick={() => handleOpenVaccinationsFromCard(overview.profileId)}
                  >
                    Open vaccinations
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </AppShell>
    );
  }

  if (!activeProfile) {
    return (
      <AppShell title="Family overview">
        <section className="sl002-not-found" role="alert">
          <h2>{FAMILY_ACCOUNT_ERRORS.profileNotFound}</h2>
          <p>Please return to your family overview and choose a profile from your account.</p>
          <button type="button" className="sl001-primary-action" onClick={handleBackToFamilyOverview}>
            Return to family overview
          </button>
        </section>
      </AppShell>
    );
  }

  if (currentSurface === FAMILY_SURFACES.dashboard) {
    if (!activePlanSnapshot || !activeDashboardProjection || !activeOverview) {
      return (
        <AppShell title="Dashboard">
          <ProfileContext activeProfile={activeProfile} />
          <p className="sl001-error-banner" role="alert">We could not load this profile dashboard right now.</p>
          <button type="button" className="sl001-primary-action" onClick={handleBackToFamilyOverview}>
            Return to family overview
          </button>
        </AppShell>
      );
    }

    const todayCount = activeOverview.dueTodayCount;

    return (
      <AppShell
        title="Dashboard"
        headerAction={(
          <div className="sl005-dashboard-actions">
            <button type="button" className="sl003-quiet-button" onClick={handleBackToFamilyOverview}>
              Family overview
            </button>
            <button type="button" className="sl003-quiet-button" onClick={() => handleOpenPlanFromCard(activeProfile.profileId)}>
              Checkup plan
            </button>
            <button type="button" className="sl003-quiet-button" onClick={() => handleOpenVaccinationsFromCard(activeProfile.profileId)}>
              Vaccinations
            </button>
          </div>
        )}
      >
        <ProfileContext activeProfile={activeProfile} />

        <div className="sl001-dashboard-summary-cards">
          <FamilyProfileCard
            name={activeOverview.displayLabel}
            age={activeProfile.age}
            gender={activeProfile.gender}
            dueCount={todayCount}
          />
          <HealthScoreCard score={activeDashboardProjection.healthScore} />
          <NextRecommendedStepCard highlightedItem={activeDashboardProjection.highlightedItem} />
        </div>

        <div className="sl001-dashboard-sections">
          {activeDashboardProjection.sections.map((section) => (
            <PrioritySection
              key={section.priority}
              priority={section.priority}
              title={section.title}
              items={section.items}
              onOpenDetail={handleOpenPlanDetailFromDashboard}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  if (currentSurface === FAMILY_SURFACES.plan) {
    return (
      <>
        <main className="app-shell sl005-context-shell" aria-label="Active profile context">
          <section className="app-panel sl005-context-panel">
            <ProfileContext activeProfile={activeProfile} />
            <button type="button" className="sl003-quiet-button" onClick={handleBackToFamilyOverview}>
              Family overview
            </button>
          </section>
        </main>
        <ItemCompletionAndReminderActions
          profile={activeProfile}
          initialPlanSnapshot={activePlanSnapshot}
          initialManualEntries={activeManualEntries}
          initialCategory={planEntry.initialCategory}
          initialItemKey={planEntry.initialItemKey}
          initialOrigin={planEntry.initialOrigin}
          initialReturnToVaccinationTracker={planEntry.initialReturnToVaccinationTracker}
          onNavigate={(target) => {
            if (target?.destination === 'dashboard') {
              handleOpenDashboardFromCard(activeProfile.profileId);
              return;
            }

            if (target?.destination === 'vaccinations') {
              handleOpenVaccinationsFromCard(activeProfile.profileId);
            }
          }}
          onPlanSnapshotChange={handlePlanSnapshotChange}
          onManualEntriesChange={handleManualEntriesChange}
          saveManualEntry={handleSaveManualEntry}
          clock={clock}
        />
      </>
    );
  }

  if (currentSurface === FAMILY_SURFACES.vaccinations) {
    return (
      <>
        <main className="app-shell sl005-context-shell" aria-label="Active profile context">
          <section className="app-panel sl005-context-panel">
            <ProfileContext activeProfile={activeProfile} />
            <button type="button" className="sl003-quiet-button" onClick={handleBackToFamilyOverview}>
              Family overview
            </button>
          </section>
        </main>
        <VaccinationTrackingAreaAndManualEntries
          profile={activeProfile}
          planSnapshot={activePlanSnapshot}
          initialManualEntries={activeManualEntries}
          saveManualEntry={handleSaveManualEntry}
          onOpenDetail={({ itemKey, origin }) => {
            if (!itemKey) {
              return;
            }

            safelyOpenSurface(() => {
              session.openProfilePlan(activeProfile.profileId);
              setPlanEntry({
                initialItemKey: itemKey,
                initialOrigin: origin || 'vaccinations',
                initialCategory: PLAN_CATEGORIES.vaccination,
                initialReturnToVaccinationTracker: true,
              });
            });
          }}
          onNavigate={(target) => {
            if (target?.destination === 'dashboard') {
              handleOpenDashboardFromCard(activeProfile.profileId);
            }
          }}
          clock={clock}
        />
      </>
    );
  }

  return (
    <AppShell title="Family overview">
      <p className="sl001-error-banner" role="alert">This screen is not available right now.</p>
      <button type="button" className="sl001-primary-action" onClick={handleBackToFamilyOverview}>
        Return to family overview
      </button>
    </AppShell>
  );
}
