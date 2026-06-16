import type {
  Persona,
  ResumeMetadata,
  ResumeVersionMetadata,
  ResourceChangedEvent,
} from '@repo/shared-types';

export interface CacheInvalidationDeps {
  patchPersonasPage: (patch: { id: string } & Partial<Persona>) => Promise<void>;
  patchResumesPage: (patch: { id: string } & Partial<ResumeMetadata>) => Promise<void>;
  patchVersionsPage: (patch: { id: string } & Partial<ResumeVersionMetadata>) => Promise<void>;
  patchPersonaCount: (id: string, resumesCount: number) => Promise<void>;
  patchResumeCount: (id: string, versionsCount: number) => Promise<void>;
  clearResumesForPersona: (personaId: string) => Promise<void>;
  clearVersionsForPersona: (personaId: string) => Promise<void>;
  clearVersionsForResume: (resumeId: string) => Promise<void>;
  invalidatePersonas: () => Promise<void>;
  invalidateResumes: () => Promise<void>;
  invalidateVersions: () => Promise<void>;
}

interface CountUpdate {
  id: string;
  resumesCount?: number;
  versionsCount?: number;
}

function isCountUpdate(value: unknown): value is CountUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown; resumesCount?: unknown; versionsCount?: unknown };
  if (typeof obj.id !== 'string') return false;
  if (obj.resumesCount !== undefined && typeof obj.resumesCount !== 'number') return false;
  if (obj.versionsCount !== undefined && typeof obj.versionsCount !== 'number') return false;
  return obj.resumesCount !== undefined || obj.versionsCount !== undefined;
}

function isFullRow(value: unknown): value is { id: string } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown };
  return typeof obj.id === 'string';
}

export function applyRealtimeEventToCache(
  event: ResourceChangedEvent,
  deps: CacheInvalidationDeps
): void {
  const related = Array.isArray(event.related) ? event.related : [];
  const fullRows = related.filter(isFullRow);
  const countUpdates = related.filter(isCountUpdate);

  if (event.resource === 'persona') {
    if (event.action === 'update' || event.action === 'setActive') {
      if (event.data && isFullRow(event.data)) {
        void deps.patchPersonasPage(event.data as { id: string } & Partial<Persona>);
      }
      for (const row of fullRows) {
        void deps.patchPersonasPage(row as { id: string } & Partial<Persona>);
      }
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      void deps.invalidatePersonas();
      return;
    }
    if (event.action === 'delete') {
      void deps.invalidatePersonas();
      void deps.clearResumesForPersona(event.id);
      void deps.clearVersionsForPersona(event.id);
      return;
    }
  }

  if (event.resource === 'resume') {
    if (event.action === 'update' || event.action === 'setActive') {
      if (event.data && isFullRow(event.data)) {
        void deps.patchResumesPage(event.data as { id: string } & Partial<ResumeMetadata>);
      }
      for (const row of fullRows) {
        void deps.patchResumesPage(row as { id: string } & Partial<ResumeMetadata>);
      }
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      void deps.invalidateResumes();
      for (const c of countUpdates) {
        if (c.resumesCount !== undefined) {
          void deps.patchPersonaCount(c.id, c.resumesCount);
        }
      }
      return;
    }
    if (event.action === 'delete') {
      void deps.invalidateResumes();
      void deps.clearVersionsForResume(event.id);
      for (const c of countUpdates) {
        if (c.resumesCount !== undefined) {
          void deps.patchPersonaCount(c.id, c.resumesCount);
        }
      }
      return;
    }
  }

  if (event.resource === 'resume-version') {
    if (event.action === 'update' || event.action === 'setActive') {
      if (event.data && isFullRow(event.data)) {
        void deps.patchVersionsPage(event.data as { id: string } & Partial<ResumeVersionMetadata>);
      }
      for (const row of fullRows) {
        void deps.patchVersionsPage(row as { id: string } & Partial<ResumeVersionMetadata>);
      }
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      void deps.invalidateVersions();
      return;
    }
    if (event.action === 'delete') {
      void deps.invalidateVersions();
      for (const c of countUpdates) {
        if (c.versionsCount !== undefined) {
          void deps.patchResumeCount(c.id, c.versionsCount);
        }
      }
      return;
    }
  }
}
