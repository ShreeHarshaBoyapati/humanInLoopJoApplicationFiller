import type { Job } from './job.js';
import type { PaginatedResultListItem } from './result.js';
import type { Persona } from './persona.js';
import type { ResumeMetadata, ResumeVersionMetadata } from './resume.js';

export type RealtimeResource = 'persona' | 'resume' | 'resume-version' | 'job' | 'result';

export type RealtimeAction = 'update' | 'setActive' | 'create' | 'branch' | 'delete';

export interface ResourceChangedEvent<T = unknown> {
  type: 'resource.changed';
  resource: RealtimeResource;
  action: RealtimeAction;
  id: string;
  data?: T;
  related?: T[];
}

export type PersonaChangedEvent = ResourceChangedEvent<Persona>;
export type ResumeChangedEvent = ResourceChangedEvent<ResumeMetadata>;
export type ResumeVersionChangedEvent = ResourceChangedEvent<ResumeVersionMetadata>;
export type JobChangedEvent = ResourceChangedEvent<Job>;
export type ResultChangedEvent = ResourceChangedEvent<PaginatedResultListItem>;

export interface HelloEvent {
  type: 'hello';
  userId: string;
  peerCount: number;
}

export type ServerEvent = HelloEvent | ResourceChangedEvent;
