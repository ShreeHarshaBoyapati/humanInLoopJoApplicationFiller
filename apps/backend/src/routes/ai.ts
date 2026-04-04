import { Router } from 'express';
import aiController from '../controllers/ai-controller.js';
import { authMiddleware } from '../middlewares/user.js';
import { asHandler } from '../types/api.js';

const router = Router();

router.post('/analyze-keywords', authMiddleware, asHandler(aiController.analyzeKeywords));

export default router;
