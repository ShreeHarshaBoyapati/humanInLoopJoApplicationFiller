/**
 * Auth Sync Utilities for Web App
 *
 * Handles synchronization of authentication state between the web app
 * and the Chrome extension.
 *
 * Flow:
 * - On login: send token to extension via postMessage
 * - On logout: send logout signal to extension
 * - Listen for extension-initiated auth changes
 */

import { WEB_APP_MESSAGE_KEY, type StoredAuth } from '@repo/shared-types';

/**
 * Sync auth data to extension after login
 */
export function syncAuthToExtension(authData: StoredAuth): void {
  if (typeof window !== 'undefined') {
    window.postMessage(
      {
        type: 'AUTH_SYNC',
        source: import.meta.env.VITE_WEB_APP_URL,
        payload: {
          token: authData.token,
          userId: authData.userId,
          email: authData.email,
          timestamp: authData.timestamp,
        },
      },
      '*'
    );
  }
}

/**
 * Notify extension of logout
 */
export function notifyExtensionLogout(): void {
  if (typeof window !== 'undefined') {
    window.postMessage(
      {
        type: 'AUTH_LOGOUT',
        source: import.meta.env.VITE_WEB_APP_URL,
        payload: {},
      },
      '*'
    );
  }
}

/**
 * Listen for auth changes from extension
 */
export function listenForExtensionAuth(
  callback: (authData: StoredAuth | null) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleMessage(event: MessageEvent) {
    // Only accept messages from our own extension
    if (event.data?.source !== import.meta.env.VITE_WEB_APP_URL) return;

    const { type, payload } = event.data;

    if (type === 'AUTH_SYNC') {
      if (payload?.token) {
        const authData: StoredAuth = {
          token: payload.token,
          userId: payload.userId,
          email: payload.email,
          timestamp: payload.timestamp,
        };
        callback(authData);
      }
    } else if (type === 'AUTH_LOGOUT') {
      callback(null);
    }
  }

  window.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}

/**
 * Get current auth from localStorage
 */
export function getLocalStorageAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(WEB_APP_MESSAGE_KEY);
  if (!stored) return null;

  try {
    const authData: StoredAuth = JSON.parse(stored);
    if (authData.token && authData.userId) {
      return authData;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Set auth in localStorage
 */
export function setLocalStorageAuth(authData: StoredAuth): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(WEB_APP_MESSAGE_KEY, JSON.stringify(authData));
}

/**
 * Clear auth from localStorage
 */
export function clearLocalStorageAuth(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(WEB_APP_MESSAGE_KEY);
}
