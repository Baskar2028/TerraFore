import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Cell, PieChart, Pie, Legend } from 'recharts';
import useApi from '../components/useApi';
import PageState from '../components/PageState';

const PIE = { HIGH: '#c0392b', MEDIUM: '#e0a020', LOW: '#1a9e6f' };

function Chart({ title, takeaway, children, height = 300 }) {
  return (
    <div className="tf-card">
      <div className="tf-card-header"><h2 className="tf-card-title">{title}</h2></div>
      <div className="tf-card-body">
        <div style={{ width: '100%', height }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
        <p style={{ fontSize: '0.84rem', marginTop: 10, color: 'var(--text-secondary)' }}><strong>Takeaway:</strong> {takeaway}</p>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: s, loading, error, reload } = useApi('/api/v1/stats');
  const info = useApi('/api/v1/model/info');
  const m = info.data?.heldout_metrics;
  return (
    <div className="page-content-wrapper">
      <div className="page-header"><h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Comparative views computed from the scored synthetic portfolio. {s?.note}</p></div>
      <PageState loading={loading} error={error} onRetry={reload} empty={s?.empty} emptyText="No projects in your jurisdiction.">
        {s && !s.empty && (() => {
          const st = s.by_state, ty = s.by_project_type, dr = s.by_driver.slice(0, 8);
          const pie = ['HIGH', 'MEDIUM', 'LOW'].map((k) => ({ name: k, value: s.risk_levels[k].count }));
          return (
            <div className="analytics-grid">
              <Chart title="Average delay probability by state" height={420}
                takeaway={`${st[0].name} has the highest average (${st[0].avg_delay_probability}%); ${st[st.length - 1].name} the lowest (${st[st.length - 1].avg_delay_probability}%).`}>
                <BarChart data={st} layout="vertical" margin={{ left: 30 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip /><Bar dataKey="avg_delay_probability" name="Avg delay %" fill="#1B4D3C" /></BarChart>
              </Chart>
              <Chart title="Project-type comparison" takeaway={`${ty[0].name} projects average ${ty[0].avg_delay_probability}% delay probability versus ${ty[ty.length - 1].avg_delay_probability}% for ${ty[ty.length - 1].name}.`}>
                <BarChart data={ty}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-25} textAnchor="end" height={70} /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="avg_delay_probability" name="Avg delay %" fill="#0E6E64" /></BarChart>
              </Chart>
              <Chart title="Risk distribution" takeaway={`${s.risk_levels.HIGH.pct}% of projects are HIGH risk. This reflects the synthetic dataset, not real portfolios.`}>
                <PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={100} label>{pie.map((p) => <Cell key={p.name} fill={PIE[p.name]} />)}</Pie><Tooltip /><Legend /></PieChart>
              </Chart>
              <Chart title="Delay-driver frequency" takeaway={`"${dr[0].name}" is the top driver for ${dr[0].count} projects (largest risk-raising SHAP contribution).`}>
                <BarChart data={dr} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={140} fontSize={11} /><Tooltip /><Bar dataKey="count" name="Projects" fill="#9E741B" /></BarChart>
              </Chart>
              <Chart title="Average delay probability by notification year" takeaway="Projects notified in each year, with their average modelled delay probability (synthetic).">
                <LineChart data={s.by_notification_year}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis domain={[0, 100]} /><Tooltip /><Line dataKey="avg_delay_probability" name="Avg delay %" stroke="#c0392b" strokeWidth={2} /></LineChart>
              </Chart>
              <Chart title="Top 10 districts by high-risk projects" takeaway={`${s.top_districts_high_risk[0]?.name} has the most HIGH-risk projects (${s.top_districts_high_risk[0]?.high_risk}).`}>
                <BarChart data={s.top_districts_high_risk} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={130} fontSize={11} /><Tooltip /><Bar dataKey="high_risk" name="High-risk projects" fill="#c0392b" /></BarChart>
              </Chart>
              <div className="tf-card" style={{ gridColumn: '1 / -1' }}>
                <div className="tf-card-header"><h2 className="tf-card-title">Model transparency</h2></div>
                <div className="tf-card-body" style={{ fontSize: '0.86rem' }}>
                  {m && <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span>Precision <strong>{m.precision}</strong></span><span>Recall <strong>{m.recall}</strong></span>
                    <span>F1 <strong>{m.f1}</strong></span><span>ROC-AUC <strong>{m.roc_auc}</strong></span><span>Test rows <strong>{m.test_rows}</strong></span></div>}
                  <em>Metrics come from a held-out test set of the synthetic dataset and demonstrate technical feasibility. Real deployment requires retraining and validation on authorised historical project data.</em>
                </div>
              </div>
            </div>
          );
        })()}
      </PageState>
    </div>
  );
}
