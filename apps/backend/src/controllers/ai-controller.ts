import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getLanguageModel, ProviderName } from '../services/ai/registry.js';
import {
  getApiKeyRepository,
  getJobRepository,
  getResumeRepository,
  getResumeVersionRepository,
} from '../database/repositories/index.js';
import { decryptText } from '../utils/encryption.js';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { transitDecrypt } from '@repo/utils';
import type { ApiResponse, AnalysisResult } from '@repo/shared-types';

const TRANSIT_SECRET = process.env.TRANSIT_SECRET ?? 'jfp-default-transit-secret-change-in-prod';

/** Decrypt a single credential value (handles both layers). */
async function decryptCredential(value: string): Promise<string> {
  let plain = value;
  try {
    plain = decryptText(value);
  } catch {
    // not inner-encrypted
  }
  if (plain.includes(':')) {
    try {
      const unwrapped = await transitDecrypt(plain, TRANSIT_SECRET);
      if (unwrapped) plain = unwrapped;
    } catch {
      // not transit-encrypted
    }
  }
  return plain;
}

const analysisSchema = z.object({
  score: z.number().min(0).max(100).describe('ATS match score 0-100'),
  missingFields: z
    .array(z.string())
    .describe('Keywords / skills present in the job description but absent in the resume'),
  highlyMatchedKeys: z
    .array(z.string())
    .max(5)
    .describe('Top 5 keywords most strongly present in the resume'),
  suggestions: z
    .array(z.string())
    .max(3)
    .describe('Up to 3 concise actionable improvement tips for the candidate'),
  overallVerdict: z
    .string()
    .describe('One sentence summary of the overall fit between resume and job'),
});

class AiController {
  async analyzeKeywords(
    req: AuthenticatedTypedRequest<{
      jobId: string;
      resumeId: string;
    }>,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.userId!;
      const { jobId, resumeId } = req.body;

      if (!jobId || !resumeId) {
        const data: ApiResponse = {
          success: false,
          message: 'jobId and resumeId are required fields',
        };
        res.status(400).json(data);
        return;
      }

      // 1. Fetch job (ownership check)
      const jobRepository = getJobRepository();
      const job = await jobRepository
        .createQueryBuilder('job')
        .leftJoin('job.user', 'user')
        .where('job.id = :jobId', { jobId })
        .andWhere('user.id = :userId', { userId })
        .getOne();

      if (!job) {
        const data: ApiResponse = { success: false, message: 'Job not found or not authorized' };
        res.status(404).json(data);
        return;
      }

      // 2. Fetch resume (ownership check via persona → user)
      const resumeRepository = getResumeRepository();
      const versionRepository = getResumeVersionRepository();
      const resume = await resumeRepository.findOne({
        where: { id: resumeId },
        relations: ['persona', 'persona.user'],
      });

      if (!resume || resume.persona.user.id !== userId) {
        const data: ApiResponse = { success: false, message: 'Resume not found or not authorized' };
        res.status(404).json(data);
        return;
      }

      // 2.1 Fetch active resume version for keywords
      const activeVersion = await versionRepository.findOne({
        where: { resume: { id: resumeId }, active: true },
        select: ['keywords'],
      });

      // 3. Resolve active API key for this user
      const apiKeyRepository = getApiKeyRepository();
      const apiKeyEntity = await apiKeyRepository.findOne({
        where: { user: { id: userId }, active: true },
      });

      if (!apiKeyEntity) {
        const data: ApiResponse = {
          success: false,
          message: 'No active AI provider configured. Please set one active in Settings.',
        };
        res.status(400).json(data);
        return;
      }

      // 4. Decrypt credentials
      const decryptedCredentials: Record<string, string> = {};
      if (apiKeyEntity.credentials) {
        for (const [key, value] of Object.entries(apiKeyEntity.credentials)) {
          if (
            typeof value === 'string' &&
            (key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('token'))
          ) {
            decryptedCredentials[key] = await decryptCredential(value);
          } else {
            decryptedCredentials[key] = value as string;
          }
        }
      }

      const model = getLanguageModel(
        apiKeyEntity.provider as ProviderName,
        decryptedCredentials,
        apiKeyEntity.model
      );

      // 5. Build rich job text from ALL available fields
      const jobParts: string[] = [];
      if (job.title) jobParts.push(`Job Title: ${job.title}`);
      if (job.companyName) jobParts.push(`Company: ${job.companyName}`);
      if (job.description) jobParts.push(`Description:\n${job.description}`);
      if (job.requirements) jobParts.push(`Requirements:\n${job.requirements}`);
      if (job.keySkills?.length) jobParts.push(`Key Skills: ${job.keySkills.join(', ')}`);
      if (job.tags?.length) jobParts.push(`Tags: ${job.tags.join(', ')}`);
      if (job.notes) jobParts.push(`Notes: ${job.notes}`);
      if (job.metaData && Object.keys(job.metaData).length) {
        jobParts.push(`Additional Info: ${JSON.stringify(job.metaData)}`);
      }
      if (job.highlights && Object.keys(job.highlights).length) {
        jobParts.push(`Highlights: ${JSON.stringify(job.highlights)}`);
      }
      const jobText = jobParts.join('\n\n');

      // 6. Build resume text from stored keywords
      const resumeText = activeVersion?.keywords?.join(', ') || '(no keywords extracted)';

      // 7. Call AI model
      const prompt = `
You are an expert ATS (Applicant Tracking System) and resume reviewer.
Carefully analyze the Job Description and the candidate's Resume keywords below.

Job Description:
${jobText}

Candidate Resume Keywords:
${resumeText}

Your task:
- Calculate an ATS match score (0-100) based on keyword overlap and relevance.
- List keywords/skills from the job that are missing or weak in the resume.
- Identify the top 5 keywords in the resume that strongly match the job (highlyMatchedKeys, max 5).
- Provide up to 3 concise, actionable suggestions to improve the resume for this role.
- Write a single sentence summarising the overall fit (overallVerdict).
      `.trim();

      const { output } = await generateText({
        model,
        prompt,
        output: Output.object({ schema: analysisSchema }),
      });

      const data: ApiResponse<AnalysisResult> = { success: true, data: output };
      res.status(200).json(data);
    } catch (error: unknown) {
      console.error('Error analyzing keywords:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze keywords';
      const errData: ApiResponse = { success: false, message: errorMessage };
      res.status(500).json(errData);
    }
  }
}

export default new AiController();
