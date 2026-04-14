/**
 * Authentication Types for Web App ↔ Extension Sync
 *
 * Used by both the web app and extension to store and sync authentication state.
 * Each token is stored with a timestamp for conflict resolution.
 */

export interface StoredAuth {
  /** JWT authentication token */
  token: string;
  /** Unix timestamp in milliseconds - used for "newest wins" conflict resolution */
  timestamp: number;
}

/**
 * Auth sync message payload sent via postMessage between web app and content script
 */
export interface AuthSyncMessage {
  type: 'AUTH_SYNC' | 'AUTH_LOGOUT';
  payload: {
    token?: string;
    timestamp?: number;
  };
}

/**
 * Extension storage keys
 */
export const AUTH_STORAGE_KEY = 'authData';

/**
 * postMessage origin for web app communication
 */
export const WEB_APP_MESSAGE_KEY = 'JFP_AUTH_SYNC';

/**
 * Cookie name for token
 */
export const TOKEN_COOKIE_NAME = 'jfp_token';
