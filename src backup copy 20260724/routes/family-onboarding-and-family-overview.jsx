import React from 'react';
import { FamilyOnboardingAndFamilyOverview } from '../features/family-onboarding-and-family-overview/index.js';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';
import '../features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css';
import '../features/vaccination-tracking-area-and-manual-entries/vaccination-tracking-area-and-manual-entries.css';
import '../features/family-onboarding-and-family-overview/family-onboarding-and-family-overview.css';

export default function FamilyOnboardingAndFamilyOverviewRoute(props) {
  return <FamilyOnboardingAndFamilyOverview {...props} />;
}
