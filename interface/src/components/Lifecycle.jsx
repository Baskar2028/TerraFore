import React from 'react';

const COL = { green: 'var(--status-low-text)', amber: '#C77F10', red: 'var(--status-high-text)' };
const BG = { green: 'var(--status-low-bg)', amber: 'var(--status-medium-bg)', red: 'var(--status-high-bg)' };

export default function Lifecycle({ data }) {
  if (!data) return null;
  return (
    <div>
      <div className="lifecycle-row">
        {data.stages.map((s, i) => (
          <div key={s.stage} className="lifecycle-step" style={{ background: BG[s.status], borderColor: COL[s.status],
            boxShadow: s.is_bottleneck ? `0 0 0 2px ${COL[s.status]}` : 'none' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stage {i + 1}</div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{s.stage}</div>
            <div style={{ color: COL[s.status], fontWeight: 800 }}>{s.completion.toFixed(0)}%</div>
            {s.is_bottleneck && <div className="lifecycle-tag">Bottleneck</div>}
            {s.legal_dispute_chip && <div className="lifecycle-tag legal">Legal disputes</div>}
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.84rem', marginTop: 10 }}><strong>{data.bottleneck}:</strong> {data.bottleneck_reason}</p>
      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{data.caption}</p>
    </div>
  );
}
