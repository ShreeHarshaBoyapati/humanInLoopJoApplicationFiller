import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import type { LanguageModel } from 'ai';
import providerUrls from './provider-urls.json' with { type: 'json' };

export const PROVIDER_NAMES = [
  'gemini',
  'openai',
  'anthropic',
  'groq',
  'mistral',
  'ollama',
  'custom',
] as const;

export type ProviderName = (typeof PROVIDER_NAMES)[number];

export function getLanguageModel(
  provider: ProviderName,
  credentials: Record<string, string>,
  model: string
): LanguageModel {
  const apiKey = credentials.apiKey || '';
  const customBaseUrl = credentials.customUrl;
  switch (provider) {
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey })(model);
    case 'anthropic':
      return createAnthropic({ apiKey })(model);
    case 'openai':
      return createOpenAI({
        apiKey,
        organization: credentials.organizationId,
        project: credentials.projectId,
      })(model);
    case 'groq':
      return createOpenAI({ apiKey, baseURL: providerUrls.groq })(model);
    case 'mistral':
      return createMistral({ apiKey })(model);
    case 'ollama': {
      // Ollama usually requires a dummy API key just to satisfy the SDK contract
      const ollamaKey = apiKey && apiKey.trim() !== '' ? apiKey : 'ollama';
      return createOpenAI({ apiKey: ollamaKey, baseURL: customBaseUrl })(model);
    }
    case 'custom':
      if (!customBaseUrl) throw new Error('custom provider requires a baseUrl');
      return createOpenAI({ apiKey, baseURL: customBaseUrl })(model);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
