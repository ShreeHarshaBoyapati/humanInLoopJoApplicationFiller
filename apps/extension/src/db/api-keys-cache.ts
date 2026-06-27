import type { PaginatedApiKeysResponse, ApiKeyData } from '@repo/shared-types';
import { getDB, type CachedApiKeysPage } from './common-cache';
import { getCurrentToken } from './personas-cache';

/**
 * Generate cache key for API keys page
 */
export function getApiKeyCacheKey(token: string, search: string, page: number): string {
  return `${token}:api-keys:${search}:${page}`;
}

/**
 * Get cached API keys page from IndexedDB
 */
export async function getCachedApiKeysPage(
  token: string,
  search: string,
  page: number
): Promise<CachedApiKeysPage | null> {
  try {
    const db = await getDB();
    const key = getApiKeyCacheKey(token, search, page);
    const cached = await db.get('apiKeys', key);
    return cached || null;
  } catch (error) {
    console.error('[ApiKeysCache] Error getting cached page:', error);
    return null;
  }
}

/**
 * Set cached API keys page in IndexedDB
 */
export async function setCachedApiKeysPage(
  token: string,
  search: string,
  data: PaginatedApiKeysResponse
): Promise<void> {
  try {
    const db = await getDB();
    const key = getApiKeyCacheKey(token, search, data.page);

    const cachedPage: CachedApiKeysPage = {
      id: key,
      items: data.items,
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };

    await db.put('apiKeys', cachedPage);
  } catch (error) {
    console.error('[ApiKeysCache] Error setting cached page:', error);
  }
}

/**
 * Clear all cached API keys pages from IndexedDB
 */
export async function clearAllApiKeysCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('apiKeys');
    console.log('[ApiKeysCache] API keys cache cleared');
  } catch (error) {
    console.error('[ApiKeysCache] Error clearing cache:', error);
  }
}

/**
 * Patch an API key in every cached page
 */
export async function patchApiKeyInPages(
  patch: { id: string } & Partial<ApiKeyData>
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('apiKeys', 'readwrite');
    const store = tx.objectStore('apiKeys');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedApiKeysPage;
      let mutated = false;
      for (const item of value.items) {
        if (item.id === patch.id) {
          mutated = true;
          Object.assign(item, patch);
        }
      }
      if (mutated) {
        await cursor.update(value);
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('[ApiKeysCache] Error patching API key in pages:', error);
  }
}

/**
 * Remove an API key from every cached page
 */
export async function removeApiKeyFromAllPages(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('apiKeys', 'readwrite');
    const store = tx.objectStore('apiKeys');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedApiKeysPage;
      const nextItems = value.items.filter((item) => item.id !== id);
      if (nextItems.length !== value.items.length) {
        value.items = nextItems;
        value.total = Math.max(0, value.total - 1);
        await cursor.update(value);
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('[ApiKeysCache] Error removing API key from pages:', error);
  }
}

export { getCurrentToken };
export type { CachedApiKeysPage } from './common-cache';
