import React from 'react';

export default function StatCard({
  icon: Icon,
  value,
  label,
  description,
  trend,
  trendType = 'neutral', // 'neutral' | 'warning' | 'positive'
  variant = 'default', // 'default' | 'critical' | 'gold' | 'teal'
}) {
  return (
    <div className={`stat-card variant-${variant}`}>
      <div className="stat-card-top">
        <div className="stat-card-icon-box" aria-hidden="true">
          {Icon && <Icon size={20} />}
        </div>
        {trend && (
          <span className={`stat-card-trend trend-${trendType}`}>
            {trend}
          </span>
        )}
      </div>

      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>

      {description && <div className="stat-card-desc">{description}</div>}
    </div>
  );
}
