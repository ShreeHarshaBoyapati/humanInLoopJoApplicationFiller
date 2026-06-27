import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import UserController from '../controllers/user-controller.js';
import {
  sendCodeValidation,
  verifyCodeValidation,
  updateUserValidation,
  authMiddleware,
  oauthCallbackValidation,
  extensionOAuthCallbackValidation,
} from '../middlewares/user.js';
import { asHandler } from '../types/api.js';
import { getAuthUrl } from '../services/google-oauth-service.js';
import logger from '../utils/logger.js';

const router: express.Router = express.Router();

// Rate limiter for send-code endpoint: 5 requests per email per hour
const sendCodeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per email
  message: {
    success: false,
    message: 'Too many verification code requests. Please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: express.Request) => {
    const email = (req as express.Request<unknown, unknown, { email?: string }>).body?.email;
    return email || ipKeyGenerator(req.ip || '') || 'unknown';
  },
});

// Email OTP Authentication routes
router.post(
  '/send-code',
  sendCodeRateLimiter,
  sendCodeValidation,
  asHandler(UserController.sendVerificationCode)
);
router.post('/verify-code', verifyCodeValidation, asHandler(UserController.verifyCode));

// Google OAuth routes
router.get('/google', (req, res) => {
  try {
    // For web app, use the default redirect URI from environment
    const authUrl = getAuthUrl(null);
    // If callback URL is provided, include it as state
    const callback = req.query.callback as string;
    if (callback) {
      const url = new URL(authUrl);
      url.searchParams.set('state', callback);
      res.redirect(url.toString());
    } else {
      res.redirect(authUrl);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error initiating Google OAuth');
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Google OAuth',
    });
  }
});

router.get('/google/callback', oauthCallbackValidation, asHandler(UserController.googleAuth));

router.post(
  '/extension/google/callback',
  extensionOAuthCallbackValidation,
  asHandler(UserController.extensionGoogleAuth)
);

// User CRUD routes
router.post('/logout', authMiddleware, asHandler(UserController.logout));
router.put('/', authMiddleware, updateUserValidation, asHandler(UserController.update));
router.delete('/', authMiddleware, asHandler(UserController.delete));
router.get('/me', authMiddleware, asHandler(UserController.me));

export default router;
