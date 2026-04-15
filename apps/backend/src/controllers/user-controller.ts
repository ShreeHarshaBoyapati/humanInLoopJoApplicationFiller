import type { Response, TypedRequest, AuthenticatedTypedRequest } from '../types/index.js';
import { type ApiResponse, type UserPublic, TOKEN_COOKIE_NAME } from '@repo/shared-types';
import { v4 as uuidv4 } from 'uuid';
import {
  getUserRepository,
  getVerificationCodeRepository,
} from '../database/repositories/index.js';
import {
  generateToken,
  staticConfig,
  logger,
  hashPassword,
  comparePassword,
} from '../utils/index.js';
import {
  SendCodeInputType,
  VerifyCodeInputType,
  UpdateUserInputType,
  OAuthCallbackInputType,
  ExtensionOAuthCallbackInputType,
} from '../middlewares/user.js';
import { getTokensFromCode, getUserInfo } from '../services/google-oauth-service.js';
import { sendVerificationCode } from '../services/email-service.js';

class UserController {
  /**
   * Send verification code to email
   * POST /api/user/send-code
   * Body: { email: string }
   */
  async sendVerificationCode(req: TypedRequest<SendCodeInputType>, res: Response) {
    const { email } = req.body;
    const verificationCodeRepository = getVerificationCodeRepository();

    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await hashPassword(code);

      // Calculate expiry time from config
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + staticConfig.auth.codeExpiryMinutes);

      // Delete any existing codes for this email first
      await verificationCodeRepository.delete({ email });

      // Store the new code (hashed)
      await verificationCodeRepository.save({
        email,
        code: hashedCode,
        expiresAt,
      });

      // Send email (placeholder - logs to console)
      await sendVerificationCode(email, code);

      res.status(200).json({
        success: true,
        message: 'Verification code sent to email',
      });
    } catch (error) {
      logger.error({ err: error }, 'Error sending verification code');
      res.status(500).json({
        success: false,
        message: 'Failed to send verification code',
      });
    }
  }

  /**
   * Verify code and login/register user
   * POST /api/user/verify-code
   * Body: { email: string, code: string }
   */
  async verifyCode(req: TypedRequest<VerifyCodeInputType>, res: Response) {
    const { email, code } = req.body;
    const verificationCodeRepository = getVerificationCodeRepository();
    const userRepository = getUserRepository();

    try {
      // Find the latest code entry for this email
      const verificationCode = await verificationCodeRepository.findOne({
        where: { email },
        order: { createdAt: 'DESC' },
      });

      if (!verificationCode) {
        res.status(400).json({
          success: false,
          message: 'No verification code found. Please request a new code.',
        });
        return;
      }

      // Check if code is expired
      const now = new Date();
      if (verificationCode.expiresAt < now) {
        res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new code.',
        });
        return;
      }

      // Verify the code (compare hashed code)
      const isCodeValid = await comparePassword(code, verificationCode.code);
      if (!isCodeValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid verification code',
        });
        return;
      }

      // Delete the used code
      await verificationCodeRepository.delete({ id: verificationCode.id });

      // Check if user exists by email (for linking with Google OAuth)
      let user = await userRepository.findOne({
        where: { email },
      });

      if (user) {
        // User exists - create session and login
        const sessionId = uuidv4();
        user.sessionId = sessionId;
        await userRepository.save(user);

        const token = generateToken({
          sessionId,
          userId: user.id,
        });

        res.cookie(TOKEN_COOKIE_NAME, token, {
          httpOnly: staticConfig.cookie.httpOnly,
          secure: staticConfig.cookie.secure,
          sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
          path: staticConfig.cookie.path,
        });

        const response: ApiResponse<UserPublic> = {
          success: true,
          message: 'Login successful',
          data: {
            id: user.id,
            email: user.email,
            token,
          },
        };
        res.status(200).json(response);
      } else {
        // New user - create account and login
        user = await userRepository.save({
          email,
          sessionId: null,
          googleId: null,
          refreshToken: null,
        });

        const sessionId = uuidv4();
        user.sessionId = sessionId;
        await userRepository.save(user);

        const token = generateToken({
          sessionId,
          userId: user.id,
        });

        res.cookie(TOKEN_COOKIE_NAME, token, {
          httpOnly: staticConfig.cookie.httpOnly,
          secure: staticConfig.cookie.secure,
          sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
          path: staticConfig.cookie.path,
        });

        const response: ApiResponse<UserPublic> = {
          success: true,
          message: 'Account created successfully',
          data: {
            id: user.id,
            email: user.email,
            token,
          },
        };
        res.status(201).json(response);
      }
    } catch (error) {
      logger.error({ err: error }, 'Error verifying code');
      res.status(500).json({
        success: false,
        message: 'Failed to verify code',
      });
    }
  }

  async googleAuth(req: TypedRequest<OAuthCallbackInputType>, res: Response) {
    const { code, state, error } = req.body;
    const userRepository = getUserRepository();

    try {
      if (error || !code) {
        if (state) {
          const callbackUrl = new URL(decodeURIComponent(state));
          callbackUrl.searchParams.set('error', error || 'oauth_failed');
          res.redirect(callbackUrl.toString());
          return;
        }
        res.status(400).json({
          success: false,
          message: 'Google authentication failed',
        });
        return;
      }
      // Exchange code for tokens
      const tokens = await getTokensFromCode(code);

      // Get user info from Google
      const googleUser = await getUserInfo(tokens.access_token);

      // Find user by googleId
      let user = await userRepository.findOne({
        where: { googleId: googleUser.id },
      });

      if (user) {
        // Case 1: User found by googleId -> login directly
        const sessionId = uuidv4();
        user.sessionId = sessionId;
        if (tokens.refresh_token) {
          user.refreshToken = tokens.refresh_token;
        }
        await userRepository.save(user);

        const token = generateToken({
          sessionId,
          userId: user.id,
        });

        // Set token in cookie
        res.cookie(TOKEN_COOKIE_NAME, token, {
          httpOnly: staticConfig.cookie.httpOnly,
          secure: staticConfig.cookie.secure,
          sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
          path: staticConfig.cookie.path,
        });

        // If callback URL is provided, redirect to it (token is in cookie)
        if (state) {
          res.redirect(decodeURIComponent(state));
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Google authentication successful',
          data: {
            token,
            id: user.id,
            email: user.email,
          },
        });
        return;
      }

      // Check if user exists with same email (from email OTP auth)
      const existingUserByEmail = await userRepository.findOne({
        where: { email: googleUser.email },
      });

      if (existingUserByEmail) {
        // Case 2: User exists with email but no googleId
        // Auto-link OAuth and login directly
        user = existingUserByEmail;
        user.googleId = googleUser.id;
        if (tokens.refresh_token) {
          user.refreshToken = tokens.refresh_token;
        }

        const sessionId = uuidv4();
        user.sessionId = sessionId;
        await userRepository.save(user);

        const token = generateToken({
          sessionId,
          userId: user.id,
        });

        // Set token in cookie
        res.cookie(TOKEN_COOKIE_NAME, token, {
          httpOnly: staticConfig.cookie.httpOnly,
          secure: staticConfig.cookie.secure,
          sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
          path: staticConfig.cookie.path,
        });

        // If callback URL is provided, redirect to it (token is in cookie)
        if (state) {
          res.redirect(decodeURIComponent(state));
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Google account linked and authentication successful',
          data: {
            token,
            id: user.id,
            email: user.email,
          },
        });
        return;
      }

      // Case 3: No user exists -> create new user with OAuth data
      user = await userRepository.save({
        email: googleUser.email,
        sessionId: null,
        googleId: googleUser.id,
        refreshToken: tokens.refresh_token || null,
      });

      const sessionId = uuidv4();
      user.sessionId = sessionId;
      await userRepository.save(user);

      const token = generateToken({
        sessionId,
        userId: user.id,
      });

      // Set token in cookie
      res.cookie(TOKEN_COOKIE_NAME, token, {
        httpOnly: staticConfig.cookie.httpOnly,
        secure: staticConfig.cookie.secure,
        sameSite: staticConfig.cookie.sameSite as 'lax' | 'strict' | 'none',
        path: staticConfig.cookie.path,
      });

      // If callback URL is provided, redirect to it (token is in cookie)
      if (state) {
        res.redirect(decodeURIComponent(state));
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: {
          token,
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Google OAuth error');

      if (state) {
        const callbackUrl = new URL(decodeURIComponent(state));
        callbackUrl.searchParams.set('error', 'oauth_failed');
        res.redirect(callbackUrl.toString());
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Google authentication failed',
      });
    }
  }

  async extensionGoogleAuth(req: TypedRequest<ExtensionOAuthCallbackInputType>, res: Response) {
    const { accessToken, error } = req.body;
    const userRepository = getUserRepository();

    try {
      if (error || !accessToken) {
        res.status(400).json({
          success: false,
          message: error || 'Google authentication failed',
        });
        return;
      }

      // Get user info from Google using the access token directly
      // No need to exchange code for tokens - extension already has the access token
      const googleUser = await getUserInfo(accessToken);

      // Find user by googleId
      let user = await userRepository.findOne({
        where: { googleId: googleUser.id },
      });

      if (user) {
        // Case 1: User found by googleId -> login directly
        const sessionId = uuidv4();
        user.sessionId = sessionId;
        await userRepository.save(user);

        const token = generateToken({
          sessionId,
          userId: user.id,
        });

        // Return token in response body (not cookie) for extension
        res.status(200).json({
          success: true,
          message: 'Google authentication successful',
          data: {
            token,
            id: user.id,
            email: user.email,
          },
        });
        return;
      }

      // Check if user exists with same email
      const existingUserByEmail = await userRepository.findOne({
        where: { email: googleUser.email },
      });

      if (existingUserByEmail) {
        // Case 2: User exists with email but no googleId -> auto-link and login
        user = existingUserByEmail;
        user.googleId = googleUser.id;

        const sessionId = uuidv4();
        user.sessionId = sessionId;
        await userRepository.save(user);

        const token = generateToken({
          sessionId,
          userId: user.id,
        });

        // Return token in response body (not cookie) for extension
        res.status(200).json({
          success: true,
          message: 'Google account linked and authentication successful',
          data: {
            token,
            id: user.id,
            email: user.email,
          },
        });
        return;
      }

      // Case 3: No user exists -> create new user with OAuth data
      user = await userRepository.save({
        email: googleUser.email,
        sessionId: null,
        googleId: googleUser.id,
        refreshToken: null,
      });

      const sessionId = uuidv4();
      user.sessionId = sessionId;
      await userRepository.save(user);

      const token = generateToken({
        sessionId,
        userId: user.id,
      });

      // Return token in response body (not cookie) for extension
      res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: {
          token,
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Extension Google OAuth error');

      res.status(400).json({
        success: false,
        message: 'Google authentication failed',
      });
    }
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

    res.clearCookie(TOKEN_COOKIE_NAME, {
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
   * Body: { email?: string }
   */
  async update(req: AuthenticatedTypedRequest<UpdateUserInputType>, res: Response) {
    const userId = req.userId!;
    const { email } = req.body;
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
