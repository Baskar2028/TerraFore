import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiPost, errorMessage } from '../services/api';
import Gauge from './Gauge';
import RiskBadge from './RiskBadge';
import { RotateCcw, Wand2 } from 'lucide-react';

const LEVERS = [
  ['documentation_completion_pct', 'Documentation', 100],
  ['compensation_completion_pct', 'Compensation', 100],
  ['approval_completion_pct', 'Approvals', 100],
  ['possession_completion_pct', 'Possession', 100],
  ['rehabilitation_completion_pct', 'Rehabilitation (R&R)', 100],
  ['legal_disputes', 'Legal disputes', 20],
];

/** What-if simulator. `base` = ProjectInput, `actionImpact` = ranked fixes from /predict. */
export default function Simulator({ base, actionImpact = [] }) {
  const [vals, setVals] = useState({});
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const baseKey = JSON.stringify(base);
  const timer = useRef();

  useEffect(() => { setVals({}); setRes(null); }, [baseKey]);

  const changes = useMemo(() => {
    const c = {};
    Object.entries(vals).forEach(([k, v]) => { if (v !== base[k]) c[k] = v; });
    return c;
  }, [vals, base]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!Object.keys(changes).length) { setRes(null); setErr(null); return; }
    timer.current = setTimeout(async () => {
      try { setRes(await apiPost('/api/v1/simulate', { base, changes })); setErr(null); }
      catch (e) { setErr(errorMessage(e)); }
    }, 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line
  }, [changes, baseKey]);

  const val = (k) => (k in vals ? vals[k] : base[k]);
  const applyPlan = () => {
    const v = {};
    actionImpact.slice(0, 3).forEach((a) => { v[a.field] = a.new_value; });
    setVals(v);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={() => setVals({})}><RotateCcw size={14} /> Reset</button>
        <button type="button" className="btn btn-teal" onClick={applyPlan} disabled={!actionImpact.length}><Wand2 size={14} /> Apply recommended plan</button>
      </div>
      <div className="sim-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LEVERS.map(([k, label, max]) => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <label htmlFor={`sim-${k}`}>{label}</label>
                <strong>{val(k)}{k !== 'legal_disputes' ? '%' : ''} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(base {base[k]})</span></strong>
              </div>
              <div className="sim-slider-wrap">
                <input id={`sim-${k}`} type="range" min="0" max={max} step={k === 'legal_disputes' ? 1 : 5} value={val(k)}
                  onChange={(e) => setVals({ ...vals, [k]: Number(e.target.value) })} style={{ width: '100%' }} />
                <span className="sim-tick" style={{ left: `${(base[k] / max) * 100}%` }} title="Base value" />
              </div>
            </div>
          ))}
          <div>
            <label className="form-label" htmlFor="sim-resp">Stakeholder responsiveness (base {base.stakeholder_responsiveness})</label>
            <select id="sim-resp" className="form-control" value={val('stakeholder_responsiveness')}
              onChange={(e) => setVals({ ...vals, stakeholder_responsiveness: e.target.value })}>
              {['High', 'Medium', 'Low'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          {err && <div className="alert-banner alert-danger">{err}</div>}
          {!res && !err && <div className="empty-state-text" style={{ padding: 16 }}>Move a slider to simulate a scenario.</div>}
          {res && (
            <>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                <div><Gauge score={res.before.score} level={res.before.level} size={140} label="Before" /></div>
                <span style={{ fontSize: '1.4rem' }}>&rarr;</span>
                <div><Gauge score={res.after.score} level={res.after.level} size={140} label="After" /></div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: res.delta <= 0 ? 'var(--status-low-text)' : 'var(--status-high-text)' }}>
                {res.delta > 0 ? '+' : ''}{res.delta} points
              </div>
              {res.level_change && <div style={{ marginTop: 4 }}><RiskBadge level={res.after.level} /> <span style={{ fontSize: '0.82rem' }}>{res.level_change}</span></div>}
              {res.worsening.length > 0 && <div className="alert-banner alert-warning" style={{ marginTop: 8 }}>Worsening change included: {res.worsening.join(', ')}</div>}
            </>
          )}
        </div>
      </div>
      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 10 }}>
        <strong>Scenario estimate, not a guarantee.</strong> Scenario estimate from a prototype model. Project type, state, land area and affected families are fixed and not adjustable.
      </p>
    </div>
  );
}
