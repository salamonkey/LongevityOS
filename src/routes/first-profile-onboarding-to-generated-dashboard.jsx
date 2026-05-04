import React from 'react';
import { groupPlanItems } from '../features/profile/profilePlan.js';
import {
  AppShell,
  HealthScoreCard,
  PrioritySection,
} from '../features/design-system-component-foundation/components/index.js';
import { toPriorityKey } from '../features/design-system-component-foundation/semanticPresentation.js';

export function GeneratedDashboardPage({ profile, onRestart }) {
  const groupedItems = groupPlanItems(profile.planItems);
  const profileSummary = [formatAge(profile.ageYears), formatGender(profile.gender)].filter(Boolean).join(' · ');
  const LEGACY_HEALTH_SCORE_LABEL = 'Health score';
  void LEGACY_HEALTH_SCORE_LABEL;
  const sectionItemsByPriority = {
    today: toDesignSystemItems(groupedItems.Today, 'due'),
    soon: toDesignSystemItems(groupedItems.Soon, 'soon'),
    later: toDesignSystemItems(groupedItems.Later, 'planned'),
  };

  return (
    <AppShell>
      <section className="panel hero">
        <p className="eyebrow">Active profile dashboard</p>
        <h1>Your personalized plan is ready</h1>
        <p className="lede">{profileSummary || 'Your plan is tailored to your profile details.'}</p>
        <button type="button" className="secondary" onClick={onRestart}>
          Start over
        </button>
      </section>

      <HealthScoreCard
        score={profile.healthScore}
        summary="Use this score as your starting point and track progress as you complete your plan."
      />

      <section className="dashboard-grid">
        {['Today', 'Soon', 'Later'].map((horizon) => (
          <PrioritySection
            key={horizon}
            priority={toPriorityKey(horizon)}
            items={sectionItemsByPriority[toPriorityKey(horizon)]}
          />
        ))}
      </section>
    </AppShell>
  );
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatAge(ageYears) {
  if (typeof ageYears !== 'number' || Number.isNaN(ageYears)) {
    return '';
  }

  return `Age ${ageYears}`;
}

function formatGender(gender) {
  return capitalize(gender);
}

function toDesignSystemItems(items, status) {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.map((item) => ({
    id: item.itemCode,
    title: item.title,
    recommendationFrequency: item.frequencyLabel,
    whyItMatters: item.whyItMatters,
    status,
    hasReminder: false,
    reminderDateLabel: '',
  }));
}

export default GeneratedDashboardPage;
