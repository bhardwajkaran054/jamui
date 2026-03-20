/**
 * API Configuration
 * Always uses local Node.js backend with Turso database
 */
export const BACKEND_MODE = 'local-node-backend';
export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  let url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  // Auto-fix for relative URLs in native/Capacitor environments
  if (!url.startsWith('http') && typeof window !== 'undefined' && (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:')) {
    console.warn('[API] Relative URL detected in native environment. This will likely fail.');
  }

  // Auto-add Authorization header if token exists
  const token = localStorage.getItem('githubToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('githubToken');
        window.dispatchEvent(new CustomEvent('github-token-cleared'));
      }
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API ERROR] ${url} (${response.status}):`, errorData.error || response.statusText);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${url}:`, err.message);
    return null;
  }
};

export default apiFetch;
