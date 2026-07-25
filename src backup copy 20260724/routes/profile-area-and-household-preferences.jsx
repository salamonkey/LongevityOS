import React from 'react';
import { ProfileAreaAndHouseholdPreferences } from '../features/profile-area-and-household-preferences/index.js';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';
import '../features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css';
import '../features/family-onboarding-and-family-overview/family-onboarding-and-family-overview.css';
import '../features/profile-area-and-household-preferences/profile-area-and-household-preferences.css';

export default function ProfileAreaAndHouseholdPreferencesRoute(props) {
  return <ProfileAreaAndHouseholdPreferences {...props} />;
}
