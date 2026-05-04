import React from 'react';

export function ReminderSelector({
  timingType,
  customDate,
  minimumDate,
  customDateError,
  customDateHint,
  saveError,
  isSaving,
  isSaveDisabled,
  hasReminder,
  reminderPreview,
  onTimingTypeChange,
  onCustomDateChange,
  onSave,
  onCancel,
  options,
}) {
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <section className="panel reminder-sheet" aria-label="Reminder timing">
      <h2>{hasReminder ? 'Change reminder' : 'Set reminder'}</h2>
      <p className="helper">Choose when to be reminded for this care step.</p>

      <fieldset className="reminder-options">
        <legend className="visually-hidden">Reminder timing options</legend>
        {safeOptions.map((option) => (
          <label key={option.value} className="reminder-option">
            <input
              type="radio"
              name="timingType"
              checked={timingType === option.value}
              onChange={() => {
                onTimingTypeChange(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {timingType === 'CUSTOM_DATE' ? (
        <label className="field">
          <span>Custom reminder date</span>
          <input
            type="date"
            value={customDate}
            min={minimumDate}
            onChange={(event) => {
              onCustomDateChange(event.target.value);
            }}
          />
          {customDateError ? <span className="field-error">{customDateError}</span> : null}
          {!customDateError && customDateHint ? <span className="helper">{customDateHint}</span> : null}
        </label>
      ) : (
        <p className="helper">Remind me on {reminderPreview}.</p>
      )}

      {saveError ? (
        <p className="inline-error" role="status">
          {saveError}
        </p>
      ) : null}

      <div className="actions">
        <button type="button" className="primary" disabled={isSaving || isSaveDisabled} onClick={onSave}>
          {isSaving ? 'Saving...' : hasReminder ? 'Update reminder' : 'Save reminder'}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </section>
  );
}

export default ReminderSelector;
