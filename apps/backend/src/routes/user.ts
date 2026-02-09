import express from 'express';
import UserController from '../controllers/user-controller.js';
import {
  registerInputValidation,
  loginInputValidation,
  updateUserValidation,
  authMiddleware,
} from '../middlewares/user.js';

const router: express.Router = express.Router();

router.post('/', registerInputValidation, UserController.register);
router.post('/login', loginInputValidation, UserController.login);
router.post('/logout', authMiddleware, UserController.logout);
router.put('/', authMiddleware, updateUserValidation, UserController.update);
router.delete('/', authMiddleware, UserController.delete);

export default router;
