/**
 * API client for Jamui Super Mart
 * All requests go to /api/* on the same Vercel deployment
 */

export const apiFetch = async (endpoint, options = {}) => {
  const url = `/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
