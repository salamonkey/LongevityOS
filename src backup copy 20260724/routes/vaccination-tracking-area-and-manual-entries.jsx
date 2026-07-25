import React from 'react';
import { VaccinationTrackingAreaAndManualEntries } from '../features/vaccination-tracking-area-and-manual-entries';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';
import '../features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css';
import '../features/vaccination-tracking-area-and-manual-entries/vaccination-tracking-area-and-manual-entries.css';

export default function VaccinationTrackingAreaAndManualEntriesRoute(props) {
  return <VaccinationTrackingAreaAndManualEntries {...props} />;
}
