import {
  PLAN_STATUSES,
} from '../health-plan-browsing-and-item-detail/model.js';
import {
  buildDashboardProjectionForSlice,
} from '../item-completion-and-reminder-actions/selectors.js';
import {
  resolveDashboardBucketForDisplay,
} from '../self-onboarding-to-first-dashboard/dashboard.js';

function toItems(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items : [];
}

function countOutstandingByBucket(items, bucket) {
  return items.filter((item) => (
    resolveDashboardBucketForDisplay(item) === bucket
    && item.status !== PLAN_STATUSES.done
  )).length;
}

export function buildProfileOverview(profile, planSnapshot) {
  const dashboard = buildDashboardProjectionForSlice(planSnapshot, {
    name: profile?.displayLabel || profile?.name || 'Profile',
  });

  const items = toItems(planSnapshot);
  const dueTodayCount = countOutstandingByBucket(items, 'today');
  const soonCount = countOutstandingByBucket(items, 'soon');

  const dueSummary = dueTodayCount > 0
    ? `${dueTodayCount} due today`
    : 'No items due today';

  const soonSummary = soonCount > 0
    ? `${soonCount} coming up soon`
    : 'No soon items';

  return {
    profileId: profile?.profileId ?? '',
    displayLabel: profile?.displayLabel ?? profile?.name ?? 'Profile',
    healthScore: dashboard.healthScore,
    dueTodayCount,
    dueSummary,
    soonSummary,
    highlightedItemName: dashboard.highlightedItem?.name ?? 'No next step available',
  };
}

export function buildFamilyOverview(profiles, plansByProfileId) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];

  return safeProfiles.map((profile) => {
    const planSnapshot = plansByProfileId?.[profile.profileId] ?? null;
    return buildProfileOverview(profile, planSnapshot);
  });
}
