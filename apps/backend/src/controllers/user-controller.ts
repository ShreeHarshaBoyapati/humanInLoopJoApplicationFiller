import type { Request, Response } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserRepository } from '../database/repositories/index.js';
import {
  validatePassword,
  validateEmail,
  hashPassword,
  comparePassword,
  generateToken,
  staticConfig,
} from '../utils/index.js';

class UserController {
  /**
   * Register a new user
   * POST /api/user/register
   * Body: { email: string, password: string }
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const userRepository = getUserRepository();
      // TODO: need to add input validation middleware
      if (!email || !validateEmail(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email address',
        });
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
        });
        return;
      }

      const existingUser = await userRepository.findOne({
        where: { email: email },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'User with this email already exists',
        });
        return;
      }

      const hashedPassword = await hashPassword(password);

      const user = await userRepository.save({
        email: email,
        password: hashedPassword,
        sessionId: null,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please login to continue.',
        data: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      // TODO: need a common debugger function
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Login user and generate JWT tokens
   * POST /api/user/login
   * Body: { email: string, password: string }
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const userRepository = getUserRepository();

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const user = await userRepository.findOne({
        where: { email: email },
      });

      if (!user) {
        res.status(400).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      const sessionId = uuidv4();

      user.sessionId = sessionId;
      await userRepository.save(user);

      const token = generateToken({
        sessionId,
        userId: user.id,
      });

      res.cookie('token', token, {
        httpOnly: staticConfig.cookie.httpOnly,
        secure: staticConfig.cookie.secure,
        sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
        path: staticConfig.cookie.path,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Logout user (invalidate session)
   * POST /api/user/logout
   * Headers: Authorization: Bearer <token>
   */
  async logout(req: Request, res: Response) {
    try {
      const userId = (req as Request & { userId?: string }).userId;
      const userRepository = getUserRepository();

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      await userRepository.update(userId, { sessionId: null });

      res.clearCookie('token', {
        httpOnly: staticConfig.cookie.httpOnly,
        secure: staticConfig.cookie.secure,
        sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
        path: staticConfig.cookie.path,
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export default new UserController();
