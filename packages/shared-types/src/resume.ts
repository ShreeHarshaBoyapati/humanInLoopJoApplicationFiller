/**
 * Resume types for the extension.
 * Used in API responses for resume CRUD operations.
 */

export interface PersonalInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

export interface Education {
  degree: string | null;
  institution: string | null;
  year: string | null;
}

export interface Experience {
  company: string | null;
  role: string | null;
  duration: string | null;
  summary: string | null;
}

export interface ResumeData {
  personal: PersonalInfo;
  current_title: string | null;
  years_experience: number | null;
  summary: string | null;
  skills: string[];
  tools: string[];
  education: Education[];
  experience: Experience[];
  keywords?: string[];
}

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
  parsedData?: ResumeData;
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
