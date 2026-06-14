import express from 'express';
import TagController from '../controllers/tag-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import {
  createTagValidation,
  updateTagValidation,
  deleteTagValidation,
  getTagsValidation,
} from '../middlewares/tag.js';
import { asHandler } from '../types/api.js';

const router: express.Router = express.Router();

router.post('/', authMiddleware, createTagValidation, asHandler(TagController.create));
router.put('/', authMiddleware, updateTagValidation, asHandler(TagController.update));
router.delete('/', authMiddleware, deleteTagValidation, asHandler(TagController.delete));
router.get('/', authMiddleware, getTagsValidation, asHandler(TagController.get));

export default router;
