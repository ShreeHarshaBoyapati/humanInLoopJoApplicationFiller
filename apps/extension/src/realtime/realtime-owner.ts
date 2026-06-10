import { AUTH_STORAGE_KEY, type StoredAuth } from '@repo/shared-types';
import { RealtimeClient, resolveRealtimeUrl } from './realtime-client';
import { applyRealtimeEventToCache, type CacheInvalidationDeps } from './realtime-handler';
import {
  patchPersonaInPages,
  patchPersonaCountInPages,
  clearAllPersonasCache,
} from '../db/personas-cache';
import {
  patchResumeInPages,
  patchResumeCountInPages,
  clearAllResumesCache,
  invalidateResumesForPersona,
} from '../db/resumes-cache';
import {
  patchVersionInPages,
  clearAllVersionsCache,
  invalidateVersionsForResume,
  clearVersionsForPersona,
} from '../db/resume-versions-cache';

const DEPS: CacheInvalidationDeps = {
  patchPersonasPage: patchPersonaInPages,
  patchResumesPage: patchResumeInPages,
  patchVersionsPage: patchVersionInPages,
  patchPersonaCount: patchPersonaCountInPages,
  patchResumeCount: patchResumeCountInPages,
  clearResumesForPersona: invalidateResumesForPersona,
  clearVersionsForPersona: clearVersionsForPersona,
  clearVersionsForResume: invalidateVersionsForResume,
  invalidatePersonas: clearAllPersonasCache,
  invalidateResumes: clearAllResumesCache,
  invalidateVersions: clearAllVersionsCache,
};

function readToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve(null);
      return;
    }
    chrome.storage.session.get([AUTH_STORAGE_KEY], (result) => {
      const authData = result[AUTH_STORAGE_KEY] as StoredAuth | undefined;
      resolve(authData?.token ?? null);
    });
  });
}

function broadcastToSidePanel(event: unknown): void {
  if (typeof chrome === 'undefined' || !chrome.runtime) return;
  try {
    chrome.runtime.sendMessage({ action: 'RESOURCE_CHANGED', payload: event }).catch(() => {
      // No side panel listener — drop silently.
    });
  } catch {
    // Ignore.
  }
}

export class RealtimeOwner {
  private client: RealtimeClient | null = null;
  private currentToken: string | null = null;
  private storageListener: ((changes: Record<string, unknown>) => void) | null = null;

  start(): void {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    if (this.storageListener) return;

    this.storageListener = (changes) => {
      const authChange = (changes as Record<string, chrome.storage.StorageChange>)[
        AUTH_STORAGE_KEY
      ];
      if (!authChange) return;
      const next = (authChange.newValue as StoredAuth | undefined)?.token ?? null;
      if (next !== this.currentToken) {
        void this.sync(next);
      }
    };
    chrome.storage.onChanged.addListener(this.storageListener);

    void readToken().then((token) => {
      void this.sync(token);
    });
  }

  stop(): void {
    if (this.storageListener && typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.removeListener(this.storageListener);
    }
    this.storageListener = null;
    this.client?.stop();
    this.client = null;
    this.currentToken = null;
  }

  private async sync(token: string | null): Promise<void> {
    if (token === this.currentToken) return;
    this.client?.stop();
    this.client = null;
    this.currentToken = token;
    if (!token) return;

    const url = resolveRealtimeUrl();
    if (!url) return;

    this.client = new RealtimeClient({
      url,
      token,
      onMessage: (event) => {
        if (event && event.type === 'resource.changed') {
          applyRealtimeEventToCache(event, DEPS);
          broadcastToSidePanel(event);
        }
      },
    });
    this.client.start();
  }
}
