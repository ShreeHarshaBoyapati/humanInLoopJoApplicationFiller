/**
 * Resume version types for the extension.
 * Used in API responses for resume version operations.
 */

import type { ResumeData } from './resume';

// Params for getting versions
export interface GetResumeVersionsParams {
  resumeId: string;
  personaId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

// Params for setting active version
export interface SetActiveVersionParams {
  resumeId: string;
  versionId: string;
  personaId?: string;
}

// Params for getting parsed data
export interface GetVersionParsedDataParams {
  resumeId: string;
  versionId: string;
}

// Response for parsed data
export interface VersionParsedDataResponse {
  parsedData: ResumeData | null;
}
