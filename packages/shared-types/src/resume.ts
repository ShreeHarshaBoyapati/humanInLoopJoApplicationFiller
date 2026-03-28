/**
 * Resume types for the extension.
 * Used in API responses for resume CRUD operations.
 */

export interface ResumeMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeList {
  resumes: ResumeMetadata[];
}

export interface GetResumeParams {
  personaId?: string;
}

export interface FileDataPayload {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface CreateResumeParams {
  personaId: string;
  file: FileDataPayload;
  keywords?: string[];
}

export interface UpdateResumeParams {
  id: string;
  file?: FileDataPayload;
  keywords?: string[];
}

export interface DeleteResumeParams {
  id: string;
}

export interface GetResumeByIdParams {
  id: string;
}

export interface ResumeFull {
  id: string;
  fileName: string;
  fileSize: number;
  file: Blob;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}
