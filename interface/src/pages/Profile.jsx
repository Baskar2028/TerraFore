import React, { useState } from 'react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import useApi from '../components/useApi';
import PageState from '../components/PageState';
import { apiPost, errorMessage } from '../services/api';

const PERMS = {
  LAND_ACQUISITION_OFFICER: 'View dashboards, projects, predictions, simulator, GIS, analytics and alerts.',
  PROJECT_AUTHORITY: 'Everything an officer can do, plus acknowledge alerts and export project CSV.',
  ADMINISTRATOR: 'Everything an authority can do, plus audit log, user list and model retraining.',
};

function Admin() {
  const [tab, setTab] = useState('audit');
  const audit = useApi('/api/v1/admin/audit', { limit: 100 });
  const users = useApi('/api/v1/admin/users');
  const models = useApi('/api/v1/admin/models');
  const [msg, setMsg] = useState(null);
  const retrain = async () => {
    setMsg('Retraining...');
    try { const r = await apiPost('/api/v1/admin/retrain'); setMsg(`v${r.version}: ROC-AUC ${r.candidate_roc_auc} (previous ${r.previous_roc_auc}) - ${r.activated ? 'activated' : 'not activated (AUC dropped)'}`); models.reload(); }
    catch (e) { setMsg(errorMessage(e)); }
  };
  const cur = tab === 'audit' ? audit : tab === 'users' ? users : models;
  return (
    <div className="tf-card" style={{ marginTop: 24 }}>
      <div className="tf-card-header">
        <h2 className="tf-card-title">Administration</h2>
        <span><button className={`btn ${tab === 'audit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('audit')}>Audit log</button>{' '}
          <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>Users</button>{' '}
          <button className={`btn ${tab === 'models' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('models')}>Models</button></span>
      </div>
      <PageState loading={cur.loading} error={cur.error} onRetry={cur.reload} empty={Array.isArray(cur.data) && cur.data.length === 0}>
        {tab === 'models' ? (
          <div className="tf-card-body" style={{ fontSize: '0.86rem' }}>
            <p>Baseline held-out ROC-AUC: <strong>{models.data?.active_baseline_roc_auc}</strong> &middot; recorded outcomes pending: <strong>{models.data?.pending_outcomes}</strong></p>
            <button className="btn btn-teal" onClick={retrain}>Retrain model</button> {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Hot-swaps only if hold-out ROC-AUC does not drop. Synthetic prototype.</p>
            <table className="tf-table"><thead><tr><th>Version</th><th>ROC-AUC</th><th>Active</th><th>Note</th></tr></thead><tbody>{models.data?.versions.map((v) => <tr key={v.version}><td>v{v.version}</td><td>{v.roc_auc}</td><td>{v.active ? 'yes' : 'no'}</td><td>{v.note}</td></tr>)}</tbody></table>
          </div>
        ) : (
        <div className="table-container"><table className="tf-table">
          {tab === 'audit' ? (<><thead><tr><th>Time (UTC)</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>{audit.data?.map((a) => <tr key={a.id}><td>{a.timestamp.replace('T', ' ').slice(0, 19)}</td><td>{a.user}</td><td>{a.action}</td><td>{a.detail}</td></tr>)}</tbody></>)
            : (<><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>State</th><th>Created</th></tr></thead>
              <tbody>{users.data?.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{ROLE_LABELS[u.role]}</td><td>{u.state_jurisdiction || 'All'}</td><td>{u.created_at.slice(0, 10)}</td></tr>)}</tbody></>)}
        </table></div>
        )}
      </PageState>
    </div>
  );
}

export default function Profile() {
  const { user, can } = useAuth();
  const me = useApi('/api/v1/auth/me');
  const u = me.data || user;
  return (
    <div className="page-content-wrapper">
      <div className="page-header"><h1 className="page-title">Profile</h1></div>
      <PageState loading={me.loading && !u} error={me.error} onRetry={me.reload}>
        {u && (
          <div className="tf-card" style={{ maxWidth: 640 }}>
            <div className="tf-card-body" style={{ fontSize: '0.92rem', display: 'grid', gap: 8 }}>
              <div><strong>Name:</strong> {u.name}</div>
              <div><strong>Email:</strong> {u.email}</div>
              <div><strong>Role:</strong> {ROLE_LABELS[u.role]}</div>
              <div><strong>State jurisdiction:</strong> {u.state_jurisdiction || 'All states'}</div>
              <div><strong>Member since:</strong> {u.created_at.slice(0, 10)}</div>
              <div style={{ color: 'var(--text-secondary)' }}><strong>Permissions:</strong> {PERMS[u.role]}</div>
            </div>
          </div>
        )}
      </PageState>
      {can.admin && <Admin />}
    </div>
  );
}
