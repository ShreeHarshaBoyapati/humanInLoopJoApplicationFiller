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
const SYSTEM_PROMPT = `You are a resume data extractor optimised for job-application form filling.
Return ONLY a valid JSON object — no markdown fences, no explanation, no preamble.
Rules:
- If a field is not found, return null for scalars and [] for arrays. Never omit a key.
- For experience bullets: copy each line EXACTLY as written in the resume — do not paraphrase, summarise or add anything. Preserve numbers, percentages, and impact statements word-for-word.
- For the extra field: if the resume contains any section that does not map to the known fields (e.g. Volunteer Work, Publications, Awards, Languages Spoken, Patents, Hobbies), capture it here. Use the section heading as the key and list every item verbatim.
- For keywords: extract every meaningful professional term — do not modify this field.`;

/**
 * User prompt for resume parsing
 */
const USER_PROMPT = `Extract ALL information from this resume into the JSON schema below.
Cover every field a job application form could ask for:
- Contact: full name, email, phone, location, LinkedIn, portfolio/website
- Current job title and total years of experience
- Professional summary (2-3 sentences, copy-paste ready)
- ALL work experiences: company, role, duration, location, and every responsibility/achievement bullet VERBATIM
- ALL education: degree, field of study, institution, graduation year, GPA if present
- ALL certifications: name, issuer, year
- ALL projects: name, description, technologies, URL
- Hard skills (languages, frameworks, methodologies)
- Tools and platforms (Figma, AWS, Jira, etc.)
- Extra: any other resume section not covered above, with items verbatim
- Keywords: every meaningful professional term, flat array, no duplicates`;

/**
 * Zod schema for resume data validation
 */
export const ResumeSchema = z.object({
  personal: z
    .object({
      name: z.string().nullable().describe("Candidate's full name"),
      email: z.string().nullable().describe("Candidate's email address"),
      phone: z.string().nullable().describe("Candidate's phone number"),
      location: z.string().nullable().describe('City, State/Province, Country'),
      linkedin: z.string().nullable().describe('LinkedIn profile URL'),
      websites: z
        .array(z.string())
        .nullable()
        .describe('Personal website or portfolio URL or any other url — [] if not present'),
    })
    .describe('Personal / contact information'),

  current_title: z.string().nullable().describe('Most recent job title'),
  years_experience: z
    .number()
    .nullable()
    .describe('Total years of professional experience as a number'),
  summary: z
    .string()
    .nullable()
    .describe(
      'Professional summary — 2-3 sentences, copy-paste ready for a job application "About you" field'
    ),

  skills: z
    .array(z.string())
    .describe(
      'Hard technical skills: programming languages, frameworks, algorithms, methodologies'
    ),
  tools: z
    .array(z.string())
    .describe('Software tools, platforms and services — e.g. Figma, AWS, Docker, Jira'),

  education: z
    .array(
      z.object({
        degree: z
          .string()
          .nullable()
          .describe("Degree level e.g. Bachelor's, Master's, PhD, Diploma"),
        field: z
          .string()
          .nullable()
          .describe('Field / major e.g. Computer Science, Mechanical Engineering'),
        institution: z.string().nullable().describe('Name of the university or college'),
        year: z.string().nullable().describe('Graduation year or expected year'),
        gpa: z.string().nullable().describe('GPA or percentage if mentioned — null otherwise'),
      })
    )
    .describe('All education entries, newest first'),

  experience: z
    .array(
      z.object({
        company: z.string().nullable().describe('Employer / company name'),
        role: z.string().nullable().describe('Job title / role'),
        duration: z.string().nullable().describe('Employment period e.g. "Jan 2022 – Mar 2024"'),
        location: z.string().nullable().describe('Work location or "Remote" — null if not stated'),
        bullets: z
          .array(z.string())
          .describe(
            'Every responsibility / achievement line for this role copied VERBATIM from the resume. Do NOT paraphrase or summarise. Preserve numbers, percentages and impact statements exactly as written. Each bullet point is one array element.'
          ),
      })
    )
    .describe('All work experiences, newest first'),

  certifications: z
    .array(
      z.object({
        name: z.string().nullable().describe('Certification or course name'),
        issuer: z.string().nullable().describe('Issuing organisation e.g. AWS, Google, Coursera'),
        year: z.string().nullable().describe('Year obtained — null if not stated'),
      })
    )
    .describe('All certifications, licences and online courses — [] if none'),

  projects: z
    .array(
      z.object({
        name: z.string().nullable().describe('Project name'),
        description: z
          .string()
          .nullable()
          .describe('What the project does in 1-2 sentences — verbatim from resume where possible'),
        technologies: z.array(z.string()).describe('Technologies / tools used in this project'),
        url: z.string().nullable().describe('Project URL or GitHub link — null if not stated'),
      })
    )
    .describe('Personal, academic or open-source projects — [] if none'),

  extra: z
    .array(
      z.object({
        section: z
          .string()
          .describe(
            'The section heading as it appears in the resume e.g. "Volunteer Work", "Publications", "Awards", "Languages", "Hobbies"'
          ),
        items: z.array(z.string()).describe('Each item / line from that section copied verbatim'),
      })
    )
    .describe(
      'Any resume section that does not fit the fields above. Capture it here so no information is lost. Empty array [] if nothing extra.'
    ),

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
