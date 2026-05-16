/**
 * Auth Sync Utilities for Web App
 *
 * Handles synchronization of authentication state between the web app
 * and the Chrome extension.
 *
 * Flow:
 * - On login: get token from cookie, send to extension via postMessage
 * - On logout: send logout signal to extension
 * - Listen for extension-initiated auth changes with timestamp comparison
 */

import { TOKEN_COOKIE_NAME, type StoredAuth } from '@repo/shared-types';

/**
 * Get token from cookie
 */
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === TOKEN_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Set token in cookie
 */
function setTokenInCookie(token: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

/**
 * Sync auth data to extension after login
 * Gets token from cookie and sends to extension
 */
export function syncAuthToExtension(authData: Partial<StoredAuth>): void {
  if (typeof window === 'undefined') return;

  // Get token from cookie if not provided in authData
  const token = authData.token || getTokenFromCookie();
  if (!token) {
    console.warn('[Auth Sync] No token available to sync to extension');
    return;
  }

  const timestamp = authData.timestamp || Date.now();

  window.postMessage(
    {
      type: 'AUTH_SYNC',
      source: import.meta.env.VITE_WEB_APP_URL,
      payload: {
        token,
        timestamp,
      },
    },
    '*'
  );
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
 * Compares timestamps - if extension data is newer, update cookie
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
          timestamp: payload.timestamp || 0,
        };

        // Update cookie with new token
        setTokenInCookie(payload.token);

        callback(authData);
      }
    } else if (type === 'AUTH_LOGOUT') {
      // Clear cookie on logout
      document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
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
 * Clear auth - clear cookie
 */
export function clearTokenAuth(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
}
