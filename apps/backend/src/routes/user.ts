import express from 'express';
import UserController from '../controllers/user-controller.js';
import {
  registerInputValidation,
  loginInputValidation,
  updateUserValidation,
  authMiddleware,
} from '../middlewares/user.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.post('/', registerInputValidation, asHandler(UserController.register));
router.post('/login', loginInputValidation, asHandler(UserController.login));
router.post('/logout', authMiddleware, asHandler(UserController.logout));
router.put('/', authMiddleware, updateUserValidation, asHandler(UserController.update));
router.delete('/', authMiddleware, asHandler(UserController.delete));
router.get('/me', authMiddleware, asHandler(UserController.me));

export default router;
