import React, { useMemo, useState } from 'react';
import {
  AppShell,
  HealthPlanItem,
  StatusPill,
  VaccinationStatusRow,
} from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS,
  MANUAL_ENTRY_STATUS_CONTEXT,
  MANUAL_ENTRY_STATUS_LABELS,
  MANUAL_ENTRY_VALIDATION_ERRORS,
  buildManualVaccinationCatalogOptions,
  buildManualVaccinationRows,
  buildVaccinationDueGuidance,
  createInitialManualEntryForm,
  createManualVaccinationEntry,
  validateManualVaccinationEntryInput,
} from './model.js';

function ManualEntryForm({
  form,
  options,
  errors,
  saveError,
  pending,
  onFieldChange,
  onSubmit,
  onCancel,
}) {
  const entryDateLabel = form.statusContext === MANUAL_ENTRY_STATUS_CONTEXT.completed
    ? 'Date received'
    : form.statusContext === MANUAL_ENTRY_STATUS_CONTEXT.planned
      ? 'Planned date'
      : 'Date received or planned date';

  return (
    <form className="sl004-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="sl004-vaccination-item">Vaccination item</label>
      <select
        id="sl004-vaccination-item"
        value={form.vaccinationKey}
        onChange={(event) => onFieldChange('vaccinationKey', event.target.value)}
        disabled={pending}
        aria-invalid={Boolean(errors.vaccinationKey)}
      >
        <option value="">Choose a vaccination</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {errors.vaccinationKey ? <p className="sl001-field-error" role="alert">{errors.vaccinationKey}</p> : null}

      <fieldset className="sl004-status-group" disabled={pending}>
        <legend>Status</legend>
        {ALLOWED_MANUAL_ENTRY_STATUS_CONTEXTS.map((statusContext) => (
          <label key={statusContext}>
            <input
              type="radio"
              name="sl004-status-context"
              value={statusContext}
              checked={form.statusContext === statusContext}
              onChange={(event) => onFieldChange('statusContext', event.target.value)}
            />
            {MANUAL_ENTRY_STATUS_LABELS[statusContext]}
          </label>
        ))}
      </fieldset>
      {errors.statusContext ? <p className="sl001-field-error" role="alert">{errors.statusContext}</p> : null}

      <label htmlFor="sl004-entry-date">{entryDateLabel}</label>
      <input
        id="sl004-entry-date"
        type="date"
        value={form.entryDate}
        onChange={(event) => onFieldChange('entryDate', event.target.value)}
        disabled={pending}
        aria-invalid={Boolean(errors.entryDate)}
      />
      {errors.entryDate ? <p className="sl001-field-error" role="alert">{errors.entryDate}</p> : null}

      {saveError ? <p className="sl001-error-banner" role="alert">{saveError}</p> : null}

      <div className="sl004-form-actions">
        <button type="submit" className="sl001-primary-action" disabled={pending}>
          {pending ? 'Saving entry...' : 'Save vaccination entry'}
        </button>
        <button type="button" className="sl003-quiet-button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function VaccinationTrackingAreaAndManualEntries({
  profile = { profileId: 'self', name: 'Me' },
  planSnapshot,
  initialManualEntries = [],
  initialAddOpen = false,
  onOpenDetail,
  onNavigate,
  saveManualEntry,
  clock = () => new Date(),
  locale = 'en-US',
}) {
  const dueGuidance = useMemo(
    () => buildVaccinationDueGuidance(planSnapshot),
    [planSnapshot],
  );

  const catalogOptions = useMemo(
    () => buildManualVaccinationCatalogOptions(planSnapshot),
    [planSnapshot],
  );

  const [manualEntries, setManualEntries] = useState(initialManualEntries);
  const [isAddOpen, setAddOpen] = useState(Boolean(initialAddOpen));
  const [form, setForm] = useState(createInitialManualEntryForm({ vaccinationKey: catalogOptions[0]?.value ?? '' }));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const manualRows = useMemo(
    () => buildManualVaccinationRows(manualEntries, planSnapshot, { locale }),
    [manualEntries, planSnapshot, locale],
  );

  const openAddFlow = () => {
    setAddOpen(true);
    setSaveError('');
    setErrors({});
    setConfirmation('');
    setForm(createInitialManualEntryForm({ vaccinationKey: catalogOptions[0]?.value ?? '' }));
  };

  const closeAddFlow = () => {
    setAddOpen(false);
    setPending(false);
    setSaveError('');
    setErrors({});
  };

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

    setSaveError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validation = validateManualVaccinationEntryInput(form, {
      allowedVaccinationKeys: catalogOptions.map((option) => option.value),
      now: clock(),
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const entry = createManualVaccinationEntry(form, {
      profileId: profile.profileId,
      allowedVaccinationKeys: catalogOptions.map((option) => option.value),
      now: clock(),
    });

    setErrors({});
    setSaveError('');
    setPending(true);

    try {
      let savedEntry = entry;

      if (typeof saveManualEntry === 'function') {
        const maybeSaved = await saveManualEntry(entry);
        if (maybeSaved && typeof maybeSaved === 'object') {
          savedEntry = maybeSaved;
        }
      }

      setManualEntries((previous) => [...previous, savedEntry]);
      setConfirmation('Vaccination entry saved. It now appears in your vaccination list.');
      closeAddFlow();
    } catch {
      setPending(false);
      setSaveError(MANUAL_ENTRY_VALIDATION_ERRORS.saveFailed);
    }
  };

  const hasDueGuidance = dueGuidance.length > 0;

  return (
    <AppShell
      title="Vaccinations"
      headerAction={(
        <>
          {typeof onNavigate === 'function' ? (
            <button
              type="button"
              className="sl003-quiet-button sl004-header-action"
              onClick={() => onNavigate({ destination: 'dashboard' })}
            >
              Back to dashboard
            </button>
          ) : null}
          <button type="button" className="sl001-primary-action sl004-header-action" onClick={openAddFlow}>
            Add vaccination entry
          </button>
        </>
      )}
    >
      <p className="sl001-support-copy">
        Keep your vaccination records up to date with rule-based guidance and your own tracked entries.
      </p>

      <section className="sl004-section" aria-label="Due guidance">
        <h2>Due guidance</h2>
        <p className="sl004-section-copy">Guidance is based on your preventive plan profile and helps you spot what may need attention next.</p>
        {!hasDueGuidance ? (
          <p className="sl001-empty">No vaccination guidance is available right now. You can still add an entry below.</p>
        ) : (
          <div className="sl004-guidance-list">
            {dueGuidance.map((item) => (
              <HealthPlanItem
                key={item.itemKey}
                item={{
                  catalogItemId: item.itemKey,
                  name: item.name,
                  status: item.status,
                  statusLabel: item.statusLabel,
                  categoryLabel: item.categoryLabel,
                  cadenceLabel: item.cadenceLabel,
                  whyItMatters: item.whyItMatters,
                  category: item.category,
                }}
                onOpenDetail={typeof onOpenDetail === 'function' ? (selectedItem) => onOpenDetail({
                  itemKey: selectedItem.catalogItemId,
                  origin: 'vaccinations',
                }) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section className="sl004-section" aria-label="Manual vaccination records">
        <div className="sl004-manual-header">
          <h2>Your vaccination records</h2>
          <button type="button" className="sl003-secondary-action" onClick={openAddFlow}>Add vaccination entry</button>
        </div>
        <p className="sl004-section-copy">Entries here are the records you add yourself for this profile.</p>

        {isAddOpen ? (
          <ManualEntryForm
            form={form}
            options={catalogOptions}
            errors={errors}
            saveError={saveError}
            pending={pending}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
            onCancel={closeAddFlow}
          />
        ) : null}

        {confirmation ? <p className="sl003-confirmation" role="status">{confirmation}</p> : null}

        {manualRows.length === 0 ? (
          <div className="sl002-empty-state" role="status" aria-live="polite">
            <h3>No manual vaccination entries yet</h3>
            <p>Add your first vaccination entry to start tracking your own record here.</p>
            <button type="button" className="sl001-primary-action" onClick={openAddFlow}>Add vaccination entry</button>
          </div>
        ) : (
          <ul className="sl004-manual-list" aria-label="Manual vaccination entries">
            {manualRows.map((row) => (
              <li key={row.id} className="sl004-manual-row">
                <div className="sl004-manual-topline">
                  <h3>{row.vaccineName}</h3>
                  <StatusPill status={row.planStatus} label={row.statusLabel} />
                </div>
                <VaccinationStatusRow
                  vaccine={row.vaccineName}
                  status={row.planStatus}
                  statusLabel={row.statusLabel}
                  lastDate={row.statusContext === MANUAL_ENTRY_STATUS_CONTEXT.completed ? row.entryDateLabel : null}
                />
                <p className="sl004-manual-date">Date: {row.entryDateLabel}</p>

                {row.relatedItemKey && typeof onOpenDetail === 'function' ? (
                  <button
                    type="button"
                    className="sl003-quiet-button"
                    onClick={() => onOpenDetail({ itemKey: row.relatedItemKey, origin: 'vaccinations' })}
                  >
                    Open related detail
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
