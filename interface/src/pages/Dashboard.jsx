import React from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, AlertTriangle, Gauge as GaugeIcon, TreePine, ShieldCheck } from 'lucide-react';
import useApi from '../components/useApi';
import PageState from '../components/PageState';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';

const BAR = { HIGH: 'var(--status-high-text)', MEDIUM: '#C77F10', LOW: 'var(--status-low-text)' };

export default function Dashboard() {
  const st = useApi('/api/v1/stats');
  const top = useApi('/api/v1/projects', { sort: 'risk_desc', page_size: 10 });
  const health = useApi('/health');
  const info = useApi('/api/v1/model/info');
  const s = st.data;

  return (
    <div className="page-content-wrapper">
      <div className="page-header">
        <h1 className="page-title">Portfolio Risk Dashboard</h1>
        <p className="page-subtitle">Delay-risk overview of the synthetic project portfolio. {s?.jurisdiction ? `Scoped to ${s.jurisdiction}.` : ''}</p>
      </div>
      <PageState loading={st.loading} error={st.error} onRetry={st.reload} empty={s?.empty} emptyText="No projects in your jurisdiction.">
        {s && !s.empty && (
          <>
            <div className="kpi-grid">
              <StatCard icon={FolderKanban} value={s.total_projects.toLocaleString()} label="Total projects" description="Synthetic dataset" />
              <StatCard icon={AlertTriangle} variant="critical" value={s.risk_levels.HIGH.count.toLocaleString()} label="High risk"
                description={`${s.risk_levels.HIGH.pct}% of portfolio`} />
              <StatCard icon={GaugeIcon} variant="gold" value={s.risk_levels.MEDIUM.count.toLocaleString()} label="Medium risk" description={`${s.risk_levels.MEDIUM.pct}% of portfolio`} />
              <StatCard icon={ShieldCheck} variant="teal" value={s.risk_levels.LOW.count.toLocaleString()} label="Low risk" description={`${s.risk_levels.LOW.pct}% of portfolio`} />
              <StatCard icon={GaugeIcon} value={`${s.avg_delay_probability}%`} label="Average delay probability" />
              <StatCard icon={TreePine} variant="gold" value={s.forest_clearance_pending.toLocaleString()} label="Forest clearance pending" description="Pending or under review" />
            </div>

            <div className="dash-grid">
              <div className="tf-card">
                <div className="tf-card-header"><h2 className="tf-card-title">Risk distribution</h2></div>
                <div className="tf-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {['HIGH', 'MEDIUM', 'LOW'].map((l) => (
                    <div key={l}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}><RiskBadge level={l} /><span>{s.risk_levels[l].count} ({s.risk_levels[l].pct}%)</span></div>
                      <div style={{ height: 10, background: 'var(--bg-subtle)', borderRadius: 5, marginTop: 4 }}>
                        <div style={{ width: `${s.risk_levels[l].pct}%`, height: '100%', background: BAR[l], borderRadius: 5 }} /></div>
                    </div>
                  ))}
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{s.note}</p>
                </div>
              </div>
              <div className="tf-card">
                <div className="tf-card-header"><h2 className="tf-card-title">System status</h2></div>
                <div className="tf-card-body" style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>API: <strong>{health.data?.status || (health.error ? 'unreachable' : '...')}</strong></div>
                  <div>Model: <strong>{info.data?.model_type || '...'}</strong></div>
                  {info.data && <>
                    <div>Held-out ROC-AUC: <strong>{info.data.heldout_metrics.roc_auc}</strong> &middot; F1: <strong>{info.data.heldout_metrics.f1}</strong></div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{info.data.dataset_disclaimer}</div></>}
                </div>
              </div>
            </div>

            <div className="tf-card" style={{ marginTop: 24 }}>
              <div className="tf-card-header"><h2 className="tf-card-title">Top 10 highest-risk projects</h2><Link to="/projects">View all</Link></div>
              <PageState loading={top.loading} error={top.error} onRetry={top.reload}>
                <div className="table-container">
                  <table className="tf-table">
                    <thead><tr><th>ID</th><th>Project</th><th>State</th><th>Score</th><th>Level</th><th>Main driver</th></tr></thead>
                    <tbody>
                      {top.data?.items.map((p) => (
                        <tr key={p.project_id}>
                          <td className="project-id-cell"><Link to={`/projects/${p.project_id}`}>{p.project_id}</Link></td>
                          <td>{p.project_name}</td><td>{p.state}</td><td><strong>{p.risk_score}</strong></td>
                          <td><RiskBadge level={p.risk_level} /></td><td>{p.dominant_driver}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PageState>
            </div>
          </>
        )}
      </PageState>
    </div>
  );
}
