import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import SyntheticBadge from '../components/SyntheticBadge';

export const PITCH = "Current systems tell officials what has already happened. TerraFore predicts what could go wrong before it becomes a critical delay: Predict → Explain → Recommend → Monitor. It doesn't just identify risk; it helps officials understand it and simulate what could happen if a bottleneck is addressed.";
const DEMOS = [
  ['Land Acquisition Officer', 'officer@terrafore.demo'],
  ['Project Authority', 'authority@terrafore.demo'],
  ['Administrator', 'admin@terrafore.demo'],
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const go = async (e, p) => {
    setBusy(true); setErr(null);
    try { await login(e, p); nav(loc.state?.from || '/', { replace: true }); }
    catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card tf-card">
        <div className="tf-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="brand-icon-box"><Landmark size={18} /></div>
            <h1 style={{ fontSize: '1.4rem' }}>TerraFore</h1><SyntheticBadge />
          </div>
          <p className="page-subtitle" style={{ marginBottom: 18 }}>{PITCH}</p>
          {err && <div className="alert-banner alert-danger" role="alert">{err}</div>}
          <form onSubmit={(e) => { e.preventDefault(); go(email, password); }}>
            <div className="form-group"><label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="form-group"><label className="form-label" htmlFor="pw">Password</label>
              <input id="pw" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <button className="btn btn-primary" style={{ width: '100%', height: 42 }} disabled={busy}>{busy ? 'Signing in...' : 'Log in'}</button>
          </form>
          <div style={{ marginTop: 18, padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 6 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 8 }}>Demo accounts (prototype) &mdash; password <code>Demo@1234</code></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DEMOS.map(([l, e]) => <button key={e} type="button" className="btn btn-secondary" disabled={busy} onClick={() => go(e, 'Demo@1234')}>Use {l}</button>)}
            </div>
          </div>
          <p style={{ marginTop: 14, fontSize: '0.84rem' }}>New here? <Link to="/signup">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
