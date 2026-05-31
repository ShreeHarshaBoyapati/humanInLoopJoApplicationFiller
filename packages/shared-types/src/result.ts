/**
 * Result types for ATS analysis results.
 * Used in API responses for result operations.
 */

import type { AnalysisBreakdown } from './api.js';

// Paginated result list item (lightweight, no breakdown)
export interface PaginatedResultListItem {
  id: string;
  versionName: string;
  resumeName: string;
  personaName: string;
  score: number;
  resumeId: string;
  resumeVersionId: string;
  createdAt: Date;
}

// Paginated result response
export interface PaginatedResultResponse {
  items: PaginatedResultListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Full result detail with breakdown
export interface ResultDetail {
  id: string;
  versionName: string;
  resumeName: string;
  personaName: string;
  score: number;
  breakdown: AnalysisBreakdown;
  resumeVersionId: string;
  jobId: string;
  createdAt: Date;
}

// Params for getting results by job
export interface GetResultsByJobParams {
  jobId: string;
  page?: number;
  limit?: number;
  search?: string;
}

// Params for getting result detail
export interface GetResultDetailParams {
  resultId: string;
}
