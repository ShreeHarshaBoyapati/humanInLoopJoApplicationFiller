import type Persona from '../database/entities/persona.js';
import type Resume from '../database/entities/resume.js';
import type ResumeVersion from '../database/entities/resume-version.js';
import type {
  Persona as PersonaPayload,
  ResumeMetadata,
  ResumeVersionMetadata,
} from '@repo/shared-types';

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
