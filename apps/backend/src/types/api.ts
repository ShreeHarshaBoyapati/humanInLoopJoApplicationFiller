/**
 * API related types and interfaces
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  environment: string;
}

/**
 * Hello endpoint response
 */
export interface HelloResponse {
  message: string;
}
