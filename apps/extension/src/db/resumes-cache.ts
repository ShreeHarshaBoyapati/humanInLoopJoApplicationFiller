import type { PaginatedResumeResponse } from '@repo/shared-types';
import { getDB, type CachedResumePage } from './common-cache';

/**
 * Generate cache key for resumes page
 */
export function getResumeCacheKey(
  token: string,
  personaId: string,
  search: string,
  page: number
): string {
  return `${token}:${personaId}:${search}:${page}`;
}

/**
 * Get cached resumes page from IndexedDB
 */
export async function getCachedResumePage(
  token: string,
  personaId: string,
  search: string,
  page: number
): Promise<CachedResumePage | null> {
  try {
    const db = await getDB();
    const key = getResumeCacheKey(token, personaId, search, page);
    const cached = await db.get('resumes', key);
    return cached || null;
  } catch (error) {
    console.error('[ResumesCache] Error getting cached page:', error);
    return null;
  }
}

/**
 * Set cached resumes page in IndexedDB
 */
export async function setCachedResumePage(
  token: string,
  personaId: string,
  search: string,
  data: PaginatedResumeResponse
): Promise<void> {
  try {
    const db = await getDB();
    const key = getResumeCacheKey(token, personaId, search, data.page);

    const cachedPage: CachedResumePage = {
      id: key,
      items: data.items,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };

    await db.put('resumes', cachedPage);
  } catch (error) {
    console.error('[ResumesCache] Error setting cached page:', error);
  }
}

/**
 * Clear all cached resumes pages from IndexedDB
 */
export async function clearAllResumesCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('resumes');
    console.log('[ResumesCache] Resumes cache cleared');
  } catch (error) {
    console.error('[ResumesCache] Error clearing cache:', error);
  }
}

/**
 * On switch persona - keep only the first 10 pages (empty search) for the previous persona
 * This ensures we have quick access when returning to a persona without extra API calls
 */
export async function onSwitchPersona(_token: string, previousPersonaId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('resumes', 'readwrite');
    const store = tx.objectStore('resumes');

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
      // Key format: `${token}:${personaId}:${search}:${page}`
      const parts = key.split(':');
      if (parts.length >= 4) {
        const keyPersonaId = parts[1];
        const keySearch = parts[2];
        const keyPage = parseInt(parts[3] as string, 10);

        // If this is the previous persona
        if (keyPersonaId === previousPersonaId) {
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
      await store.delete(key);
    }

    await tx.done;
    console.log(
      `[ResumesCache] Cleaned up cache for persona ${previousPersonaId}, kept first 10 pages`
    );
  } catch (error) {
    console.error('[ResumesCache] Error in onSwitchPersona:', error);
  }
}

/**
 * Invalidate cache for a specific persona's resumes
 * Only clears entries matching the given personaId
 */
export async function invalidateResumesForPersona(personaId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('resumes', 'readwrite');
    const store = tx.objectStore('resumes');

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
      // Key format: `${token}:${personaId}:${search}:${page}`
      const parts = keyStr.split(':');
      if (parts.length >= 4) {
        const keyPersonaId = parts[1];
        if (keyPersonaId === personaId) {
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
    console.log(`[ResumesCache] Invalidated cache for persona ${personaId}`);
  } catch (error) {
    console.error('[ResumesCache] Error in invalidateResumesForPersona:', error);
  }
}

export async function patchResumeInPages(
  patch: { id: string } & Partial<import('@repo/shared-types').ResumeMetadata>
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('resumes', 'readwrite');
    const store = tx.objectStore('resumes');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedResumePage;
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
    console.error('[ResumesCache] Error patching resume in pages:', error);
  }
}

export async function patchResumeCountInPages(id: string, versionsCount: number): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('resumes', 'readwrite');
    const store = tx.objectStore('resumes');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedResumePage;
      let mutated = false;
      const nextItems = value.items.map((item) => {
        if (item.id !== id) return item;
        if (item.versionsCount === versionsCount) return item;
        mutated = true;
        return { ...item, versionsCount };
      });
      if (mutated) {
        await cursor.update({ ...value, items: nextItems });
        break;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('[ResumesCache] Error patching resume count in pages:', error);
  }
}

// Re-export types for convenience
export type { CachedResumePage } from './common-cache';
