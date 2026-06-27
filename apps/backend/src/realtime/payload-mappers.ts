import type Persona from '../database/entities/persona.js';
import type Resume from '../database/entities/resume.js';
import type ResumeVersion from '../database/entities/resume-version.js';
import type Result from '../database/entities/result.js';
import type JobEntity from '../database/entities/job.js';
import type Event from '../database/entities/event.js';
import type Tag from '../database/entities/tag.js';
import type ApiKey from '../database/entities/api-key.js';
import type {
  ApiKeyData,
  Persona as PersonaPayload,
  ResumeMetadata,
  ResumeVersionMetadata,
  Job,
  PaginatedResultListItem,
  Event as EventPayload,
  Tag as TagPayload,
} from '@repo/shared-types';
import { transitEncrypt } from '@repo/utils';
import { decryptText } from '../utils/encryption.js';
import logger from '../utils/logger.js';

const TRANSIT_SECRET = process.env.TRANSIT_SECRET ?? 'jfp-default-transit-secret-change-in-prod';

export function personaToMetadata(p: Persona): PersonaPayload {
  return {
    id: p.id,
    title: p.title,
    keywords: p.keywords,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function resumeToMetadata(r: Resume): ResumeMetadata {
  return {
    id: r.id,
    fileName: r.fileName,
    active: r.active,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    personaId: r.persona?.id,
  };
}

export function versionToMetadata(
  v: ResumeVersion,
  resumeFileName: string,
  resumeId?: string,
  personaId?: string
): ResumeVersionMetadata {
  return {
    id: v.id,
    fileName: resumeFileName,
    fileSize: v.fileSize,
    active: v.active,
    versionName: v.versionName,
    comment: v.comment,
    keywords: v.keywords || [],
    dataUpdatedAt: v.dataUpdatedAt,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    resumeId,
    personaId,
  };
}

export function jobToPublic(job: JobEntity): Job {
  return {
    id: job.id,
    title: job.title,
    tags: job.tags,
    personaId: job.personaId,
    status: job.status,
    acceptanceLevel: job.acceptanceLevel,
    companyName: job.companyName,
    metaData: job.metaData,
    description: job.description,
    requirements: job.requirements,
    keySkills: job.keySkills,
    notes: job.notes,
    favorite: job.favorite,
    primaryResultId: job.primaryResultId,
    dataUpdatedAt: job.dataUpdatedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function resultToListItem(result: Result): PaginatedResultListItem {
  return {
    id: result.id,
    versionName: result.resumeVersion.versionName,
    resumeName: result.resumeVersion.resume.fileName,
    personaName: result.resumeVersion.resume.persona.title,
    score: result.score,
    resumeId: result.resumeVersion.resume.id,
    resumeVersionId: result.resumeVersionId,
    createdAt: result.createdAt,
    resumeVersionDataUpdatedAt: result.resumeVersion.dataUpdatedAt,
  };
}

export function eventToPublic(event: Event): EventPayload {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    tagId: event.tagId,
    jobId: event.jobId,
    isCompleted: event.isCompleted,
    completedAt: event.completedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export function tagToPublic(tag: Tag): TagPayload {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

export async function apiKeyToPublic(key: ApiKey): Promise<ApiKeyData> {
  const safeCredentials: Record<string, string> = {};
  if (key.credentials) {
    for (const [credKey, value] of Object.entries(key.credentials)) {
      try {
        if (
          credKey.toLowerCase().includes('key') ||
          credKey.toLowerCase().includes('secret') ||
          credKey.toLowerCase().includes('token')
        ) {
          let plainText = value;
          try {
            plainText = decryptText(value);
          } catch {
            // Fallback for old/transit-only strings
          }
          safeCredentials[credKey] = await transitEncrypt(plainText, TRANSIT_SECRET);
        } else {
          safeCredentials[credKey] = value;
        }
      } catch (err) {
        logger.error({ err, keyId: key.id }, 'apiKeyToPublic: failed to transform credential');
        safeCredentials[credKey] = value;
      }
    }
  }
  return {
    id: key.id,
    provider: key.provider,
    model: key.model ?? null,
    active: key.active,
    credentials: safeCredentials,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}
