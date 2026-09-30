import React from 'react';
import Gauge from './Gauge';
import RiskBadge from './RiskBadge';
import PriorityBadge from './PriorityBadge';
import DriverBars from './DriverBars';
import Lifecycle from './Lifecycle';
import ComplianceBanner from './ComplianceBanner';
import { CheckCircle2, Lightbulb } from 'lucide-react';

/** Shared result view for a /predict-shaped response (Predict page + Project Detail). */
export default function ResultPanel({ result }) {
  const acts = result.priority_actions || [];
  const fix = result.action_impact || [];
  const h = result.historical_context;
  return (
    <>
      <ComplianceBanner compliance={result.compliance} />
      <div className="tf-card">
        <div className="tf-card-header">
          <h2 className="tf-card-title"><CheckCircle2 size={18} style={{ color: 'var(--forest-base)' }} /> Delay Risk Score</h2>
          <RiskBadge level={result.risk_level} />
        </div>
        <div className="tf-card-body" style={{ display: 'flex', justifyContent: 'center' }}>
          <Gauge score={result.risk_score} level={result.risk_level} size={260}
            label={`Estimated delay probability: ${Math.round(result.delay_probability)}%`} />
        </div>
      </div>

      <div className="tf-card">
        <div className="tf-card-header"><h3 className="tf-card-title">Why this project is at risk</h3>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Red raises risk, green reduces it</span></div>
        <div className="tf-card-body"><DriverBars factors={result.key_factors} /></div>
      </div>

      <div className="tf-card">
        <div className="tf-card-header"><h3 className="tf-card-title">Priority actions</h3></div>
        <div className="tf-card-body">
          {acts.length ? acts.map((a, i) => (
            <div key={i} className={`priority-action-card action-${(a.priority || 'medium').toLowerCase()}`}>
              <div style={{ marginTop: 2 }}><PriorityBadge priority={a.priority} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{a.factor}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {i === 0 ? <strong>Priority action: </strong> : null}{a.action}
                </div>
              </div>
            </div>
          )) : <div className="empty-state-text">No immediate intervention directives required.</div>}
        </div>
      </div>

      {fix.length > 0 && (
        <div className="tf-card">
          <div className="tf-card-header"><h3 className="tf-card-title"><Lightbulb size={18} style={{ color: 'var(--gold-base)' }} /> Highest-impact fix</h3>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Scenario estimate, not a guarantee</span></div>
          <div className="tf-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fix.map((f, i) => <div key={f.field} style={{ fontSize: '0.88rem' }}>{i === 0 ? <strong>{f.message}</strong> : f.message}</div>)}
          </div>
        </div>
      )}

      <div className="tf-card">
        <div className="tf-card-header"><h3 className="tf-card-title">Lifecycle timeline</h3></div>
        <div className="tf-card-body"><Lifecycle data={result.lifecycle_stages} /></div>
      </div>

      {h && (
        <div className="tf-card"><div className="tf-card-body" style={{ fontSize: '0.84rem' }}>
          <strong>Historical context (synthetic dataset):</strong> {h.state.name}: {h.state.delay_rate_pct}% of {h.state.projects} projects delayed;
          {' '}{h.project_type.name}: {h.project_type.delay_rate_pct}% of {h.project_type.projects}; overall {h.overall.delay_rate_pct}%.
          <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{h.note}</div>
        </div></div>
      )}
      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{result.disclaimer}</p>
    </>
  );
}
