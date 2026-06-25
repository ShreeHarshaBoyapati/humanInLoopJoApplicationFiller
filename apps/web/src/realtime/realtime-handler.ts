import type { QueryClient } from '@tanstack/react-query';
import type {
  ApiKeyData,
  Event,
  EventList,
  Job,
  Persona,
  ResumeMetadata,
  ResumeVersionMetadata,
} from '@repo/shared-types';
import { PERSONA_KEYS } from '../hooks/use-personas';
import { RESUME_KEYS } from '../hooks/use-resumes';
import { VERSION_KEYS } from '../hooks/use-resume-versions';
import { JOB_KEYS, requiresListInvalidation } from '../hooks/use-jobs';
import { RESULT_KEYS } from '../hooks/use-results';
import { EVENT_KEYS } from '../hooks/use-events';
import { TAG_KEYS } from '../hooks/use-tags';
import { ONBOARDING_KEYS } from '../hooks/use-onboarding';
import { DASHBOARD_KEYS } from '../hooks/use-dashboard';
import { API_KEY_KEYS } from '../hooks/use-api-keys';

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

type EventPages = { pages: EventList[]; pageParams?: number[] };

function isEventPages(value: unknown): value is EventPages {
  if (!value || typeof value !== 'object') return false;
  const pages = (value as { pages?: unknown }).pages;
  return Array.isArray(pages);
}

function patchEventInPages(
  qc: QueryClient,
  queryKey: readonly unknown[],
  patchById: Map<string, Partial<Event>>
): void {
  qc.setQueryData(queryKey, (old: unknown) => {
    if (!isEventPages(old)) return old;
    return {
      pages: old.pages.map((page) => ({
        ...page,
        events: page.events.map((item) => {
          const patch = patchById.get(item.id);
          return patch ? { ...item, ...patch } : item;
        }),
      })),
      pageParams: old.pageParams ?? old.pages.map((_, index) => index + 1),
    };
  });
}

function applyEventPatchesToMatchingQueries(
  qc: QueryClient,
  prefix: readonly unknown[],
  patches: ReadonlyArray<{ id: string } & Partial<Event>>
): void {
  if (patches.length === 0) return;
  const patchById = new Map(patches.map((p) => [p.id, p]));
  const entries = qc.getQueriesData({ queryKey: prefix, exact: false });
  for (const [queryKey] of entries) {
    patchEventInPages(qc, queryKey, patchById);
  }
}

function findJobInQueryCache<T extends { id: string }>(
  qc: QueryClient,
  prefix: readonly unknown[],
  id: string
): T | undefined {
  const entries = qc.getQueriesData<{ pages: { items: T[] }[] }>({
    queryKey: prefix,
    exact: false,
  });
  for (const [, data] of entries) {
    if (!data?.pages) continue;
    for (const page of data.pages) {
      const match = page.items.find((item) => item.id === id);
      if (match) return match;
    }
  }
  return undefined;
}

interface CountUpdate {
  id: string;
  resumesCount?: number;
  versionsCount?: number;
}

interface ScopeUpdate {
  personaId: string;
  resumeId?: string;
}

function isCountUpdate(value: unknown): value is CountUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown; resumesCount?: unknown; versionsCount?: unknown };
  if (typeof obj.id !== 'string') return false;
  if (obj.resumesCount !== undefined && typeof obj.resumesCount !== 'number') return false;
  if (obj.versionsCount !== undefined && typeof obj.versionsCount !== 'number') return false;
  return true;
}

function isScopeUpdate(value: unknown): value is ScopeUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { personaId?: unknown; resumeId?: unknown };
  return typeof obj.personaId === 'string';
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
  resource: 'persona' | 'resume' | 'resume-version' | 'job' | 'result' | 'event' | 'tag' | 'apiKey';
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
    (e.resource === 'persona' ||
      e.resource === 'resume' ||
      e.resource === 'resume-version' ||
      e.resource === 'job' ||
      e.resource === 'result' ||
      e.resource === 'event' ||
      e.resource === 'tag' ||
      e.resource === 'apiKey') &&
    (e.action === 'update' ||
      e.action === 'setActive' ||
      e.action === 'create' ||
      e.action === 'branch' ||
      e.action === 'delete')
  );
}

function isEventScope(
  value: unknown
): value is { id: string; date: string; tagId: string | null; jobId: string | null } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown; date?: unknown; tagId?: unknown; jobId?: unknown };
  return (
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    (obj.tagId === null || typeof obj.tagId === 'string') &&
    (obj.jobId === null || typeof obj.jobId === 'string')
  );
}

function eventDateMatchesQueryRange(date: string, params: Record<string, unknown>): boolean {
  const from = typeof params.from === 'string' ? params.from : undefined;
  const to = typeof params.to === 'string' ? params.to : undefined;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function eventMatchesQueryFilters(
  event: { tagId: string | null; jobId: string | null },
  params: Record<string, unknown>
): boolean {
  const tagId = typeof params.tagId === 'string' ? params.tagId : undefined;
  const jobId = typeof params.jobId === 'string' ? params.jobId : undefined;
  if (tagId && event.tagId !== tagId) return false;
  if (jobId && event.jobId !== jobId) return false;
  return true;
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
    if (event.action === 'update') {
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
    if (event.action === 'setActive') {
      // Invalidate persona lists and resume lists for the affected personas
      // because active flags may change on rows across cached pages.
      qc.invalidateQueries({ queryKey: PERSONA_KEYS.lists() });
      const personaIds = new Set<string>([event.id]);
      for (const row of related) {
        const persona = row as { id?: unknown };
        if (typeof persona.id === 'string') {
          personaIds.add(persona.id);
        }
      }
      for (const personaId of personaIds) {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(personaId) });
      }
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
        queryKey: VERSION_KEYS.all,
        exact: false,
        predicate: (query) => hasPersonaIdSegment(query.queryKey, event.id),
      });
      return;
    }
  }

  if (event.resource === 'resume') {
    if (event.action === 'update') {
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
    if (event.action === 'setActive') {
      const personaIds = new Set<string>();
      if (event.data) {
        const resume = event.data as { personaId?: unknown };
        if (typeof resume.personaId === 'string') {
          personaIds.add(resume.personaId);
        }
      }
      for (const row of related) {
        const resume = row as { personaId?: unknown };
        if (typeof resume.personaId === 'string') {
          personaIds.add(resume.personaId);
        }
      }
      if (personaIds.size === 0) {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.lists() });
        return;
      }
      for (const personaId of personaIds) {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(personaId) });
      }
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      const scopeUpdate = related.find(isScopeUpdate);
      if (scopeUpdate) {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(scopeUpdate.personaId) });
      } else {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.lists() });
      }
      applyCountUpdates(qc, related);
      return;
    }
    if (event.action === 'delete') {
      const scopeUpdate = related.find(isScopeUpdate);
      if (scopeUpdate && scopeUpdate.resumeId) {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(scopeUpdate.personaId) });
        qc.removeQueries({
          queryKey: VERSION_KEYS.byPersonaAndResume(scopeUpdate.personaId, scopeUpdate.resumeId),
          exact: false,
        });
      } else {
        qc.invalidateQueries({ queryKey: RESUME_KEYS.lists() });
        qc.removeQueries({
          queryKey: VERSION_KEYS.all,
          exact: false,
          predicate: (query) => hasResumeIdSegment(query.queryKey, event.id),
        });
      }
      applyCountUpdates(qc, related);
      return;
    }
  }

  if (event.resource === 'job') {
    if (event.action === 'update' || event.action === 'setActive') {
      const jobData = event.data as unknown as Job | undefined;
      const newStatus = jobData?.status;
      const previousJob = jobData?.id
        ? findJobInQueryCache<Job>(qc, JOB_KEYS.lists(), jobData.id)
        : undefined;
      const previousStatus = previousJob?.status;

      if (requiresListInvalidation(previousStatus, newStatus)) {
        qc.invalidateQueries({ queryKey: JOB_KEYS.lists() });
        qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
        return;
      }

      if (jobData) {
        applyPatchFromData<Job>(qc, JOB_KEYS.lists(), jobData);
      }
      applyPatchesToMatchingQueries<Job>(qc, JOB_KEYS.lists(), related as unknown as Job[]);
      return;
    }
    if (event.action === 'create' || event.action === 'branch' || event.action === 'delete') {
      qc.invalidateQueries({ queryKey: JOB_KEYS.lists() });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }
  }

  if (event.resource === 'result') {
    if (event.action === 'create') {
      const firstRelated = Array.isArray(event.related) ? event.related[0] : undefined;
      const jobId =
        firstRelated && typeof firstRelated === 'object' && 'jobId' in firstRelated
          ? (firstRelated as { jobId?: string }).jobId
          : undefined;

      if (jobId) {
        qc.invalidateQueries({ queryKey: RESULT_KEYS.byJob(jobId) });
      }

      if (firstRelated && typeof firstRelated === 'object') {
        const jobPatch: { id: string } & Partial<Job> = { id: jobId ?? event.id };
        if ('primaryResultId' in firstRelated) {
          jobPatch.primaryResultId = (
            firstRelated as { primaryResultId?: string | null }
          ).primaryResultId;
        }
        if ('acceptanceLevel' in firstRelated) {
          jobPatch.acceptanceLevel = (firstRelated as { acceptanceLevel?: number }).acceptanceLevel;
        }
        applyPatchesToMatchingQueries<Job>(qc, JOB_KEYS.lists(), [jobPatch]);
      }
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }
  }

  if (event.resource === 'resume-version') {
    const versionData = event.data as unknown as ResumeVersionMetadata | undefined;

    if (event.action === 'update') {
      if (!versionData?.personaId || !versionData?.resumeId) return;
      const versionScope = VERSION_KEYS.byPersonaAndResume(
        versionData.personaId,
        versionData.resumeId
      );
      applyPatchFromData<ResumeVersionMetadata>(qc, versionScope, versionData);
      applyPatchesToMatchingQueries<ResumeVersionMetadata>(
        qc,
        versionScope,
        related as unknown as ResumeVersionMetadata[]
      );
      return;
    }
    if (event.action === 'setActive') {
      const resumeIds = new Set<string>();
      if (typeof versionData?.resumeId === 'string') {
        resumeIds.add(versionData.resumeId);
      }
      for (const row of related) {
        const version = row as { resumeId?: unknown };
        if (typeof version.resumeId === 'string') {
          resumeIds.add(version.resumeId);
        }
      }
      const personaIds = new Set<string>();
      if (typeof versionData?.personaId === 'string') {
        personaIds.add(versionData.personaId);
      }
      for (const row of related) {
        const version = row as { personaId?: unknown };
        if (typeof version.personaId === 'string') {
          personaIds.add(version.personaId);
        }
      }
      if (resumeIds.size === 0 || personaIds.size === 0) {
        qc.invalidateQueries({ queryKey: VERSION_KEYS.lists() });
        return;
      }
      if (personaIds.size === 1) {
        const personaId = Array.from(personaIds)[0];
        for (const resumeId of resumeIds) {
          qc.invalidateQueries({
            queryKey: VERSION_KEYS.byPersonaAndResume(personaId, resumeId),
          });
        }
        return;
      }

      qc.invalidateQueries({ queryKey: VERSION_KEYS.lists() });
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      if (!versionData?.personaId || !versionData?.resumeId) return;
      const versionScope = VERSION_KEYS.byPersonaAndResume(
        versionData.personaId,
        versionData.resumeId
      );
      qc.invalidateQueries({ queryKey: versionScope });
      applyCountUpdates(qc, related);
      return;
    }
    if (event.action === 'delete') {
      if (!versionData?.personaId || !versionData?.resumeId) return;
      const versionScope = VERSION_KEYS.byPersonaAndResume(
        versionData.personaId,
        versionData.resumeId
      );
      qc.invalidateQueries({ queryKey: versionScope });
      applyCountUpdates(qc, related);
      return;
    }
  }

  if (event.resource === 'event') {
    if (event.action === 'update') {
      if (event.data) {
        applyEventPatchesToMatchingQueries(qc, EVENT_KEYS.lists(), [
          event.data as unknown as Event,
        ]);
      }
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }

    const scope = event.data && isEventScope(event.data) ? event.data : undefined;
    if (!scope) {
      qc.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'], exact: false });
      return;
    }

    const predicate = (query: { queryKey: readonly unknown[] }) => {
      const params = query.queryKey[2];
      if (!params || typeof params !== 'object') return true;
      const record = params as Record<string, unknown>;
      return (
        eventDateMatchesQueryRange(scope.date, record) && eventMatchesQueryFilters(scope, record)
      );
    };

    if (event.action === 'delete') {
      qc.invalidateQueries({ queryKey: EVENT_KEYS.lists(), predicate });
      qc.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'], exact: false, predicate });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }

    if (event.action === 'create') {
      qc.invalidateQueries({ queryKey: EVENT_KEYS.lists(), predicate });
      qc.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'], exact: false, predicate });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }
  }

  if (event.resource === 'tag') {
    if (event.action === 'update') {
      qc.invalidateQueries({ queryKey: TAG_KEYS.lists() });
      qc.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'], exact: false });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }
    if (event.action === 'create') {
      qc.invalidateQueries({ queryKey: TAG_KEYS.lists() });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }
    if (event.action === 'delete') {
      qc.invalidateQueries({ queryKey: TAG_KEYS.lists() });
      qc.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'], exact: false });
      qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
      return;
    }
  }

  if (event.resource === 'apiKey') {
    if (event.action === 'create' || event.action === 'delete') {
      qc.invalidateQueries({ queryKey: API_KEY_KEYS.lists(), exact: false });
    } else if (event.action === 'update') {
      if (event.data) {
        applyPatchFromData<ApiKeyData>(
          qc,
          API_KEY_KEYS.lists(),
          event.data as unknown as ApiKeyData
        );
      }
      const related = (event.related ?? []) as unknown as ApiKeyData[];
      if (related.length > 0) {
        applyPatchesToMatchingQueries<ApiKeyData>(qc, API_KEY_KEYS.lists(), related);
      }
    } else if (event.action === 'setActive') {
      if (event.data) {
        applyPatchFromData<ApiKeyData>(
          qc,
          API_KEY_KEYS.lists(),
          event.data as unknown as ApiKeyData
        );
      }
      const related = (event.related ?? []) as unknown as ApiKeyData[];
      if (related.length > 0) {
        applyPatchesToMatchingQueries<ApiKeyData>(qc, API_KEY_KEYS.lists(), related);
      }
    }
    qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.all, exact: false });
    qc.invalidateQueries({ queryKey: ONBOARDING_KEYS.all });
    return;
  }
}
