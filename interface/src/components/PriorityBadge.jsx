import React from 'react';

export default function PriorityBadge({ priority = 'MEDIUM' }) {
  const normalized = String(priority || 'MEDIUM').toUpperCase();
  let className = 'priority-badge prio-medium';

  if (normalized === 'CRITICAL') {
    className = 'priority-badge prio-critical';
  } else if (normalized === 'HIGH') {
    className = 'priority-badge prio-high';
  }

  return (
    <span className={className} role="status" aria-label={`Priority: ${normalized}`}>
      {normalized}
    </span>
  );
}
