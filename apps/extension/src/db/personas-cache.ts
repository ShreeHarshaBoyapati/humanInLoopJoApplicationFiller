import type { PaginatedPersonasResponse } from '@repo/shared-types';
import { AUTH_STORAGE_KEY, type StoredAuth } from '@repo/shared-types';
import { getDB, type CachedPage } from './common-cache';

/**
 * Generate cache key for personas page
 */
export function getCacheKey(token: string, search: string, page: number): string {
  return `${token}:${search}:${page}`;
}

/**
 * Get cached personas page from IndexedDB
 */
export async function getCachedPage(
  token: string,
  search: string,
  page: number
): Promise<CachedPage | null> {
  try {
    const db = await getDB();
    const key = getCacheKey(token, search, page);
    const cached = await db.get('personas', key);
    return cached || null;
  } catch (error) {
    console.error('[PersonasCache] Error getting cached page:', error);
    return null;
  }
}

/**
 * Set cached personas page in IndexedDB
 */
export async function setCachedPage(
  token: string,
  search: string,
  data: PaginatedPersonasResponse
): Promise<void> {
  try {
    const db = await getDB();
    const key = getCacheKey(token, search, data.page);

    const cachedPage: CachedPage = {
      id: key,
      items: data.items,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };

    await db.put('personas', cachedPage);
  } catch (error) {
    console.error('[PersonasCache] Error setting cached page:', error);
  }
}

/**
 * Clear all cached data (personas, resumes, metadata)
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('personas');
    await db.clear('resumes');
    await db.delete('metadata', 'token');
    console.log('[PersonasCache] All cache cleared');
  } catch (error) {
    console.error('[PersonasCache] Error clearing all cache:', error);
  }
}

/**
 * Get current auth token from Chrome storage
 */
export async function getCurrentToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve(null);
      return;
    }

    chrome.storage.session.get([AUTH_STORAGE_KEY], (result) => {
      const authData = result[AUTH_STORAGE_KEY] as StoredAuth | undefined;
      if (authData?.token) {
        resolve(authData.token);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Clear all cached personas pages from IndexedDB
 */
export async function clearAllPersonasCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('personas');
    console.log('[PersonasCache] Personas cache cleared');
  } catch (error) {
    console.error('[PersonasCache] Error clearing cache:', error);
  }
}

// Re-export types for convenience
export type { CachedPage } from './common-cache';
