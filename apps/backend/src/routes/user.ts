import express from 'express';
import UserController from '../controllers/user-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

const router: express.Router = express.Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);

router.post('/logout', authMiddleware, UserController.logout);

export default router;
