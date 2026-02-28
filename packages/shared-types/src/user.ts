/**
 * Public-facing user data (never includes password or sessionId).
 * Used in API responses for register, login, update, etc.
 */
export interface UserPublic {
  token?: string;
  id: string;
  email: string;
}
