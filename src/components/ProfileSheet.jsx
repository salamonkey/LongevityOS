import React from 'react';
import { Sheet, Avatar, Icon } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';
import './profile-sheet.css';

const MANAGED_PROFILE_CAP = 10;

function ProfileRow({ profile, isActive, subtitle, onPick }) {
  const label = profile.displayLabel || profile.name || '';

  return (
    <button
      type="button"
      className={`vitalis-profile-sheet-row${isActive ? ' is-active' : ''}`}
      onClick={() => onPick?.(profile.profileId)}
    >
      <Avatar name={label} size={42} />
      <span className="vitalis-profile-sheet-copy">
        <span className="vitalis-profile-sheet-name">{label}</span>
        {subtitle ? <span className="vitalis-profile-sheet-role">{subtitle}</span> : null}
      </span>
      {isActive ? <Icon name="check-circle-2" size={20} color="var(--color-primary)" /> : null}
    </button>
  );
}

export default function ProfileSheet({
  open = false,
  profiles = [],
  activeProfileId = null,
  onClose,
  onPick,
  onAddProfile,
}) {
  const { t } = useTranslation();
  const sortedProfiles = [...profiles].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
  );

  // The account owner's own profile is created first, at signup, before any
  // "add family member" flow can run — no schema field distinguishes self
  // from managed today, so earliest createdAt is used as a real (if not
  // airtight) signal rather than fabricating a role/relationship value we
  // never actually collect. See ALIGNMENT_SUMMARY open questions.
  const [selfProfile, ...managedProfiles] = sortedProfiles;
  const atCap = managedProfiles.length >= MANAGED_PROFILE_CAP;

  return (
    <Sheet open={open} onClose={onClose} title={t('profileSheet.title')} closeLabel={t('common.close')}>
      <div className="vitalis-profile-sheet-rows">
        {selfProfile ? (
          <>
            <p className="sec-label vitalis-profile-sheet-section-label">{t('profileSheet.you')}</p>
            <ProfileRow
              profile={selfProfile}
              isActive={String(selfProfile.profileId) === String(activeProfileId)}
              subtitle={Number.isFinite(selfProfile.age) ? t('profileSheet.ageYears', { age: selfProfile.age }) : null}
              onPick={onPick}
            />
          </>
        ) : null}

        {managedProfiles.length > 0 ? (
          <>
            <p className="sec-label vitalis-profile-sheet-section-label">
              {t('profileSheet.managedProfiles', { count: managedProfiles.length, cap: MANAGED_PROFILE_CAP })}
            </p>
            {managedProfiles.map((profile) => (
              <ProfileRow
                key={profile.profileId}
                profile={profile}
                isActive={String(profile.profileId) === String(activeProfileId)}
                subtitle={Number.isFinite(profile.age) ? t('profileSheet.ageYears', { age: profile.age }) : null}
                onPick={onPick}
              />
            ))}
          </>
        ) : null}

        {!atCap ? (
          <button type="button" className="vitalis-profile-sheet-add" onClick={onAddProfile}>
            <span className="vitalis-profile-sheet-add-icon">
              <Icon name="plus" size={20} />
            </span>
            {t('profileSheet.addProfile')}
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
