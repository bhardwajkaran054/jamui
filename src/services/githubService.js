/**
 * GitHub API Service
 * This service allows the frontend to act as its own backend by 
 * reading and writing a JSON file directly in the GitHub repository.
 */

const REPO_OWNER = 'bhardwajkaran054';
const REPO_NAME = 'jamui';
const DB_PATH = 'public/db.json';

// Helper to get token from storage or environment
const getToken = () => {
  try {
    return localStorage.getItem('githubToken') || import.meta.env.VITE_GITHUB_TOKEN;
  } catch (e) {
    return import.meta.env.VITE_GITHUB_TOKEN;
  }
};

/**
 * Fetches the current database content from GitHub
 */
export const fetchDb = async () => {
  const token = getToken();
  
  const tryFetch = async (path, useToken = true) => {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (useToken && token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?t=${Date.now()}`, { headers });
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
  // Try with token first, then without (if rate limit allows)
  let sha = null;
  let finalPath = DB_PATH;

  const tryGetSha = async (path, useToken = true) => {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (useToken) headers['Authorization'] = `Bearer ${token}`;
    
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?t=${Date.now()}`;
    const response = await fetch(url, { headers });
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
      'Authorization': `Bearer ${token}`,
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
    const error = await updateResponse.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to update database on GitHub: ${error.message}`);
  }

  return updateResponse.json();
};

/**
 * Validates a GitHub Token by checking repository access
 */
export const validateToken = async (token) => {
  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  return response.ok;
};
