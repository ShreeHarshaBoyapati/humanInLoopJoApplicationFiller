/**
 * Public-facing user data (never includes password or sessionId).
 * Used in API responses for register, login, update, etc.
 */
export interface UserPublic {
  token?: string;
  id: string;
  email: string;
}

/**
 * OAuth pending data - returned when user exists with email but no googleId.
 * User must login with password first, then link OAuth.
 */
export interface OAuthPendingData {
  googleId: string;
  refreshToken: string | null;
}

/**
 * User data with optional OAuth pending data.
 * Used in googleAuth response when email exists but no googleId.
 */
export interface UserPublicWithOAuth extends UserPublic {
  oauthData?: OAuthPendingData;
}
