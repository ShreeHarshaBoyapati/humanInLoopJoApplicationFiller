import express from 'express';
import UserController from '../controllers/user-controller.js';
import {
  registerInputValidation,
  loginInputValidation,
  authMiddleware,
} from '../middlewares/auth.js';

const router: express.Router = express.Router();

router.post('/register', registerInputValidation, UserController.register);
router.post('/login', loginInputValidation, UserController.login);

router.post('/logout', authMiddleware, UserController.logout);

export default router;
