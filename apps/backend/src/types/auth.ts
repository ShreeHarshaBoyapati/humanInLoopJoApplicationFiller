/**
 * Authentication related types and interfaces
 */

import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

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
export interface AuthenticatedRequest extends Request {
  userId?: string;
  sessionId?: string;
}
