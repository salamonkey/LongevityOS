import React from 'react';
import { resolvePrioritySemantics } from '../semanticPresentation.js';
import { HealthPlanItem } from './HealthPlanItem.jsx';

export function PrioritySection({
  priority,
  items,
  onOpenItem,
  emptyLabel = 'No open items right now. Review your upcoming steps below.',
}) {
  const semantic = resolvePrioritySemantics(priority);
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className={`panel section-card priority-section ${semantic.toneClassName}`} data-token={semantic.token}>
      <h2>{semantic.label}</h2>
      <ul className="priority-list">
        {safeItems.map((item) => (
          <HealthPlanItem
            key={item.id}
            item={item}
            onOpenItem={onOpenItem}
            showReminder
          />
        ))}
        {safeItems.length === 0 ? <li className="health-item-empty">{emptyLabel}</li> : null}
      </ul>
    </section>
  );
}

export default PrioritySection;
