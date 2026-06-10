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

/**
 * Invalidate cache for a specific resume's versions
 * Only clears entries matching the given resumeId
 */
export async function invalidateVersionsForResume(resumeId: string): Promise<void> {
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
        if (keyResumeId === resumeId) {
          keysToDelete.push(keyStr);
        }
      }
      cursor = await cursor.continue();
    }

    // Delete the marked keys
    for (const key of keysToDelete) {
      await store.delete(key);
    }

    await tx.done;
    console.log(`[VersionsCache] Invalidated cache for resume ${resumeId}`);
  } catch (error) {
    console.error('[VersionsCache] Error in invalidateVersionsForResume:', error);
  }
}

export async function patchVersionInPages(
  patch: { id: string } & Partial<import('@repo/shared-types').ResumeVersionMetadata>
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('versions', 'readwrite');
    const store = tx.objectStore('versions');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedVersionPage;
      let mutated = false;
      const nextItems = value.items.map((item) => {
        if (item.id !== patch.id) return item;
        mutated = true;
        return { ...item, ...patch };
      });
      if (mutated) {
        await cursor.update({ ...value, items: nextItems });
        break;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('[VersionsCache] Error patching version in pages:', error);
  }
}

export async function clearVersionsForPersona(personaId: string): Promise<void> {
  try {
    const db = await getDB();
    const resumesTx = db.transaction('resumes', 'readonly');
    const resumesStore = resumesTx.objectStore('resumes');
    const resumeIds: string[] = [];
    let resumeCursor = await resumesStore.openCursor();
    while (resumeCursor) {
      const key = resumeCursor.key as string;
      const parts = key.split(':');
      if (parts.length >= 4 && parts[1] === personaId) {
        const page = resumeCursor.value as { items: { id: string }[] };
        for (const r of page.items) resumeIds.push(r.id);
      }
      resumeCursor = await resumeCursor.continue();
    }
    await resumesTx.done;
    for (const resumeId of resumeIds) {
      await invalidateVersionsForResume(resumeId);
    }
  } catch (error) {
    console.error('[VersionsCache] Error in clearVersionsForPersona:', error);
  }
}

// Re-export types for convenience
export type { CachedVersionPage } from './common-cache';
