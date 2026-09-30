import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, Menu, LogOut, User } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import SyntheticBadge from './SyntheticBadge';

const routeTitleMap = {
  '/': 'Dashboard', '/predict': 'Risk Assessment', '/gis': 'GIS Mapping', '/projects': 'Projects',
  '/alerts': 'Alerts', '/analytics': 'Analytics', '/profile': 'Profile', '/settings': 'Settings',
};

export default function Header({ theme, toggleTheme, toggleMobileSidebar }) {
  const location = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const title = location.pathname.startsWith('/projects/') ? 'Project Detail' : routeTitleMap[location.pathname] || 'Workspace';
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="app-header">
      <div className="header-left">
        <button type="button" className="header-menu-btn" onClick={toggleMobileSidebar} aria-label="Toggle navigation menu"><Menu size={20} /></button>
        <nav aria-label="Breadcrumb" className="breadcrumb-nav">
          <Link to="/">TerraFore</Link><span className="breadcrumb-sep">/</span><span className="breadcrumb-current">{title}</span>
        </nav>
      </div>
      <div className="header-right">
        <SyntheticBadge />
        <button type="button" className="header-action-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link to="/alerts" className="header-action-btn" aria-label="View alerts" title="Alerts"><Bell size={18} /></Link>
        <div style={{ position: 'relative' }}>
          <button type="button" className="header-avatar" onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open}>{initials}</button>
          {open && (
            <div className="avatar-menu" onMouseLeave={() => setOpen(false)}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{ROLE_LABELS[user?.role]}</div>
              </div>
              <button type="button" className="avatar-menu-item" onClick={() => { setOpen(false); nav('/profile'); }}><User size={15} /> Profile</button>
              <button type="button" className="avatar-menu-item" onClick={async () => { await logout(); nav('/login'); }}><LogOut size={15} /> Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
