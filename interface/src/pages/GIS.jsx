import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import useApi from '../components/useApi';
import PageState from '../components/PageState';
import RiskBadge from '../components/RiskBadge';

const COLORS = { LOW: '#1a9e6f', MEDIUM: '#e0a020', HIGH: '#c0392b' };

export default function GIS() {
  const [risk, setRisk] = useState('');
  const [state, setState] = useState('');
  const [limit, setLimit] = useState(300);
  const meta = useApi('/api/v1/model/info');
  const { data, loading, error, reload } = useApi('/api/v1/gis/projects', { risk: risk || undefined, state: state || undefined, limit });

  return (
    <div className="page-content-wrapper">
      <div className="page-header">
        <h1 className="page-title">GIS Mapping</h1>
        <p className="page-subtitle">Highest-risk projects on OpenStreetMap. Coordinates are synthetic (district headquarters plus random offset). Showing up to {limit} markers, ranked by risk.</p>
      </div>
      <div className="filter-bar">
        <select className="form-control" value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk level"><option value="">All risk levels</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select>
        <select className="form-control" value={state} onChange={(e) => setState(e.target.value)} aria-label="State"><option value="">All states</option>{meta.data?.states.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="Marker limit"><option value={100}>Top 100</option><option value={300}>Top 300</option><option value={600}>Top 600</option></select>
      </div>
      <PageState loading={loading} error={error} onRetry={reload} empty={data && data.items.length === 0} emptyText="No projects match these filters.">
        {data && (
          <div className="gis-map-container">
            <div className="map-floating-legend">
              <strong>Risk level</strong>
              {Object.entries(COLORS).map(([k, c]) => <div key={k}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, marginRight: 6 }} />{k}</div>)}
              <div style={{ marginTop: 4 }}>{data.total_returned} markers</div>
            </div>
            <MapContainer center={[22.5, 79]} zoom={5} scrollWheelZoom style={{ height: '100%' }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {data.items.map((m) => (
                <CircleMarker key={m.id} center={[m.lat, m.lng]} radius={6} pathOptions={{ color: COLORS[m.risk_level], fillColor: COLORS[m.risk_level], fillOpacity: 0.7, weight: 1 }}>
                  <Popup>
                    <strong>{m.name}</strong><br />{m.district}, {m.state}<br />
                    Score: <strong>{m.risk_score}</strong> <RiskBadge level={m.risk_level} /><br />
                    <Link to={`/projects/${m.id}`}>View project</Link>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </PageState>
    </div>
  );
}
