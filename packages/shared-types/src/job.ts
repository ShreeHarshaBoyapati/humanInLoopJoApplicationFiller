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

export interface GetJobParams {
  page?: number;
  limit?: number;
  status?: 'draft' | 'active' | 'archived';
  persona?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'acceptanceLevel';
  sortOrder?: 'ASC' | 'DESC';
  select?: string;
}
