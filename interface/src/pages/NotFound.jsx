import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="page-content-wrapper">
      <div className="tf-card" style={{ maxWidth: '540px', margin: '40px auto', textAlign: 'center', padding: '48px 24px' }}>
        <Compass size={48} style={{ color: 'var(--teal-base)', margin: '0 auto 16px', opacity: 0.8 }} />
        <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          The requested coordinate or routing path is not indexed within the TerraFore Land Acquisition Intelligence workspace.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
          <Home size={16} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
