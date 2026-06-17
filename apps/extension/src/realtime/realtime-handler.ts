import type {
  Job,
  PaginatedResultListItem,
  Persona,
  ResumeMetadata,
  ResumeVersionMetadata,
  ResourceChangedEvent,
} from '@repo/shared-types';

export interface CacheInvalidationDeps {
  patchPersonasPage: (patch: { id: string } & Partial<Persona>) => Promise<void>;
  patchResumesPage: (patch: { id: string } & Partial<ResumeMetadata>) => Promise<void>;
  patchVersionsPage: (patch: { id: string } & Partial<ResumeVersionMetadata>) => Promise<void>;
  patchJobsPage: (patch: { id: string } & Partial<Job>) => Promise<void>;
  patchResultsPage: (patch: { id: string } & Partial<PaginatedResultListItem>) => Promise<void>;
  patchPersonaCount: (id: string, resumesCount: number) => Promise<void>;
  patchResumeCount: (id: string, versionsCount: number) => Promise<void>;
  patchJobPrimaryAndAcceptance: (
    id: string,
    primaryResultId?: string | null,
    acceptanceLevel?: number
  ) => Promise<void>;
  clearResumesForPersona: (personaId: string) => Promise<void>;
  clearVersionsForPersona: (personaId: string) => Promise<void>;
  clearVersionsForResume: (resumeId: string) => Promise<void>;
  clearResultsForJob: (jobId: string) => Promise<void>;
  invalidatePersonas: () => Promise<void>;
  invalidateResumes: () => Promise<void>;
  invalidateVersions: () => Promise<void>;
  invalidateJobs: () => Promise<void>;
  invalidateResults: () => Promise<void>;
}

interface PersonaScopeUpdate {
  personaId: string;
}

interface ResumeScopeUpdate {
  personaId: string;
  resumeId: string;
}

interface PersonaCountUpdate {
  id: string;
  resumesCount: number;
}

interface ResumeCountUpdate {
  id: string;
  versionsCount: number;
}

interface ResultRelatedUpdate {
  jobId: string;
  primaryResultId?: string | null;
  acceptanceLevel?: number;
}

function isFullRow(value: unknown): value is { id: string } {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown };
  return typeof obj.id === 'string';
}

function isPersonaScope(value: unknown): value is PersonaScopeUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { personaId?: unknown };
  return typeof obj.personaId === 'string';
}

function isResumeScope(value: unknown): value is ResumeScopeUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { personaId?: unknown; resumeId?: unknown };
  return typeof obj.personaId === 'string' && typeof obj.resumeId === 'string';
}

function isPersonaCount(value: unknown): value is PersonaCountUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown; resumesCount?: unknown };
  return typeof obj.id === 'string' && typeof obj.resumesCount === 'number';
}

function isResumeCount(value: unknown): value is ResumeCountUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { id?: unknown; versionsCount?: unknown };
  return typeof obj.id === 'string' && typeof obj.versionsCount === 'number';
}

function isResultRelatedUpdate(value: unknown): value is ResultRelatedUpdate {
  if (!value || typeof value !== 'object') return false;
  const obj = value as { jobId?: unknown; primaryResultId?: unknown; acceptanceLevel?: unknown };
  return typeof obj.jobId === 'string';
}

export async function applyRealtimeEventToCache(
  event: ResourceChangedEvent,
  deps: CacheInvalidationDeps
): Promise<void> {
  const related = Array.isArray(event.related) ? event.related : [];
  const fullRows = related.filter(isFullRow);

  if (event.resource === 'persona') {
    if (event.action === 'update') {
      const patches: Array<{ id: string } & Partial<Persona>> = [];
      if (event.data && isFullRow(event.data)) {
        patches.push(event.data as { id: string } & Partial<Persona>);
      }
      for (const row of fullRows) {
        patches.push(row as { id: string } & Partial<Persona>);
      }
      await Promise.all(patches.map((p) => deps.patchPersonasPage(p)));
      return;
    }
    if (event.action === 'setActive') {
      const newId = event.data && isFullRow(event.data) ? event.data.id : event.id;
      const previousIds = fullRows.map((r) => r.id);
      const personaIds = Array.from(new Set([newId, ...previousIds]));
      const ops: Promise<void>[] = [deps.invalidatePersonas()];
      for (const personaId of personaIds) {
        ops.push(deps.clearResumesForPersona(personaId));
      }
      await Promise.all(ops);
      return;
    }
    if (event.action === 'create') {
      await deps.invalidatePersonas();
      return;
    }
    if (event.action === 'delete') {
      await Promise.all([
        deps.invalidatePersonas(),
        deps.clearResumesForPersona(event.id),
        deps.clearVersionsForPersona(event.id),
      ]);
      return;
    }
  }

  if (event.resource === 'resume') {
    if (event.action === 'update') {
      const patches: Array<{ id: string } & Partial<ResumeMetadata>> = [];
      if (event.data && isFullRow(event.data)) {
        patches.push(event.data as { id: string } & Partial<ResumeMetadata>);
      }
      for (const row of fullRows) {
        patches.push(row as { id: string } & Partial<ResumeMetadata>);
      }
      await Promise.all(patches.map((p) => deps.patchResumesPage(p)));
      return;
    }
    if (event.action === 'setActive') {
      const personaIds = new Set<string>();
      if (event.data && isFullRow(event.data)) {
        const resume = event.data as { personaId?: unknown };
        if (typeof resume.personaId === 'string') {
          personaIds.add(resume.personaId);
        }
      }
      for (const row of fullRows) {
        const resume = row as { personaId?: unknown };
        if (typeof resume.personaId === 'string') {
          personaIds.add(resume.personaId);
        }
      }
      if (personaIds.size === 0) {
        await deps.invalidateResumes();
        return;
      }
      await Promise.all(
        Array.from(personaIds).map((personaId) => deps.clearResumesForPersona(personaId))
      );
      return;
    }
    if (event.action === 'create' || event.action === 'branch') {
      const scope = related.find(isPersonaScope);
      const count = related.find(isPersonaCount);
      const ops: Promise<void>[] = [];
      if (scope) {
        ops.push(deps.clearResumesForPersona(scope.personaId));
      } else {
        ops.push(deps.invalidateResumes());
      }
      if (count) {
        ops.push(deps.patchPersonaCount(count.id, count.resumesCount));
      }
      await Promise.all(ops);
      return;
    }
    if (event.action === 'delete') {
      const scope = related.find(isResumeScope);
      const count = related.find(isPersonaCount);
      const ops: Promise<void>[] = [];
      if (scope) {
        ops.push(deps.clearResumesForPersona(scope.personaId));
        ops.push(deps.clearVersionsForResume(scope.resumeId));
      } else {
        ops.push(deps.invalidateResumes());
        ops.push(deps.invalidateVersions());
      }
      if (count) {
        ops.push(deps.patchPersonaCount(count.id, count.resumesCount));
      }
      await Promise.all(ops);
      return;
    }
  }

  if (event.resource === 'job') {
    if (event.action === 'update' || event.action === 'setActive') {
      const patches: Array<{ id: string } & Partial<Job>> = [];
      if (event.data && isFullRow(event.data)) {
        patches.push(event.data as { id: string } & Partial<Job>);
      }
      for (const row of fullRows) {
        patches.push(row as { id: string } & Partial<Job>);
      }
      await Promise.all(patches.map((p) => deps.patchJobsPage(p)));
      return;
    }
    if (event.action === 'create' || event.action === 'branch' || event.action === 'delete') {
      const ops: Promise<void>[] = [deps.invalidateJobs()];
      if (event.action === 'delete') {
        ops.push(deps.clearResultsForJob(event.id));
      }
      await Promise.all(ops);
      return;
    }
  }

  if (event.resource === 'result') {
    if (event.action === 'create') {
      const update = related.find(isResultRelatedUpdate);
      const ops: Promise<void>[] = [];
      if (update) {
        ops.push(deps.clearResultsForJob(update.jobId));
        ops.push(
          deps.patchJobPrimaryAndAcceptance(
            update.jobId,
            update.primaryResultId,
            update.acceptanceLevel
          )
        );
      } else {
        ops.push(deps.invalidateResults());
      }
      await Promise.all(ops);
      return;
    }
  }

  if (event.resource === 'resume-version') {
    const versionData = event.data as Partial<ResumeVersionMetadata> | undefined;
    const resumeId = versionData?.resumeId;

    if (event.action === 'update') {
      if (!resumeId) {
        await deps.invalidateVersions();
        return;
      }
      const patches: Array<{ id: string } & Partial<ResumeVersionMetadata>> = [];
      if (event.data && isFullRow(event.data)) {
        patches.push(event.data as { id: string } & Partial<ResumeVersionMetadata>);
      }
      for (const row of fullRows) {
        patches.push(row as { id: string } & Partial<ResumeVersionMetadata>);
      }
      await Promise.all(patches.map((p) => deps.patchVersionsPage(p)));
      return;
    }
    if (event.action === 'setActive') {
      const resumeIds = new Set<string>();
      if (resumeId) resumeIds.add(resumeId);
      for (const row of fullRows) {
        const r = row as { resumeId?: unknown };
        if (typeof r.resumeId === 'string') resumeIds.add(r.resumeId);
      }
      if (resumeIds.size === 0) {
        await deps.invalidateVersions();
        return;
      }
      await Promise.all(Array.from(resumeIds).map((id) => deps.clearVersionsForResume(id)));
      return;
    }
    if (event.action === 'create' || event.action === 'branch' || event.action === 'delete') {
      const count = related.find(isResumeCount);
      const ops: Promise<void>[] = [];
      if (resumeId) {
        ops.push(deps.clearVersionsForResume(resumeId));
      } else {
        ops.push(deps.invalidateVersions());
      }
      if (count) {
        ops.push(deps.patchResumeCount(count.id, count.versionsCount));
      }
      await Promise.all(ops);
      return;
    }
  }
}
