/* generated_from: fabric/company/v1/runtime/commands/runtime.mjs
 * target: src/features/profile/ProfileForm.jsx
 * fabric_version: v1
 * generated_at_utc: 2026-04-25T08:33:51.954Z
 */
import React, { useState } from 'react';

export function ProfileForm({ familyMode, onSubmit }) {
  const [name, setName] = useState('Alex');
  const [age, setAge] = useState('42');
  const [gender, setGender] = useState('female');

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name, age, gender, familyMode });
      }}
    >
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
      </label>
      <label>
        Age
        <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="42" />
      </label>
      <label>
        Gender
        <select value={gender} onChange={(event) => setGender(event.target.value)}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="diverse">Diverse</option>
        </select>
      </label>
      <button type="submit" className="primary">Generate my health plan</button>
      <p className="helper">{familyMode ? 'Family mode enabled: the next slice can extend to multiple profiles.' : 'Single-profile onboarding for the MVP flow.'}</p>
    </form>
  );
}
