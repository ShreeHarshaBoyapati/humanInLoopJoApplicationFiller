import express from 'express';
import PersonaController from '../controllers/persona-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createPersonaValidation,
  updatePersonaValidation,
  deletePersonaValidation,
} from '../middlewares/persona.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.post('/', authMiddleware, createPersonaValidation, asHandler(PersonaController.create));
router.put('/', authMiddleware, updatePersonaValidation, asHandler(PersonaController.update));
router.delete('/', authMiddleware, deletePersonaValidation, asHandler(PersonaController.delete));
router.get('/', authMiddleware, asHandler(PersonaController.get));
router.get('/active', authMiddleware, asHandler(PersonaController.getActive));
router.post('/set-active', authMiddleware, asHandler(PersonaController.setActive));

export default router;
