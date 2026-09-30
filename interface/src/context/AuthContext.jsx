import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, getToken, setToken } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const ROLE_LABELS = {
  LAND_ACQUISITION_OFFICER: 'Land Acquisition Officer',
  PROJECT_AUTHORITY: 'Project Authority',
  ADMINISTRATOR: 'Administrator',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    apiGet('/api/v1/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener('terrafore-unauthorized', h);
    return () => window.removeEventListener('terrafore-unauthorized', h);
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await apiPost('/api/v1/auth/login', { email, password });
    setToken(d.token); setUser(d.user); return d.user;
  }, []);
  const signup = useCallback(async (body) => {
    const d = await apiPost('/api/v1/auth/signup', body);
    setToken(d.token); setUser(d.user); return d.user;
  }, []);
  const logout = useCallback(async () => {
    try { await apiPost('/api/v1/auth/logout'); } catch { /* token may be expired */ }
    setToken(null); setUser(null);
  }, []);

  const role = user?.role;
  const can = {
    ack: role === 'PROJECT_AUTHORITY' || role === 'ADMINISTRATOR',
    export: role === 'PROJECT_AUTHORITY' || role === 'ADMINISTRATOR',
    admin: role === 'ADMINISTRATOR',
  };
  return <AuthContext.Provider value={{ user, loading, login, signup, logout, can }}>{children}</AuthContext.Provider>;
}
