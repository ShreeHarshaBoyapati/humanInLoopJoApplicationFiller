import type { Request, Response, NextFunction, AuthenticatedTypedRequest } from '../types/index.js';
import { verifyToken } from '../utils/auth.js';
import { getUserRepository } from '../database/repositories/index.js';
import * as z from 'zod';
import { ApiResponse } from '@repo/shared-types';
import { flattenZodErrorToString } from '../utils/validations.js';

const UserObj = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/\d/, 'Password must contain at least 1 number')
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      'Password must contain at least 1 special character'
    ),
});

const UpdateUserObj = z
  .object({
    email: z.email().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/\d/, 'Password must contain at least 1 number')
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        'Password must contain at least 1 special character'
      )
      .optional(),
  })
  .refine((data) => data.email || data.password, {
    message: 'At least one of email or password must be provided',
  });

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

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

    if (!user || user.sessionId !== decoded.sessionId) {
      res.status(401).json({
        success: false,
        message: 'Session expired or invalid',
      });
      return;
    }

    (req as AuthenticatedTypedRequest<unknown>).userId = decoded.userId;
    (req as AuthenticatedTypedRequest<unknown>).sessionId = decoded.sessionId;

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
export type RegisterInputType = z.infer<typeof UserObj>;
export function registerInputValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UserObj.parse(req.body);
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

export type LoginInputType = z.infer<typeof UserObj>;
export function loginInputValidation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = UserObj.parse(req.body);
    next();
  } catch {
    const data: ApiResponse = {
      success: false,
      message: 'Invalid email or password',
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
