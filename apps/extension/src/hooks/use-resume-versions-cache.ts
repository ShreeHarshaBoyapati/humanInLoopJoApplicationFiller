import { useCallback } from 'react';

import type { PaginatedVersionResponse } from '@repo/shared-types';
import {
  getCachedVersionPage,
  setCachedVersionPage,
  clearAllVersionsCache,
} from '../db/resume-versions-cache';

/**
 * Hook return type
 */
export interface UseVersionsCacheResult {
  /** Get page from IndexedDB cache */
  getPage: (
    page: number,
    resumeId: string,
    search: string
  ) => Promise<PaginatedVersionResponse | null>;
  /** Set page in IndexedDB cache */
  setPage: (data: PaginatedVersionResponse, resumeId: string, search: string) => void;
  /** Invalidate cache and re-fetch fresh data */
  invalidateCache: () => Promise<void>;
}

/**
 * Hook for managing resume versions cache with IndexedDB
 * Token handling is done by personas-cache (clears entire DB on auth changes)
 */
export function useResumeVersionsCache(): UseVersionsCacheResult {
  /**
   * Get page from IndexedDB cache
   */
  const getPage = useCallback(
    async (
      page: number,
      resumeId: string,
      search: string
    ): Promise<PaginatedVersionResponse | null> => {
      const cached = await getCachedVersionPage(resumeId, search, page);
      if (cached) {
        return {
          items: cached.items,
          total: cached.total,
          page: cached.page,
          limit: cached.limit,
          totalPages: cached.totalPages,
        };
      }

      return null;
    },
    []
  );

  /**
   * Set page in IndexedDB cache
   */
  const setPage = useCallback(
    (data: PaginatedVersionResponse, resumeId: string, search: string) => {
      setCachedVersionPage(resumeId, search, data);
    },
    []
  );

  /**
   * Invalidate cache - clear all versions cache
   */
  const invalidateCache = useCallback(async () => {
    await clearAllVersionsCache();
  }, []);

  return {
    getPage,
    setPage,
    invalidateCache,
  };
}
