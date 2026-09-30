import React from 'react';

export default function RiskBadge({ level = 'LOW' }) {
  const normalized = String(level || 'LOW').toUpperCase();
  let className = 'risk-badge risk-low';

  if (normalized === 'HIGH' || normalized === 'CRITICAL') {
    className = 'risk-badge risk-high';
  } else if (normalized === 'MEDIUM') {
    className = 'risk-badge risk-medium';
  }

  return (
    <span className={className} role="status" aria-label={`Risk level: ${normalized}`}>
      <span className="risk-badge-dot" />
      {normalized}
    </span>
  );
}
