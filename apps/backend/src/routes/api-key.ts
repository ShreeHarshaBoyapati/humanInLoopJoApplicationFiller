import { Router } from 'express';
import { authMiddleware } from '../middlewares/user.js';
import { updateApiKeyValidation } from '../middlewares/api-key.js';
import apiKeyController from '../controllers/api-key-controller.js';
import { asHandler } from '../types/api.js';

const router = Router();

router.post('/', authMiddleware, updateApiKeyValidation, asHandler(apiKeyController.upsertApiKey));
router.get('/', authMiddleware, asHandler(apiKeyController.getApiKeys));

export default router;
