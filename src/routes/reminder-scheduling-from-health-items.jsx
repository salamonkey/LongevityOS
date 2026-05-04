import React from 'react';
import { ReminderSchedulingDashboardDetailPage } from '../features/reminder-scheduling-from-health-items/ReminderSchedulingDashboardDetailPage.jsx';
import { ReminderSchedulingFullHealthPlanPage } from '../features/reminder-scheduling-from-health-items/ReminderSchedulingFullHealthPlanPage.jsx';

export function ReminderSchedulingFromHealthItemsRoute({ view, ...props }) {
  if (view === 'plan') {
    return <ReminderSchedulingFullHealthPlanPage {...props} />;
  }

  return <ReminderSchedulingDashboardDetailPage {...props} />;
}

export default ReminderSchedulingFromHealthItemsRoute;
