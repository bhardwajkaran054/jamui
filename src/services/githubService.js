/**
 * GitHub API Service
 * This service allows the frontend to act as its own backend by 
 * reading and writing a JSON file directly in the GitHub repository.
 */

const REPO_OWNER = 'bhardwajkaran054';
const REPO_NAME = 'jamui';
const DB_PATH = 'public/db.json';

// Helper to get token from storage or environment
const getToken = () => localStorage.getItem('githubToken') || import.meta.env.VITE_GITHUB_TOKEN;

/**
 * Fetches the current database content from GitHub
 */
export const fetchDb = async () => {
  const token = getToken();
  
  // 1. Try fetching via API (with token) for real-time consistency
  if (token) {
    try {
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DB_PATH}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (response.ok) {
        const fileData = await response.json();
        // Base64 to UTF-8 decoding
        const decoded = decodeURIComponent(escape(atob(fileData.content)));
        return JSON.parse(decoded);
      }
    } catch (err) {
      console.warn('[GITHUB] API fetch failed, falling back to raw content', err.message);
    }
  }

  // 2. Fallback to raw content (heavily cached by GitHub CDN)
  const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${DB_PATH}?t=${Date.now()}`);
  if (!response.ok) throw new Error('Failed to fetch database from GitHub');
  return response.json();
};

/**
 * Updates the database file in the repository
 */
export const updateDb = async (newData) => {
  const token = getToken();
  if (!token) throw new Error('GitHub Token required for this action');

  // 1. Get the current file's SHA (required for updates)
  const getFileResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DB_PATH}`, {
    headers: { 'Authorization': `token ${token}` }
  });
  
  if (!getFileResponse.ok) throw new Error('Could not find database file in repository');
  const fileData = await getFileResponse.json();
  const sha = fileData.sha;

  // 2. Commit the new content (Base64 encoding with UTF-8 support)
  const jsonString = JSON.stringify(newData, null, 2);
  const content = btoa(unescape(encodeURIComponent(jsonString)));
  const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DB_PATH}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Update database [via Admin Dashboard]',
      content,
      sha,
      branch: 'main'
    })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.message || 'Failed to update database on GitHub');
  }

  return updateResponse.json();
};

/**
 * Validates a GitHub Token by checking repository access
 */
export const validateToken = async (token) => {
  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
    headers: { 'Authorization': `token ${token}` }
  });
  return response.ok;
};
