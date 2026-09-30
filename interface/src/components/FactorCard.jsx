import React from 'react';
import PriorityBadge from './PriorityBadge';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function FactorCard({ factor }) {
  if (!factor) return null;

  const {
    factor: name = 'Risk Factor',
    value = 'N/A',
    shap_impact = 0,
    effect = 'INCREASES_DELAY_RISK',
    priority = 'MEDIUM',
    recommendation,
  } = factor;

  const isIncrease = effect === 'INCREASES_DELAY_RISK' || shap_impact > 0;
  const formattedImpact = typeof shap_impact === 'number'
    ? (shap_impact > 0 ? `+${shap_impact.toFixed(4)}` : shap_impact.toFixed(4))
    : shap_impact;

  return (
    <div className="factor-card">
      <div className="factor-card-top">
        <PriorityBadge priority={priority} />
        <span className={`factor-effect-badge ${isIncrease ? 'effect-increases' : 'effect-reduces'}`}>
          {isIncrease ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isIncrease ? 'INCREASES DELAY RISK' : 'REDUCES DELAY RISK'}
        </span>
      </div>

      <div className="factor-name">{name}</div>

      <div className="factor-metrics-grid">
        <div className="factor-metric-item">
          <span className="factor-metric-label">Actual Value</span>
          <span className="factor-metric-val">{value}</span>
        </div>
        <div className="factor-metric-item">
          <span className="factor-metric-label">SHAP Impact</span>
          <span className="factor-metric-val">{formattedImpact}</span>
        </div>
      </div>

      {recommendation && (
        <div className="factor-recommendation">
          <strong>Action: </strong>{recommendation}
        </div>
      )}
    </div>
  );
}
