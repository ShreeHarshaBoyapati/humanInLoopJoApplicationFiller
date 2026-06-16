import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Job,
  Persona,
  PaginatedResumeListItem,
  PaginatedVersionListItem,
} from '@repo/shared-types';

/**
 * Cached page data structure for personas
 */
export interface CachedPage {
  id: string; // `${token}:${search}:${page}`
  items: Persona[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Cached page data structure for resumes
 */
export interface CachedResumePage {
  id: string; // `${token}:${personaId}:${page}`
  items: PaginatedResumeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Cached page data structure for resume versions
 */
export interface CachedVersionPage {
  id: string; // `${token}:${resumeId}:${page}`
  items: PaginatedVersionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CachedJobsPage {
  id: string; // `${token}:${limit}:${sortBy}:${sortOrder}`
  jobs: Job[];
  limit: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  cachedAt: number;
}

/**
 * IndexedDB schema with separate object stores for each cache type
 */
interface JFPCacheDB extends DBSchema {
  personas: {
    key: string;
    value: CachedPage;
  };
  resumes: {
    key: string;
    value: CachedResumePage;
  };
  versions: {
    key: string;
    value: CachedVersionPage;
  };
  jobs: {
    key: string;
    value: CachedJobsPage;
  };
  metadata: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'jfp-cache';
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<JFPCacheDB>> | null = null;

/**
 * Get or create IndexedDB connection (shared across all cache modules)
 */
export function getDB(): Promise<IDBPDatabase<JFPCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JFPCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create personas store
        if (!db.objectStoreNames.contains('personas')) {
          db.createObjectStore('personas', { keyPath: 'id' });
        }

        // Create resumes store
        if (!db.objectStoreNames.contains('resumes')) {
          db.createObjectStore('resumes', { keyPath: 'id' });
        }

        // Create versions store
        if (!db.objectStoreNames.contains('versions')) {
          db.createObjectStore('versions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('jobs')) {
          db.createObjectStore('jobs', { keyPath: 'id' });
        }

        // Create metadata store for token and other metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });
  }
  return dbPromise;
}
