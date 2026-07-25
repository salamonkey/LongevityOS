import React, { useMemo, useState } from 'react';
import { AppShell, StatusPill } from '../self-onboarding-to-first-dashboard/components.jsx';
import {
  DETAIL_ORIGIN,
  PLAN_CATEGORIES,
  getCategoryLabel,
} from './model.js';
import {
  buildCategoryTabs,
  buildHealthPlanReadModel,
  resolveDetailBackTarget,
  resolveItemDetail,
} from './projection.js';

function ListEmptyState({ activeCategory, onSwitchCategory }) {
  const nextCategory = activeCategory === PLAN_CATEGORIES.checkup
    ? PLAN_CATEGORIES.vaccination
    : PLAN_CATEGORIES.checkup;

  return (
    <section className="sl002-empty-state" role="status" aria-live="polite">
      <h3>No {getCategoryLabel(activeCategory).toLowerCase()} in your plan right now</h3>
      <p>
        There are no {getCategoryLabel(activeCategory).toLowerCase()} to show for this plan yet.
      </p>
      <button
        type="button"
        className="sl001-primary-action"
        onClick={() => onSwitchCategory(nextCategory)}
      >
        View {getCategoryLabel(nextCategory)}
      </button>
    </section>
  );
}

function PlanRow({ item, onOpen }) {
  return (
    <li>
      <button type="button" className="sl002-plan-row" onClick={() => onOpen(item.itemKey)}>
        <span className="sl002-plan-row-copy">
          <span className="sl002-plan-row-title">{item.displayName}</span>
          <span className="sl002-plan-row-cadence">{item.cadenceText}</span>
        </span>
        <StatusPill status={item.status} label={item.statusLabel} />
      </button>
    </li>
  );
}

function NotFoundState({ onRecover }) {
  return (
    <section className="sl002-not-found" role="alert">
      <h2>This item is not available in your current plan</h2>
      <p>It may no longer be part of this plan. You can return to your checkups and vaccinations list.</p>
      <button type="button" className="sl001-primary-action" onClick={onRecover}>Return to your plan</button>
    </section>
  );
}

function DetailView({ item }) {
  return (
    <section className="sl002-detail-view" aria-label={`${item.displayName} details`}>
      <div className="sl002-detail-topline">
        <StatusPill status={item.status} label={item.statusLabel} />
        <span className="sl002-detail-category">{item.interventionTypeLabel ?? item.categoryLabel}</span>
      </div>

      <section className="sl002-detail-section" aria-label="Cadence">
        <h3>Cadence</h3>
        <p>{item.cadenceText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Recommendation">
        <h3>Recommendation</h3>
        <p>{item.recommendationText}</p>
      </section>

      <section className="sl002-detail-section" aria-label="Why it matters">
        <h3>Why it matters</h3>
        <p>{item.whyItMattersText}</p>
      </section>
    </section>
  );
}

export default function HealthPlanBrowsingAndItemDetail({
  planSnapshot,
  initialCategory = PLAN_CATEGORIES.checkup,
  initialItemKey,
  initialOrigin = DETAIL_ORIGIN.direct,
  initialReturnToVaccinationTracker = false,
  onNavigate,
}) {
  const readModel = useMemo(() => buildHealthPlanReadModel(planSnapshot), [planSnapshot]);

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [detailState, setDetailState] = useState(initialItemKey ? {
    itemKey: initialItemKey,
    origin: initialOrigin,
    returnToVaccinationTracker: Boolean(initialReturnToVaccinationTracker),
  } : null);

  if (!planSnapshot) {
    return (
      <AppShell title="Your preventive plan">
        <p className="sl001-support-copy">Loading your checkups and vaccinations...</p>
        <div className="sl002-loading-block" aria-hidden="true" />
        <div className="sl002-loading-block" aria-hidden="true" />
      </AppShell>
    );
  }

  const detailItem = detailState ? resolveItemDetail(readModel, detailState.itemKey) : null;
  const activeItems = activeCategory === PLAN_CATEGORIES.vaccination ? readModel.vaccinations : readModel.checkups;

  const handleOpenDetail = (itemKey) => {
    setDetailState({
      itemKey,
      origin: activeCategory === PLAN_CATEGORIES.vaccination ? DETAIL_ORIGIN.vaccinations : DETAIL_ORIGIN.checkups,
      returnToVaccinationTracker: false,
    });
  };

  const handleBackFromDetail = () => {
    const target = resolveDetailBackTarget({
      origin: detailState?.origin,
      detailItem,
    });

    if (target.destination === DETAIL_ORIGIN.dashboard) {
      if (typeof onNavigate === 'function') {
        onNavigate(target);
      } else if (detailItem) {
        setActiveCategory(detailItem.category);
      }
      setDetailState(null);
      return;
    }

    if (target.destination === DETAIL_ORIGIN.vaccinations) {
      if (detailState?.returnToVaccinationTracker && typeof onNavigate === 'function') {
        onNavigate(target);
        setDetailState(null);
        return;
      }

      setActiveCategory(PLAN_CATEGORIES.vaccination);
      setDetailState(null);
      return;
    }

    setActiveCategory(PLAN_CATEGORIES.checkup);
    setDetailState(null);
  };

  const handleBackToDashboard = () => {
    if (typeof onNavigate === 'function') {
      onNavigate({ destination: DETAIL_ORIGIN.dashboard });
    }
  };

  if (detailState && !detailItem) {
    return (
      <AppShell title="Plan item unavailable">
        <NotFoundState
          onRecover={() => {
            setActiveCategory(PLAN_CATEGORIES.checkup);
            setDetailState(null);
          }}
        />
      </AppShell>
    );
  }

  if (detailItem) {
    return (
      <AppShell
        title={detailItem.displayName}
        headerAction={(
          <button type="button" className="sl002-back-button" onClick={handleBackFromDetail}>
            Back
          </button>
        )}
      >
        <DetailView item={detailItem} />
      </AppShell>
    );
  }

  const tabs = buildCategoryTabs(activeCategory);

  return (
    <AppShell title={getCategoryLabel(activeCategory)}>
      {typeof onNavigate === 'function' ? (
        <button type="button" className="sl002-back-to-dashboard" onClick={handleBackToDashboard}>
          Back to dashboard
        </button>
      ) : null}
      <div className="sl002-category-switch" role="tablist" aria-label="Plan categories">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className={tab.isActive ? 'sl002-tab is-active' : 'sl002-tab'}
            aria-selected={tab.isActive}
            onClick={() => setActiveCategory(tab.category)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeItems.length === 0 ? (
        <ListEmptyState activeCategory={activeCategory} onSwitchCategory={setActiveCategory} />
      ) : (
        <ul className="sl002-plan-list" aria-label={`${getCategoryLabel(activeCategory)} list`}>
          {activeItems.map((item) => (
            <PlanRow key={item.itemKey} item={item} onOpen={handleOpenDetail} />
          ))}
        </ul>
      )}
    </AppShell>
  );
}
