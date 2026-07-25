import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components';
import { Card, ProgressRing, ListRow, BodyMap, IconButton, Logo, Icon, Button, Avatar } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { buildDashboardProjection } from './dashboard';
import { buildBodyMapPoints, buildRegionDetailData, resolveRegionRouteForRegionId } from './bodyRegions.js';
import { PLAN_CATEGORIES } from '../health-plan-browsing-and-item-detail/model.js';
import { getCategoryIcon, getStatusBadgeStatus, getStatusLabelKey, getStatusTone, getToneColors } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { buildTimelineItems, buildTimelineGroups } from '../plan-timeline/index.js';

const DASHBOARD_SECTION_VISIBILITY_STORAGE_KEY = 'sl001.dashboard.section-visibility.v1';
const COLLAPSIBLE_SECTION_PRIORITIES = new Set(['soon', 'later']);
const DEFAULT_DASHBOARD_SECTION_VISIBILITY = Object.freeze({
  soon: false,
  later: false,
});

function normalizeDashboardSectionVisibility(value) {
  const candidate = value && typeof value === 'object' ? value : {};
  return {
    soon: typeof candidate.soon === 'boolean' ? candidate.soon : DEFAULT_DASHBOARD_SECTION_VISIBILITY.soon,
    later: typeof candidate.later === 'boolean' ? candidate.later : DEFAULT_DASHBOARD_SECTION_VISIBILITY.later,
  };
}

function readDashboardSectionVisibilityByProfile() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_SECTION_VISIBILITY_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadDashboardSectionVisibility(profileId) {
  const normalizedProfileId = String(profileId ?? '').trim() || 'default';
  const byProfile = readDashboardSectionVisibilityByProfile();
  return normalizeDashboardSectionVisibility(byProfile[normalizedProfileId]);
}

function persistDashboardSectionVisibility(profileId, visibility) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedProfileId = String(profileId ?? '').trim() || 'default';
  const normalizedVisibility = normalizeDashboardSectionVisibility(visibility);

  try {
    const byProfile = readDashboardSectionVisibilityByProfile();
    byProfile[normalizedProfileId] = normalizedVisibility;
    window.localStorage.setItem(DASHBOARD_SECTION_VISIBILITY_STORAGE_KEY, JSON.stringify(byProfile));
  } catch {
    // Ignore persistence failures and keep in-memory behavior.
  }
}

const SECTION_TITLE_KEY_BY_PRIORITY = Object.freeze({
  today: 'dashboard.sectionToday',
  soon: 'dashboard.sectionSoon',
  later: 'dashboard.sectionLater',
});

function resolveGreetingKey(now) {
  const hour = now.getHours();
  if (hour < 12) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

function DashboardSection({ priority, items, onOpenDetail, collapsible, isOpen, onToggle, t }) {
  const canToggle = collapsible && typeof onToggle === 'function';
  const expanded = canToggle ? Boolean(isOpen) : true;
  const headingId = `dashboard-section-${priority}`;
  const contentId = `${headingId}-content`;
  const title = t(SECTION_TITLE_KEY_BY_PRIORITY[priority] ?? 'dashboard.sectionLater');

  return (
    <section aria-labelledby={headingId}>
      {canToggle ? (
        <button
          type="button"
          className="vitalis-dash-section-toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={onToggle}
        >
          <span id={headingId} className="sec-label">{title}</span>
          <span className="vitalis-dash-section-count" aria-hidden="true">
            {items.length}
            <span className={`vitalis-dash-section-chevron${expanded ? ' is-open' : ''}`}>▾</span>
          </span>
        </button>
      ) : (
        <p id={headingId} className="sec-label">{title}</p>
      )}
      {expanded ? (
        <div id={contentId} className="rows">
          {items.length === 0 ? (
            <p className="vitalis-dash-empty">{t('dashboard.emptySection')}</p>
          ) : (
            items.map((item) => (
              <ListRow
                key={item.catalogItemId}
                icon={getCategoryIcon(item.category)}
                tone={getStatusTone(item.status)}
                title={item.name}
                subtitle={item.cadenceLabel}
                badge={t(getStatusLabelKey(item.status))}
                badgeStatus={getStatusBadgeStatus(item.status)}
                onClick={typeof onOpenDetail === 'function' ? () => onOpenDetail(item) : undefined}
              />
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

const REGION_TONE_COLORS = Object.freeze({
  action: ['var(--status-overdue-soft)', 'var(--status-overdue)'],
  soon: ['var(--status-upcoming-soft)', 'var(--status-upcoming)'],
  ok: ['var(--status-done-soft)', 'var(--status-done)'],
});

function RegionDetailSection({ label, items }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="sec-label">{label}</p>
      <div className="rows">
        {items.map((item) => (
          <ListRow
            key={item.itemKey}
            icon={getCategoryIcon(item.category)}
            tone={getStatusTone(item.status)}
            title={item.name}
            subtitle={item.cadenceLabel}
            trailingChevron={false}
          />
        ))}
      </div>
    </div>
  );
}

function RegionDetailView({ region, onBack, onViewInTab, t }) {
  const [chipBg, chipFg] = REGION_TONE_COLORS[region.status] ?? REGION_TONE_COLORS.ok;
  const viewLabelKey = region.id === 'immunizations' ? 'bodyRegionDetail.viewInVaccinations' : 'bodyRegionDetail.viewInCheckups';

  return (
    <div className="vitalis-region-detail">
      <div className="vitalis-region-detail-header">
        <IconButton icon="chevron-left" variant="ghost" label={t('common.back')} onClick={onBack} />
        <span className="vitalis-region-detail-title">{region.label}</span>
        <Logo size={24} word={false} style={{ marginRight: 8 }} />
      </div>
      <div className="vitalis-region-detail-body">
        <Card padding={16} className="vitalis-region-detail-summary">
          <span className="vitalis-region-detail-icon-chip" style={{ background: chipBg, color: chipFg }}>
            <Icon name={region.icon} size={26} />
          </span>
          <div>
            <p className="vitalis-region-detail-summary-title">{region.label}</p>
            <p className="vitalis-region-detail-summary-status">{region.statusText}</p>
          </div>
        </Card>

        <RegionDetailSection label={t('bodyRegionDetail.sectionOpen')} items={region.dueItems} />
        <RegionDetailSection label={t('bodyRegionDetail.sectionUpcoming')} items={region.soonItems} />
        <RegionDetailSection label={t('bodyRegionDetail.sectionHistory')} items={region.historyItems} />

        {region.hasItems ? (
          <Button variant="primary" size="lg" fullWidth iconLeft="plus" onClick={onViewInTab} className="vitalis-region-detail-cta">
            {t(viewLabelKey)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TimelineRailNode({ item, kind, onOpen, t }) {
  const isToday = kind === 'today';
  const tone = isToday ? 'primary' : getStatusTone(item?.status);
  const [chipBg, chipFg] = getToneColors(tone);

  return (
    <button type="button" className="vitalis-rail-node" onClick={onOpen}>
      {isToday ? (
        <span className="vitalis-rail-node-dot vitalis-rail-node-dot--today">
          <span className="vitalis-rail-node-halo" />
          <span className="vitalis-rail-node-core" />
        </span>
      ) : (
        <span
          className={`vitalis-rail-node-dot${kind === 'past' ? ' vitalis-rail-node-dot--past' : ''}`}
          style={{ background: kind === 'past' ? 'var(--surface-card)' : chipBg, color: chipFg, borderColor: kind === 'past' ? 'var(--status-done)' : chipFg }}
        >
          <Icon name={kind === 'past' ? 'check' : getCategoryIcon(item.category)} size={16} />
        </span>
      )}
      <span className="vitalis-rail-node-date" style={{ color: isToday ? 'var(--color-primary)' : chipFg }}>
        {isToday ? t('dashboard.timelineToday') : item.dateLabel}
      </span>
      <span className="vitalis-rail-node-title">{isToday ? '' : item.name}</span>
    </button>
  );
}

function TimelineRail({ planSnapshot, locale, catalogGeneration, onOpen, onOpenItem, t }) {
  const items = useMemo(() => {
    if (!planSnapshot) return [];
    return buildTimelineItems(planSnapshot, { locale });
  }, [planSnapshot, locale, catalogGeneration]);

  const groups = useMemo(() => buildTimelineGroups(items), [items]);

  const past = (groups.find((group) => group.label === 'Completed and past')?.items ?? []).slice(-2);
  const future = groups
    .filter((group) => group.label === 'Next 90 days' || group.label === 'Later')
    .flatMap((group) => group.items)
    .slice(0, 3);

  if (past.length === 0 && future.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="vitalis-rail-header">
        <div className="vitalis-rail-header-title">
          <span className="vitalis-rail-icon-chip"><Icon name="git-commit-horizontal" size={17} /></span>
          <span>{t('dashboard.timelineTitle')}</span>
        </div>
        <button type="button" className="vitalis-rail-link" onClick={onOpen}>
          {t('dashboard.timelineViewAll')}
          <Icon name="chevron-right" size={15} />
        </button>
      </div>
      <div className="vitalis-rail-track">
        <div className="vitalis-rail-line" />
        <div className="vitalis-rail-nodes">
          {past.map((item, index) => (
            <TimelineRailNode key={`past-${index}`} item={item} kind="past" onOpen={() => onOpenItem(item)} t={t} />
          ))}
          <TimelineRailNode key="today" kind="today" onOpen={onOpen} t={t} />
          {future.map((item, index) => (
            <TimelineRailNode key={`future-${index}`} item={item} kind="future" onOpen={() => onOpenItem(item)} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SelfOnboardingToFirstDashboard({
  initialProfile = null,
  initialPlanSnapshot = null,
  onOpenHealthPlan,
  onOpenSettings,
  onOpenProfile,
  onOpenTimeline,
  catalogGeneration = 0,
}) {
  const { t, locale } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [planSnapshot, setPlanSnapshot] = useState(initialPlanSnapshot);
  const [openRegionId, setOpenRegionId] = useState(null);
  const [dashboardSectionVisibility, setDashboardSectionVisibility] = useState(() => (
    loadDashboardSectionVisibility(initialProfile?.profileId)
  ));
  const hadProjectionRef = useRef(Boolean(initialProfile && initialPlanSnapshot));

  useEffect(() => {
    setProfile(initialProfile);
    setPlanSnapshot(initialPlanSnapshot);
  }, [initialPlanSnapshot, initialProfile]);

  useEffect(() => {
    if (!profile?.profileId) {
      return;
    }

    setDashboardSectionVisibility(loadDashboardSectionVisibility(profile.profileId));
  }, [profile?.profileId]);

  const projection = useMemo(() => {
    if (!planSnapshot || !profile) {
      return null;
    }

    return buildDashboardProjection(planSnapshot, profile);
  }, [planSnapshot, profile, locale, catalogGeneration]);

  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!projection || projection.healthScore === null || projection.healthScore === undefined) {
      setAnimatedScore(0);
      return undefined;
    }

    const target = Math.round(projection.healthScore);
    let current = 0;
    setAnimatedScore(0);
    const id = setInterval(() => {
      current += Math.max(1, Math.ceil((target - current) / 6));
      if (current >= target) {
        current = target;
        clearInterval(id);
      }
      setAnimatedScore(current);
    }, 45);

    return () => clearInterval(id);
  }, [projection?.healthScore]);

  const bodyMapPoints = useMemo(() => {
    if (!planSnapshot) {
      return [];
    }

    return buildBodyMapPoints(planSnapshot.items, { t });
  }, [planSnapshot, t, locale, catalogGeneration]);

  const openRegionDetail = useMemo(() => {
    if (!openRegionId || !planSnapshot) {
      return null;
    }

    return buildRegionDetailData(openRegionId, planSnapshot.items, { t });
  }, [openRegionId, planSnapshot, t, locale, catalogGeneration]);

  useEffect(() => {
    if (!projection) {
      hadProjectionRef.current = false;
      return;
    }

    if (hadProjectionRef.current) {
      return;
    }

    const scrollToTop = () => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };

    // iOS Safari can preserve previous scroll offset during same-view surface swaps.
    scrollToTop();
    requestAnimationFrame(scrollToTop);
    setTimeout(scrollToTop, 0);
    hadProjectionRef.current = true;
  }, [projection]);

  const openHealthPlanFromDashboardItem = (item) => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile || !item?.catalogItemId) return;
    onOpenHealthPlan({
      planSnapshot,
      profile,
      initialItemKey: item.catalogItemId,
      initialOrigin: 'dashboard',
      initialCategory: item.category,
    });
  };

  const openHealthPlanFromTimelineItem = (item) => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile || !item?.itemKey) return;
    onOpenHealthPlan({
      planSnapshot,
      profile,
      initialItemKey: item.itemKey,
      initialOrigin: 'dashboard',
      initialCategory: item.category,
    });
  };

  const openHealthPlanForRegion = (regionId) => {
    if (typeof onOpenHealthPlan !== 'function' || !planSnapshot || !profile) return;
    const route = resolveRegionRouteForRegionId(regionId);
    onOpenHealthPlan({
      planSnapshot,
      profile,
      initialItemKey: undefined,
      initialOrigin: 'dashboard',
      initialCategory: route === 'vaccinations' ? PLAN_CATEGORIES.vaccination : PLAN_CATEGORIES.checkup,
    });
  };

  const handleSectionToggle = (priority) => {
    if (!COLLAPSIBLE_SECTION_PRIORITIES.has(priority) || !profile?.profileId) {
      return;
    }

    setDashboardSectionVisibility((previous) => {
      const next = {
        ...previous,
        [priority]: !Boolean(previous?.[priority]),
      };
      persistDashboardSectionVisibility(profile.profileId, next);
      return next;
    });
  };

  if (!projection) {
    return (
      <AppShell title={null}>
        <p>{t('dashboard.loading')}</p>
      </AppShell>
    );
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const sex = profile?.gender === 'male' ? 'm' : 'w';
  const dueTodayCount = projection.sections.find((section) => section.priority === 'today')?.items.length ?? 0;

  return (
    <>
      <AppShell title={null}>
        <div className="vitalis-dash-header">
          <div>
            <p className="vitalis-dash-header-sub">
              <Logo size={15} word={false} />
              {dateLabel}
            </p>
            <h1 className="vitalis-dash-header-title">{t(resolveGreetingKey(now))}, {projection.profileName}</h1>
          </div>
          <div className="vitalis-dash-header-actions">
            <IconButton icon="settings" variant="surface" label={t('dashboard.settingsLabel')} onClick={onOpenSettings} />
            <button type="button" className="vitalis-dash-header-avatar" onClick={onOpenProfile} aria-label={t('dashboard.profileLabel')}>
              <Avatar name={projection.profileName} size={40} />
            </button>
          </div>
        </div>

        <Card padding={16} className="vitalis-dash-hero">
          <div className="vitalis-dash-hero-glow" aria-hidden="true" />
          <div className="vitalis-dash-hero-top">
            <div className="vitalis-dash-hero-copy">
              <p className="vitalis-dash-hero-label">{t('bodyRegions.title')}</p>
              <p className="vitalis-dash-hero-status">{t('dashboard.dueToday', { count: dueTodayCount })}</p>
            </div>
            <div className="vitalis-dash-hero-ring-card">
              <ProgressRing
                value={animatedScore}
                size={60}
                stroke={6}
                label={
                  <span className="vitalis-dash-hero-ring-value">
                    {projection.healthScore === null || projection.healthScore === undefined ? 'N/A' : animatedScore}
                  </span>
                }
              />
              <p className="vitalis-dash-hero-ring-label">{t('dashboard.scoreTitle')}</p>
            </div>
          </div>

          {bodyMapPoints.length > 0 ? (
            <>
              <div className="vitalis-dash-hero-bodymap">
                <BodyMap points={bodyMapPoints} sex={sex} onOpen={setOpenRegionId} showLegend={false} />
              </div>
              <div className="vitalis-dash-hero-divider" />
            </>
          ) : null}

          <TimelineRail
            planSnapshot={planSnapshot}
            locale={locale}
            catalogGeneration={catalogGeneration}
            onOpen={onOpenTimeline}
            onOpenItem={openHealthPlanFromTimelineItem}
            t={t}
          />
        </Card>

        <div className="vitalis-dash-sections">
          {projection.sections.map((section) => (
            <DashboardSection
              key={section.priority}
              priority={section.priority}
              items={section.items}
              onOpenDetail={typeof onOpenHealthPlan === 'function' ? openHealthPlanFromDashboardItem : undefined}
              collapsible={COLLAPSIBLE_SECTION_PRIORITIES.has(section.priority)}
              isOpen={
                COLLAPSIBLE_SECTION_PRIORITIES.has(section.priority)
                  ? Boolean(dashboardSectionVisibility?.[section.priority])
                  : true
              }
              onToggle={() => handleSectionToggle(section.priority)}
              t={t}
            />
          ))}
        </div>
      </AppShell>
      {openRegionDetail ? (
        <RegionDetailView
          region={openRegionDetail}
          onBack={() => setOpenRegionId(null)}
          onViewInTab={() => {
            setOpenRegionId(null);
            openHealthPlanForRegion(openRegionId);
          }}
          t={t}
        />
      ) : null}
    </>
  );
}
