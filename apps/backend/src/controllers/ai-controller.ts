import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getLanguageModel, ProviderName } from '../services/ai/registry.js';
import { getApiKeyRepository } from '../database/repositories/index.js';
import { decryptText } from '../utils/encryption.js';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { transitDecrypt } from '@repo/utils';

const TRANSIT_SECRET = process.env.TRANSIT_SECRET ?? 'jfp-default-transit-secret-change-in-prod';

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

      const decryptedCredentials: Record<string, string> = {};
      if (apiKeyEntity.credentials) {
        for (const [key, value] of Object.entries(apiKeyEntity.credentials)) {
          if (
            typeof value === 'string' &&
            (key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('token'))
          ) {
            let plainText = value;
            try {
              plainText = decryptText(value);
            } catch {
              // Fallback
            }
            if (plainText.includes(':')) {
              try {
                const unwrapped = await transitDecrypt(plainText, TRANSIT_SECRET);
                if (unwrapped) plainText = unwrapped;
              } catch {
                // Not transit encrypted
              }
            }
            decryptedCredentials[key] = plainText;
          } else {
            decryptedCredentials[key] = value as string;
          }
        }
      }

      const model = getLanguageModel(
        providerName as ProviderName,
        decryptedCredentials,
        apiKeyEntity.model
      );

      const prompt = `
      You are an expert ATS (Applicant Tracking System) reviewer.
      Analyze the provided Job Description and the candidate's Resume.
      Extract the most important technical keywords and skills from the Job Description that the Resume is missing or could improve upon.
      
      Job Description:
      ${jobDescription}
      
      Resume:
      ${resume}
      `;

      const { output } = await generateText({
        model,
        prompt,
        output: Output.object({
          schema: z.object({
            keywords: z
              .array(z.string())
              .describe('The list of missing or matchable keywords from the job description.'),
          }),
        }),
      });

      res.json({ keywords: output.keywords });
    } catch (error: unknown) {
      console.error('Error analyzing keywords:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze keywords';
      res.status(500).json({ error: errorMessage });
    }
  }
}

export default new AiController();
