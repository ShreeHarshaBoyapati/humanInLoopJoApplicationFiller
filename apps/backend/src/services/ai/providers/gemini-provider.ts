import { GoogleGenAI, Type } from '@google/genai';
import { AiProvider, KeywordAnalysisResult } from '../ai-interface.js';

// Initialize the Google Gen AI SDK in constructor
export class GeminiProvider implements AiProvider {
  name = 'gemini';
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async analyzeKeywords(jobContext: string, resumeContext: string): Promise<KeywordAnalysisResult> {
    const prompt = `
    You are an expert ATS (Applicant Tracking System) reviewer. 
    Analyze the provided Job Description and the candidate's Resume.
    Extract the most important technical keywords and skills from the Job Description that the Resume is missing or could improve upon.
    Provide the result as an array of strictly string values.
    
    Job Description:
    ${jobContext}
    
    Resume:
    ${resumeContext}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: 'The list of missing or matchable keywords from the job description.',
              },
            },
            required: ['keywords'],
          },
        },
      });

      if (!response.text) {
        throw new Error('No text returned from Gemini API');
      }

      const result = JSON.parse(response.text) as KeywordAnalysisResult;
      return result;
    } catch (error) {
      console.error('Error in GeminiProvider:', error);
      throw new Error('Failed to analyze keywords using Gemini');
    }
  }
}
