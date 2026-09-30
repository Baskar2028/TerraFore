import React from 'react';
import { Palette, Sun, Moon, Check, Bell } from 'lucide-react';

export default function Settings({ theme, setTheme }) {
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <div className="page-content-wrapper">
      <div className="page-header">
        <h1 className="page-title">Platform Settings</h1>
        <p className="page-subtitle">
          Manage system interface preferences, display theme, and localized workspace defaults.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
        {/* Appearance Section */}
        <div className="tf-card">
          <div className="tf-card-header">
            <h2 className="tf-card-title">
              <Palette size={18} style={{ color: 'var(--forest-base)' }} />
              Appearance
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Theme Engine</span>
          </div>

          <div className="tf-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Select your preferred visual identity for the TerraFore intelligence workspace. Your preference is persisted in your browser's local storage across sessions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Light Mode Option Card */}
              <div
                onClick={() => handleThemeChange('light')}
                style={{
                  border: theme === 'light' ? '2px solid var(--forest-base)' : '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#F7F8F6',
                  color: '#15221C',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem' }}>
                    <Sun size={18} style={{ color: '#0E6E64' }} /> Light Mode
                  </div>
                  {theme === 'light' && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--forest-base)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#55685F', lineHeight: '1.4' }}>
                  Warm ivory surfaces, deep forest green accents, and optimal contrast for bright office environments.
                </div>
              </div>

              {/* Dark Mode Option Card */}
              <div
                onClick={() => handleThemeChange('dark')}
                style={{
                  border: theme === 'dark' ? '2px solid var(--teal-base)' : '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#14221D',
                  color: '#E9F1EC',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem' }}>
                    <Moon size={18} style={{ color: '#1BB3A2' }} /> Dark Mode
                  </div>
                  {theme === 'dark' && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--teal-base)', color: '#0D1613', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#ABC0B5', lineHeight: '1.4' }}>
                  Sophisticated deep forest slate, high-contrast typography, and reduced glare for prolonged monitoring.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Settings Placeholders (restrained & clean) */}
        <div className="tf-card">
          <div className="tf-card-header">
            <h2 className="tf-card-title">
              <Bell size={18} style={{ color: 'var(--text-muted)' }} />
              Notification Thresholds
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read-Only (from model rules)</span>
          </div>
          <div className="tf-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>High Risk Delay Escalation Threshold</span>
              <strong>&gt; 60.0% Probability</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Statutory Dispute Flagging</span>
              <strong>&ge; 5 Active Disputes</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
