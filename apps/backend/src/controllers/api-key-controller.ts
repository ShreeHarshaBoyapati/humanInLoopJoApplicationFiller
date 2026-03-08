import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getApiKeyRepository, getUserRepository } from '../database/repositories/index.js';
import { encryptText } from '../utils/encryption.js';
import { UpdateApiKeyInputType } from '../middlewares/api-key.js';
import ApiKey from '../database/entities/api-key.js';
import { ProviderName } from '../services/ai/ai-factory.js';

class ApiKeyController {
  /**
   * Upsert an API Key for the authenticated user and provider
   * POST /api/api-key
   * Body: { providerName: 'gemini' | 'anthropic', apiKey: string }
   */
  async upsertApiKey(req: AuthenticatedTypedRequest<UpdateApiKeyInputType>, res: Response) {
    const userId = req.userId;
    const { providerName, apiKey, model } = req.body;
    const apiKeyRepository = getApiKeyRepository();
    const userRepository = getUserRepository();

    try {
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const encryptedKey = encryptText(apiKey);

      const existingKey = await apiKeyRepository.findOne({
        where: { user: { id: userId }, provider: providerName as ProviderName },
      });

      if (existingKey) {
        existingKey.key = encryptedKey;
        existingKey.model = model;
        await apiKeyRepository.save(existingKey);
      } else {
        const newKey = new ApiKey();
        newKey.provider = providerName as ProviderName;
        newKey.key = encryptedKey;
        newKey.model = model;
        newKey.user = user;
        await apiKeyRepository.save(newKey);
      }

      res.status(200).json({
        success: true,
        message: `API Key for ${providerName} saved successfully`,
      });
    } catch (error: unknown) {
      console.error('Error saving API Key:', error);
      res.status(500).json({ success: false, message: 'Failed to save API Key' });
    }
  }

  /**
   * Get configured API Key providers for the authenticated user
   * GET /api/api-key
   */
  async getApiKeys(req: AuthenticatedTypedRequest<null>, res: Response) {
    const userId = req.userId!;
    const apiKeyRepository = getApiKeyRepository();

    try {
      const keys = await apiKeyRepository.find({
        where: { user: { id: userId } },
        select: ['id', 'provider', 'model', 'createdAt', 'updatedAt'],
      });

      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error: unknown) {
      console.error('Error fetching API Keys:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch API Keys' });
    }
  }
}

export default new ApiKeyController();
