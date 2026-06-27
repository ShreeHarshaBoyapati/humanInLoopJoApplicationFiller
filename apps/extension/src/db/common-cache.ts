import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ApiKeyData,
  Job,
  Persona,
  PaginatedResumeListItem,
  PaginatedVersionListItem,
} from '@repo/shared-types';

export interface CachedPage {
  id: string;
  items: Persona[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CachedResumePage {
  id: string;
  items: PaginatedResumeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CachedVersionPage {
  id: string;
  items: PaginatedVersionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CachedJobsPage {
  id: string;
  jobs: Job[];
  limit: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  cachedAt: number;
}

export interface CachedApiKeysPage {
  id: string;
  items: ApiKeyData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  apiKeys: {
    key: string;
    value: CachedApiKeysPage;
  };
  metadata: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'jfp-cache';
const DB_VERSION = 7;

let dbPromise: Promise<IDBPDatabase<JFPCacheDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<JFPCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JFPCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('personas')) {
          db.createObjectStore('personas', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('resumes')) {
          db.createObjectStore('resumes', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('versions')) {
          db.createObjectStore('versions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('jobs')) {
          db.createObjectStore('jobs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('apiKeys')) {
          db.createObjectStore('apiKeys', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });
  }
  return dbPromise;
}
