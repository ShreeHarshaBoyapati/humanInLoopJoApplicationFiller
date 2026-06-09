export type RealtimeResource = 'persona' | 'resume' | 'resume-version';

export type RealtimeAction = 'update' | 'setActive' | 'create' | 'branch' | 'delete';

export interface ResourceChangedEvent<T = unknown> {
  type: 'resource.changed';
  resource: RealtimeResource;
  action: RealtimeAction;
  id: string;
  data?: T;
}

export interface HelloEvent {
  type: 'hello';
  userId: string;
  peerCount: number;
}

export type ServerEvent = HelloEvent | ResourceChangedEvent;
