import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ApiResponse,
  CreateEventInput,
  DeleteEventInput,
  Event,
  EventDotsResponse,
  EventList,
  GetEventsParams,
  UpdateEventInput,
} from '@repo/shared-types';

export const EVENT_KEYS = {
  all: ['events'] as const,
  lists: () => [...EVENT_KEYS.all, 'list'] as const,
  dots: (params: Record<string, unknown>) => [...EVENT_KEYS.all, 'dots', params] as const,
};

export interface UseEventsListParams {
  mode?: 'list';
  limit?: number;
  from?: string;
  to?: string;
  tagId?: string;
  jobId?: string;
  includeCompleted?: boolean;
}

export interface UseEventDotsParams {
  mode: 'dots';
  from?: string;
  to?: string;
  tagId?: string;
  jobId?: string;
  includeCompleted?: boolean;
}

export const useEvents = (params: UseEventsListParams = {}) => {
  const { limit = 20, from, to, tagId, jobId, includeCompleted = true } = params;

  const query = useInfiniteQuery({
    queryKey: [...EVENT_KEYS.lists(), { from, to, tagId, jobId, includeCompleted, limit }],
    initialPageParam: 1,
    maxPages: 5,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<EventList>>('/event', {
        params: {
          mode: 'list',
          page: pageParam,
          limit,
          from: from || undefined,
          to: to || undefined,
          tagId: tagId || undefined,
          jobId: jobId || undefined,
          includeCompleted,
        },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch events');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: EventList) => {
      if (!lastPage.pagination.hasNextPage) return undefined;
      return lastPage.pagination.page + 1;
    },
    getPreviousPageParam: (firstPage: EventList) => {
      if (!firstPage.pagination.hasPrevPage) return undefined;
      return firstPage.pagination.page - 1;
    },
  });

  const events = useMemo(() => {
    if (!query.data) return [] as Event[];
    return query.data.pages.flatMap((page) => page.events);
  }, [query.data]);

  const statusPseudoEvents = useMemo(() => {
    if (!query.data) return undefined;
    for (const page of query.data.pages) {
      if (page.statusPseudoEvents && page.statusPseudoEvents.length > 0) {
        return page.statusPseudoEvents;
      }
    }
    return undefined;
  }, [query.data]);

  return {
    ...query,
    events,
    statusPseudoEvents,
  };
};

export const useEventDots = (params: UseEventDotsParams) => {
  const { from, to, tagId, jobId, includeCompleted = true } = params;
  return useQuery({
    queryKey: EVENT_KEYS.dots({ from, to, tagId, jobId, includeCompleted }),
    queryFn: async () => {
      const response = await axiosInstance.get<ApiResponse<EventDotsResponse>>('/event', {
        params: {
          mode: 'dots',
          from: from || undefined,
          to: to || undefined,
          tagId: tagId || undefined,
          jobId: jobId || undefined,
          includeCompleted,
        },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch event dots');
      }
      return response.data.data;
    },
  });
};

function extractError(err: unknown, fallback: string): Error {
  if (axios.isCancel(err)) {
    return new Error('Request was cancelled');
  }
  if (err && typeof err === 'object' && 'response' in err) {
    const error = err as { response: { data: ApiResponse<never> } };
    if (error.response?.data && !error.response.data.success) {
      return new Error(error.response.data.message);
    }
  }
  if (err instanceof Error) return err;
  return new Error(fallback);
}

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      try {
        const response = await axiosInstance.post<ApiResponse<{ id: string }>>('/event', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to create event');
        }
        return response.data.data;
      } catch (err) {
        throw extractError(err, 'Failed to create event');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateEventInput) => {
      try {
        const response = await axiosInstance.put<ApiResponse<Event>>('/event', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to update event');
        }
        return response.data.data;
      } catch (err) {
        throw extractError(err, 'Failed to update event');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DeleteEventInput) => {
      try {
        const response = await axiosInstance.delete('/event', { data });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete event');
        }
        return data.id;
      } catch (err) {
        throw extractError(err, 'Failed to delete event');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'] });
    },
  });
};

export type { GetEventsParams, EventDotsResponse, EventList };
