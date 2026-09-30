import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'LAND_ACQUISITION_OFFICER' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(null);
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.');
    setBusy(true);
    try { await signup(f); nav('/', { replace: true }); } catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <div className="auth-page">
      <div className="auth-card tf-card"><div className="tf-card-body">
        <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Create account</h1>
        <p className="page-subtitle" style={{ marginBottom: 16 }}>Prototype accounts only. Administrator accounts cannot be self-registered.</p>
        {err && <div className="alert-banner alert-danger" role="alert">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label" htmlFor="n">Full name</label><input id="n" className="form-control" value={f.name} onChange={set('name')} required minLength={2} /></div>
          <div className="form-group"><label className="form-label" htmlFor="e">Email</label><input id="e" type="email" className="form-control" value={f.email} onChange={set('email')} required /></div>
          <div className="form-group"><label className="form-label" htmlFor="p">Password (8+ characters)</label><input id="p" type="password" className="form-control" value={f.password} onChange={set('password')} required /></div>
          <div className="form-group"><label className="form-label" htmlFor="r">Role</label>
            <select id="r" className="form-control" value={f.role} onChange={set('role')}>
              <option value="LAND_ACQUISITION_OFFICER">Land Acquisition Officer</option>
              <option value="PROJECT_AUTHORITY">Project Authority</option>
            </select></div>
          <button className="btn btn-primary" style={{ width: '100%', height: 42 }} disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
        </form>
        <p style={{ marginTop: 14, fontSize: '0.84rem' }}>Already registered? <Link to="/login">Log in</Link></p>
      </div></div>
    </div>
  );
}
