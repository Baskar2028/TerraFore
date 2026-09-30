import React from 'react';

/** Horizontal SHAP bars: red raises risk, green reduces it. */
export default function DriverBars({ factors = [] }) {
  const max = Math.max(0.01, ...factors.map((f) => Math.abs(f.shap_impact)));
  if (!factors.length) return <div className="empty-state-text">No drivers returned.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {factors.map((f) => {
        const up = f.shap_impact > 0;
        return (
          <div key={f.factor}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', gap: 8 }}>
              <span>{f.factor.replace(/ (completion|responsiveness)$/i, (m) => m)}: <strong>{f.value}</strong></span>
              <span style={{ color: up ? 'var(--status-high-text)' : 'var(--status-low-text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {up ? 'raises risk' : 'reduces risk'}
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${(Math.abs(f.shap_impact) / max) * 100}%`, height: '100%', borderRadius: 4,
                background: up ? 'var(--status-high-text)' : 'var(--status-low-text)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
