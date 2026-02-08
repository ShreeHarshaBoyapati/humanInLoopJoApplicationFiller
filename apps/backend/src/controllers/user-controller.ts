import type { Request, Response } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserRepository } from '../database/repositories/index.js';
import { hashPassword, comparePassword, generateToken, staticConfig } from '../utils/index.js';

class UserController {
  /**
   * Register a new user
   * POST /api/user/register
   * Body: { email: string, password: string }
   */
  async register(req: Request, res: Response) {
    const { email, password } = req.body;
    const userRepository = getUserRepository();

    const existingUser = await userRepository.findOne({
      where: { email: email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
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
  }

  /**
   * Login user and generate JWT tokens
   * POST /api/user/login
   * Body: { email: string, password: string }
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid email or password',
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
  }

  /**
   * Logout user (invalidate session)
   * POST /api/user/logout
   * Headers: Authorization: Bearer <token>
   */
  async logout(req: Request, res: Response) {
    const userId = (req as Request & { userId: string }).userId;
    const userRepository = getUserRepository();

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
  }
}

export default new UserController();
