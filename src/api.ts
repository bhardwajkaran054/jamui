/**
 * API client for Jamui Super Mart
 * All requests go to /api/* on the same Vercel deployment
 */

export interface ApiFetchOptions extends RequestInit {
  // Allows extending fetch options
}

export interface ApiError {
  error: string;
}

/**
 * API client for Jamui Super Mart
 * All requests go to /api/* on the same Vercel deployment
 */
export const apiFetch = async <T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> => {
  const url = `/api${endpoint}`;
  
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('jamuiToken') : null;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
