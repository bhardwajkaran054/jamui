/**
 * GitHub API Service
 * This service allows the frontend to act as its own backend by 
 * reading and writing a JSON file directly in the GitHub repository.
 */

const REPO_OWNER = 'bhardwajkaran054';
const REPO_NAME = 'jamui';
const DB_PATH = 'public/db.json';

// Simple Promise-based cache for concurrent calls
let activeFetchPromise = null;
let lastFetchTime = 0;
let cachedDb = null;
const CACHE_TTL = 5000; // 5 seconds (Reduced from 30s or other for better real-time feel)

// FALLBACK TOKEN: This is a restricted, public-only token for saving orders.
// In a real production app, this should be an edge function/proxy.
// For this Git-as-a-Backend setup, we use it for mobile/private window writes.
const PUBLIC_WRITE_TOKEN = 'ghp_rKk7L6p6X8N9M0P1Q2R3S4T5U6V7W8X9Y0Z1'; // Placeholder, will use admin's token if available

// Helper to get token from storage or environment
const getToken = () => {
  try {
    // 1. Check for a blacklisted token first (to avoid repeating known failures in this session)
    const badToken = typeof window !== 'undefined' ? sessionStorage.getItem('badGithubToken') : null;
    
    // 2. Admin Session Token (Saved in localStorage)
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('githubToken') : null;
    if (adminToken && adminToken !== badToken) return adminToken.trim();
    
    // 3. Shared Public Token (Optional fallback saved by admin)
    const publicToken = typeof window !== 'undefined' ? localStorage.getItem('publicOrderToken') : null;
    if (publicToken && publicToken !== badToken) return publicToken.trim();

    // 4. Environment Variable (VITE_GITHUB_TOKEN)
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    if (envToken && envToken !== badToken) return envToken.trim();

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Marks a token as invalid and clears it from storage
 */
const invalidateToken = (token) => {
  if (!token) return;
  const t = token.trim();
  console.warn('[GITHUB] Token identified as invalid. Clearing from session.');
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('badGithubToken', t);
    
    if (localStorage.getItem('githubToken') === t) {
      localStorage.removeItem('githubToken');
    }
    if (localStorage.getItem('publicOrderToken') === t) {
      localStorage.removeItem('publicOrderToken');
    }
    
    window.dispatchEvent(new CustomEvent('github-token-cleared'));
  }
};

/**
 * Fetches the current database content from GitHub
 */
export const fetchDb = async () => {
  // 1. STRATEGY: Try Raw GitHub Content FIRST (Fastest, no rate limits, public-safe)
  try {
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${DB_PATH}?t=${Date.now()}`;
    const rawResponse = await fetch(rawUrl, { cache: 'no-store' });
    if (rawResponse.ok) {
      const data = await rawResponse.json();
      if (data && data.products) {
        console.log('[GITHUB] Database loaded via Raw Content URL');
        return data;
      }
    }
  } catch (err) {
    console.warn('[GITHUB] Raw fetch fallback:', err.message);
  }

  // 2. Fallback: REST API (If raw content is delayed or fails)
  const token = getToken();
  
  const tryFetch = async (path, useToken = true) => {
    // If we don't have a token and useToken is true, skip this attempt to save time
    if (useToken && !token) return null;

    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (useToken && token) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    try {
      // Use a unique query parameter for cache-busting
      const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?t=${Date.now()}`;
      const response = await fetch(url, {
        headers,
        method: 'GET',
        mode: 'cors'
      });

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`[GITHUB] ${response.status} for ${path}:`, errorData.message || 'Unauthorized/Rate Limit');

        // DECISIVE FIX: If it's a 401 (Unauthorized), the token is definitely bad.
        if (response.status === 401 && useToken) {
          invalidateToken(token);
          return null;
        }
        return null;
      }

      if (response.ok) {
        const fileData = await response.json();
        const binaryString = atob(fileData.content.replace(/\n/g, ''));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoded = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(decoded);
      }
    } catch (err) {
      console.warn(`[GITHUB] Fetch failed for ${path}:`, err.message);
    }
    return null;
  };

  // 3. Fallback: REST API with token
  if (token) {
    const data = await tryFetch(DB_PATH, true);
    if (data) return data;
  }

  // 4. Final Fallback: REST API without token
  const finalData = await tryFetch(DB_PATH, false);
  if (finalData) return finalData;

  // 5. Emergency Default (Prevents app crash)
  return { products: [], orders: [], categories: [] };
};

/**
 * Updates the database file in the repository
 */
export const updateDb = async (newData) => {
  const token = getToken();
  if (!token) throw new Error('GitHub Token required for this action');

  // 1. Get the current file's SHA (required for updates)
  // Try with token first, then without (if rate limit allows)
  let sha = null;
  let finalPath = DB_PATH;

  const tryGetSha = async (path, useToken = true) => {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (useToken && token) headers['Authorization'] = `token ${token.trim()}`;
    
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?t=${Date.now()}`;
    const response = await fetch(url, {
      headers,
      method: 'GET',
      mode: 'cors'
    });
    if (response.ok) {
      const data = await response.json();
      return data.sha;
    }
    return null;
  };

  try {
    // Try primary path with token
    sha = await tryGetSha(DB_PATH, true);
    
    // If failed, try primary path without token
    if (!sha) {
      sha = await tryGetSha(DB_PATH, false);
    }

    // If still failed, try root path with token
    if (!sha && DB_PATH.includes('/')) {
      const rootPath = DB_PATH.split('/').pop();
      sha = await tryGetSha(rootPath, true);
      if (sha) finalPath = rootPath;
      else {
        sha = await tryGetSha(rootPath, false);
        if (sha) finalPath = rootPath;
      }
    }

    if (!sha) {
      throw new Error(`Could not find database file at ${DB_PATH} or ${DB_PATH.split('/').pop()} in repository ${REPO_OWNER}/${REPO_NAME}. Please verify the repository path and token permissions.`);
    }
  } catch (err) {
    throw new Error(`Failed to get database file info: ${err.message}`);
  }

  if (!sha) throw new Error('Could not retrieve file SHA for update');

  // 2. Commit the new content (Modern Base64 encoding with UTF-8 support)
  const jsonString = JSON.stringify(newData, null, 2);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonString);
  let binaryString = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  const content = btoa(binaryString);

  const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${finalPath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Update database [skip ci]`,
      content: content,
      sha: sha,
      branch: 'main'
    })
  });

  if (!updateResponse.ok) {
    if (updateResponse.status === 401) {
      invalidateToken(token);
    }
    const error = await updateResponse.json().catch(() => ({ message: 'Unknown error' }));
    console.error('[GITHUB DEBUG] Update failed:', {
      status: updateResponse.status,
      message: error.message,
      tokenPreview: token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : 'none'
    });
    throw new Error(`Failed to update database on GitHub: ${error.message}`);
  }

  return updateResponse.json();
};

/**
 * Validates a GitHub Token by checking repository access
 */
export const validateToken = async (token) => {
  try {
    // 1. First, check if the token is valid by getting the authenticated user
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      console.error('[GITHUB] Invalid Token:', userResponse.status);
      return false;
    }

    const userData = await userResponse.json();
    console.log('[GITHUB] Token belongs to:', userData.login);

    // 2. Check if the repo exists under either bhardwajkaran054 OR the token owner
    const repoOwners = ['bhardwajkaran054', userData.login];
    
    for (const owner of repoOwners) {
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${REPO_NAME}`, {
        headers: { 
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (repoResponse.ok) {
        console.log(`[GITHUB] Found repository under owner: ${owner}`);
        return true;
      }
    }

    console.error(`[GITHUB] Repository ${REPO_NAME} not found under ${repoOwners.join(' or ')}`);
    return false;
  } catch (err) {
    console.error('[GITHUB] Validation request failed:', err);
    return false;
  }
};
