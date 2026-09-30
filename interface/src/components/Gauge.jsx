import React from 'react';

const color = (l) => (l === 'HIGH' ? 'var(--status-high-text)' : l === 'MEDIUM' ? '#C77F10' : 'var(--status-low-text)');

/** Semicircle 0-100 risk gauge. */
export default function Gauge({ score, level, size = 200, label }) {
  const r = 80, c = Math.PI * r;
  const s = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div style={{ textAlign: 'center', width: size, maxWidth: '100%' }}>
      <svg viewBox="0 0 200 120" width="100%" role="img" aria-label={`Delay risk score ${s} out of 100, ${level}`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--bg-subtle)" strokeWidth="16" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={color(level)} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${(s / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray .4s' }} />
        <text x="100" y="90" textAnchor="middle" fontSize="38" fontWeight="800" fill="var(--text-primary)">{s}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="var(--text-muted)">out of 100</text>
      </svg>
      {label && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>}
    </div>
  );
}
