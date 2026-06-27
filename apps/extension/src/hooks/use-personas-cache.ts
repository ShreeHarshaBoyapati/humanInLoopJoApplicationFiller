import { useCallback, useRef } from 'react';

import type { PaginatedPersonasResponse } from '@repo/shared-types';
import {
  getCachedPage,
  getCurrentToken,
  setCachedPage,
  clearAllPersonasCache,
} from '../db/personas-cache';

/**
 * Hook return type
 */
export interface UsePersonasCacheResult {
  /** Get page from IndexedDB cache */
  getPage: (page: number, search: string) => Promise<PaginatedPersonasResponse | null>;
  /** Set page in IndexedDB cache */
  setPage: (data: PaginatedPersonasResponse, search: string) => void;
  /** Invalidate cache and re-fetch fresh data */
  invalidateCache: () => Promise<void>;
}

/**
 * Hook for managing personas cache with IndexedDB
 * - IndexedDB: Persistent storage for all fetched pages
 * - Token change detection: Clears cache when user changes
 */
export function usePersonasCache(): UsePersonasCacheResult {
  const currentToken = useRef<string | null>(null);

  /**
   * Initialize token from personas cache
   */
  const initToken = useCallback(async () => {
    const token = await getCurrentToken();
    currentToken.current = token;
    return token;
  }, []);

  // Initialize token on first use
  const ensureToken = useCallback(async () => {
    if (!currentToken.current) {
      await initToken();
    }
    return currentToken.current;
  }, [initToken]);

  /**
   * Get page from IndexedDB cache
   */
  const getPage = useCallback(
    async (page: number, search: string): Promise<PaginatedPersonasResponse | null> => {
      const token = await ensureToken();
      if (!token) return null;

      const cached = await getCachedPage(token, search, page);
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
    [ensureToken]
  );

  /**
   * Set page in IndexedDB cache
   */
  const setPage = useCallback((data: PaginatedPersonasResponse, search: string) => {
    if (!currentToken.current) return;
    setCachedPage(currentToken.current, search, data);
  }, []);

  /**
   * Invalidate cache - clear only personas data, not the token
   */
  const invalidateCache = useCallback(async () => {
    await clearAllPersonasCache();
  }, []);

  return {
    getPage,
    setPage,
    invalidateCache,
  };
}
