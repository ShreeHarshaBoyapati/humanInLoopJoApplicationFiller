import { AiProvider } from './ai-interface.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';

export type ProviderName = 'gemini' | 'anthropic';

export class AiProviderFactory {
  static getProvider(name: ProviderName, apiKey: string, model: string): AiProvider {
    switch (name) {
      case 'gemini':
        return new GeminiProvider(apiKey, model);
      case 'anthropic':
        return new AnthropicProvider(apiKey, model);
      default:
        throw new Error(`Unsupported AI provider: ${name}`);
    }
  }
}
