import { useState, useEffect, useCallback, useRef } from 'react';

import type { PaginatedPersonasResponse } from '@repo/shared-types';
import { AUTH_STORAGE_KEY, type StoredAuth } from '@repo/shared-types';
import {
  getCachedPage,
  setCachedPage,
  clearAllCache,
  clearAllPersonasCache,
  checkTokenChange,
} from '../db/personas-cache';

/**
 * Hook return type
 */
export interface UsePersonasCacheResult {
  /** Get page from IndexedDB cache */
  getPage: (page: number, search: string) => Promise<PaginatedPersonasResponse | null>;
  /** Set page in IndexedDB cache */
  setPage: (data: PaginatedPersonasResponse, search: string) => void;
  /** Clear all cache */
  clearCache: () => Promise<void>;
  /** Invalidate cache and re-fetch fresh data */
  invalidateCache: () => Promise<void>;
  /** Current auth token */
  token: string | null;
  /** Whether token has changed (triggers reset) */
  tokenChanged: boolean;
  /** Reset token changed flag */
  resetTokenChanged: () => void;
}

/**
 * Hook for managing personas cache with IndexedDB
 * - IndexedDB: Persistent storage for all fetched pages
 * - Token change detection: Clears cache when user changes
 */
export function usePersonasCache(): UsePersonasCacheResult {
  const [token, setToken] = useState<string | null>(null);
  const [tokenChanged, setTokenChanged] = useState(false);
  const currentToken = useRef<string | null>(null);

  /**
   * Get page from IndexedDB cache
   */
  const getPage = useCallback(
    async (page: number, search: string): Promise<PaginatedPersonasResponse | null> => {
      if (!currentToken.current) return null;

      const cached = await getCachedPage(currentToken.current, search, page);
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
  const setPage = useCallback((data: PaginatedPersonasResponse, search: string) => {
    if (!currentToken.current) return;
    setCachedPage(currentToken.current, search, data);
  }, []);

  /**
   * Clear all cache
   */
  const clearCache = useCallback(async () => {
    await clearAllCache();
  }, []);

  /**
   * Reset token changed flag
   */
  const resetTokenChanged = useCallback(() => {
    setTokenChanged(false);
  }, []);

  /**
   * Initialize: Check token on mount and listen for changes
   */
  useEffect(() => {
    let mounted = true;

    const initCache = async () => {
      const result = await checkTokenChange();
      if (mounted) {
        setToken(result.token);
        currentToken.current = result.token;
        if (result.tokenChanged) {
          setTokenChanged(true);
        }
      }
    };

    initCache();

    // Listen for token changes
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[AUTH_STORAGE_KEY]) {
        const newAuth = changes[AUTH_STORAGE_KEY].newValue as StoredAuth | undefined;
        const oldAuth = changes[AUTH_STORAGE_KEY].oldValue as StoredAuth | undefined;

        const newToken = newAuth?.token;
        const oldToken = oldAuth?.token;

        if (newToken !== oldToken) {
          // Token changed - clear cache
          clearCache();
          if (mounted) {
            setToken(newToken || null);
            currentToken.current = newToken || null;
            setTokenChanged(true);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [clearCache]);

  /**
   * Invalidate cache - clear only personas data, not the token
   */
  const invalidateCache = useCallback(async () => {
    await clearAllPersonasCache();
  }, []);

  return {
    getPage,
    setPage,
    clearCache,
    invalidateCache,
    token,
    tokenChanged,
    resetTokenChanged,
  };
}
