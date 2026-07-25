import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppShell,
  FamilyProfileCard,
  HealthScoreCard,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  PROFILE_AREA_ERRORS,
  PROFILE_AREA_PROFILE_LIMIT,
  PROFILE_AREA_REMINDER_TIMING_LABELS,
  canCreateAnotherProfile,
  formatProfileCountText,
  hasPlanInputChanges,
  validateProfileBasicsInput,
} from './model.js';
import {
  PROFILE_AREA_SURFACES,
  createProfileAreaAndHouseholdPreferencesSession,
} from './service.js';

function createEmptyProfileForm() {
  return {
    displayLabel: '',
    age: '',
    gender: '',
  };
}

function toTouchedErrors(validation, touched) {
  const errors = {};

  if (touched.displayLabel && validation.errors.displayLabel) {
    errors.displayLabel = validation.errors.displayLabel;
  }

  if (touched.age && validation.errors.age) {
    errors.age = validation.errors.age;
  }

  if (touched.gender && validation.errors.gender) {
    errors.gender = validation.errors.gender;
  }

  return errors;
}

function renderDestinationLabel(destination) {
  if (destination === 'dashboard') return 'Dashboard';
  if (destination === 'plan') return 'Plan';
  return 'Vaccinations';
}

export default function ProfileAreaAndHouseholdPreferences({
  sessionFactory = createProfileAreaAndHouseholdPreferencesSession,
  planGenerator,
  clock = () => new Date(),
  onNavigate,
  onSessionStateChange,
}) {
  const sessionRef = useRef(null);

  if (!sessionRef.current) {
    sessionRef.current = sessionFactory({
      now: clock,
      planGenerator,
    });
  }

  const session = sessionRef.current;

  const [sessionState, setSessionState] = useState(() => session.getState());
  const [createForm, setCreateForm] = useState(() => createEmptyProfileForm());
  const [createTouched, setCreateTouched] = useState({ displayLabel: false, age: false, gender: false });
  const [createErrors, setCreateErrors] = useState({});
  const [createPending, setCreatePending] = useState(false);
  const [createErrorBanner, setCreateErrorBanner] = useState('');

  const [editForm, setEditForm] = useState(() => createEmptyProfileForm());
  const [editTouched, setEditTouched] = useState({ displayLabel: false, age: false, gender: false });
  const [editErrors, setEditErrors] = useState({});
  const [editPending, setEditPending] = useState(false);
  const [editErrorBanner, setEditErrorBanner] = useState('');
  const [editSuccessMessage, setEditSuccessMessage] = useState('');

  const [navigationMessage, setNavigationMessage] = useState('');
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesSuccess, setPreferencesSuccess] = useState('');

  const [reminderForm, setReminderForm] = useState(() => ({
    remindersEnabled: true,
    defaultTiming: 'one_month',
  }));

  const activeProfile = useMemo(
    () => sessionState.profiles.find((profile) => profile.profileId === sessionState.activeProfileId) ?? null,
    [sessionState.activeProfileId, sessionState.profiles],
  );

  const householdOverview = useMemo(
    () => session.getHouseholdOverview(),
    [session, sessionState.profiles, sessionState.plansByProfileId],
  );

  const orderedHouseholdOverview = useMemo(() => (
    [...householdOverview].sort((left, right) => {
      const leftIsSelf = left.profileId === 'self';
      const rightIsSelf = right.profileId === 'self';
      if (leftIsSelf && !rightIsSelf) return -1;
      if (!leftIsSelf && rightIsSelf) return 1;
      return String(left.displayLabel).localeCompare(String(right.displayLabel));
    })
  ), [householdOverview]);

  const activeProfileSummary = useMemo(
    () => session.getActiveProfileSummary(),
    [session, sessionState.activeProfileId, sessionState.profiles, sessionState.plansByProfileId],
  );

  const preferencesViewModel = useMemo(
    () => session.getPreferencesViewModel(),
    [session, sessionState.profiles, sessionState.reminderSettings],
  );

  useEffect(() => {
    setReminderForm({
      remindersEnabled: Boolean(sessionState.reminderSettings.remindersEnabled),
      defaultTiming: sessionState.reminderSettings.defaultTiming,
    });
  }, [sessionState.reminderSettings.defaultTiming, sessionState.reminderSettings.remindersEnabled]);

  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    setEditForm({
      displayLabel: activeProfile.displayLabel ?? activeProfile.name ?? '',
      age: String(activeProfile.age ?? ''),
      gender: activeProfile.gender ?? '',
    });
    setEditTouched({ displayLabel: false, age: false, gender: false });
    setEditErrors({});
    setEditErrorBanner('');
  }, [activeProfile?.profileId]);

  const refreshSession = () => {
    const nextState = session.getState();
    setSessionState(nextState);
    if (typeof onSessionStateChange === 'function') {
      onSessionStateChange(nextState);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm(createEmptyProfileForm());
    setCreateTouched({ displayLabel: false, age: false, gender: false });
    setCreateErrors({});
    setCreateErrorBanner('');
    setNavigationMessage('');
    session.openCreateProfile();
    refreshSession();
  };

  const handleCreateFieldChange = (field, value) => {
    const nextForm = {
      ...createForm,
      [field]: value,
    };

    setCreateForm(nextForm);

    if (createTouched[field]) {
      const validation = validateProfileBasicsInput(nextForm);
      setCreateErrors(toTouchedErrors(validation, {
        ...createTouched,
        [field]: true,
      }));
    }

    setCreateErrorBanner('');
  };

  const handleCreateBlur = (field) => {
    const nextTouched = {
      ...createTouched,
      [field]: true,
    };

    setCreateTouched(nextTouched);
    const validation = validateProfileBasicsInput(createForm);
    setCreateErrors(toTouchedErrors(validation, nextTouched));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    const touchedAll = { displayLabel: true, age: true, gender: true };
    setCreateTouched(touchedAll);

    const validation = validateProfileBasicsInput(createForm);
    if (!validation.isValid) {
      setCreateErrors(toTouchedErrors(validation, touchedAll));
      return;
    }

    setCreatePending(true);
    setCreateErrorBanner('');

    try {
      const result = await session.createProfile(createForm);
      if (!result.isValid) {
        setCreateErrors(result.errors);
        return;
      }

      session.openHousehold();
      refreshSession();
      setCreateForm(createEmptyProfileForm());
      setCreateTouched({ displayLabel: false, age: false, gender: false });
      setCreateErrors({});
      setNavigationMessage(`${result.profile.displayLabel} was added to your household.`);
    } catch (error) {
      setCreateErrorBanner(error instanceof Error ? error.message : PROFILE_AREA_ERRORS.profileCreateFailed);
    } finally {
      setCreatePending(false);
    }
  };

  const handleEditFieldChange = (field, value) => {
    const nextForm = {
      ...editForm,
      [field]: value,
    };

    setEditForm(nextForm);
    if (editTouched[field]) {
      const validation = validateProfileBasicsInput(nextForm);
      setEditErrors(toTouchedErrors(validation, {
        ...editTouched,
        [field]: true,
      }));
    }

    setEditErrorBanner('');
    setEditSuccessMessage('');
  };

  const handleEditBlur = (field) => {
    const nextTouched = {
      ...editTouched,
      [field]: true,
    };

    setEditTouched(nextTouched);
    const validation = validateProfileBasicsInput(editForm);
    setEditErrors(toTouchedErrors(validation, nextTouched));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!activeProfile) {
      setEditErrorBanner(PROFILE_AREA_ERRORS.profileNotFound);
      return;
    }

    const touchedAll = { displayLabel: true, age: true, gender: true };
    setEditTouched(touchedAll);

    const validation = validateProfileBasicsInput(editForm);
    if (!validation.isValid) {
      setEditErrors(toTouchedErrors(validation, touchedAll));
      return;
    }

    const shouldRegenerate = hasPlanInputChanges(activeProfile, validation.normalized);

    setEditPending(true);
    setEditErrorBanner('');
    setEditSuccessMessage('');

    try {
      const result = await session.updateProfileBasics(activeProfile.profileId, editForm);
      if (!result.isValid) {
        setEditErrors(result.errors);
        return;
      }

      refreshSession();
      if (result.planRegenerated) {
        setEditSuccessMessage('Profile updated and plan refreshed for this person.');
      } else {
        setEditSuccessMessage('Profile details were saved.');
      }

      if (shouldRegenerate) {
        setNavigationMessage('Dashboard and plan are now up to date for this profile.');
      }
    } catch (error) {
      setEditErrorBanner(error instanceof Error ? error.message : PROFILE_AREA_ERRORS.profileUpdateFailed);
    } finally {
      setEditPending(false);
    }
  };

  const handleOpenProfileDetail = (profileId) => {
    setNavigationMessage('');
    setEditSuccessMessage('');
    session.openProfileDetail(profileId);
    refreshSession();
  };

  const handleSelectActiveProfile = (profileId) => {
    setNavigationMessage('');

    try {
      session.selectActiveProfile(profileId);
      refreshSession();

      const profile = session.getProfile(profileId);
      const planSnapshot = session.getPlanSnapshot(profileId);

      if (typeof onNavigate === 'function') {
        onNavigate({
          profile,
          planSnapshot,
        });
      }
    } catch (error) {
      setNavigationMessage(error instanceof Error ? error.message : PROFILE_AREA_ERRORS.profileNotFound);
    }
  };

  const handleActiveProfileKeyDown = (profileId, event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    handleSelectActiveProfile(profileId);
  };

  const handleNavigateToDestination = (profileId, destination) => {
    setNavigationMessage('');

    try {
      const target = session.openProfileDestination(profileId, destination);
      refreshSession();

      const profile = session.getProfile(profileId);
      const planSnapshot = session.getPlanSnapshot(profileId);

      if (typeof onNavigate === 'function') {
        onNavigate({
          ...target,
          profile,
          planSnapshot,
        });
      }

      setNavigationMessage(`Opened ${renderDestinationLabel(destination)} for ${profile.displayLabel}.`);
    } catch (error) {
      setNavigationMessage(error instanceof Error ? error.message : PROFILE_AREA_ERRORS.invalidDestination);
    }
  };

  const handleSaveReminderSettings = (event) => {
    event.preventDefault();
    setPreferencesError('');
    setPreferencesSuccess('');

    const result = session.updateReminderSettings(reminderForm);
    if (!result.isValid) {
      setPreferencesError(
        result.errors.defaultTiming
        || result.errors.remindersEnabled
        || PROFILE_AREA_ERRORS.profileUpdateFailed,
      );
      return;
    }

    refreshSession();
    setPreferencesSuccess('Reminder settings were saved.');
  };

  const activeSurface = sessionState.currentSurface;
  const canAddProfile = canCreateAnotherProfile(sessionState.profiles, PROFILE_AREA_PROFILE_LIMIT);

  if (activeSurface === PROFILE_AREA_SURFACES.create) {
    const createValidation = validateProfileBasicsInput(createForm);
    const createDisabled = !createValidation.isValid || createPending;

    return (
      <AppShell title={null}>
        <div className="sl006-add-profile-stack">
          <section className="sl001-summary-card sl006-add-profile-intro" aria-label="Add profile overview">
            <p className="sl001-label">Profile</p>
            <h1 className="sl001-summary-title">Add profile</h1>
            <p className="sl001-summary-meta">
              Add a person to this household to manage preventive steps in one place.
            </p>
          </section>

          <section className="sl001-summary-card sl006-add-profile-form-card" aria-label="Add profile form">
            <form className="sl006-profile-form sl006-add-profile-form" onSubmit={handleCreateSubmit} noValidate>
              {createErrorBanner ? <p className="sl001-error-banner" role="alert">{createErrorBanner}</p> : null}

              <label htmlFor="sl006-create-name">Name</label>
              <input
                id="sl006-create-name"
                type="text"
                value={createForm.displayLabel}
                onChange={(event) => handleCreateFieldChange('displayLabel', event.target.value)}
                onBlur={() => handleCreateBlur('displayLabel')}
                aria-invalid={Boolean(createErrors.displayLabel)}
                disabled={createPending}
              />
              {createErrors.displayLabel ? <p className="sl001-field-error" role="alert">{createErrors.displayLabel}</p> : null}

              <label htmlFor="sl006-create-age">Age</label>
              <input
                id="sl006-create-age"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={createForm.age}
                onChange={(event) => handleCreateFieldChange('age', event.target.value)}
                onBlur={() => handleCreateBlur('age')}
                aria-invalid={Boolean(createErrors.age)}
                disabled={createPending}
              />
              {createErrors.age ? <p className="sl001-field-error" role="alert">{createErrors.age}</p> : null}

              <fieldset className="sl006-gender-field" disabled={createPending} aria-invalid={Boolean(createErrors.gender)}>
                <legend>Gender</legend>
                <label>
                  <input
                    type="radio"
                    name="sl006-create-gender"
                    value="female"
                    checked={createForm.gender === 'female'}
                    onChange={(event) => handleCreateFieldChange('gender', event.target.value)}
                    onBlur={() => handleCreateBlur('gender')}
                  />
                  Female
                </label>
                <label>
                  <input
                    type="radio"
                    name="sl006-create-gender"
                    value="male"
                    checked={createForm.gender === 'male'}
                    onChange={(event) => handleCreateFieldChange('gender', event.target.value)}
                    onBlur={() => handleCreateBlur('gender')}
                  />
                  Male
                </label>
              </fieldset>
              {createErrors.gender ? <p className="sl001-field-error" role="alert">{createErrors.gender}</p> : null}

              <div className="sl006-form-actions sl006-add-profile-actions">
                <button type="submit" className="sl001-primary-action" disabled={createDisabled}>
                  {createPending ? 'Creating profile...' : 'Create profile'}
                </button>
                <button
                  type="button"
                  className="sl003-quiet-button"
                  onClick={() => {
                    session.openHousehold();
                    refreshSession();
                  }}
                  disabled={createPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      </AppShell>
    );
  }

  if (activeSurface === PROFILE_AREA_SURFACES.detail) {
    if (!activeProfile) {
      return (
        <AppShell title="Profile details">
          <p className="sl001-error-banner" role="alert">{PROFILE_AREA_ERRORS.profileNotFound}</p>
          <button
            type="button"
            className="sl001-primary-action"
            onClick={() => {
              session.openHousehold();
              refreshSession();
            }}
          >
            Return to profile area
          </button>
        </AppShell>
      );
    }

    const editValidation = validateProfileBasicsInput(editForm);
    const saveDisabled = !editValidation.isValid || editPending;
    const willRegenerate = hasPlanInputChanges(activeProfile, editValidation.normalized);

    return (
      <AppShell
        title="Edit profile"
        headerAction={(
          <button
            type="button"
            className="sl002-back-button"
            onClick={() => {
              session.openHousehold();
              refreshSession();
            }}
          >
            Back
          </button>
        )}
      >
        <p className="sl001-support-copy">
          Update profile basics and keep this person&apos;s preventive plan current.
        </p>
        <p className="sl001-support-copy">
          Keeping age and gender accurate helps show the right preventive steps and reminders for this person.
        </p>

        {editErrorBanner ? <p className="sl001-error-banner" role="alert">{editErrorBanner}</p> : null}
        {editSuccessMessage ? <p className="sl006-success-banner" role="status">{editSuccessMessage}</p> : null}

        <form className="sl006-profile-form" onSubmit={handleEditSubmit} noValidate>
          <label htmlFor="sl006-edit-name">Name</label>
          <input
            id="sl006-edit-name"
            type="text"
            value={editForm.displayLabel}
            onChange={(event) => handleEditFieldChange('displayLabel', event.target.value)}
            onBlur={() => handleEditBlur('displayLabel')}
            aria-invalid={Boolean(editErrors.displayLabel)}
            disabled={editPending}
          />
          {editErrors.displayLabel ? <p className="sl001-field-error" role="alert">{editErrors.displayLabel}</p> : null}

          <label htmlFor="sl006-edit-age">Age</label>
          <input
            id="sl006-edit-age"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={editForm.age}
            onChange={(event) => handleEditFieldChange('age', event.target.value)}
            onBlur={() => handleEditBlur('age')}
            aria-invalid={Boolean(editErrors.age)}
            disabled={editPending}
          />
          {editErrors.age ? <p className="sl001-field-error" role="alert">{editErrors.age}</p> : null}

          <fieldset className="sl006-gender-field" disabled={editPending} aria-invalid={Boolean(editErrors.gender)}>
            <legend>Gender</legend>
            <label>
              <input
                type="radio"
                name="sl006-edit-gender"
                value="female"
                checked={editForm.gender === 'female'}
                onChange={(event) => handleEditFieldChange('gender', event.target.value)}
                onBlur={() => handleEditBlur('gender')}
              />
              Female
            </label>
            <label>
              <input
                type="radio"
                name="sl006-edit-gender"
                value="male"
                checked={editForm.gender === 'male'}
                onChange={(event) => handleEditFieldChange('gender', event.target.value)}
                onBlur={() => handleEditBlur('gender')}
              />
              Male
            </label>
          </fieldset>
          {editErrors.gender ? <p className="sl001-field-error" role="alert">{editErrors.gender}</p> : null}

          {editPending ? (
            <p className="sl006-progress" role="status">
              {willRegenerate
                ? `Updating ${activeProfile.displayLabel}'s plan...`
                : 'Saving profile changes...'}
            </p>
          ) : null}

          <button type="submit" className="sl001-primary-action" disabled={saveDisabled}>
            Save changes
          </button>
        </form>

        {activeProfileSummary ? (
          <div className="sl006-summary-row">
            <FamilyProfileCard
              name={activeProfileSummary.displayLabel}
              age={activeProfileSummary.age}
              gender={activeProfileSummary.gender}
              dueCount={activeProfileSummary.dueTodayCount}
            />
            <HealthScoreCard score={activeProfileSummary.healthScore} />
          </div>
        ) : null}

        <section className="sl006-quick-links" aria-label="Quick links">
          <h2>Quick links</h2>
          <p className="sl001-support-copy">
            Open this person&apos;s dashboard, plan, or vaccinations.
          </p>
          <div className="sl006-link-actions">
            {['dashboard', 'plan', 'vaccinations'].map((destination) => (
              <button
                key={destination}
                type="button"
                className="sl003-quiet-button"
                onClick={() => handleNavigateToDestination(activeProfile.profileId, destination)}
              >
                {renderDestinationLabel(destination)}
              </button>
            ))}
          </div>
        </section>
      </AppShell>
    );
  }

  if (activeSurface === PROFILE_AREA_SURFACES.preferences) {
    const reminderSection = preferencesViewModel.sections.find((section) => section.id === 'reminder_settings');

    return (
      <AppShell
        title="Preferences"
        headerAction={(
          <button
            type="button"
            className="sl002-back-button"
            onClick={() => {
              session.openHousehold();
              refreshSession();
            }}
          >
            Back
          </button>
        )}
      >
        <section className="sl006-preferences-card" aria-label="Reminder settings">
          <h2>{reminderSection?.heading ?? 'Reminder settings'}</h2>
          <p className="sl001-support-copy">{reminderSection?.description}</p>

          <form onSubmit={handleSaveReminderSettings} noValidate>
            <label className="sl006-toggle-row">
              <input
                type="checkbox"
                checked={reminderForm.remindersEnabled}
                onChange={(event) => {
                  setReminderForm((previous) => ({
                    ...previous,
                    remindersEnabled: event.target.checked,
                  }));
                  setPreferencesError('');
                  setPreferencesSuccess('');
                }}
              />
              Enable reminders
            </label>

            <fieldset className="sl006-gender-field">
              <legend>Default reminder timing</legend>
              {reminderSection?.settings.allowedDefaultTimings.map((timing) => (
                <label key={timing}>
                  <input
                    type="radio"
                    name="sl006-default-reminder"
                    value={timing}
                    checked={reminderForm.defaultTiming === timing}
                    onChange={(event) => {
                      setReminderForm((previous) => ({
                        ...previous,
                        defaultTiming: event.target.value,
                      }));
                      setPreferencesError('');
                      setPreferencesSuccess('');
                    }}
                  />
                  {PROFILE_AREA_REMINDER_TIMING_LABELS[timing]}
                </label>
              ))}
            </fieldset>

            {preferencesError ? <p className="sl001-error-banner" role="alert">{preferencesError}</p> : null}
            {preferencesSuccess ? <p className="sl006-success-banner" role="status">{preferencesSuccess}</p> : null}

            <button type="submit" className="sl001-primary-action">Save reminder settings</button>
          </form>
        </section>

      </AppShell>
    );
  }

  return (
    <AppShell
      title={null}
      headerAction={(
        <button
          type="button"
          className="sl001-secondary-action sl006-header-action-button"
          onClick={() => {
            session.openPreferences();
            refreshSession();
          }}
        >
          Preferences
        </button>
      )}
    >
      <section className="sl006-household-list" aria-label="Household profiles">
        {orderedHouseholdOverview.length === 0 ? (
          <p className="sl001-empty">No profiles yet. Add a profile to get started.</p>
        ) : (
          orderedHouseholdOverview.map((summary) => {
            const isActive = summary.profileId === sessionState.activeProfileId;
            return (
              <article className={`sl006-household-card${isActive ? ' is-active' : ''}`} key={summary.profileId}>
                <div
                  className="sl006-household-select"
                  onClick={() => handleSelectActiveProfile(summary.profileId)}
                  onKeyDown={(event) => handleActiveProfileKeyDown(summary.profileId, event)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                >
                  {isActive ? (
                    <p className="sl006-household-active-pill is-active">Active profile</p>
                  ) : null}

                  <FamilyProfileCard
                    name={summary.displayLabel}
                    age={summary.age}
                    gender={summary.gender}
                    dueCount={summary.dueTodayCount}
                    showDueCount={false}
                    showNextStep={false}
                    showCardLabel={false}
                    healthScore={summary.healthScore}
                    showHealthTileLabel={false}
                  />
                </div>

              </article>
            );
          })
        )}
      </section>

      <p className="sl001-support-copy">
        Manage profiles for your household and open each person&apos;s dashboard, plan, or vaccinations.
      </p>

      <div className="sl005-summary-strip" role="status" aria-live="polite">
        <p>{formatProfileCountText(sessionState.profiles.length, PROFILE_AREA_PROFILE_LIMIT)}</p>
        {!canAddProfile ? <p>{PROFILE_AREA_ERRORS.profileLimitReached}</p> : null}
      </div>

      {navigationMessage ? <p className="sl006-success-banner" role="status">{navigationMessage}</p> : null}

      <button type="button" className="sl001-primary-action" onClick={handleOpenCreate} disabled={!canAddProfile}>
        Add profile
      </button>
    </AppShell>
  );
}
