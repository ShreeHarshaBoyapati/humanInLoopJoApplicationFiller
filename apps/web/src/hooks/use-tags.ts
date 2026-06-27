import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../utils/axios.ts';
import { EVENT_KEYS } from './use-events';
import type {
  ApiResponse,
  CreateTagInput,
  DeleteTagInput,
  Tag,
  TagList,
  UpdateTagInput,
} from '@repo/shared-types';

export const TAG_KEYS = {
  all: ['tags'] as const,
  lists: () => [...TAG_KEYS.all, 'list'] as const,
};

export interface UseTagsParams {
  search?: string;
  limit?: number;
}

export const useTags = (params: UseTagsParams = {}) => {
  const { search, limit = 50 } = params;
  return useQuery({
    queryKey: [...TAG_KEYS.lists(), { search: search ?? '', limit }],
    queryFn: async ({ signal }) => {
      try {
        const response = await axiosInstance.get<ApiResponse<TagList>>('/tag', {
          params: {
            search: search || undefined,
            limit,
          },
          signal,
        });
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to fetch tags');
        }
        return response.data.data;
      } catch (err) {
        if (axios.isCancel(err)) {
          throw new Error('Request was cancelled');
        }
        throw err;
      }
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

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTagInput) => {
      try {
        const response = await axiosInstance.post<ApiResponse<{ id: string }>>('/tag', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to create tag');
        }
        return response.data.data;
      } catch (err) {
        throw extractError(err, 'Failed to create tag');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_KEYS.lists() });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateTagInput) => {
      try {
        const response = await axiosInstance.put<ApiResponse<Tag>>('/tag', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to update tag');
        }
        return response.data.data;
      } catch (err) {
        throw extractError(err, 'Failed to update tag');
      }
    },
    onSuccess: (updatedTag: Tag) => {
      queryClient.setQueriesData({ queryKey: TAG_KEYS.lists() }, (oldData: TagList | undefined) => {
        if (!oldData) return oldData;
        return {
          tags: oldData.tags.map((t) => (t.id === updatedTag.id ? updatedTag : t)),
        };
      });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: DeleteTagInput) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
        const response = await axiosInstance.delete('/tag', {
          data,
          signal: controller.signal,
        });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete tag');
        }
        return data.id;
      } catch (err) {
        throw extractError(err, 'Failed to delete tag');
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: [...EVENT_KEYS.all, 'dots'], exact: false });
    },
  });
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);
  return { ...mutation, cancel };
};

const RESERVED_TASK_TAG = 'task';

export const useEnsureTaskTag = () => {
  const { data } = useTags({ limit: 200 });
  const createTag = useCreateTag();
  const ensuredRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (ensuredRef.current) return;
    if (!data) return;
    if (inFlightRef.current) return;
    if (createTag.isPending) return;
    const hasTask = data.tags.some((t) => t.name === RESERVED_TASK_TAG);
    if (hasTask) {
      ensuredRef.current = true;
      return;
    }
    ensuredRef.current = true;
    inFlightRef.current = true;
    createTag.mutate(
      { name: RESERVED_TASK_TAG },
      {
        onSettled: () => {
          inFlightRef.current = false;
        },
      }
    );
  }, [data, createTag]);
};
