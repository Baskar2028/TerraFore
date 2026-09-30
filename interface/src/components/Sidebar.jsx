import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Map,
  FolderKanban,
  AlertTriangle,
  BarChart3,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from 'lucide-react';

const workspaceNav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/predict', label: 'Risk Assessment', icon: ShieldAlert },
  { path: '/gis', label: 'GIS Mapping', icon: Map },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
];

const insightsNav = [
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const accountNav = [
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  isCollapsed,
  toggleCollapse,
  mobileOpen,
  closeMobileSidebar,
}) {
  const location = useLocation();

  const handleNavClick = () => {
    if (mobileOpen) {
      closeMobileSidebar();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />

      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <NavLink to="/" className="brand-wrapper" onClick={handleNavClick}>
            <div className="brand-icon-box">
              <Landmark size={18} />
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <span className="brand-title">TerraFore</span>
                <span className="brand-subtitle">Intelligence</span>
              </div>
            )}
          </NavLink>

          {/* Desktop collapse button */}
          <button
            type="button"
            className="sidebar-toggle-btn desktop-only"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Content */}
        <div className="sidebar-content">
          {/* Workspace Section */}
          <div className="nav-section">
            <div className="nav-section-title">Workspace</div>
            <ul className="nav-list">
              {workspaceNav.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleNavClick}
                      className={`nav-item-link ${isActive ? 'active' : ''}`}
                      title={item.label}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Insights Section */}
          <div className="nav-section">
            <div className="nav-section-title">Insights</div>
            <ul className="nav-list">
              {insightsNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleNavClick}
                      className={`nav-item-link ${isActive ? 'active' : ''}`}
                      title={item.label}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Account Section */}
          <div className="nav-section">
            <div className="nav-section-title">Account</div>
            <ul className="nav-list">
              {accountNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleNavClick}
                      className={`nav-item-link ${isActive ? 'active' : ''}`}
                      title={item.label}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="nav-item-label">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <span className="sidebar-footer-text">Prototype v2.0</span>
          {!isCollapsed && <span className="sidebar-footer-text">Synthetic data</span>}
        </div>
      </aside>

      {/* Spacer to push content correctly on desktop */}
      <div className={`sidebar-desktop-spacer ${isCollapsed ? 'collapsed' : ''}`} aria-hidden="true" />
    </>
  );
}
