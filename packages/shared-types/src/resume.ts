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
  websites: string[] | null;
}

export interface Education {
  degree: string | null;
  field: string | null;
  institution: string | null;
  year: string | null;
  gpa: string | null;
}

export interface Experience {
  company: string | null;
  role: string | null;
  duration: string | null;
  location: string | null;
  bullets: string[];
}

export interface Certification {
  name: string | null;
  issuer: string | null;
  year: string | null;
}

export interface Project {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
}

export interface ExtraSection {
  section: string;
  items: string[];
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
  certifications: Certification[];
  projects: Project[];
  extra: ExtraSection[];
  keywords?: string[];
}

export interface ResumeMetadata {
  id: string;
  fileName: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  personaId?: string;
}

export interface ResumeWithVersions extends ResumeMetadata {
  versions: ResumeVersionMetadata[];
  activeVersion?: ResumeVersionMetadata;
}

export interface ResumeVersionMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  active: boolean;
  versionName: string;
  comment: string | null;
  keywords: string[];
  dataUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  resumeId?: string;
  personaId?: string;
}

export interface ResumeVersionWithFile {
  id: string;
  fileName: string;
  fileSize: number;
  active: boolean;
  versionName: string;
  comment: string | null;
  keywords: string[];
  dataUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeList {
  resumes: ResumeMetadata[];
}

export interface PaginatedResumeListItem {
  id: string;
  fileName: string;
  active: boolean;
  versionsCount: number;
  activeVersionFileSize: number | null;
  updatedAt: Date;
}

export interface PaginatedResumeResponse {
  items: PaginatedResumeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  fileName?: string;
  keywords?: string[];
  parsedData?: ResumeData;
  comment?: string;
}

export interface UpdateResumeParams {
  id: string;
  fileName: string;
}

export interface DeleteResumeParams {
  id: string;
  personaId: string;
}

export interface GetResumeByIdParams {
  id: string;
}

export interface ResumeFull {
  id: string;
  fileName: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResumeVersionParams {
  resumeId: string;
  file: FileDataPayload;
  keywords?: string[];
  parsedData?: ResumeData;
  comment?: string;
}

export interface UpdateResumeVersionParams {
  resumeId: string;
  versionId: string;
  keywords?: string[];
  parsedData?: ResumeData;
  comment?: string;
}

export interface DeleteResumeVersionParams {
  resumeId: string;
  versionId: string;
}

export interface GetResumeVersionByIdParams {
  resumeId: string;
  versionId: string;
}

export interface SetActiveResumeVersionParams {
  resumeId: string;
  versionId: string;
}

export interface BranchResumeParams {
  resumeId: string;
  versionId: string;
  newFileName: string;
}

export interface CompareVersionsParams {
  resumeId: string;
  versionA: string;
  versionB: string;
}

// Paginated version list response
export interface PaginatedVersionListItem {
  id: string;
  fileName: string;
  fileSize: number;
  active: boolean;
  versionName: string;
  comment: string | null;
  keywords: string[];
  dataUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedVersionResponse {
  items: PaginatedVersionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Compare versions response
export interface CompareVersionData {
  fileName: string;
  fileSize: number;
  comment: string | null;
  updatedAt: Date;
  parsedData: ResumeData | null;
}

export interface CompareVersionsResponse {
  versionA: CompareVersionData;
  versionB: CompareVersionData;
}

// View document response (for opening files in new tab)
export interface ViewDocumentResponse {
  file?: string | number[]; // base64 encoded string OR number array (Buffer)
  text?: string; // for txt files
  fileName: string;
  fileSize: number;
  contentType: string;
}
