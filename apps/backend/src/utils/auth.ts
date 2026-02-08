/**
 * Authentication Utilities
 *
 * Combines password validation, password hashing, and JWT token management
 *
 * Security Features:
 * - Password validation (min 8 chars, 1 number, 1 special character)
 * - Bcrypt password hashing
 * - JWT with HS256, session-based payload
 * - Explicit algorithm specification to prevent algorithm confusion attacks
 */

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import staticConfig from '../static-config.json' with { type: 'json' };
import type { TokenPayload, DecodedToken } from '../types/index.js';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(staticConfig.auth.saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

function getJwtConfig() {
  const secret = process.env.NODE_JWT_SECRET || '';
  const expiresIn = process.env.NODE_JWT_EXPIRES_IN || '15m';

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NODE_JWT_SECRET must be at least 32 characters long!');
    }
    console.warn('⚠️ NODE_JWT_SECRET should be at least 32 characters long!');
  }

  return { secret, expiresIn };
}

export function generateToken(payload: TokenPayload): string {
  const config = getJwtConfig();

  const options: SignOptions = {
    expiresIn: config.expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'jfp-backend',
    subject: payload.userId,
  };

  return jwt.sign({ sessionId: payload.sessionId }, config.secret, options);
}

export function verifyToken(token: string): DecodedToken {
  const config = getJwtConfig();

  try {
    const decoded = jwt.verify(token, config.secret, {
      algorithms: ['HS256'],
      issuer: 'jfp-backend',
    }) as jwt.JwtPayload & { sessionId: string };

    return {
      ...decoded,
      sessionId: decoded.sessionId,
      userId: decoded.sub as string,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export { staticConfig };
