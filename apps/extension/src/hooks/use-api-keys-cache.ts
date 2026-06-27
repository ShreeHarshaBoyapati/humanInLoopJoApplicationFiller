import { useCallback, useRef } from 'react';

import type { ApiKeyData, PaginatedApiKeysResponse } from '@repo/shared-types';
import {
  getCachedApiKeysPage,
  getCurrentToken,
  setCachedApiKeysPage,
  clearAllApiKeysCache,
  patchApiKeyInPages,
} from '../db/api-keys-cache';

export interface UseApiKeysCacheResult {
  getPage: (page: number, search: string) => Promise<PaginatedApiKeysResponse | null>;
  setPage: (data: PaginatedApiKeysResponse, search: string) => void;
  invalidateCache: () => Promise<void>;
  patchInPages: (patch: { id: string } & Partial<ApiKeyData>) => Promise<void>;
}

export function useApiKeysCache(): UseApiKeysCacheResult {
  const currentToken = useRef<string | null>(null);

  const initToken = useCallback(async () => {
    const token = await getCurrentToken();
    currentToken.current = token;
    return token;
  }, []);

  const ensureToken = useCallback(async () => {
    if (!currentToken.current) {
      await initToken();
    }
    return currentToken.current;
  }, [initToken]);

  const getPage = useCallback(
    async (page: number, search: string): Promise<PaginatedApiKeysResponse | null> => {
      const token = await ensureToken();
      if (!token) return null;

      const cached = await getCachedApiKeysPage(token, search, page);
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

  const setPage = useCallback((data: PaginatedApiKeysResponse, search: string) => {
    if (!currentToken.current) return;
    setCachedApiKeysPage(currentToken.current, search, data);
  }, []);

  const invalidateCache = useCallback(async () => {
    await clearAllApiKeysCache();
  }, []);

  const patchInPages = useCallback(async (patch: { id: string } & Partial<ApiKeyData>) => {
    await patchApiKeyInPages(patch);
  }, []);

  return {
    getPage,
    setPage,
    invalidateCache,
    patchInPages,
  };
}
