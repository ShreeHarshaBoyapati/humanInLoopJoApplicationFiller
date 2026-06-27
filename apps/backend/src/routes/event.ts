import express from 'express';
import EventController from '../controllers/event-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createEventValidation,
  updateEventValidation,
  deleteEventValidation,
  getEventsValidation,
} from '../middlewares/event.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.post('/', authMiddleware, createEventValidation, asHandler(EventController.create));
router.put('/', authMiddleware, updateEventValidation, asHandler(EventController.update));
router.delete('/', authMiddleware, deleteEventValidation, asHandler(EventController.delete));
router.get('/', authMiddleware, getEventsValidation, asHandler(EventController.get));

export default router;
