import type { Request, Response, NextFunction, AuthenticatedTypedRequest } from '../types/index.js';
import { verifyToken } from '../utils/auth.js';
import { getUserRepository } from '../database/repositories/index.js';
import { trackClientAbort } from './abort-detection.js';
import * as z from 'zod';
import { ApiResponse, TOKEN_COOKIE_NAME } from '@repo/shared-types';
import { flattenZodErrorToString } from '../utils/validations.js';
import logger from '../utils/logger.js';

const SendCodeObj = z.object({
  email: z.email(),
});

const VerifyCodeObj = z.object({
  email: z.email(),
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
});

const OAuthCallbackObj = z.object({
  code: z.string().min(1, 'Authorization code is required').optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

const ExtensionOAuthCallbackObj = z.object({
  accessToken: z.string().min(1, 'Access token is required').optional(),
  error: z.string().optional(),
});

const UpdateUserObj = z.object({
  email: z.email().optional(),
});

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else {
      token = req.cookies?.[TOKEN_COOKIE_NAME] || req.cookies?.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const decoded = verifyToken(token);
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Session expired or invalid',
      });
      return;
    }
    (req as AuthenticatedTypedRequest<unknown>).userId = decoded.userId;
    (req as AuthenticatedTypedRequest<unknown>).sessionId = decoded.sessionId;
    (req as AuthenticatedTypedRequest<unknown>).realtimeClientId =
      typeof req.headers['x-realtime-client-id'] === 'string'
        ? req.headers['x-realtime-client-id']
        : undefined;

    trackClientAbort(req, res);

    next();
  } catch (error) {
    if (error instanceof Error) {
      const data: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(401).json(data);
      return;
    }

    const data: ApiResponse = {
      success: false,
      message: 'Authentication failed',
    };
    res.status(401).json(data);
  }
}
export type SendCodeInputType = z.infer<typeof SendCodeObj>;
export function sendCodeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = SendCodeObj.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const data: ApiResponse = {
        success: false,
        message: flattenZodErrorToString(error),
      };
      res.status(400).json(data);
      return;
    }
    const data: ApiResponse = {
      success: false,
      message: 'Invalid input',
    };
    res.status(400).json(data);
    return;
  }
}

export type VerifyCodeInputType = z.infer<typeof VerifyCodeObj>;
export function verifyCodeValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = VerifyCodeObj.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const data: ApiResponse = {
        success: false,
        message: flattenZodErrorToString(error),
      };
      res.status(400).json(data);
      return;
    }
    const data: ApiResponse = {
      success: false,
      message: 'Invalid code',
    };
    res.status(400).json(data);
    return;
  }
}

export type OAuthCallbackInputType = z.infer<typeof OAuthCallbackObj>;
export function oauthCallbackValidation(req: Request, res: Response, next: NextFunction) {
  try {
    // Google sends OAuth callback as GET with query params, not POST with body
    const data = req.method === 'GET' ? req.query : req.body;
    req.body = OAuthCallbackObj.parse(data);
    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid OAuth callback data');
    try {
      const { state } = req.body;
      if (state) {
        const callbackUrl = new URL(decodeURIComponent(state));
        callbackUrl.searchParams.set('error', 'oauth_failed');
        res.redirect(callbackUrl.toString());
        return;
      }
    } catch {
      const data: ApiResponse = {
        success: false,
        message: 'Invalid OAuth callback',
      };
      res.status(400).json(data);
      return;
    }
  }
}

export type ExtensionOAuthCallbackInputType = z.infer<typeof ExtensionOAuthCallbackObj>;
export function extensionOAuthCallbackValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = ExtensionOAuthCallbackObj.parse(req.body);
    next();
  } catch (error) {
    logger.error({ err: error }, 'Invalid extension OAuth callback data');
    const data: ApiResponse = {
      success: false,
      message: 'Invalid extension OAuth callback',
    };
    res.status(400).json(data);
    return;
  }
}

export type UpdateUserInputType = z.infer<typeof UpdateUserObj>;
export function updateUserValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UpdateUserObj.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const data: ApiResponse = {
        success: false,
        message: flattenZodErrorToString(error),
      };
      res.status(400).json(data);
      return;
    }

    const data: ApiResponse = {
      success: false,
      message: 'Invalid input',
    };

    res.status(400).json(data);
    return;
  }
}
