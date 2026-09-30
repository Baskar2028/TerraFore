import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import useApi from '../components/useApi';
import PageState from '../components/PageState';
import ResultPanel from '../components/ResultPanel';
import Simulator from '../components/Simulator';
import RiskBadge from '../components/RiskBadge';
import { ArrowLeft } from 'lucide-react';

const COLORS = { LOW: '#1a9e6f', MEDIUM: '#e0a020', HIGH: '#c0392b' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: p, loading, error, reload } = useApi(`/api/v1/projects/${id}`);
  return (
    <div className="page-content-wrapper">
      <Link to="/projects" className="btn btn-secondary" style={{ marginBottom: 16, display: 'inline-flex' }}><ArrowLeft size={15} /> Projects</Link>
      <PageState loading={loading} error={error} onRetry={reload}>
        {p && (
          <>
            <div className="page-header">
              <h1 className="page-title">{p.project_name}</h1>
              <p className="page-subtitle">
                {p.project_id} &middot; {p.project_type} &middot; {p.district}, {p.state} &middot; <RiskBadge level={p.risk_level} />
                <br />Planned completion: {p.planned_completion_date} ({p.days_to_deadline >= 0 ? `${p.days_to_deadline} days left` : `${-p.days_to_deadline} days overdue`}) &middot; Notified: {p.notification_date}
              </p>
            </div>
            <div className="predict-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                <ResultPanel result={p.prediction} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                <div className="tf-card">
                  <div className="tf-card-header"><h3 className="tf-card-title">Location (synthetic)</h3></div>
                  <div className="tf-card-body">
                    <MapContainer center={[p.latitude, p.longitude]} zoom={9} style={{ height: 220, borderRadius: 6 }} scrollWheelZoom={false}>
                      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <CircleMarker center={[p.latitude, p.longitude]} radius={10} pathOptions={{ color: COLORS[p.risk_level], fillOpacity: 0.7 }} />
                    </MapContainer>
                  </div>
                </div>
                <div className="tf-card">
                  <div className="tf-card-header"><h3 className="tf-card-title">What-if simulator</h3></div>
                  <div className="tf-card-body"><Simulator base={p.inputs} actionImpact={p.prediction.action_impact} /></div>
                </div>
                <Link to="/predict" className="btn btn-secondary">Open in Risk Assessment form</Link>
              </div>
            </div>
          </>
        )}
      </PageState>
    </div>
  );
}
