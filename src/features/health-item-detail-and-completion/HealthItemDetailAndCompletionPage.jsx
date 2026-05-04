import React, { useEffect, useMemo, useState } from 'react';
import {
  HEALTH_ITEM_STATUS,
  calculateDisplayedHealthScore,
  getHealthItemById,
  getHealthItemStatusContext,
  groupHealthItemsForDashboard,
  loadPersistedHealthItems,
  markHealthItemDone,
  mergePersistedHealthItems,
  persistHealthItems,
} from './healthItemsModel.js';

export function HealthItemDetailAndCompletionPage({ profile, onRestart }) {
  const [detailHashState, setDetailHashState] = useState(() => readDetailHashStateFromHash());
  const { itemId: activeItemId, fromPlan: isFromPlanRoute } = detailHashState;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [healthItems, setHealthItems] = useState(() => {
    const persisted = loadPersistedHealthItems(profile.profileId);
    return mergePersistedHealthItems(profile, persisted);
  });

  useEffect(() => {
    const persisted = loadPersistedHealthItems(profile.profileId);
    setHealthItems(mergePersistedHealthItems(profile, persisted));
    setDetailHashState(readDetailHashStateFromHash());
    setIsSaving(false);
    setSaveError('');
    setSaveSuccess('');
  }, [profile]);

  useEffect(() => {
    persistHealthItems(profile.profileId, healthItems);
  }, [profile.profileId, healthItems]);

  useEffect(() => {
    if (!globalThis.location) {
      return;
    }

    if (activeItemId) {
      const encodedItemId = encodeURIComponent(activeItemId);
      const nextHash = isFromPlanRoute
        ? `#/health-item/${encodedItemId}?from=plan`
        : `#/health-item/${encodedItemId}`;
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
      return;
    }

    if (globalThis.location.hash.startsWith('#/health-item/')) {
      const nextHash = isFromPlanRoute ? '#/plan' : '#/dashboard';
      if (globalThis.location.hash !== nextHash) {
        globalThis.location.hash = nextHash;
      }
    }
  }, [activeItemId, isFromPlanRoute]);

  const groupedItems = useMemo(() => groupHealthItemsForDashboard(healthItems), [healthItems]);
  const displayedScore = useMemo(() => calculateDisplayedHealthScore(healthItems), [healthItems]);
  const activeItem = activeItemId
    ? getHealthItemById(profile.profileId, activeItemId, healthItems)
    : null;
  const backButtonLabel = isFromPlanRoute ? 'Back to health plan' : 'Back to dashboard';
  const handleBack = () => {
    setDetailHashState((current) => ({ ...current, itemId: null }));
    setSaveError('');
    setSaveSuccess('');
  };
  const requestedItemTitle = useMemo(
    () => resolveRequestedItemTitle(profile, healthItems, activeItemId),
    [activeItemId, healthItems, profile],
  );

  if (!activeItemId) {
    return (
      <main className="app-shell">
        <section className="panel hero">
          <p className="eyebrow">Active profile dashboard</p>
          <h1>Your personalized plan is ready</h1>
          <p className="lede">
            Age {profile.ageYears} · {capitalize(profile.gender)}
          </p>
          <button type="button" className="secondary" onClick={onRestart}>
            Start over
          </button>
        </section>

        <section className="panel score-card" aria-label="Health progress score">
          <div>
            <p className="eyebrow">Health progress score</p>
            <h2>{displayedScore}</h2>
          </div>
          <p className="helper">
            As you mark items done, this score updates to reflect your completed preventive care steps.
          </p>
        </section>

        <section className="dashboard-grid">
          {['Today', 'Soon', 'Later'].map((horizon) => (
            <PrioritySection
              key={horizon}
              title={horizon}
              items={groupedItems[horizon]}
              onOpenItem={(itemId) => {
                setDetailHashState({
                  itemId,
                  fromPlan: false,
                });
              }}
            />
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="panel detail-panel">
        {!activeItem ? (
          <>
            <div className="detail-header">
              <button type="button" className="secondary back-button" onClick={handleBack}>
                {backButtonLabel}
              </button>
            </div>
            <h1 className="detail-title">{requestedItemTitle ?? 'Review this care step'}</h1>
            <div className="inline-error" role="status">
              <p>
                {requestedItemTitle
                  ? `We couldn't load details for ${requestedItemTitle} right now.`
                  : "We couldn't load this health item right now."}
              </p>
            </div>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const persisted = loadPersistedHealthItems(profile.profileId);
                  setHealthItems(mergePersistedHealthItems(profile, persisted));
                }}
              >
                Try again
              </button>
              <button type="button" className="secondary" onClick={handleBack}>
                {backButtonLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="detail-header">
              <button type="button" className="secondary back-button" onClick={handleBack}>
                {backButtonLabel}
              </button>
              <span className={`status-chip status-${activeItem.status.toLowerCase()}`}>
                {activeItem.status}
              </span>
            </div>
            <h1 className="detail-title">{activeItem.title}</h1>

            <section className="detail-block" aria-label="Action">
              <h2>Action</h2>
              <p>
                {toDisplayText(
                  activeItem.actionLabel,
                  "We don't have a clear next step for this item right now. Review why it matters and check back soon.",
                )}
              </p>
            </section>

            <section className="detail-block" aria-label="Recommendation frequency">
              <h2>Recommendation frequency</h2>
              <p>
                {toDisplayText(
                  activeItem.recommendationFrequency,
                  "No timing is listed right now. If you're unsure when to do this, follow your care team's guidance.",
                )}
              </p>
            </section>

            <section className="detail-block" aria-label="Why it matters">
              <h2>Why it matters</h2>
              <p>{toDisplayText(activeItem.whyItMatters, 'This action supports your preventive health plan.')}</p>
            </section>

            <section className="detail-block" aria-label="Current status">
              <h2>Current status</h2>
              <p>{getHealthItemStatusContext(activeItem)}</p>
            </section>

            {saveError ? (
              <p className="inline-error" role="status">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p className="inline-success" role="status">
                {saveSuccess}
              </p>
            ) : null}

            {activeItem.status !== HEALTH_ITEM_STATUS.DONE ? (
              <div className="detail-action-bar">
                <button
                  type="button"
                  className="primary"
                  disabled={isSaving}
                  onClick={() => {
                    setIsSaving(true);
                    setSaveError('');
                    setSaveSuccess('');

                    globalThis.setTimeout(() => {
                      try {
                        setHealthItems((current) =>
                          markHealthItemDone(profile.profileId, activeItem.id, current, new Date()),
                        );
                        setSaveSuccess('Marked as done. Your dashboard and score are now updated.');
                      } catch {
                        setSaveError("Couldn't mark this as done. Try again.");
                      } finally {
                        setIsSaving(false);
                      }
                    }, 280);
                  }}
                >
                  {isSaving ? 'Saving...' : 'Mark as Done'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function PrioritySection({ title, items, onOpenItem }) {
  return (
    <section className="panel section-card">
      <h2>{title}</h2>
      <ul className="priority-list">
        {items.map((item) => (
          <li key={item.id} className="health-item">
            <button
              type="button"
              className="health-item-button"
              onClick={() => {
                onOpenItem(item.id);
              }}
            >
              <span className="health-item-header">
                <span className="health-item-title">{item.title}</span>
                <span className="badge">{item.recommendationFrequency}</span>
              </span>
              <span className="health-item-why">{item.whyItMatters}</span>
            </button>
          </li>
        ))}
        {items.length === 0 ? <li className="health-item-empty">No open items in this horizon.</li> : null}
      </ul>
    </section>
  );
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readDetailHashStateFromHash() {
  if (!globalThis.location?.hash) {
    return {
      itemId: null,
      fromPlan: false,
    };
  }

  const match = globalThis.location.hash.match(/^#\/health-item\/([^?]+)(?:\?(.*))?$/);
  if (!match) {
    return {
      itemId: null,
      fromPlan: false,
    };
  }

  const searchParams = new URLSearchParams(match[2] ?? '');
  return {
    itemId: safeDecodeURIComponent(match[1]),
    fromPlan: searchParams.get('from') === 'plan',
  };
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toDisplayText(value, fallback) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

function resolveRequestedItemTitle(profile, healthItems, itemId) {
  if (!itemId) {
    return null;
  }

  const itemFromHealthList = healthItems.find((item) => item.id === itemId);
  const itemFromProfilePlan = Array.isArray(profile?.planItems)
    ? profile.planItems.find((item) => item.itemCode === itemId)
    : null;

  const title = String(itemFromHealthList?.title ?? itemFromProfilePlan?.title ?? '').trim();
  return title.length > 0 ? title : null;
}

export default HealthItemDetailAndCompletionPage;
