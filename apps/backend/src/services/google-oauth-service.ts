/**
 * Google OAuth2 Service
 *
 * Handles Google OAuth2 authentication flow using googleapis package.
 * Provides methods for generating auth URLs, exchanging codes for tokens,
 * and fetching user information from Google.
 */

import { google } from 'googleapis';

const scopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email: boolean;
}

function getGoogleOAuth2Client(redirectUri?: string | null) {
  const clientId = process.env.NODE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.NODE_GOOGLE_CLIENT_SECRET;
  const defaultRedirectUri = process.env.NODE_GOOGLE_REDIRECT_URI;
  const finalRedirectUri = redirectUri ?? defaultRedirectUri;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth credentials not configured. Please set NODE_GOOGLE_CLIENT_ID and NODE_GOOGLE_CLIENT_SECRET environment variables.'
    );
  }

  // If redirectUri is explicitly null, don't set one (for Chrome Extension OAuth)
  // Chrome Identity API handles the redirect automatically
  if (finalRedirectUri === null) {
    return new google.auth.OAuth2(clientId, clientSecret);
  }

  if (!finalRedirectUri) {
    throw new Error(
      'Google OAuth redirect URI not configured. Please set NODE_GOOGLE_REDIRECT_URI environment variable.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, finalRedirectUri);
}

/**
 * Generate the Google OAuth2 consent URL for user authorization
 * @param redirectUri - Custom redirect URI (required for Chrome Extension OAuth)
 *                     Must be the Chrome Extension URL like https://<extension-id>.chromiumapp.org/
 * @returns The URL to redirect users to for Google authorization
 */
export function getAuthUrl(redirectUri: string | null): string {
  const oauth2Client = getGoogleOAuth2Client(redirectUri);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' gives you a refresh_token
    prompt: 'select_account',
    scope: scopes,
    // Explicitly pass redirect_uri to override any default
    redirect_uri: redirectUri || undefined,
  });

  return url;
}

/**
 * Exchange authorization code for tokens
 * @param code - The authorization code from Google callback
 * @param redirectUri - Optional custom redirect URI (for extension OAuth)
 * @returns Google tokens including access_token and potentially refresh_token
 */
export async function getTokensFromCode(code: string, redirectUri?: string): Promise<GoogleTokens> {
  const oauth2Client = getGoogleOAuth2Client(redirectUri);

  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || 0,
    token_type: tokens.token_type || 'Bearer',
    id_token: tokens.id_token || undefined,
  };
}

/**
 * Fetch user information from Google
 * @param accessToken - The access token from Google
 * @returns User profile information from Google
 */
export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id || '',
    email: data.email || '',
    name: data.name || undefined,
    picture: data.picture || undefined,
    verified_email: data.verified_email || false,
  };
}

/**
 * Refresh an access token using a refresh token
 * @param refreshToken - The refresh token from Google
 * @returns Updated Google tokens
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    access_token: credentials.access_token || '',
    refresh_token: credentials.refresh_token || refreshToken, // Keep the original if not provided
    expiry_date: credentials.expiry_date || 0,
    token_type: credentials.token_type || 'Bearer',
    id_token: credentials.id_token || undefined,
  };
}

export default {
  getAuthUrl,
  getTokensFromCode,
  getUserInfo,
  refreshAccessToken,
};
