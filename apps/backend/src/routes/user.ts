import express from 'express';
import UserController from '../controllers/user-controller.js';
import {
  registerInputValidation,
  loginInputValidation,
  updateUserValidation,
  authMiddleware,
  oauthCallbackValidation,
  extensionOAuthCallbackValidation,
} from '../middlewares/user.js';
import { asHandler } from '../types/api.js';
import { getAuthUrl } from '../services/google-oauth-service.js';
import logger from '../utils/logger.js';

const router: express.Router = express.Router();

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
router.post('/', registerInputValidation, asHandler(UserController.register));
router.post('/login', loginInputValidation, asHandler(UserController.login));
router.post('/logout', authMiddleware, asHandler(UserController.logout));
router.put('/', authMiddleware, updateUserValidation, asHandler(UserController.update));
router.delete('/', authMiddleware, asHandler(UserController.delete));
router.get('/me', authMiddleware, asHandler(UserController.me));

export default router;
