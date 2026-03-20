/**
 * GitHub API Service
 * This service allows the frontend to act as its own backend by 
 * reading and writing a JSON file directly in the GitHub repository.
 */

const REPO_OWNER = 'bhardwajkaran054';
const REPO_NAME = 'jamui';
const DB_PATH = 'public/db.json';

// FALLBACK TOKEN: This is a restricted, public-only token for saving orders.
// In a real production app, this should be an edge function/proxy.
// For this Git-as-a-Backend setup, we use it for mobile/private window writes.
const PUBLIC_WRITE_TOKEN = 'ghp_rKk7L6p6X8N9M0P1Q2R3S4T5U6V7W8X9Y0Z1'; // Placeholder, will use admin's token if available

// Helper to get token from storage or environment
const getToken = () => {
  try {
    // 1. Admin Session Token (Most reliable)
    const adminToken = localStorage.getItem('githubToken');
    if (adminToken) return adminToken;
    
    // 2. Shared Public Token (Saved when admin first logs in on this app instance)
    const publicToken = localStorage.getItem('publicOrderToken');
    if (publicToken) return publicToken;

    // 3. Environment Variable (CI/CD / Local Dev)
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    if (envToken) return envToken;

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Fetches the current database content from GitHub
 */
export const fetchDb = async () => {
  const token = getToken();
  
  const tryFetch = async (path, useToken = true) => {
    const headers = { 
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Use 'token' prefix for classic PATs (ghp_...)
    // IMPORTANT: GitHub API prefers 'Authorization: token <token>' for classic PATs
    if (useToken && token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    try {
      // Use a unique query parameter for cache-busting instead of Cache-Control header (to avoid CORS preflight issues)
      const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?t=${Date.now()}`;
      const response = await fetch(url, { 
        headers,
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.status === 401) {
        console.warn(`[GITHUB] 401 Unauthorized for ${path}. The token might be invalid or expired.`);
        // If the token in localStorage is invalid, we should probably remove it
        if (useToken && token === localStorage.getItem('githubToken')) {
          console.warn('[GITHUB] Removing invalid token from localStorage');
          localStorage.removeItem('githubToken');
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

  // 1. Try primary path with token
  let data = await tryFetch(DB_PATH, true);
  if (data) return data;

  // 2. Try root path with token
  if (DB_PATH.includes('/')) {
    data = await tryFetch(DB_PATH.split('/').pop(), true);
    if (data) return data;
  }

  // 3. Try primary path without token
  data = await tryFetch(DB_PATH, false);
  if (data) return data;

  // 4. Fallback to raw content
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${DB_PATH}?t=${Date.now()}`);
    if (response.ok) return await response.json();
    
    // Try raw root path
    if (DB_PATH.includes('/')) {
      const responseRoot = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${DB_PATH.split('/').pop()}?t=${Date.now()}`);
      if (responseRoot.ok) return await responseRoot.json();
    }
  } catch (err) {
    console.error('[GITHUB] Raw fallback failed:', err.message);
  }

  throw new Error('Failed to fetch database from GitHub. Please check your internet connection or repository settings.');
};

/**
 * Updates the database file in the repository
 */
export const updateDb = async (newData) => {
  const token = getToken();
  if (!token) throw new Error('GitHub Token required for this action');

  // 1. Get the current file's SHA (required for updates)
  let sha = null;
  let finalPath = DB_PATH;

  const tryGetSha = async (path, useToken = true) => {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (useToken && token) headers['Authorization'] = `token ${token}`;
    
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
      'Authorization': `token ${token}`,
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
      localStorage.removeItem('githubToken');
    }
    const error = await updateResponse.json().catch(() => ({ message: 'Unknown error' }));
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
