import type { Response, AuthenticatedTypedRequest } from '../types/index.js';
import { getLanguageModel, ProviderName } from '../services/ai/registry.js';
import {
  getApiKeyRepository,
  getJobRepository,
  getResumeVersionRepository,
  getResultRepository,
} from '../database/repositories/index.js';
import { decryptText } from '../utils/encryption.js';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { transitDecrypt } from '@repo/utils';
import type { ApiResponse, AnalysisResult, ResumeData } from '@repo/shared-types';

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
      resumeVersionId: string;
    }>,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.userId!;
      const { jobId, resumeVersionId } = req.body;

      if (!jobId || !resumeVersionId) {
        const data: ApiResponse = {
          success: false,
          message: 'jobId and resumeVersionId are required fields',
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

      // 2. Fetch resume version (ownership check via resume → persona → user)
      const versionRepository = getResumeVersionRepository();
      const resumeVersion = await versionRepository.findOne({
        where: { id: resumeVersionId },
        relations: ['resume', 'resume.persona', 'resume.persona.user'],
      });

      if (!resumeVersion || resumeVersion.resume.persona.user.id !== userId) {
        const data: ApiResponse = {
          success: false,
          message: 'Resume version not found or not authorized',
        };
        res.status(404).json(data);
        return;
      }

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

      // 6. Build resume text from parsedData (structured resume data)
      const resumeData = resumeVersion.parsedData as ResumeData | null;

      let resumeText = '(no resume data available)';

      if (resumeData) {
        const resumeParts: string[] = [];

        // Personal Information
        if (resumeData.personal) {
          const { personal } = resumeData;
          if (personal.name) resumeParts.push(`Name: ${personal.name}`);
          if (personal.email) resumeParts.push(`Email: ${personal.email}`);
          if (personal.phone) resumeParts.push(`Phone: ${personal.phone}`);
          if (personal.location) resumeParts.push(`Location: ${personal.location}`);
          if (personal.linkedin) resumeParts.push(`LinkedIn: ${personal.linkedin}`);
          if (personal.websites?.length) {
            resumeParts.push(`Websites: ${personal.websites.join(', ')}`);
          }
        }

        // Professional Summary
        if (resumeData.current_title) {
          resumeParts.push(`Current Title: ${resumeData.current_title}`);
        }
        if (resumeData.years_experience !== null && resumeData.years_experience !== undefined) {
          resumeParts.push(`Years of Experience: ${resumeData.years_experience}`);
        }
        if (resumeData.summary) {
          resumeParts.push(`Professional Summary:\n${resumeData.summary}`);
        }

        // Skills & Tools
        if (resumeData.skills?.length) {
          resumeParts.push(`Skills: ${resumeData.skills.join(', ')}`);
        }
        if (resumeData.tools?.length) {
          resumeParts.push(`Tools & Technologies: ${resumeData.tools.join(', ')}`);
        }

        // Work Experience
        if (resumeData.experience?.length) {
          resumeParts.push('Work Experience:');
          resumeData.experience.forEach((exp, i) => {
            const expLines: string[] = [];
            if (exp.role) expLines.push(`  Role: ${exp.role}`);
            if (exp.company) expLines.push(`  Company: ${exp.company}`);
            if (exp.duration) expLines.push(`  Duration: ${exp.duration}`);
            if (exp.location) expLines.push(`  Location: ${exp.location}`);
            if (exp.bullets?.length) {
              expLines.push(`  Key Achievements:`);
              exp.bullets.forEach((bullet) => {
                expLines.push(`    - ${bullet}`);
              });
            }
            resumeParts.push(`${i + 1}. ${expLines.join('\n')}`);
          });
        }

        // Education
        if (resumeData.education?.length) {
          resumeParts.push('Education:');
          resumeData.education.forEach((edu, i) => {
            const eduParts: string[] = [];
            if (edu.degree) eduParts.push(edu.degree);
            if (edu.field) eduParts.push(`in ${edu.field}`);
            if (edu.institution) eduParts.push(`from ${edu.institution}`);
            if (edu.year) eduParts.push(`(${edu.year})`);
            if (edu.gpa) eduParts.push(`- GPA: ${edu.gpa}`);
            resumeParts.push(`${i + 1}. ${eduParts.join(' ')}`);
          });
        }

        // Certifications
        if (resumeData.certifications?.length) {
          resumeParts.push('Certifications:');
          resumeData.certifications.forEach((cert, i) => {
            const certParts: string[] = [];
            if (cert.name) certParts.push(cert.name);
            if (cert.issuer) certParts.push(`by ${cert.issuer}`);
            if (cert.year) certParts.push(`(${cert.year})`);
            resumeParts.push(`${i + 1}. ${certParts.join(' ')}`);
          });
        }

        // Projects
        if (resumeData.projects?.length) {
          resumeParts.push('Projects:');
          resumeData.projects.forEach((proj, i) => {
            const projLines: string[] = [];
            if (proj.name) projLines.push(`  Name: ${proj.name}`);
            if (proj.description) projLines.push(`  Description: ${proj.description}`);
            if (proj.technologies?.length) {
              projLines.push(`  Technologies: ${proj.technologies.join(', ')}`);
            }
            if (proj.url) projLines.push(`  URL: ${proj.url}`);
            resumeParts.push(`${i + 1}. ${projLines.join('\n')}`);
          });
        }

        // Extra Sections
        if (resumeData.extra?.length) {
          resumeData.extra.forEach((section) => {
            if (section.section && section.items?.length) {
              resumeParts.push(
                `${section.section}:\n${section.items.map((item) => `  - ${item}`).join('\n')}`
              );
            }
          });
        }

        resumeText = resumeParts.join('\n\n');
      }

      // 7. Call AI model
      const prompt = `
You are an expert ATS (Applicant Tracking System) and resume reviewer.
Carefully analyze the Job Description and the candidate's Full Resume below.

Job Description:
${jobText}

Candidate Resume:
${resumeText}

Your task:
- Calculate an ATS match score (0-100) based on how well the resume matches the job requirements, considering skills, experience, education, certifications, and relevant keywords.
- List keywords/skills from the job that are missing or weak in the resume (missingFields).
- Identify the top 5 keywords/skills in the resume that strongly match the job (highlyMatchedKeys, max 5).
- Provide up to 3 concise, actionable suggestions to improve the resume for this specific role.
- Write a single sentence summarizing the overall fit (overallVerdict).
      `.trim();

      const { output } = await generateText({
        model,
        prompt,
        output: Output.object({ schema: analysisSchema }),
      });

      const resultRepository = getResultRepository();
      const existingResultsCount = await resultRepository.count({ where: { jobId } });
      const isFirstResult = existingResultsCount === 0;

      const result = resultRepository.create({
        jobId,
        resumeVersionId,
        score: output.score,
        breakdown: {
          missingFields: output.missingFields,
          highlyMatchedKeys: output.highlyMatchedKeys,
          suggestions: output.suggestions,
          overallVerdict: output.overallVerdict,
        },
      });
      await resultRepository.save(result);

      if (isFirstResult) {
        job.primaryVersionId = resumeVersionId;
        job.personaId = resumeVersion.resume.persona.id;
        await jobRepository.save(job);
      }

      const data: ApiResponse<AnalysisResult> = {
        success: true,
        data: output,
        message: isFirstResult
          ? 'This resume version is now set as primary for this job. You can change that in website.'
          : undefined,
      };
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
