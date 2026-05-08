import React from 'react';
import { PlanTimeline } from '../features/plan-timeline/index.js';
import '../features/self-onboarding-to-first-dashboard/self-onboarding-to-first-dashboard.css';
import '../features/plan-timeline/plan-timeline.css';

export default function PlanTimelineRoute(props) {
  return <PlanTimeline {...props} />;
}
