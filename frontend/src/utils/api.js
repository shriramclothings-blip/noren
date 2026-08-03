import axios from 'axios';

const TOKEN_KEY = 'noren_token';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — token expired or invalid
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('noren_user');
      localStorage.removeItem('src_token');
      localStorage.removeItem('src_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const downloadFile = async (url, filename) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    alert('You are not logged in. Please login again.');
    window.location.href = '/login';
    return;
  }
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], {
    type: res.headers['content-type'] || 'application/octet-stream',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || 'export.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export default api;
