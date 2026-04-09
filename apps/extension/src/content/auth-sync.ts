/**
 * Content Script: Auth Sync
 *
 * Runs on the web app domain to handle authentication sync between
 * the web app and the Chrome extension.
 *
 * Flow:
 * - Receives AUTH_SYNC messages from web app via postMessage
 * - Stores auth data in chrome.storage.local with timestamps
 * - Broadcasts auth changes back to web app when storage changes
 * - Handles logout synchronization
 */

import { AUTH_STORAGE_KEY, type StoredAuth } from '@repo/shared-types';

/**
 * Send message to web app via postMessage
 */
function notifyWebApp(data: { type: string; payload: StoredAuth | null }) {
  if (typeof window !== 'undefined') {
    window.postMessage(
      {
        ...data,
        source: import.meta.env.VITE_WEB_APP_URL,
      },
      '*'
    );
  }
}

/**
 * Handle incoming postMessage from web app
 */
function handleWebAppMessage(event: MessageEvent) {
  // Only accept messages from our web app origin
  if (event.data?.source !== import.meta.env.VITE_WEB_APP_URL) return;

  const { type, payload } = event.data;

  if (type === 'AUTH_SYNC' && payload?.token) {
    const authData: StoredAuth = {
      token: payload.token,
      userId: payload.userId,
      email: payload.email,
      timestamp: payload.timestamp || Date.now(),
    };

    // Save to chrome storage
    chrome.storage.local.set({ [AUTH_STORAGE_KEY]: authData }, () => {
      console.log('[Auth Sync] Saved auth data from web app:', {
        userId: authData.userId,
        timestamp: authData.timestamp,
      });
    });
  } else if (type === 'AUTH_LOGOUT') {
    // Web app is logging out - clear extension storage
    chrome.storage.local.remove(AUTH_STORAGE_KEY, () => {
      console.log('[Auth Sync] Cleared auth data from extension storage (web app logout)');
    });
  }
}

/**
 * Listen for storage changes from extension background
 */
function listenForStorageChanges() {
  chrome.storage.onChanged.addListener((changes) => {
    if (AUTH_STORAGE_KEY in changes) {
      const newValue = changes[AUTH_STORAGE_KEY].newValue as StoredAuth | undefined;
      if (newValue === undefined || newValue === null) {
        // Extension logged out - notify web app
        notifyWebApp({ type: 'AUTH_LOGOUT', payload: null });
      } else {
        // Auth data changed - notify web app
        notifyWebApp({ type: 'AUTH_SYNC', payload: newValue });
      }
    }
  });
}

/**
 * Get current auth data from storage
 */
async function getCurrentAuth(): Promise<StoredAuth | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_STORAGE_KEY], (result) => {
      const authData = result[AUTH_STORAGE_KEY] as StoredAuth | undefined;
      if (authData && authData.token) {
        resolve(authData);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Initialize the auth sync content script
 */
function init() {
  console.log('[Auth Sync] Initializing content script on web app');

  // Listen for messages from web app
  window.addEventListener('message', handleWebAppMessage);

  // Listen for storage changes from extension
  listenForStorageChanges();

  // Check if there's existing auth data and notify web app
  getCurrentAuth().then((authData) => {
    if (authData) {
      console.log('[Auth Sync] Found existing auth data, notifying web app');
      notifyWebApp({ type: 'AUTH_SYNC', payload: authData });
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
