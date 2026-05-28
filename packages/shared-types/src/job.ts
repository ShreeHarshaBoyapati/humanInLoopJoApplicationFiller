/**
 * Public job shape — mirrors the backend Job entity without relations.
 * Used in API responses for job CRUD operations.
 */
export interface Job {
  id: string;
  title: string;
  tags: string[];
  persona: string;
  status: string;
  acceptanceLevel: number;
  companyName: string;
  metaData: Record<string, unknown>;
  description: string;
  requirements: string;
  highlights: Record<string, unknown>;
  keySkills: string[];
  notes: string;
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapedJob {
  title: string | null;
  companyName: string | null;
  location: string | null;
  description: string | null;
  requirements: string | null;
  keySkills: string[] | null;
  tags: string[] | null;
  jobType: string | null;
  salary: string | null;
  currency: string | null;
  jobPostingUrl: string;
  platform: string | null;
  scrapedAt: Date;
}

export interface JobPublic {
  id: string;
}

export interface JobList {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type JobStatus =
  | 'draft'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'active'
  | 'archived';

export interface GetJobParams {
  page?: number;
  limit?: number;
  status?: JobStatus;
  persona?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'acceptanceLevel';
  sortOrder?: 'ASC' | 'DESC';
  select?: string;
  favorite?: boolean;
}

// Paginated Jobs Response for frontend hooks
export interface PaginatedJobsResponse {
  items: Job[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Hook params for fetching jobs
export interface UseJobsParams {
  limit?: number;
  searchQuery?: string;
  status?: string;
  persona?: string;
  favorite?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'acceptanceLevel';
  sortOrder?: 'ASC' | 'DESC';
}

// Create Job Input
export interface CreateJobInput {
  title: string;
  companyName: string;
  description?: string;
  requirements?: string;
  tags?: string[];
  keySkills?: string[];
  persona?: string;
  status?: string;
  notes?: string;
  acceptanceLevel?: number;
}

// Update Job Input
export interface UpdateJobInput {
  id: string;
  title?: string;
  companyName?: string;
  description?: string;
  requirements?: string;
  tags?: string[];
  keySkills?: string[];
  persona?: string;
  status?: string;
  notes?: string;
  favorite?: boolean;
  invalidateQueries?: boolean;
}

// Delete Job Input
export interface DeleteJobInput {
  id: string;
}
