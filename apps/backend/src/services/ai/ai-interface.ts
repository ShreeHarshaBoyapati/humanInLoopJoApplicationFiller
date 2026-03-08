export interface KeywordAnalysisResult {
  keywords: string[];
}

export interface AiProvider {
  name: string;
  analyzeKeywords(jobContext: string, resumeContext: string): Promise<KeywordAnalysisResult>;
}
