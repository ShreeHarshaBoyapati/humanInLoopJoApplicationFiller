/**
 * Central types file for the backend
 * All types and interfaces are exported from here
 */

// Re-export Express types
export type { Request, Response, NextFunction, Application } from 'express';

// Auth types
export * from './auth.js';

// API types
export * from './api.js';
