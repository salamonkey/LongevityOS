import React from 'react';
import { StatusPill } from './StatusPill.jsx';

export function HealthPlanItem({ item, onOpenItem, showWhy = true, showReminder = true, className = '' }) {
  const title = toDisplayText(item?.title, 'Preventive care step');
  const recommendation = toDisplayText(item?.recommendationFrequency, 'Timing to be confirmed');
  const whyItMatters = toDisplayText(item?.whyItMatters, 'This action supports your preventive health plan.');

  return (
    <li className={className ? `health-item ${className}` : 'health-item'}>
      <button
        type="button"
        className="health-item-button"
        onClick={() => {
          if (typeof onOpenItem === 'function') {
            onOpenItem(item?.id);
          }
        }}
      >
        <span className="health-item-header">
          <span className="health-item-title">{title}</span>
          <StatusPill status={item?.status} />
        </span>
        <span className="plan-frequency">Recommendation frequency: {recommendation}</span>
        {showWhy ? <span className="health-item-why">{whyItMatters}</span> : null}
        {showReminder && item?.hasReminder ? (
          <span className="health-item-reminder">Reminder: {item.reminderDateLabel}</span>
        ) : null}
      </button>
    </li>
  );
}

function toDisplayText(value, fallback) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

export default HealthPlanItem;
