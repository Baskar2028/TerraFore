import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const TOKEN_KEY = 'terrafore-token';

const apiClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' }, timeout: 20000 });

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

apiClient.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/signup')) {
      setToken(null);
      window.dispatchEvent(new Event('terrafore-unauthorized'));
    }
    return Promise.reject(err);
  },
);

export const errorMessage = (error) => {
  const d = error?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join(', ');
  if (d) return String(d);
  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return 'Unable to connect to the TerraFore API. Start the backend with: python -m uvicorn api:app --host 127.0.0.1 --port 8000';
  }
  return error?.message || 'Unexpected error';
};

export const checkApiHealth = async () => {
  try {
    return (await apiClient.get('/health', { timeout: 5000 })).data;
  } catch {
    return null;
  }
};

export const predictRisk = async (payload, projectId) => {
  try {
    const r = await apiClient.post('/predict', payload, { params: projectId ? { project_id: projectId } : undefined });
    return { success: true, data: r.data };
  } catch (e) {
    return { success: false, error: errorMessage(e) };
  }
};

export const apiGet = async (path, params) => (await apiClient.get(path, { params })).data;
export const apiPost = async (path, body, params) => (await apiClient.post(path, body, { params })).data;

export const downloadCsv = async (params) => {
  const r = await apiClient.get('/api/v1/projects/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url; a.download = 'terrafore_projects_synthetic.csv'; a.click();
  URL.revokeObjectURL(url);
};

export default apiClient;
