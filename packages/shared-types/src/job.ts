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
  description: Record<string, unknown>;
  highlights: Record<string, unknown>;
  keySkills: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
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
