/**
 * Authentication related types and interfaces
 */

import { JwtPayload } from 'jsonwebtoken';
import { Request, ParamsDictionary } from 'express-serve-static-core';

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * JWT token payload containing session information
 */
export interface TokenPayload {
  sessionId: string;
  userId: string;
}

/**
 * Decoded JWT token with all claims
 */
export interface DecodedToken extends JwtPayload {
  sessionId: string;
  userId: string;
}

/**
 * Extended Request with authenticated user information
 */
export type AuthenticatedTypedRequest<TBody> = Request<ParamsDictionary, never, TBody> & {
  userId: string;
  sessionId: string;
  clientAborted?: boolean;
  realtimeClientId?: string;
};
