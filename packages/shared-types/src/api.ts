/**
 * Standard API response wrapper — shared between backend and extension.
 * Every backend controller response should conform to this shape.
 *
 * @template TData  - Shape of `data` on success (e.g. UserPublic)
 * @template TErrors - Shape of `errors` on failure (e.g. ZodFlattenedError)
 */
export type ApiResponse<TData = never, TErrors = never> =
  | {
      success: true;
      data?: TData;
      message?: string;
    }
  | {
      success: false;
      message: string;
      errors?: TErrors;
    };

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Result returned by the AI resume-job analysis endpoint.
 */
export interface AnalysisResult {
  /** ATS match score 0-100 */
  score: number;
  /** Keywords / skills present in job but absent in resume */
  missingFields: string[];
  /** Top 5 keywords most strongly matched in the resume */
  highlyMatchedKeys: string[];
  /** Up to 3 actionable improvement tips */
  suggestions: string[];
  /** One-sentence AI-generated summary of overall fit */
  overallVerdict: string;
}
