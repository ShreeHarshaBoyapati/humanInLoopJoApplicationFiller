import { AiProvider, KeywordAnalysisResult } from '../ai-interface.js';

export class AnthropicProvider implements AiProvider {
  name = 'anthropic';

  constructor(_apiKey: string, _model: string) {}

  async analyzeKeywords(
    _jobContext: string,
    _resumeContext: string
  ): Promise<KeywordAnalysisResult> {
    // Stub implementation placeholder
    console.warn('AnthropicProvider is not yet fully implemented');

    return {
      keywords: ['stub_keyword_1', 'stub_keyword_2'],
    };
  }
}
