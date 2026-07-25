import React, { useState } from 'react';
import bodyFemale from '../assets/body-female.png';
import bodyMale from '../assets/body-male.png';
import './BodyMap.css';

const STATUS_CLASS = {
  action: 'vds-bodymap-dot--action',
  soon: 'vds-bodymap-dot--soon',
  ok: 'vds-bodymap-dot--ok',
};

const DEFAULT_POINTS = [];

export function BodyMap({
  points = DEFAULT_POINTS,
  sex = 'w',
  showList = true,
  showLegend = true,
  onOpen,
  style,
  legend = { action: 'Act now', soon: 'Coming up', ok: 'Done' },
}) {
  const first = points.find((point) => point.status === 'action') || points[0] || null;
  const [selectedId, setSelectedId] = useState(first ? first.id : null);
  const src = sex === 'm' ? bodyMale : bodyFemale;

  const select = (id) => {
    setSelectedId(id);
    if (typeof onOpen === 'function') {
      onOpen(id);
    }
  };

  return (
    <div className="vds-bodymap" style={style}>
      <div className="vds-bodymap-figure-row">
        <div className="vds-bodymap-figure">
          <img
            src={src}
            alt={sex === 'm' ? 'Male body silhouette' : 'Female body silhouette'}
            draggable={false}
            className="vds-bodymap-image"
          />
          {points.map((point) => {
            const statusClass = STATUS_CLASS[point.status] || STATUS_CLASS.ok;
            const isSelected = point.id === selectedId;
            return (
              <button
                key={point.id}
                type="button"
                aria-label={point.label}
                className={`vds-bodymap-dot ${statusClass}${isSelected ? ' is-selected' : ''}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => select(point.id)}
              >
                {point.status === 'action' ? <span className="vds-bodymap-dot-ping" /> : null}
                <span className="vds-bodymap-dot-halo" />
                <span className="vds-bodymap-dot-core" />
              </button>
            );
          })}
        </div>
        {showList ? (
          <div className="vds-bodymap-list">
            {points.map((point) => {
              const isSelected = point.id === selectedId;
              return (
                <button
                  key={point.id}
                  type="button"
                  className={`vds-bodymap-list-row${isSelected ? ' is-selected' : ''}`}
                  onClick={() => select(point.id)}
                >
                  <span className={`vds-bodymap-list-dot ${STATUS_CLASS[point.status] || STATUS_CLASS.ok}`} />
                  <span className="vds-bodymap-list-copy">
                    <span className="vds-bodymap-list-label">{point.label}</span>
                    {isSelected && point.note ? (
                      <span className="vds-bodymap-list-note">{point.note}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {showLegend ? (
        <div className="vds-bodymap-legend">
          <span><span className="vds-bodymap-legend-dot vds-bodymap-dot--action" />{legend.action}</span>
          <span><span className="vds-bodymap-legend-dot vds-bodymap-dot--soon" />{legend.soon}</span>
          <span><span className="vds-bodymap-legend-dot vds-bodymap-dot--ok" />{legend.ok}</span>
        </div>
      ) : null}
    </div>
  );
}
