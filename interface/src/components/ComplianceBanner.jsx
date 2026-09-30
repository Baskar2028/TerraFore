import React from 'react';
import { TreePine } from 'lucide-react';

export default function ComplianceBanner({ compliance }) {
  if (!compliance?.is_risk) return null;
  return (
    <div className="alert-banner alert-warning" role="alert" title={compliance.note}>
      <TreePine size={20} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong>{compliance.flag}</strong> (status: {compliance.forest_clearance_status}) &mdash; a compliance and delay risk.
        <div style={{ fontSize: '0.82rem', marginTop: 4 }}>{compliance.recommended_action}</div>
        <div style={{ fontSize: '0.74rem', marginTop: 4, opacity: 0.85 }}>{compliance.note}</div>
      </div>
    </div>
  );
}
