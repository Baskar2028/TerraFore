import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import useApi from '../components/useApi';
import PageState from '../components/PageState';
import RiskBadge from '../components/RiskBadge';
import { useAuth } from '../context/AuthContext';
import { downloadCsv, errorMessage } from '../services/api';

export default function Projects() {
  const { can } = useAuth();
  const [f, setF] = useState({ search: '', risk: '', state: '', project_type: '', forest_pending: false, sort: 'risk_desc' });
  const [q, setQ] = useState(f.search);
  const [page, setPage] = useState(1);
  const [exportErr, setExportErr] = useState(null);
  const meta = useApi('/api/v1/model/info');

  useEffect(() => { const t = setTimeout(() => { setF((o) => ({ ...o, search: q })); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const params = { ...f, forest_pending: f.forest_pending || undefined, risk: f.risk || undefined, state: f.state || undefined,
    project_type: f.project_type || undefined, search: f.search || undefined };
  const { data, loading, error, reload } = useApi('/api/v1/projects', { ...params, page, page_size: 25 });
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); setPage(1); };

  return (
    <div className="page-content-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div><h1 className="page-title">Projects</h1><p className="page-subtitle">Scored synthetic projects, ranked by delay risk.</p></div>
        {can.export && <button className="btn btn-secondary" onClick={() => downloadCsv(params).catch((e) => setExportErr(errorMessage(e)))}><Download size={15} /> Export CSV</button>}
      </div>
      {exportErr && <div className="alert-banner alert-danger">{exportErr}</div>}
      <div className="filter-bar">
        <input className="form-control" placeholder="Search ID or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        <select className="form-control" value={f.risk} onChange={set('risk')} aria-label="Risk level"><option value="">All risk levels</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select>
        <select className="form-control" value={f.state} onChange={set('state')} aria-label="State"><option value="">All states</option>{meta.data?.states.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={f.project_type} onChange={set('project_type')} aria-label="Project type"><option value="">All types</option>{meta.data?.project_types.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={f.sort} onChange={set('sort')} aria-label="Sort"><option value="risk_desc">Highest risk</option><option value="risk_asc">Lowest risk</option><option value="deadline">Nearest deadline</option><option value="id">ID</option></select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.84rem' }}><input type="checkbox" checked={f.forest_pending} onChange={set('forest_pending')} /> Forest clearance pending</label>
      </div>
      <PageState loading={loading} error={error} onRetry={reload} empty={data && data.total === 0} emptyText="No projects match these filters.">
        {data && (
          <div className="tf-card">
            <div className="table-container">
              <table className="tf-table">
                <thead><tr><th>ID</th><th>Project</th><th>Type</th><th>State / District</th><th>Score</th><th>Level</th><th>Forest clearance</th></tr></thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.project_id}>
                      <td className="project-id-cell"><Link to={`/projects/${p.project_id}`}>{p.project_id}</Link></td>
                      <td>{p.project_name}</td><td>{p.project_type}</td><td>{p.state} / {p.district}</td>
                      <td><strong>{p.risk_score}</strong></td><td><RiskBadge level={p.risk_level} /></td>
                      <td>{p.forest_clearance_pending ? <span className="risk-badge risk-medium">{p.forest_clearance_status}</span> : p.forest_clearance_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>{data.total.toLocaleString()} projects &middot; page {data.page} of {data.pages}</span>
              <span><button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>{' '}
                <button className="btn btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></span>
            </div>
          </div>
        )}
      </PageState>
    </div>
  );
}
