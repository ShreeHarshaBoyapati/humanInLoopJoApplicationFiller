import type { QueryClient } from '@tanstack/react-query';
import type { Persona, ResumeMetadata, ResumeVersionMetadata } from '@repo/shared-types';
import { PERSONA_KEYS } from '../hooks/use-personas';
import { RESUME_KEYS } from '../hooks/use-resumes';
import { VERSION_KEYS } from '../hooks/use-resume-versions';

type InfinitePages<T> = { pages: { items: T[] }[]; pageParams?: number[] };

function isInfinitePages<T>(value: unknown): value is InfinitePages<T> {
  if (!value || typeof value !== 'object') return false;
  const pages = (value as { pages?: unknown }).pages;
  return Array.isArray(pages);
}

function patchInInfinitePages<T extends { id: string }>(
  qc: QueryClient,
  queryKey: readonly unknown[],
  patchById: Map<string, Partial<T>>
): void {
  qc.setQueryData(queryKey, (old: unknown) => {
    if (!isInfinitePages<T>(old)) return old;
    return {
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => {
          const patch = patchById.get(item.id);
          return patch ? { ...item, ...patch } : item;
        }),
      })),
      pageParams: old.pageParams ?? old.pages.map((_, index) => index + 1),
    };
  });
}

function removeFromInfinitePages<T extends { id: string }>(
  qc: QueryClient,
  queryKey: readonly unknown[],
  id: string
): void {
  qc.setQueryData(queryKey, (old: unknown) => {
    if (!isInfinitePages<T>(old)) return old;
    return {
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== id),
      })),
      pageParams: old.pageParams ?? old.pages.map((_, index) => index + 1),
    };
  });
}

function applyPatchesToMatchingQueries<T extends { id: string }>(
  qc: QueryClient,
  prefix: readonly unknown[],
  patches: ReadonlyArray<{ id: string } & Partial<T>>
): void {
  if (patches.length === 0) return;
  const patchById = new Map(patches.map((p) => [p.id, p]));
  const entries = qc.getQueriesData({ queryKey: prefix, exact: false });
  for (const [queryKey] of entries) {
    patchInInfinitePages<T>(qc, queryKey, patchById);
  }
}

function applyPatchFromData<T extends { id: string }>(
  qc: QueryClient,
  prefix: readonly unknown[],
  data: { id: string } & Partial<T>
): void {
  applyPatchesToMatchingQueries<T>(qc, prefix, [data]);
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
  return true;
}

function applyCountUpdates(qc: QueryClient, updates: ReadonlyArray<unknown>): void {
  const personaUpdates: CountUpdate[] = [];
  const resumeUpdates: CountUpdate[] = [];
  for (const raw of updates) {
    if (!isCountUpdate(raw)) continue;
    if (raw.resumesCount !== undefined) personaUpdates.push(raw);
    if (raw.versionsCount !== undefined) resumeUpdates.push(raw);
  }
  if (personaUpdates.length > 0) {
    applyPatchesToMatchingQueries<Persona>(qc, PERSONA_KEYS.lists(), personaUpdates);
  }
  if (resumeUpdates.length > 0) {
    applyPatchesToMatchingQueries<ResumeMetadata>(
      qc,
      RESUME_KEYS.lists(),
      resumeUpdates as Array<{ id: string } & Partial<ResumeMetadata>>
    );
  }
}

export interface RealtimeEvent {
  type: 'resource.changed';
  resource: 'persona' | 'resume' | 'resume-version';
  action: 'update' | 'setActive' | 'create' | 'branch' | 'delete';
  id: string;
  data?: { id: string } & Record<string, unknown>;
  related?: unknown[];
}

function isResourceChangedEvent(event: unknown): event is RealtimeEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as { type?: unknown; resource?: unknown; action?: unknown; id?: unknown };
  return (
    e.type === 'resource.changed' &&
    typeof e.id === 'string' &&
    (e.resource === 'persona' || e.resource === 'resume' || e.resource === 'resume-version') &&
    (e.action === 'update' ||
      e.action === 'setActive' ||
      e.action === 'create' ||
      e.action === 'branch' ||
      e.action === 'delete')
  );
}

function hasPersonaIdSegment(key: readonly unknown[], id: string): boolean {
  return key.some(
    (segment) =>
      segment &&
      typeof segment === 'object' &&
      'personaId' in (segment as object) &&
      (segment as { personaId?: string }).personaId === id
  );
}

function hasResumeIdSegment(key: readonly unknown[], id: string): boolean {
  return key.some(
    (segment) =>
      segment &&
      typeof segment === 'object' &&
      'resumeId' in (segment as object) &&
      (segment as { resumeId?: string }).resumeId === id
  );
}

export function applyRealtimeEvent(qc: QueryClient, event: unknown): void {
  if (!isResourceChangedEvent(event)) return;

  const related = Array.isArray(event.related) ? event.related : [];

  if (event.resource === 'persona') {
    if (event.action === 'update' || event.action === 'setActive') {
      if (event.data) {
        applyPatchFromData<Persona>(qc, PERSONA_KEYS.lists(), event.data as unknown as Persona);
      }
      applyPatchesToMatchingQueries<Persona>(
        qc,
        PERSONA_KEYS.lists(),
        related as unknown as Persona[]
      );
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      qc.invalidateQueries({ queryKey: PERSONA_KEYS.lists() });
      return;
    }
    if (event.action === 'delete') {
      qc.invalidateQueries({ queryKey: PERSONA_KEYS.lists() });
      qc.removeQueries({ queryKey: RESUME_KEYS.byPersona(event.id), exact: false });
      qc.removeQueries({
        queryKey: VERSION_KEYS.lists(),
        exact: false,
        predicate: (query) => hasPersonaIdSegment(query.queryKey, event.id),
      });
      return;
    }
  }

  if (event.resource === 'resume') {
    if (event.action === 'update' || event.action === 'setActive') {
      if (event.data) {
        applyPatchFromData<ResumeMetadata>(
          qc,
          RESUME_KEYS.lists(),
          event.data as unknown as ResumeMetadata
        );
      }
      applyPatchesToMatchingQueries<ResumeMetadata>(
        qc,
        RESUME_KEYS.lists(),
        related as unknown as ResumeMetadata[]
      );
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      qc.invalidateQueries({ queryKey: RESUME_KEYS.lists() });
      return;
    }
    if (event.action === 'delete') {
      qc.invalidateQueries({ queryKey: RESUME_KEYS.lists() });
      qc.removeQueries({
        queryKey: VERSION_KEYS.lists(),
        exact: false,
        predicate: (query) => hasResumeIdSegment(query.queryKey, event.id),
      });
      applyCountUpdates(qc, related);
      return;
    }
  }

  if (event.resource === 'resume-version') {
    if (event.action === 'update' || event.action === 'setActive') {
      if (event.data) {
        applyPatchFromData<ResumeVersionMetadata>(
          qc,
          VERSION_KEYS.lists(),
          event.data as unknown as ResumeVersionMetadata
        );
      }
      applyPatchesToMatchingQueries<ResumeVersionMetadata>(
        qc,
        VERSION_KEYS.lists(),
        related as unknown as ResumeVersionMetadata[]
      );
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      qc.invalidateQueries({ queryKey: VERSION_KEYS.lists() });
      return;
    }
    if (event.action === 'delete') {
      qc.invalidateQueries({ queryKey: VERSION_KEYS.lists() });
      applyCountUpdates(qc, related);
      return;
    }
  }
}
