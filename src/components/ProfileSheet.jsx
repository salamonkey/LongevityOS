import React from 'react';
import { Sheet, Avatar, Icon } from '../design-system/components/index.js';
import { useTranslation } from '../lib/i18n/index.js';
import './profile-sheet.css';

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

  return (
    <Sheet open={open} onClose={onClose} title={t('profileSheet.title')}>
      <div className="vitalis-profile-sheet-rows">
        {sortedProfiles.map((profile) => {
          const isActive = String(profile.profileId) === String(activeProfileId);
          const label = profile.displayLabel || profile.name || '';

          return (
            <button
              key={profile.profileId}
              type="button"
              className={`vitalis-profile-sheet-row${isActive ? ' is-active' : ''}`}
              onClick={() => onPick?.(profile.profileId)}
            >
              <Avatar name={label} size={42} />
              <span className="vitalis-profile-sheet-name">{label}</span>
              {isActive ? <Icon name="check-circle-2" size={20} color="var(--color-primary)" /> : null}
            </button>
          );
        })}
        <button type="button" className="vitalis-profile-sheet-add" onClick={onAddProfile}>
          <span className="vitalis-profile-sheet-add-icon">
            <Icon name="plus" size={20} />
          </span>
          {t('profileSheet.addProfile')}
        </button>
      </div>
    </Sheet>
  );
}
