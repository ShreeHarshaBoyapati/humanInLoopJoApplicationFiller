import type { Job } from '@repo/shared-types';
import { getDB, type CachedJobsPage } from './common-cache';

/**
 * Invalidate all cached jobs pages. Used after mutations that change the list
 * order or contents (create/delete) so the next recent-jobs load fetches fresh data.
 */
export async function invalidateJobsCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('jobs');
  } catch (error) {
    console.error('[JobsCache] Error invalidating jobs cache:', error);
  }
}

/**
 * Patch an existing job in every cached jobs page (setQueryData-style update).
 */
export async function updateJobInCache(
  jobId: string,
  updates: Partial<Job> & { id: string }
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('jobs', 'readwrite');
    const store = tx.objectStore('jobs');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedJobsPage;
      const nextJobs = value.jobs.map((j) => (j.id === jobId ? ({ ...j, ...updates } as Job) : j));
      if (nextJobs.some((j, i) => j !== value.jobs[i])) {
        await cursor.update({ ...value, jobs: nextJobs, cachedAt: Date.now() });
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('[JobsCache] Error updating job in cache:', error);
  }
}

export function getJobsCacheKey(
  token: string,
  limit: number,
  sortBy: string,
  sortOrder: 'ASC' | 'DESC'
): string {
  return `${token}:${limit}:${sortBy}:${sortOrder}`;
}

export async function getCachedRecentJobs(
  token: string,
  limit: number,
  sortBy: string,
  sortOrder: 'ASC' | 'DESC'
): Promise<CachedJobsPage | null> {
  try {
    const db = await getDB();
    const key = getJobsCacheKey(token, limit, sortBy, sortOrder);
    const cached = await db.get('jobs', key);
    return cached || null;
  } catch (error) {
    console.error('[JobsCache] Error getting cached jobs:', error);
    return null;
  }
}

export async function setCachedRecentJobs(
  token: string,
  limit: number,
  sortBy: string,
  sortOrder: 'ASC' | 'DESC',
  jobs: Job[]
): Promise<void> {
  try {
    const db = await getDB();
    const key = getJobsCacheKey(token, limit, sortBy, sortOrder);

    const cachedPage: CachedJobsPage = {
      id: key,
      jobs,
      limit,
      sortBy,
      sortOrder,
      cachedAt: Date.now(),
    };

    await db.put('jobs', cachedPage);
  } catch (error) {
    console.error('[JobsCache] Error setting cached jobs:', error);
  }
}

export async function removeJobFromCache(jobId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('jobs', 'readwrite');
    const store = tx.objectStore('jobs');
    let cursor = await store.openCursor();
    while (cursor) {
      const value = cursor.value as CachedJobsPage;
      const nextJobs = value.jobs.filter((j) => j.id !== jobId);
      if (nextJobs.length !== value.jobs.length) {
        await cursor.update({ ...value, jobs: nextJobs, cachedAt: Date.now() });
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('[JobsCache] Error removing job from cache:', error);
  }
}

export async function clearAllJobsCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('jobs');
  } catch (error) {
    console.error('[JobsCache] Error clearing jobs cache:', error);
  }
}

export type { CachedJobsPage } from './common-cache';
