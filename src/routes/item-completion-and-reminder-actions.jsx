import React from 'react';
import { ItemCompletionAndReminderActions } from '../features/item-completion-and-reminder-actions';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/health-plan-browsing-and-item-detail/health-plan-browsing-and-item-detail.css';
import '../features/item-completion-and-reminder-actions/item-completion-and-reminder-actions.css';

export default function ItemCompletionAndReminderActionsRoute(props) {
  return <ItemCompletionAndReminderActions {...props} />;
}
