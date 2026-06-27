import { useCallback, useRef } from 'react';

import type { PaginatedResumeResponse } from '@repo/shared-types';
import {
  getCachedResumePage,
  setCachedResumePage,
  onSwitchPersona,
  clearAllResumesCache,
  invalidateResumesForPersona,
} from '../db/resumes-cache';
import { getCurrentToken } from '../db/personas-cache';

/**
 * Hook return type
 */
export interface UseResumesCacheResult {
  /** Get page from IndexedDB cache */
  getPage: (
    page: number,
    personaId: string,
    search: string
  ) => Promise<PaginatedResumeResponse | null>;
  /** Set page in IndexedDB cache */
  setPage: (data: PaginatedResumeResponse, personaId: string, search: string) => void;
  /** Handle persona switch - clean up previous persona cache */
  handlePersonaSwitch: (previousPersonaId: string) => Promise<void>;
  /** Invalidate all resumes cache */
  invalidateCache: () => Promise<void>;
  /** Invalidate cache for a specific persona only */
  invalidateForPersona: (personaId: string) => Promise<void>;
  /** Current auth token */
  token: string | null;
}

/**
 * Hook for managing resumes cache with IndexedDB
 * - IndexedDB: Persistent storage for all fetched pages
 * - No token handling (handled in personas-cache)
 * - onSwitchPersona: Keeps first 10 pages for previous persona
 */
export function useResumesCache(): UseResumesCacheResult {
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
    async (
      page: number,
      personaId: string,
      search: string
    ): Promise<PaginatedResumeResponse | null> => {
      const token = await ensureToken();
      if (!token) return null;

      const cached = await getCachedResumePage(token, personaId, search, page);
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
  const setPage = useCallback(
    (data: PaginatedResumeResponse, personaId: string, search: string) => {
      if (!currentToken.current) return;
      setCachedResumePage(currentToken.current, personaId, search, data);
    },
    []
  );

  /**
   * Handle persona switch - keep first 10 pages for previous persona
   */
  const handlePersonaSwitch = useCallback(async (previousPersonaId: string) => {
    if (currentToken.current && previousPersonaId) {
      await onSwitchPersona(currentToken.current, previousPersonaId);
    }
  }, []);

  /**
   * Invalidate cache - clear all resumes cache
   */
  const invalidateCache = useCallback(async () => {
    await clearAllResumesCache();
  }, []);

  /**
   * Invalidate cache for a specific persona only
   */
  const invalidateForPersona = useCallback(async (personaId: string) => {
    await invalidateResumesForPersona(personaId);
  }, []);

  return {
    getPage,
    setPage,
    handlePersonaSwitch,
    invalidateCache,
    invalidateForPersona,
    token: currentToken.current,
  };
}
