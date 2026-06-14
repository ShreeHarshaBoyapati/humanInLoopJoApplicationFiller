export type EventField =
  | 'id'
  | 'title'
  | 'description'
  | 'date'
  | 'time'
  | 'tagId'
  | 'jobId'
  | 'isCompleted'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  tagId: string | null;
  jobId: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusPseudoEvent {
  date: string;
  status: string;
  color: 'STATUS_PSEUDO';
}

export interface EventPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface EventList {
  events: Event[];
  pagination: EventPagination;
  statusPseudoEvents?: StatusPseudoEvent[];
}

export interface EventDotsTag {
  id: string;
  name: string;
  color: string;
}

export interface EventDotsResponse {
  tags: EventDotsTag[];
  dates: string[];
  statusPseudoEvents?: StatusPseudoEvent[];
}

export interface CreateEventInput {
  title: string;
  description?: string;
  date: string;
  time?: string | null;
  tagId: string;
  jobId?: string | null;
}

export interface UpdateEventInput {
  id: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string | null;
  tagId?: string;
  jobId?: string | null;
  isCompleted?: boolean;
}

export interface DeleteEventInput {
  id: string;
}

export interface GetEventsParams {
  mode?: 'list' | 'dots';
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  tagId?: string;
  jobId?: string;
  includeCompleted?: boolean;
  select?: string;
}
