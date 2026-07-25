import React from 'react';
import { storybookContract } from './fixtures';
import RouteSurface1 from '../../../routes/vaccination-tracking-area-and-manual-entries.jsx';
import { AppShell as ComponentSurface2 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { HealthPlanItem as ComponentSurface3 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { StatusPill as ComponentSurface4 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';
import { VaccinationStatusRow as ComponentSurface5 } from '../../../features/self-onboarding-to-first-dashboard/components.jsx';


const meta = {
  title: 'Slices/SL-004',
  parameters: {
    layout: 'centered',
    fabric: storybookContract,
  },
};

export default meta;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <section className="app-panel">{children}</section>
    </main>
  );
}

function ContractSurface({ title, type }: { title: string; type: 'component' | 'screen' }) {
  return (
    <StoryFrame>
      <p className="kicker">{type} contract story</p>
      <h1>{title}</h1>
      <p className="subtle">{storybookContract.slice_title}</p>
      <section>
        <strong>Required states</strong>
        <ul>{storybookContract.required_states.map((state) => <li key={state}>{state}</li>)}</ul>
      </section>
      <section>
        <strong>Semantic statuses</strong>
        <ul>{storybookContract.required_statuses.map((status) => <li key={status}>{status}</li>)}</ul>
      </section>
      <section>
        <strong>Priority groups</strong>
        <ul>{storybookContract.required_priorities.map((priority) => <li key={priority}>{priority}</li>)}</ul>
      </section>
    </StoryFrame>
  );
}

function ComponentFallback({ component }: { component: string }) {
  const token = component.toLowerCase();
  if (token.includes('status')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <div>
          <span className="status-pill status-pill-due">Due</span>{' '}
          <span className="status-pill status-pill-soon">Upcoming</span>
        </div>
      </StoryFrame>
    );
  }
  if (token.includes('item')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <article className="health-plan-item">
          <button type="button" className="health-plan-item-button">
            <div>
              <h4>Annual blood panel</h4>
              <p className="subtle">Due in 1 month</p>
            </div>
            <span className="status-pill status-pill-due">Due</span>
          </button>
        </article>
      </StoryFrame>
    );
  }
  if (token.includes('section')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="priority-section priority-today">
          <h3>Today</h3>
        </section>
        <section className="priority-section priority-soon">
          <h3>Soon</h3>
        </section>
        <section className="priority-section priority-later">
          <h3>Later</h3>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('score')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="health-score-card">
          <p className="kicker">Health Score</p>
          <p className="health-score-value">78</p>
          <p className="subtle">4 due now, 2 due soon.</p>
        </section>
      </StoryFrame>
    );
  }
  if (token.includes('profile')) {
    return (
      <StoryFrame>
        <h1>{component}</h1>
        <section className="family-profile-card">
          <p className="kicker">Active profile</p>
          <h2>Alex, age 42</h2>
          <p className="subtle">3 actions need attention soon.</p>
        </section>
      </StoryFrame>
    );
  }
  return <ContractSurface title={component} type="component" />;
}

export const AppShellVisual = {
  render: () => <ComponentSurface2 title="Storybook Surface" />,
  name: 'Product/AppShell',
};

export const HealthPlanItemVisual = {
  render: () => <ComponentSurface3 item={{
      catalogItemId: 'storybook-item-1',
      name: 'Annual wellness visit',
      status: 'due',
      statusLabel: 'Due now',
      category: 'checkup',
      categoryLabel: 'Checkups',
      cadenceLabel: 'Every year',
      whyItMatters: 'Regular preventive visits help catch issues early and keep your plan on track.',
    }} />,
  name: 'Product/HealthPlanItem',
};

export const StatusPillVisual = {
  render: () => <ComponentSurface4 status="due" label="Due now" />,
  name: 'Product/StatusPill',
};

export const VaccinationStatusRowVisual = {
  render: () => <ComponentSurface5 vaccine="Influenza vaccine" status="planned" statusLabel="Planned" lastDate={null} />,
  name: 'Product/VaccinationStatusRow',
};

export const FamilyVisual = {
  render: () => <RouteSurface1 />,
  name: 'Screens/family',
};
