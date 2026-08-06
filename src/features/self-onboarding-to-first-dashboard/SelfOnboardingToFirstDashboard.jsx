import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components';
import { Card, ProgressRing, ListRow, BodyMap, IconButton, Logo, Icon, Button, Sheet } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import { buildDashboardProjection } from './dashboard';
import { buildBodyMapPoints, buildRegionDetailData, resolveRegionRouteForRegionId } from './bodyRegions.js';
import { PLAN_CATEGORIES } from '../health-plan-browsing-and-item-detail/model.js';
import { getCategoryIcon, getStatusTone, getToneColors } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import { buildTimelineItems, buildTimelineGroups } from '../plan-timeline/index.js';
import { computeRiskProfileReviewStatus, RISK_PROFILE_TOTAL_QUESTIONS } from '../live-enrollment/riskProfile.js';
import { FeedbackSheet } from '../feedback-and-issue-reporting/index.js';
import { useTodayKey } from '../../lib/useTodayKey.js';

const BMI_CATEGORY_LABEL_KEY = Object.freeze({
  underweight: 'dashboard.bmiCategoryUnderweight',
  normal: 'dashboard.bmiCategoryNormal',
  overweight: 'dashboard.bmiCategoryOverweight',
  obese: 'dashboard.bmiCategoryObese',
});

const TIME_AGO_LABEL_KEY = Object.freeze({
  day: 'dashboard.timeAgoDay',
  days: 'dashboard.timeAgoDays',
  week: 'dashboard.timeAgoWeek',
  weeks: 'dashboard.timeAgoWeeks',
  month: 'dashboard.timeAgoMonth',
  months: 'dashboard.timeAgoMonths',
  year: 'dashboard.timeAgoYear',
  years: 'dashboard.timeAgoYears',
});

function formatTimeAgo(timeAgo, t) {
  if (!timeAgo) return '';
  return t(TIME_AGO_LABEL_KEY[timeAgo.unit], { count: timeAgo.value });
}

function resolveGreetingKey(now) {
  const hour = now.getHours();
  if (hour < 12) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

const REGION_TONE_COLORS = Object.freeze({
  action: ['var(--status-overdue-soft)', 'var(--status-overdue)'],
  soon: ['var(--status-upcoming-soft)', 'var(--status-upcoming)'],
  ok: ['var(--status-done-soft)', 'var(--status-done)'],
});

function RegionDetailSection({ label, items, onOpenItem }) {
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
            onClick={typeof onOpenItem === 'function' ? () => onOpenItem(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function RegionDetailView({ region, onBack, onViewInTab, onOpenItem, t }) {
  const [chipBg, chipFg] = REGION_TONE_COLORS[region.status] ?? REGION_TONE_COLORS.ok;
  const viewLabelKey = region.id === 'immunizations' ? 'bodyRegionDetail.viewInVaccinations' : 'bodyRegionDetail.viewInCheckups';

  return (
    <div className="vitalis-region-detail">
      <div className="vitalis-region-detail-header">
        <IconButton icon="chevron-left" variant="ghost" label={t('common.back')} onClick={onBack} />
        <span className="vitalis-region-detail-title">{region.label}</span>
        <Logo size={36} word={false} style={{ marginRight: 8 }} />
      </div>
      <div className="vitalis-region-detail-body">
        <div className="vitalis-region-detail-summary">
          <span className="vitalis-region-detail-icon-chip" style={{ background: chipBg, color: chipFg }}>
            <Icon name={region.icon} size={26} />
          </span>
          <div>
            <p className="vitalis-region-detail-summary-title">{region.label}</p>
            <p className="vitalis-region-detail-summary-status">{region.statusText}</p>
          </div>
        </div>

        <RegionDetailSection label={t('bodyRegionDetail.sectionOpen')} items={region.dueItems} onOpenItem={onOpenItem} />
        <RegionDetailSection label={t('bodyRegionDetail.sectionUpcoming')} items={region.soonItems} onOpenItem={onOpenItem} />
        <RegionDetailSection label={t('bodyRegionDetail.sectionHistory')} items={region.historyItems} onOpenItem={onOpenItem} />
        <RegionDetailSection label={t('bodyRegionDetail.sectionSkipped')} items={region.skippedItems} onOpenItem={onOpenItem} />

        {region.hasItems ? (
          <Button variant="primary" size="lg" fullWidth iconLeft="plus" onClick={onViewInTab} className="vitalis-region-detail-cta">
            {t(viewLabelKey)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function resolveItemRawDueDate(item) {
  const raw = item?.reminder?.scheduledFor || item?.nextDueDate || item?.dueDate || item?.initialDueDate;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatItemDueDate(dueDate, locale) {
  if (!dueDate) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(dueDate);
}

// How many display-overflow due/overdue items (see buildFutureRailNodes)
// share one "in N weeks" pacing label before moving to the next week's
// label -- a deliberate queue, not a real schedule.
const OVERFLOW_ITEMS_PER_WEEK_LABEL = 4;

// todayItems is dashboard.js's own curated "what to focus on today" set (the
// top few outstanding due/overdue items by priority, capped in
// groupItemsByPriority) -- it's a work queue, not a claim that every one of
// these has a due date of literally today, so it's always the "Heute"
// spotlight regardless of how overdue any individual item actually is.
// soonItems is everything else: items bumped out of the spotlight purely by
// the cap (still due/overdue, just not one of the top few) get a "in N
// weeks" pacing label instead of their real (already-past) due date, so a
// large backlog reads as a manageable queue rather than a wall of identical
// "Heute" or a pile of stale dates. Genuinely future items (real status
// 'soon'/'pending'/'planned') keep showing their real due date, unaffected.
function buildFutureRailNodes(todayItems, soonItems, locale, t) {
  const todayNodes = todayItems.map((item) => ({
    item,
    tone: 'primary',
    dateLabel: t('dashboard.timelineToday'),
  }));

  let overflowDueCount = 0;
  const soonNodes = soonItems.map((item) => {
    const status = String(item?.status ?? '').toLowerCase();
    const isOverflowDueItem = status === 'due' || status === 'overdue';

    let tone;
    let dateLabel;

    if (isOverflowDueItem) {
      const weekIndex = Math.floor(overflowDueCount / OVERFLOW_ITEMS_PER_WEEK_LABEL);
      overflowDueCount += 1;
      tone = 'amber';
      dateLabel = weekIndex === 0
        ? t('dashboard.timelineNextWeek')
        : t('dashboard.timelineInWeeks', { count: weekIndex + 1 });
    } else {
      tone = getStatusTone(item?.status);
      dateLabel = formatItemDueDate(resolveItemRawDueDate(item), locale);
    }

    return { item, tone, dateLabel };
  });

  return [...todayNodes, ...soonNodes];
}

function TimelineRailNode({ item, kind, tone: toneOverride, dateLabel, onOpen, t }) {
  const isToday = kind === 'today';
  const tone = isToday ? 'primary' : (toneOverride ?? getStatusTone(item?.status));
  const [chipBg, chipFg] = getToneColors(tone);
  const label = isToday ? t('dashboard.timelineToday') : (dateLabel ?? item?.dateLabel);

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
        {label}
      </span>
      <span className="vitalis-rail-node-title">{isToday ? '' : item.name}</span>
    </button>
  );
}

// The rail is the Start page's single temporal element: recent history, the
// present moment, then every due-or-overdue and upcoming item as its own
// bullet — no separate list below it. todayItems/soonItems come from
// buildDashboardProjection's capped bucketing (see groupItemsByPriority in
// dashboard.js), which is only about limiting how many items get pulled in
// this far, not about which day an item is actually due -- see
// buildFutureRailNodes for the label/tone each bullet actually renders.
function TimelineRail({ planSnapshot, todayItems, soonItems, locale, catalogGeneration, todayKey, onOpen, onOpenItem, onOpenDashboardItem, t }) {
  const items = useMemo(() => {
    if (!planSnapshot) return [];
    return buildTimelineItems(planSnapshot, { locale });
  }, [planSnapshot, locale, catalogGeneration, todayKey]);

  const groups = useMemo(() => buildTimelineGroups(items), [items]);

  const past = (groups.find((group) => group.label === 'Completed and past')?.items ?? []).slice(-2);
  const futureNodes = buildFutureRailNodes(todayItems, soonItems, locale, t);

  if (past.length === 0 && todayItems.length === 0 && soonItems.length === 0) {
    return null;
  }

  return (
    <Card padding={16} className="vitalis-dash-timeline-card">
      <div className="vitalis-rail-header">
        <h3 className="vitalis-dash-card-title">{t('dashboard.timelineTitle')}</h3>
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
          {futureNodes.map(({ item, tone, dateLabel }) => {
            return (
              <TimelineRailNode
                key={`future-${item.catalogItemId}`}
                item={item}
                kind="future"
                tone={tone}
                dateLabel={dateLabel}
                onOpen={() => onOpenDashboardItem(item)}
                t={t}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function SelfOnboardingToFirstDashboard({
  initialProfile = null,
  initialPlanSnapshot = null,
  onOpenHealthPlan,
  onOpenSettings,
  onOpenRiskProfile,
  onOpenTimeline,
  catalogGeneration = 0,
  onSubmitFeedback,
  feedbackSubmitPending = false,
  feedbackSubmitError = '',
}) {
  const { t, locale } = useTranslation();
  const [profile, setProfile] = useState(initialProfile);
  const [planSnapshot, setPlanSnapshot] = useState(initialPlanSnapshot);
  const [openRegionId, setOpenRegionId] = useState(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);
  const todayKey = useTodayKey();
  const hadProjectionRef = useRef(Boolean(initialProfile && initialPlanSnapshot));

  useEffect(() => {
    setProfile(initialProfile);
    setPlanSnapshot(initialPlanSnapshot);
  }, [initialPlanSnapshot, initialProfile]);

  const projection = useMemo(() => {
    if (!planSnapshot || !profile) {
      return null;
    }

    return buildDashboardProjection(planSnapshot, profile);
  }, [planSnapshot, profile, locale, catalogGeneration, todayKey]);

  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!projection || projection.healthScore === null || projection.healthScore === undefined) {
      setAnimatedScore(0);
      return undefined;
    }

    const target = Math.round(projection.healthScore);
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedScore(target);
      return undefined;
    }

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
  }, [planSnapshot, t, locale, catalogGeneration, todayKey]);

  const openRegionDetail = useMemo(() => {
    if (!openRegionId || !planSnapshot) {
      return null;
    }

    return buildRegionDetailData(openRegionId, planSnapshot.items, { t });
  }, [openRegionId, planSnapshot, t, locale, catalogGeneration, todayKey]);

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

  if (!projection) {
    return (
      <AppShell title={null}>
        <p>{t('dashboard.loading')}</p>
      </AppShell>
    );
  }

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  const sex = profile?.gender === 'male' ? 'm' : 'w';
  const firstName = profile?.firstName || String(projection.profileName || '').split(' ')[0] || projection.profileName;
  const todayItems = projection.sections.find((section) => section.priority === 'today')?.items ?? [];
  const soonItems = projection.sections.find((section) => section.priority === 'soon')?.items ?? [];
  const riskProfileReviewedKeys = Array.isArray(profile?.riskProfileReviewedKeys) ? profile.riskProfileReviewedKeys : [];
  const riskProfileReviewed = riskProfileReviewedKeys.length > 0;
  const riskProfileReviewStatus = computeRiskProfileReviewStatus({
    reviewedKeys: riskProfileReviewedKeys,
    reviewedAt: profile?.riskProfileReviewedAt,
    cadenceMonths: profile?.riskProfileReviewCadenceMonths,
    now,
  });
  const riskProfileStale = riskProfileReviewStatus.state === 'due' || riskProfileReviewStatus.state === 'overdue';
  const riskProfileCompletionPercent = Math.round((riskProfileReviewedKeys.length / RISK_PROFILE_TOTAL_QUESTIONS) * 100);
  const riskProfileChipTone = riskProfileStale
    ? 'var(--status-upcoming)'
    : (riskProfileReviewed ? 'var(--color-secondary)' : 'var(--color-primary)');

  const handleCloseFeedbackSheet = () => {
    if (feedbackSubmitPending) return;
    setShowFeedbackSheet(false);
  };

  return (
    <>
      <AppShell title={null}>
        <div className="vitalis-dash-header">
          <div className="vitalis-dash-header-copy">
            <p className="vitalis-dash-header-sub">
              <Logo size={22} word={false} />
              {dateLabel}
            </p>
            <h1 className="vitalis-dash-header-title">{t(resolveGreetingKey(now))}, {firstName}</h1>
          </div>
          <div className="vitalis-dash-header-actions">
            <IconButton
              icon="message-circle"
              variant="surface"
              label={t('settings.reportIssue')}
              onClick={() => setShowFeedbackSheet(true)}
            />
            <IconButton icon="settings" variant="surface" label={t('dashboard.settingsLabel')} onClick={onOpenSettings} />
          </div>
        </div>

        <Card padding={16} className="vitalis-hero vitalis-dash-hero">
          <div className="vitalis-hero-glow" aria-hidden="true" />
          <div className="vitalis-dash-hero-top">
            <div className="vitalis-dash-hero-copy">
              <h3 className="vitalis-dash-card-title">{t('bodyRegions.title')}</h3>
              {typeof onOpenRiskProfile === 'function' ? (
                <>
                  <button
                    type="button"
                    className={`vitalis-risk-chip ${riskProfileStale ? 'is-stale' : (riskProfileReviewed ? 'is-reviewed' : 'is-unreviewed')}`}
                    onClick={onOpenRiskProfile}
                  >
                    <span className="vitalis-risk-chip-ring" aria-hidden="true">
                      <ProgressRing
                        value={riskProfileCompletionPercent}
                        size={18}
                        stroke={2.5}
                        color={riskProfileChipTone}
                        track="var(--slate-150)"
                        label={null}
                      />
                    </span>
                    {riskProfileStale ? t('dashboard.riskProfileCtaStale') : t('dashboard.riskProfileCta')}
                    <Icon name="chevron-right" size={14} color="var(--text-muted)" />
                  </button>
                  {riskProfileReviewed && riskProfileReviewStatus.timeAgo ? (
                    <p className={`vitalis-risk-chip-caption ${riskProfileStale ? 'is-stale' : ''}`}>
                      {t('dashboard.riskProfileReviewedCaption', { timeAgo: formatTimeAgo(riskProfileReviewStatus.timeAgo, t) })}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="vitalis-dash-hero-ring-card">
              <ProgressRing
                value={animatedScore}
                size={76}
                stroke={9}
                label={
                  <span className="vitalis-dash-hero-ring-value">
                    {projection.healthScore === null || projection.healthScore === undefined ? t('dashboard.scoreUnavailable') : animatedScore}
                  </span>
                }
              />
              <button
                type="button"
                className="vitalis-dash-hero-ring-label vitalis-dash-score-info-trigger"
                onClick={() => setShowScoreInfo(true)}
              >
                {t('dashboard.scoreTitle')}
                <Icon name="info" size={12} color="var(--text-muted)" />
              </button>
            </div>
          </div>

          {bodyMapPoints.length > 0 ? (
            <div className="vitalis-dash-hero-bodymap">
              <BodyMap points={bodyMapPoints} sex={sex} onOpen={setOpenRegionId} showLegend={false} />
              {Number.isFinite(profile?.heightCm) && Number.isFinite(profile?.weightKg) ? (
                <div className="vitalis-bmi-strip">
                  <div className="vitalis-bmi-stat">
                    <span className="vitalis-bmi-stat-label">{t('dashboard.bmiHeightLabel')}</span>
                    <span className="vitalis-bmi-stat-value">{profile.heightCm}<span className="vitalis-bmi-stat-unit">cm</span></span>
                  </div>
                  <div className="vitalis-bmi-stat">
                    <span className="vitalis-bmi-stat-label">{t('dashboard.bmiWeightLabel')}</span>
                    <span className="vitalis-bmi-stat-value">{profile.weightKg}<span className="vitalis-bmi-stat-unit">kg</span></span>
                  </div>
                  {projection.bmi ? (
                    <div className="vitalis-bmi-stat">
                      <span className="vitalis-bmi-stat-label">{t('dashboard.bmiLabel')}</span>
                      <span className="vitalis-bmi-stat-value">
                        <span className={`vitalis-bmi-cat-dot vitalis-bmi-cat-dot--${projection.bmi.category}`} />
                        {projection.bmi.value}
                        <span className={`vitalis-bmi-cat-text vitalis-bmi-cat-text--${projection.bmi.category}`}>
                          {t(BMI_CATEGORY_LABEL_KEY[projection.bmi.category])}
                        </span>
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {riskProfileReviewStatus.state === 'overdue' && typeof onOpenRiskProfile === 'function' ? (
            <div className="vitalis-risk-nudge">
              <Icon name="triangle-alert" size={18} color="var(--status-upcoming)" />
              <div>
                <p className="vitalis-risk-nudge-title">{t('dashboard.riskProfileNudgeTitle')}</p>
                <p className="vitalis-risk-nudge-body">
                  {t('dashboard.riskProfileNudgeBody', { timeAgo: formatTimeAgo(riskProfileReviewStatus.timeAgo, t) })}
                </p>
                <button type="button" className="vitalis-risk-nudge-cta" onClick={onOpenRiskProfile}>
                  {t('dashboard.riskProfileNudgeCta')}
                </button>
              </div>
            </div>
          ) : null}
        </Card>

        <TimelineRail
          planSnapshot={planSnapshot}
          todayItems={todayItems}
          soonItems={soonItems}
          locale={locale}
          catalogGeneration={catalogGeneration}
          todayKey={todayKey}
          onOpen={onOpenTimeline}
          onOpenItem={openHealthPlanFromTimelineItem}
          onOpenDashboardItem={openHealthPlanFromDashboardItem}
          t={t}
        />
      </AppShell>
      {openRegionDetail ? (
        <RegionDetailView
          region={openRegionDetail}
          onBack={() => setOpenRegionId(null)}
          onViewInTab={() => {
            setOpenRegionId(null);
            openHealthPlanForRegion(openRegionId);
          }}
          onOpenItem={(item) => {
            setOpenRegionId(null);
            openHealthPlanFromTimelineItem(item);
          }}
          t={t}
        />
      ) : null}
      <Sheet
        open={showScoreInfo}
        onClose={() => setShowScoreInfo(false)}
        title={t('dashboard.scoreTitle')}
        closeLabel={t('common.close')}
      >
        <p className="vitalis-dash-score-explainer">{t('dashboard.scoreExplainer')}</p>
      </Sheet>
      <FeedbackSheet
        open={showFeedbackSheet}
        onClose={handleCloseFeedbackSheet}
        onSubmit={onSubmitFeedback}
        pending={feedbackSubmitPending}
        errorMessage={feedbackSubmitError}
      />
    </>
  );
}
