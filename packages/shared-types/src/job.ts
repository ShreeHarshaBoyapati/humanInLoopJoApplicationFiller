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
