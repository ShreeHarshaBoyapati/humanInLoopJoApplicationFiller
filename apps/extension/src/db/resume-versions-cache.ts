import type { PaginatedVersionResponse } from '@repo/shared-types';
import { getDB, type CachedVersionPage } from './common-cache';

/**
 * Generate cache key for versions page
 */
export function getVersionCacheKey(resumeId: string, search: string, page: number): string {
  return `${resumeId}:${search}:${page}`;
}

/**
 * Get cached versions page from IndexedDB
 */
export async function getCachedVersionPage(
  resumeId: string,
  search: string,
  page: number
): Promise<CachedVersionPage | null> {
  try {
    const db = await getDB();
    const key = getVersionCacheKey(resumeId, search, page);
    const cached = await db.get('versions', key);
    return cached || null;
  } catch (error) {
    console.error('[VersionsCache] Error getting cached page:', error);
    return null;
  }
}

/**
 * Set cached versions page in IndexedDB
 */
export async function setCachedVersionPage(
  resumeId: string,
  search: string,
  data: PaginatedVersionResponse
): Promise<void> {
  try {
    const db = await getDB();
    const key = getVersionCacheKey(resumeId, search, data.page);

    const cachedPage: CachedVersionPage = {
      id: key,
      items: data.items,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };

    await db.put('versions', cachedPage);
  } catch (error) {
    console.error('[VersionsCache] Error setting cached page:', error);
  }
}

/**
 * Clear all cached versions pages from IndexedDB
 */
export async function clearAllVersionsCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('versions');
    console.log('[VersionsCache] Versions cache cleared');
  } catch (error) {
    console.error('[VersionsCache] Error clearing cache:', error);
  }
}

/**
 * On switch resume - keep only the first 10 pages (empty search) for the previous resume
 * This ensures we have quick access when returning to a resume without extra API calls
 */
export async function onSwitchResume(previousResumeId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('versions', 'readwrite');
    const store = tx.objectStore('versions');

    // Get all keys
    let cursor = await store.openCursor();
    const keysToDelete: string[] = [];

    while (cursor) {
      const key = cursor.key;
      if (!key) {
        cursor = await cursor.continue();
        continue;
      }
      const keyStr = key as string;
      // Key format: `${resumeId}:${search}:${page}`
      const parts = keyStr.split(':');
      if (parts.length >= 3) {
        const keyResumeId = parts[0];
        const keySearch = parts[1];
        const keyPage = parseInt(parts[2] as string, 10);

        // If this is the previous resume
        if (keyResumeId === previousResumeId) {
          // Keep only first 10 pages with empty search
          const shouldKeep = keySearch === '' && keyPage >= 1 && keyPage <= 10;
          if (!shouldKeep) {
            keysToDelete.push(keyStr);
          }
        }
      }
      cursor = await cursor.continue();
    }

    // Delete the marked keys
    for (const key of keysToDelete) {
      if (key) {
        await store.delete(key);
      }
    }

    await tx.done;
    console.log(
      `[VersionsCache] Cleaned up cache for resume ${previousResumeId}, kept first 10 pages`
    );
  } catch (error) {
    console.error('[VersionsCache] Error in onSwitchResume:', error);
  }
}

// Re-export types for convenience
export type { CachedVersionPage } from './common-cache';
