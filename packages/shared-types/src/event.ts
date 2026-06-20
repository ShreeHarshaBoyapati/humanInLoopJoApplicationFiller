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

export const STATUS_PSEUDO_COLOR = '#9ca3af';

export interface StatusPseudoEvent {
  date: string;
  status: string;
  color: string;
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

export interface EventDotsDate {
  date: string;
  tagColor: string[];
}

export interface EventDotsResponse {
  dates: EventDotsDate[];
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
