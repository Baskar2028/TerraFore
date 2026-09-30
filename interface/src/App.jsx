import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingState from './components/LoadingState';
import BackendBanner from './components/BackendBanner';
import { AuthProvider } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Predict = lazy(() => import('./pages/Predict'));
const GIS = lazy(() => import('./pages/GIS'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

function Shell({ theme, setTheme }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed((p) => !p)} mobileOpen={mobileOpen}
        closeMobileSidebar={() => setMobileOpen(false)} />
      <div className="main-wrapper">
        <Header theme={theme} toggleTheme={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))}
          toggleMobileSidebar={() => setMobileOpen((p) => !p)} />
        <main id="main-content" tabIndex={-1}>
          <BackendBanner />
          <Suspense fallback={<LoadingState message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/predict" element={<Predict />} />
              <Route path="/gis" element={<GIS />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
              <Route path="/inbox" element={<Navigate to="/alerts" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('terrafore-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('terrafore-theme', theme);
  }, [theme]);

  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState message="Loading..." />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={<ProtectedRoute><Shell theme={theme} setTheme={setTheme} /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
