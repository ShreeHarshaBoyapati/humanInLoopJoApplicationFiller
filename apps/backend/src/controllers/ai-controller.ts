import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { AiProviderFactory, ProviderName } from '../services/ai/ai-factory.js';
import { getApiKeyRepository } from '../database/repositories/index.js';
import { decryptText } from '../utils/encryption.js';

class AiController {
  async analyzeKeywords(
    req: AuthenticatedTypedRequest<{
      jobDescription: string;
      resume: string;
      providerName?: string;
    }>,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.userId!;
      const { jobDescription, resume, providerName = 'gemini' } = req.body;

      if (!jobDescription || !resume) {
        res.status(400).json({ error: 'jobDescription and resume are required fields' });
        return;
      }

      const apiKeyRepository = getApiKeyRepository();
      const apiKeyEntity = await apiKeyRepository.findOne({
        where: { user: { id: userId }, provider: providerName as ProviderName },
      });

      if (!apiKeyEntity) {
        res
          .status(400)
          .json({ error: `API Key for ${providerName} is not configured. Please add one first.` });
        return;
      }

      const decryptedKey = decryptText(apiKeyEntity.key);

      const provider = AiProviderFactory.getProvider(
        providerName as ProviderName,
        decryptedKey,
        apiKeyEntity.model
      );
      const result = await provider.analyzeKeywords(jobDescription, resume);

      res.json(result);
    } catch (error: unknown) {
      console.error('Error analyzing keywords:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze keywords';
      res.status(500).json({ error: errorMessage });
    }
  }
}

export default new AiController();
