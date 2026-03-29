/**
 * Resume Parser Service
 * Handles AI-based resume parsing with structured output
 */

import { z } from 'zod';
import { generateText, Output } from 'ai';
import { getLanguageModel, ProviderName } from './ai/registry.js';
import { getApiKeyRepository } from '../database/repositories/index.js';
import { decryptText } from '../utils/encryption.js';
import { ApiResponse } from '@repo/shared-types';
import { transitDecrypt } from '@repo/utils';

const TRANSIT_SECRET = process.env.TRANSIT_SECRET ?? 'jfp-default-transit-secret-change-in-prod';

/**
 * System prompt for resume parsing
 */
const SYSTEM_PROMPT = `You are a resume parser. Extract structured information from the resume text provided. 
Return ONLY a valid JSON object — no markdown, no explanation, no preamble. 
If a field cannot be found, return null for strings and empty array [] for arrays. 
Never omit a key. Never add keys that are not in the schema.`;

/**
 * User prompt for resume parsing
 */
const USER_PROMPT = `Extract the following from this resume and return as JSON matching this exact schema:`;

/**
 * Zod schema for resume data validation
 */
export const ResumeSchema = z.object({
  personal: z
    .object({
      name: z.string().nullable().describe("Candidate's full name"),
      email: z.string().nullable().describe("Candidate's email address"),
      phone: z.string().nullable().describe("Candidate's phone number"),
      location: z.string().nullable().describe("Candidate's location"),
      linkedin: z.string().nullable().describe("Candidate's LinkedIn URL"),
    })
    .describe('Personal information'),
  current_title: z.string().nullable().describe('Current job title'),
  years_experience: z.number().nullable().describe('Years of professional experience'),
  summary: z.string().nullable().describe('Professional summary (2-3 sentences, professional bio)'),
  skills: z.array(z.string()).describe('Hard skills only — frameworks, languages, methodologies'),
  tools: z.array(z.string()).describe('Software, platforms, services — Figma, AWS, Jira etc.'),
  education: z
    .array(
      z.object({
        degree: z.string().nullable().describe('Degree obtained'),
        institution: z.string().nullable().describe('Educational institution'),
        year: z.string().nullable().describe('Year of graduation'),
      })
    )
    .describe('List of educational background'),
  experience: z
    .array(
      z.object({
        company: z.string().nullable().describe('Company name'),
        role: z.string().nullable().describe('Job role/title'),
        duration: z.string().nullable().describe('Duration at the company'),
        summary: z.string().nullable().describe('One line summary of what they did and impact'),
      })
    )
    .describe('List of work experiences'),
  keywords: z
    .array(z.string())
    .describe(
      'Every meaningful professional term from the entire resume — skills, tools, domain words, certifications, methodologies, job titles held, industry terms. Flatten into one array. No duplicates. This is the most important field.'
    ),
});

export type ResumeData = z.infer<typeof ResumeSchema>;

/**
 * Parse resume text using AI and return structured data
 * @param resumeText - The extracted text from the resume file
 * @param userId - The user ID to fetch their active API key
 * @returns Promise resolving to ApiResponse with parsed resume data
 */
export async function parseResume(
  resumeText: string,
  userId: string
): Promise<ApiResponse<ResumeData>> {
  try {
    // Get active API key for the user
    const apiKeyRepository = getApiKeyRepository();
    const apiKeyEntity = await apiKeyRepository.findOne({
      where: { user: { id: userId }, active: true },
    });

    if (!apiKeyEntity) {
      return {
        success: false,
        message: 'No active API key found. Please configure an active API key first.',
      };
    }

    // Decrypt credentials
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

    // Get language model using the provider from the active API key
    const model = getLanguageModel(
      apiKeyEntity.provider as ProviderName,
      decryptedCredentials,
      apiKeyEntity.model
    );

    // Generate structured output
    const { output } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `${USER_PROMPT}\n\nResume Text:\n${resumeText}`,
      output: Output.object({
        schema: ResumeSchema,
      }),
    });

    // Validate the output against the schema (additional validation)
    const validationResult = ResumeSchema.safeParse(output);
    if (!validationResult.success) {
      return {
        success: false,
        message: `Schema validation failed: ${validationResult.error.message}`,
      };
    }

    return {
      success: true,
      data: validationResult.data,
    };
  } catch (error: unknown) {
    console.error('Error parsing resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse resume';
    return {
      success: false,
      message: errorMessage,
    };
  }
}
