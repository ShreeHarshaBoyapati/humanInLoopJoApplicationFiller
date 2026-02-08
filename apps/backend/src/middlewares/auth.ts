import type { Request, Response, NextFunction, AuthenticatedRequest } from '../types/index.js';
import { verifyToken } from '../utils/auth.js';
import { getUserRepository } from '../database/repositories/index.js';

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
        error: 'No token provided',
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
        error: 'Session expired or invalid',
      });
      return;
    }

    (req as AuthenticatedRequest).userId = decoded.userId;
    (req as AuthenticatedRequest).sessionId = decoded.sessionId;

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const decoded = verifyToken(token);
        const userRepository = getUserRepository();

        const user = await userRepository.findOne({
          where: { id: decoded.userId },
        });

        if (user && user.sessionId === decoded.sessionId) {
          (req as AuthenticatedRequest).userId = decoded.userId;
          (req as AuthenticatedRequest).sessionId = decoded.sessionId;
        }
      }
    }
  } catch {
    // Silently ignore auth errors for optional auth
  }

  next();
}
