/**
 * api.js — Centralized fetch wrapper
 * Attaches JWT from localStorage to every request.
 */

const API_BASE = '/api';

async function request(method, path, body = null) {
  const token = localStorage.getItem('tf_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + path, opts);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_user');
      window.navigate && window.navigate('/login');
    }
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data !== undefined ? json.data : json;
}

const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
};

const Auth = {
  login:  (creds) => api.post('/auth/login',  creds),
  signup: (creds) => api.post('/auth/signup', creds),
  saveSession(token, user) {
    localStorage.setItem('tf_token', token);
    localStorage.setItem('tf_user',  JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.navigate('/login');
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('tf_user')); }
    catch { return null; }
  },
  isLoggedIn() { return !!localStorage.getItem('tf_token'); },
};
