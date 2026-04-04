import type { Response, TypedRequest, AuthenticatedTypedRequest } from '../types/index.js';
import type { ApiResponse, UserPublic } from '@repo/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { getUserRepository } from '../database/repositories/index.js';
import { hashPassword, comparePassword, generateToken, staticConfig } from '../utils/index.js';
import { LoginInputType, RegisterInputType, UpdateUserInputType } from '../middlewares/user.js';

class UserController {
  /**
   * Register a new user
   * POST /api/user
   * Body: { email: string, password: string }
   */
  async register(req: TypedRequest<RegisterInputType>, res: Response) {
    const { email, password } = req.body;
    const userRepository = getUserRepository();

    const existingUser = await userRepository.findOne({
      where: { email: email },
    });

    if (existingUser) {
      const errorResponse: ApiResponse = {
        success: false,
        message: 'User with this email already exists',
      };
      res.status(400).json(errorResponse);
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await userRepository.save({
      email: email,
      password: hashedPassword,
      sessionId: null,
    });

    const response: ApiResponse<UserPublic> = {
      success: true,
      message: 'User registered successfully. Please login to continue.',
      data: {
        id: user.id,
        email: user.email,
      },
    };
    res.status(201).json(response);
  }

  /**
   * Login user and generate JWT tokens
   * POST /api/user/login
   * Body: { email: string, password: string }
   */
  async login(req: TypedRequest<LoginInputType>, res: Response) {
    const { email, password } = req.body;
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({
      where: { email: email },
    });
    const errData: ApiResponse = {
      success: false,
      message: 'Invalid email or password',
    };
    if (!user) {
      res.status(400).json(errData);
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(400).json(errData);
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
    const data: ApiResponse<UserPublic> = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        id: user.id,
        email: user.email,
      },
    };
    res.status(200).json(data);
  }

  /**
   * Logout user (invalidate session)
   * POST /api/user/logout
   * Headers: Authorization: Bearer <token>
   */
  async logout(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId!;
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

  /**
   * Update user profile
   * PUT /api/user
   * Body: { email?: string, password?: string }
   */
  async update(req: AuthenticatedTypedRequest<UpdateUserInputType>, res: Response) {
    const userId = req.userId!;
    const { email, password } = req.body;
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (email && email !== user.email) {
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Email is already in use',
        });
        return;
      }
      user.email = email;
    }

    if (password) {
      user.password = await hashPassword(password);
    }

    await userRepository.save(user);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        email: user.email,
      },
    });
  }

  /**
   * Delete user account
   * DELETE /api/user
   */
  async delete(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId!;
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    await userRepository.remove(user);

    res.clearCookie('token', {
      httpOnly: staticConfig.cookie.httpOnly,
      secure: staticConfig.cookie.secure,
      sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
      path: staticConfig.cookie.path,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  }

  /**
   * Get current authenticated user
   * GET /api/user/me
   */
  async me(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId!;
    const userRepository = getUserRepository();

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const response: ApiResponse<UserPublic> = {
      success: true,
      message: 'User retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
      },
    };
    res.status(200).json(response);
  }
}

export default new UserController();
