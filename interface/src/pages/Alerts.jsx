import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import useApi from '../components/useApi';
import PageState from '../components/PageState';
import { useAuth } from '../context/AuthContext';
import { apiPost, errorMessage } from '../services/api';

const SEV = { CRITICAL: 'risk-high', HIGH: 'risk-high', MEDIUM: 'risk-medium' };

export default function Alerts() {
  const { can } = useAuth();
  const [severity, setSeverity] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(null);
  const meta = useApi('/api/v1/model/info');
  const { data, loading, error, reload } = useApi('/api/v1/alerts', { severity: severity || undefined, state: state || undefined, status: status || undefined, page, page_size: 20 });

  const ack = async (key) => { try { await apiPost(`/api/v1/alerts/${key}/acknowledge`); reload(); } catch (e) { setErr(errorMessage(e)); } };
  const f = (fn) => (e) => { fn(e.target.value); setPage(1); };

  return (
    <div className="page-content-wrapper">
      <div className="page-header">
        <h1 className="page-title">Alerts</h1>
        <p className="page-subtitle">Generated from scored projects, planned deadlines and forest-clearance status (synthetic data).
          {data && <> Totals &mdash; Critical: {data.counts.CRITICAL}, High: {data.counts.HIGH}, Medium: {data.counts.MEDIUM}.</>}</p>
      </div>
      {err && <div className="alert-banner alert-danger">{err}</div>}
      <div className="filter-bar">
        <select className="form-control" value={severity} onChange={f(setSeverity)} aria-label="Severity"><option value="">All severities</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option></select>
        <select className="form-control" value={state} onChange={f(setState)} aria-label="State"><option value="">All states</option>{meta.data?.states.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={status} onChange={f(setStatus)} aria-label="Status"><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="">All</option></select>
      </div>
      <PageState loading={loading} error={error} onRetry={reload} empty={data && data.total === 0} emptyText="No alerts match these filters.">
        {data && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.items.map((a) => (
                <div key={a.alert_key} className="tf-card"><div className="tf-card-body alert-row">
                  <span className={`risk-badge ${SEV[a.severity]}`}>{a.severity}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}><Link to={`/projects/${a.project_id}`}>{a.project_id}</Link> &middot; {a.project_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.district}, {a.state} &middot; score {a.risk_score}</div>
                    <div style={{ fontSize: '0.86rem', marginTop: 4 }}>{a.reasons.join(' \u00b7 ')}</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}><strong>Recommended:</strong> {a.recommended_action}</div>
                  </div>
                  {a.acknowledged ? <span style={{ fontSize: '0.78rem' }}><Check size={14} /> Acknowledged by {a.acknowledged_by}</span>
                    : can.ack ? <button className="btn btn-secondary" onClick={() => ack(a.alert_key)}>Acknowledge</button>
                      : <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Authority/Admin can acknowledge</span>}
                </div></div>
              ))}
            </div>
            <div className="pager"><span>{data.total} alerts &middot; page {data.page} of {data.pages}</span>
              <span><button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>{' '}
                <button className="btn btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></span></div>
          </>
        )}
      </PageState>
    </div>
  );
}
