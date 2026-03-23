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
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
