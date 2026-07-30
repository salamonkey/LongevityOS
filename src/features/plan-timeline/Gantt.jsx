import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Icon } from '../../design-system/components/index.js';
import { useTodayKey } from '../../lib/useTodayKey.js';
import { getToneColors } from '../health-plan-browsing-and-item-detail/statusVisuals.js';
import {
  parseDateValue,
  buildGanttRows,
  buildStandaloneAppointmentRows,
  filterRelevantRows,
} from './gantt.js';

const LABEL_COL_W = 118;
const MONTH_COL_W = 48;
const QUARTER_COL_W = 36;
const MONTH_COLS = 12;
const QUARTER_COLS = 20; // 5 years
const MONTH_ANCHOR_COLS = 2; // ~96px (2 * 48) of history visible before today
const QUARTER_ANCHOR_COLS = 3; // ~108px (3 * 36), closest whole-quarter anchor to the 96px target
const TODAY_ANCHOR_PX = 96;
const AXIS_HEAD_H = 30;

const LANE_ORDER = ['vaccination', 'preventive', 'appointments'];
const LANE_LABEL_KEY = Object.freeze({
  vaccination: 'timeline.laneVaccination',
  preventive: 'timeline.lanePreventive',
  appointments: 'timeline.laneAppointments',
});

function formatShortDate(date, locale) {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function buildMonthColumns(today, colsBeforeToday) {
  const anchor = new Date(today.getFullYear(), today.getMonth() - colsBeforeToday, 1);
  return Array.from({ length: MONTH_COLS }, (_, i) => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + i + 1, 1);
    return { start, end, isYearStart: start.getMonth() === 0 };
  });
}

function buildQuarterColumns(today, colsBeforeToday) {
  const todayQuarter = today.getFullYear() * 4 + Math.floor(today.getMonth() / 3);
  const anchorQuarter = todayQuarter - colsBeforeToday;
  return Array.from({ length: QUARTER_COLS }, (_, i) => {
    const abs = anchorQuarter + i;
    const year = Math.floor(abs / 4);
    const q = abs - year * 4;
    const start = new Date(year, q * 3, 1);
    const end = new Date(year, q * 3 + 3, 1);
    return { start, end, isYearStart: q === 0, quarter: q + 1 };
  });
}

function resolveDatePosition(date, columns, colWidth) {
  if (!date) return { px: null, offRange: null };
  const time = date.getTime();
  const rangeStart = columns[0].start.getTime();
  const rangeEnd = columns[columns.length - 1].end.getTime();
  if (time < rangeStart) return { px: 0, offRange: 'before' };
  if (time >= rangeEnd) return { px: columns.length * colWidth, offRange: 'after' };
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    if (time >= col.start.getTime() && time < col.end.getTime()) {
      const frac = (time - col.start.getTime()) / (col.end.getTime() - col.start.getTime());
      return { px: i * colWidth + frac * colWidth, offRange: null };
    }
  }
  return { px: null, offRange: null };
}

function GanttMarker({ x, size, tone, icon, ping, past }) {
  const [soft, solid] = getToneColors(tone);
  return (
    <span className="vitalis-gantt-mk" style={{ left: x }}>
      {ping ? <span className="vitalis-gantt-mk-ping" style={{ width: size, height: size, borderColor: solid }} /> : null}
      <span
        className="vitalis-gantt-mk-circle"
        style={{
          width: size,
          height: size,
          background: past ? 'var(--surface-card)' : soft,
          borderColor: solid,
          color: solid,
        }}
      >
        {icon ? <Icon name={icon} size={size >= 26 ? 13 : 11} /> : null}
      </span>
    </span>
  );
}

function GanttGhost({ date, tone, side = 'after', t, uiLocale }) {
  const [, solid] = getToneColors(tone);
  const edgeStyle = side === 'before' ? { left: 8 } : { right: 8 };
  return (
    <span className="vitalis-gantt-ghost" style={{ borderColor: solid, color: solid, ...edgeStyle }}>
      {side === 'before' ? <Icon name="chevron-left" size={12} /> : null}
      {date ? formatShortDate(date, uiLocale) : t('timeline.noDateSet')}
      {side === 'after' ? <Icon name="chevron-right" size={12} /> : null}
    </span>
  );
}

function GanttAppointmentMarkers({ appointments, columns, colWidth }) {
  return appointments.map((appointment) => {
    const pos = resolveDatePosition(parseDateValue(appointment.scheduledFor), columns, colWidth);
    if (pos.px === null || pos.offRange) {
      return null;
    }
    return (
      <GanttMarker key={appointment.id} x={pos.px} size={18} tone="teal" icon="calendar" />
    );
  });
}

function GanttRowPrimaryContent({ row, columns, colWidth, todayTime, t, uiLocale }) {
  if (row.kind === 'appointment-point') {
    const pos = resolveDatePosition(row.pointDate, columns, colWidth);
    if (pos.offRange) {
      return <GanttGhost date={row.pointDate} tone={row.tone} side={pos.offRange} t={t} uiLocale={uiLocale} />;
    }
    return <GanttMarker x={pos.px} size={26} tone={row.tone} icon={row.icon} />;
  }

  if (row.kind === 'bar') {
    const startPos = resolveDatePosition(row.startDate, columns, colWidth);
    const endPos = resolveDatePosition(row.endDate, columns, colWidth);
    if (startPos.offRange === 'after' || endPos.offRange === 'before') {
      const side = endPos.offRange === 'before' ? 'before' : 'after';
      const ghostDate = side === 'before' ? row.endDate : row.startDate;
      return <GanttGhost date={ghostDate} tone={row.tone} side={side} t={t} uiLocale={uiLocale} />;
    }

    const [soft, solid] = getToneColors(row.tone);
    const barStart = startPos.px ?? 0;
    const barEnd = endPos.px ?? columns.length * colWidth;
    const width = Math.max(4, barEnd - barStart);
    const elapsedEnd = Math.min(Math.max(todayTime, barStart), barEnd);
    const elapsedWidth = Math.max(0, elapsedEnd - barStart);
    const squareLeft = startPos.offRange === 'before';
    const squareRight = endPos.offRange === 'after';
    const radius = `${squareLeft ? 3 : 999}px ${squareRight ? 3 : 999}px ${squareRight ? 3 : 999}px ${squareLeft ? 3 : 999}px`;

    return (
      <>
        <span className="vitalis-gantt-bar" style={{ left: barStart, width, borderRadius: radius, background: soft }}>
          <span className="vitalis-gantt-bar-elapsed" style={{ width: elapsedWidth, background: solid }} />
          {row.isRecurring ? (
            <span
              className="vitalis-gantt-bar-stripe"
              style={{ background: `repeating-linear-gradient(115deg, transparent 0 7px, ${solid} 7px 8px)` }}
            />
          ) : null}
        </span>
        <GanttMarker x={barEnd} size={20} tone={row.tone} icon={null} ping={row.status === 'due' || row.status === 'overdue'} />
      </>
    );
  }

  const pos = resolveDatePosition(row.pointDate, columns, colWidth);
  if (pos.offRange) {
    return <GanttGhost date={row.pointDate} tone={row.tone} side={pos.offRange} t={t} uiLocale={uiLocale} />;
  }

  if (row.kind === 'due') {
    return <GanttMarker x={pos.px} size={20} tone={row.tone} icon={null} ping />;
  }

  if (row.kind === 'done-point') {
    return <GanttMarker x={pos.px} size={26} tone={row.tone} icon="check" past />;
  }

  return <GanttMarker x={pos.px} size={26} tone={row.tone} icon={row.icon} />;
}

function GanttRowTime({ row, columns, colWidth, todayTime, t, uiLocale, linkedAppointments = [] }) {
  return (
    <>
      <GanttRowPrimaryContent row={row} columns={columns} colWidth={colWidth} todayTime={todayTime} t={t} uiLocale={uiLocale} />
      {linkedAppointments.length > 0 ? (
        <GanttAppointmentMarkers appointments={linkedAppointments} columns={columns} colWidth={colWidth} />
      ) : null}
    </>
  );
}

export default function Gantt({ planSnapshot, onOpenItem, clock = () => new Date(), uiLocale = 'en-US', t, appointments = [] }) {
  const [scope, setScope] = useState('months');
  const scrollRef = useRef(null);
  const todayKey = useTodayKey();
  const today = useMemo(() => {
    const now = clock();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [clock, todayKey]);

  const colWidth = scope === 'months' ? MONTH_COL_W : QUARTER_COL_W;
  const columns = useMemo(
    () => (scope === 'months'
      ? buildMonthColumns(today, MONTH_ANCHOR_COLS)
      : buildQuarterColumns(today, QUARTER_ANCHOR_COLS)),
    [scope, today],
  );
  const totalWidth = columns.length * colWidth;
  const todayPos = resolveDatePosition(today, columns, colWidth);
  const todayTime = todayPos.px ?? 0;

  const planRows = useMemo(() => buildGanttRows(planSnapshot, { today }), [planSnapshot, today]);
  const standaloneAppointmentRows = useMemo(
    () => buildStandaloneAppointmentRows(appointments),
    [appointments],
  );
  const allRows = useMemo(
    () => [...planRows, ...standaloneAppointmentRows],
    [planRows, standaloneAppointmentRows],
  );
  // Only rows actually relevant to *this* scope survive -- an item due at 65
  // has no business cluttering a 53-year-old's 12-month or 5-year view, and
  // a "skip forever" choice shouldn't keep showing up either. Recomputed per
  // scope since relevance is relative to the currently visible window.
  const rows = useMemo(
    () => filterRelevantRows(allRows, columns[0].start, columns[columns.length - 1].end),
    [allRows, columns],
  );
  const linkedAppointmentsByItemKey = useMemo(() => {
    const index = new Map();
    for (const appointment of appointments) {
      if (!appointment.catalogItemId) continue;
      if (!index.has(appointment.catalogItemId)) {
        index.set(appointment.catalogItemId, []);
      }
      index.get(appointment.catalogItemId).push(appointment);
    }
    return index;
  }, [appointments]);
  const lanes = LANE_ORDER
    .map((lane) => ({ lane, rows: rows.filter((row) => row.lane === lane) }))
    .filter((group) => group.rows.length > 0);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollLeft = Math.max(0, todayTime - TODAY_ANCHOR_PX);
  }, [scope, todayTime]);

  if (lanes.length === 0) {
    return <p className="vitalis-timeline-empty">{t('timeline.empty')}</p>;
  }

  return (
    <div>
      <div className="vitalis-seg vitalis-gantt-scope">
        <button type="button" className={scope === 'months' ? 'is-active' : ''} onClick={() => setScope('months')}>
          {t('timeline.scope12Months')}
        </button>
        <button type="button" className={scope === 'quarters' ? 'is-active' : ''} onClick={() => setScope('quarters')}>
          {t('timeline.scope5Years')}
        </button>
      </div>

      <div className="vitalis-gantt-legend">
        <span><span className="vitalis-gantt-legend-bar" />{t('timeline.legendCoverage')}</span>
        <span><span className="vitalis-gantt-legend-ring" />{t('timeline.legendDue')}</span>
        <span><span className="vitalis-gantt-legend-ring-overdue" />{t('status.overdue')}</span>
        <span><span className="vitalis-gantt-legend-dot" />{t('timeline.legendAppointment')}</span>
        <span><span className="vitalis-gantt-legend-line" />{t('timeline.legendToday')}</span>
        <span><span className="vitalis-gantt-legend-ghost" />{t('timeline.legendOffRange')}</span>
      </div>

      <p className="vitalis-gantt-hint">{t('timeline.scrollHint')}</p>

      <Card padding={0} className="vitalis-gantt">
        <div className="vitalis-gantt-scroll" ref={scrollRef}>
          <div className="vitalis-gantt-inner" style={{ width: LABEL_COL_W + totalWidth }}>
            <div className="vitalis-gantt-grid" style={{ left: LABEL_COL_W, top: AXIS_HEAD_H }}>
              {columns.map((col, i) => (
                <span
                  key={`grid-${col.start.toISOString()}`}
                  className={col.isYearStart ? 'is-year' : ''}
                  style={{ left: i * colWidth }}
                />
              ))}
            </div>

            <div className="vitalis-gantt-today-line" style={{ left: LABEL_COL_W + todayTime }} aria-hidden="true" />

            <div className="vitalis-gantt-head">
              <div className="vitalis-gantt-lab vitalis-gantt-head-corner">{today.getFullYear()}</div>
              <div className="vitalis-gantt-time">
                {columns.map((col, i) => (
                  <span
                    key={`col-${col.start.toISOString()}`}
                    className={`vitalis-gantt-col${col.isYearStart ? ' is-year' : ''}`}
                    style={{ left: i * colWidth, width: colWidth }}
                  >
                    {scope === 'months'
                      ? new Intl.DateTimeFormat(uiLocale, { month: 'short' }).format(col.start).toUpperCase()
                      : `Q${col.quarter}`}
                    {col.isYearStart ? (
                      <span className="vitalis-gantt-col-yy">{new Intl.DateTimeFormat(uiLocale, { year: '2-digit' }).format(col.start)}</span>
                    ) : null}
                  </span>
                ))}
                <span className="vitalis-gantt-todaydot" style={{ left: todayTime }}>
                  <span className="vitalis-gantt-todaydot-halo" />
                  <span className="vitalis-gantt-todaydot-core" />
                </span>
              </div>
            </div>

            {lanes.map((group) => (
              <React.Fragment key={group.lane}>
                <div className="vitalis-gantt-lane">
                  <span className="vitalis-gantt-lab">{t(LANE_LABEL_KEY[group.lane])}</span>
                </div>
                {group.rows.map((row) => {
                  const [, rowDotSolid] = getToneColors(row.tone);
                  const interactiveProps = row.isAppointment ? {} : {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => onOpenItem?.(row),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenItem?.(row);
                      }
                    },
                  };
                  return (
                    <div
                      key={row.itemKey}
                      className="vitalis-gantt-row"
                      {...interactiveProps}
                    >
                      <span className="vitalis-gantt-lab">
                        <span className="vitalis-gantt-lab-dot" style={{ background: rowDotSolid }} />
                        <span className="vitalis-gantt-lab-text">
                          <b>{row.name}</b>
                          <span className="vitalis-gantt-lab-date">
                            {row.kind === 'bar'
                              ? `${formatShortDate(row.startDate, uiLocale)} – ${formatShortDate(row.endDate, uiLocale)}`
                              : formatShortDate(row.pointDate, uiLocale)}
                          </span>
                        </span>
                      </span>
                      <div className="vitalis-gantt-time">
                        <GanttRowTime
                          row={row}
                          columns={columns}
                          colWidth={colWidth}
                          todayTime={todayTime}
                          t={t}
                          uiLocale={uiLocale}
                          linkedAppointments={linkedAppointmentsByItemKey.get(row.itemKey) ?? []}
                        />
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
