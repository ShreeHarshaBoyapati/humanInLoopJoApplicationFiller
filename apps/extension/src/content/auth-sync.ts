/**
 * Content Script: Auth Sync
 *
 * Runs on the web app domain to handle authentication sync between
 * the web app and the Chrome extension.
 *
 * Flow:
 * - Receives AUTH_SYNC messages from web app via postMessage
 * - Sends auth data to background script via message passing
 * - Background script stores in chrome.storage.session with timestamps
 * - Broadcasts auth changes back to web app when storage changes
 * - Handles logout synchronization
 * - Uses session storage for sensitive data (cleared when browser closes)
 */

import { type StoredAuth } from '@repo/shared-types';

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
 * Send message to background script and handle response
 */
async function sendToBackground(message: {
  action: string;
  payload?: StoredAuth;
}): Promise<{ success: boolean; data?: StoredAuth | null; error?: string }> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            '[Auth Sync] Error sending message to background:',
            chrome.runtime.lastError.message
          );
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response as { success: boolean; data?: StoredAuth | null; error?: string });
        }
      });
    } catch (error) {
      console.error('[Auth Sync] Exception sending message to background:', error);
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Handle incoming postMessage from web app
 */
async function handleWebAppMessage(event: MessageEvent) {
  // Only accept messages from our web app origin
  if (event.data?.source !== import.meta.env.VITE_WEB_APP_URL) return;

  const { type, payload } = event.data;

  if (type === 'AUTH_SYNC' && payload?.token) {
    const authData: StoredAuth = {
      token: payload.token,
      timestamp: payload.timestamp || Date.now(),
    };

    // Send auth data to background script (background will store in chrome.storage.session)
    const response = await sendToBackground({
      action: 'AUTH_STORAGE_SET',
      payload: authData,
    });

    if (response.success) {
      console.log('[Auth Sync] Saved auth data from web app:', {
        token: authData.token.substring(0, 20) + '...',
        timestamp: authData.timestamp,
      });
    } else {
      console.error('[Auth Sync] Error saving auth data:', response.error);
    }
  } else if (type === 'AUTH_LOGOUT') {
    // Web app is logging out - clear extension storage
    const response = await sendToBackground({
      action: 'AUTH_STORAGE_REMOVE',
    });

    if (response.success) {
      console.log('[Auth Sync] Cleared auth data from extension storage (web app logout)');
    } else {
      console.error('[Auth Sync] Error clearing auth data:', response.error);
    }
  }
}

function listenForStorageChanges() {
  try {
    // Listen for auth state changes from background script
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.action === 'AUTH_STATE_CHANGED') {
        const authData = message.payload as StoredAuth | null;
        if (authData === null) {
          notifyWebApp({ type: 'AUTH_LOGOUT', payload: null });
        } else {
          notifyWebApp({ type: 'AUTH_SYNC', payload: authData });
        }
      }
    });
  } catch (error) {
    console.error('[Auth Sync] Error setting up storage change listener:', error);
  }
}

/**
 * Get current auth data from background script
 */
async function getCurrentAuth(): Promise<StoredAuth | null> {
  const response = await sendToBackground({
    action: 'AUTH_STORAGE_GET',
  });

  if (response.success && response.data) {
    return response.data;
  }

  return null;
}

/**
 * Check if extension context is valid
 */
function isExtensionContextValid(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.runtime !== 'undefined' &&
      typeof chrome.runtime.id !== 'undefined'
    );
  } catch {
    return false;
  }
}

/**
 * Initialize the auth sync content script
 */
async function init() {
  // Check if we're in a valid extension context
  if (!isExtensionContextValid()) {
    console.log('[Auth Sync] Not in a valid extension context, skipping initialization');
    return;
  }

  console.log('[Auth Sync] Initializing content script on web app');

  // Listen for messages from web app
  window.addEventListener('message', handleWebAppMessage);

  // Listen for storage changes from extension
  listenForStorageChanges();

  // Check if there's existing auth data and notify web app
  const authData = await getCurrentAuth();
  if (authData) {
    console.log('[Auth Sync] Found existing auth data, notifying web app');
    notifyWebApp({ type: 'AUTH_SYNC', payload: authData });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
