/**
 * Central types file for the backend
 * Import commonly used types from here instead of directly from packages
 */

// Re-export Express types
export type { Request, Response, NextFunction, Application } from 'express';

// You can also create custom types here
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  environment: string;
}

export interface HelloResponse {
  message: string;
}
