import { Router } from 'express';
import { authMiddleware } from '../middlewares/user.js';
import { updateApiKeyValidation, testConnectionValidation } from '../middlewares/api-key.js';
import apiKeyController from '../controllers/api-key-controller.js';
import { asHandler } from '../types/api.js';

const router = Router();

router.post('/', authMiddleware, updateApiKeyValidation, asHandler(apiKeyController.upsertApiKey));
router.get('/', authMiddleware, asHandler(apiKeyController.getApiKeys));
router.post(
  '/test-connection',
  authMiddleware,
  testConnectionValidation,
  asHandler(apiKeyController.testConnection)
);
router.put('/select/:id', authMiddleware, asHandler(apiKeyController.selectApiKey));
router.delete('/:id', authMiddleware, asHandler(apiKeyController.deleteApiKey));

export default router;
