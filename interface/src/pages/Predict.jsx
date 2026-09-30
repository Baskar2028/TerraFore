import React, { useEffect, useMemo, useState } from 'react';
import { predictRisk, apiGet, errorMessage } from '../services/api';
import ResultPanel from '../components/ResultPanel';
import Simulator from '../components/Simulator';
import LoadingState from '../components/LoadingState';
import { ShieldAlert, Send, AlertCircle, RotateCcw, Search, AlertTriangle } from 'lucide-react';

const PROJECT_TYPES = ['Airport', 'Expressway', 'Highway', 'Industrial Corridor', 'Irrigation Project', 'Metro', 'Power Infrastructure', 'Railway'];
const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'];

// Moderate project: scores ~58% (verified against the live model).
const DEFAULTS = {
  project_type: 'Expressway', state: 'Tamil Nadu', land_area_acres: 120, affected_families: 85,
  documentation_completion_pct: 60, compensation_completion_pct: 45, legal_disputes: 2, approval_completion_pct: 60,
  possession_completion_pct: 50, rehabilitation_completion_pct: 45, stakeholder_responsiveness: 'Medium',
};
const PCT = [
  ['documentation_completion_pct', 'Documentation'], ['compensation_completion_pct', 'Compensation'],
  ['approval_completion_pct', 'Approval'], ['possession_completion_pct', 'Possession'], ['rehabilitation_completion_pct', 'Rehabilitation (R&R)'],
];
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 };

function validate(f) {
  const e = {};
  const n = (k) => (f[k] === '' || f[k] === null ? NaN : Number(f[k]));
  if (!(n('land_area_acres') > 0)) e.land_area_acres = 'Must be greater than 0';
  if (!Number.isInteger(n('affected_families')) || n('affected_families') < 0) e.affected_families = 'Whole number, 0 or more';
  if (!Number.isInteger(n('legal_disputes')) || n('legal_disputes') < 0 || n('legal_disputes') > 20) e.legal_disputes = 'Whole number, 0 to 20';
  PCT.forEach(([k]) => { const v = n(k); if (!(v >= 0 && v <= 100)) e[k] = 'Must be 0 to 100'; });
  return e;
}
function warnings(f) {
  const w = [];
  if (f.possession_completion_pct - f.compensation_completion_pct > 30) w.push('Possession is far ahead of compensation. Verify entries.');
  if (f.rehabilitation_completion_pct - f.possession_completion_pct > 30) w.push('Rehabilitation is far ahead of possession. Verify entries.');
  if (Number(f.approval_completion_pct) === 100 && f.documentation_completion_pct < 40) w.push('Approval is 100% while documentation is under 40%. Verify entries.');
  return w;
}

export default function Predict() {
  const [form, setForm] = useState(DEFAULTS);
  const [projectId, setProjectId] = useState(null);
  const [search, setSearch] = useState('');
  const [demos, setDemos] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { apiGet('/api/v1/demo-projects').then(setDemos).catch(() => {}); }, []);
  const errors = useMemo(() => validate(form), [form]);
  const warns = useMemo(() => warnings(form), [form]);

  const onChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setProjectId(null); };
  const payload = () => ({
    ...form, land_area_acres: Number(form.land_area_acres), affected_families: parseInt(form.affected_families, 10),
    legal_disputes: parseInt(form.legal_disputes, 10),
    ...Object.fromEntries(PCT.map(([k]) => [k, Number(form[k])])),
  });

  const run = async (data = payload(), pid = projectId) => {
    setLoading(true); setError(null);
    const res = await predictRisk(data, pid);
    setLoading(false);
    if (res.success) setResult({ data: res.data, base: data }); else setError(res.error);
  };
  const submit = (e) => { e.preventDefault(); setSubmitted(true); if (Object.keys(errors).length === 0) run(); };

  const loadRecord = (inputs, pid) => { setForm(inputs); setProjectId(pid); setSubmitted(false); run(inputs, pid); };
  const loadById = async () => {
    const id = search.trim().toUpperCase(); if (!id) return;
    try { const d = await apiGet(`/api/v1/projects/${id}`); loadRecord(d.inputs, d.project_id); setError(null); }
    catch (x) { setError(errorMessage(x)); }
  };
  const reset = () => { setForm(DEFAULTS); setProjectId(null); setResult(null); setError(null); setSubmitted(false); };
  const Err = ({ k }) => (submitted && errors[k] ? <div style={{ color: 'var(--status-high-text)', fontSize: '0.74rem' }} role="alert">{errors[k]}</div> : null);

  return (
    <div className="page-content-wrapper">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title">Risk Assessment &amp; Explainability</h1>
            <p className="page-subtitle">Enter project parameters to estimate delay risk, see why, and test what could change it.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={reset}><RotateCcw size={15} /> Reset form</button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger" role="alert"><AlertCircle size={20} style={{ flexShrink: 0 }} /><div><strong>Notice:</strong> {error}</div></div>
      )}

      <div className="predict-grid">
        <div className="tf-card">
          <div className="tf-card-header">
            <h2 className="tf-card-title"><ShieldAlert size={18} style={{ color: 'var(--forest-base)' }} /> Project Parameters</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>11 fields</span>
          </div>
          <div className="tf-card-body">
            <div style={{ ...grid, marginBottom: 14 }}>
              <div className="form-group"><label className="form-label" htmlFor="demo">Load Demo Project</label>
                <select id="demo" className="form-control" value="" onChange={(e) => { const d = demos.find((x) => x.label === e.target.value); if (d) loadRecord(d.inputs, d.project_id); }}>
                  <option value="">Choose...</option>
                  {demos.map((d) => <option key={d.label} value={d.label}>{d.label} ({d.project_id}, {Math.round(d.delay_probability)}%)</option>)}
                </select></div>
              <div className="form-group"><label className="form-label" htmlFor="pid">Load existing project</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input id="pid" className="form-control" placeholder="TF00001" value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), loadById())} />
                  <button type="button" className="btn btn-secondary" onClick={loadById} aria-label="Load project"><Search size={15} /></button>
                </div></div>
            </div>
            {projectId && <div style={{ fontSize: '0.78rem', marginBottom: 10 }}>Loaded synthetic record <strong>{projectId}</strong>.</div>}

            <form onSubmit={submit} noValidate>
              <div style={grid}>
                <div className="form-group"><label className="form-label" htmlFor="project_type">Project Type</label>
                  <select id="project_type" name="project_type" className="form-control" value={form.project_type} onChange={onChange}>
                    {PROJECT_TYPES.map((p) => <option key={p}>{p}</option>)}</select></div>
                <div className="form-group"><label className="form-label" htmlFor="state">State</label>
                  <select id="state" name="state" className="form-control" value={form.state} onChange={onChange}>
                    {STATES.map((p) => <option key={p}>{p}</option>)}</select></div>
                <div className="form-group"><label className="form-label" htmlFor="land_area_acres">Land Area (Acres)</label>
                  <input id="land_area_acres" name="land_area_acres" type="number" step="any" className="form-control" value={form.land_area_acres} onChange={onChange} /><Err k="land_area_acres" /></div>
                <div className="form-group"><label className="form-label" htmlFor="affected_families">Affected Families</label>
                  <input id="affected_families" name="affected_families" type="number" step="1" className="form-control" value={form.affected_families} onChange={onChange} /><Err k="affected_families" /></div>
                <div className="form-group"><label className="form-label" htmlFor="legal_disputes">Legal Disputes (0-20)</label>
                  <input id="legal_disputes" name="legal_disputes" type="number" step="1" className="form-control" value={form.legal_disputes} onChange={onChange} /><Err k="legal_disputes" /></div>
                <div className="form-group"><label className="form-label" htmlFor="stakeholder_responsiveness">Stakeholder Responsiveness</label>
                  <select id="stakeholder_responsiveness" name="stakeholder_responsiveness" className="form-control" value={form.stakeholder_responsiveness} onChange={onChange}>
                    {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}</select></div>
              </div>

              <div style={{ margin: '12px 0 10px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Acquisition milestones completion (0 - 100%)
              </div>
              <div style={grid}>
                {PCT.map(([k, label]) => (
                  <div className="form-group" key={k}><label className="form-label" htmlFor={k}>{label}</label>
                    <div className="input-with-addon">
                      <input id={k} name={k} type="number" step="any" className="form-control" value={form[k]} onChange={onChange} />
                      <span className="input-addon-right">%</span></div><Err k={k} /></div>
                ))}
              </div>

              {warns.map((w) => <div key={w} className="alert-banner alert-warning" style={{ marginTop: 8 }}><AlertTriangle size={16} style={{ flexShrink: 0 }} /> {w}</div>)}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 44, marginTop: 16 }} disabled={loading}>
                {loading ? 'Analyzing project...' : <><Send size={16} /> Run Delay Risk Prediction</>}
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {loading && <div className="tf-card"><div className="tf-card-body"><LoadingState message="Analyzing project with the model and SHAP explainer..." /></div></div>}
          {!loading && !result && (
            <div className="tf-card"><div className="tf-card-body"><div className="empty-state">
              <ShieldAlert size={42} className="empty-state-icon" />
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 6 }}>Ready for assessment</div>
              <div className="empty-state-text">Submit the default moderate project, load a demo project, or search a project ID.</div>
            </div></div></div>
          )}
          {!loading && result && (
            <>
              <ResultPanel result={result.data} />
              <div className="tf-card">
                <div className="tf-card-header"><h3 className="tf-card-title">What-if simulator</h3></div>
                <div className="tf-card-body"><Simulator base={result.base} actionImpact={result.data.action_impact} /></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
