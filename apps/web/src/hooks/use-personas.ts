import { useCallback, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../utils/axios.ts';
import type {
  Persona,
  CreatePersonaInput,
  UpdatePersonaInput,
  DeletePersonaInput,
  PaginatedPersonasResponse,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';

export const PERSONA_KEYS = {
  all: ['personas'] as const,
  lists: () => [...PERSONA_KEYS.all, 'list'] as const,
};

export type { PaginatedPersonasResponse };

export const usePersonas = (limit: number = 10, searchQuery: string = '') => {
  return useInfiniteQuery({
    queryKey: [...PERSONA_KEYS.lists(), { limit, search: searchQuery }],
    initialPageParam: 1,
    maxPages: 20,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<PaginatedPersonasResponse>>('/persona', {
        params: { page: pageParam, limit, search: searchQuery || undefined },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch personas');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: PaginatedPersonasResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedPersonasResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
  });
};

export const useCreatePersona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePersonaInput) => {
      try {
        const response = await axiosInstance.post<ApiResponse<Persona>>('/persona', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to create persona');
        }
        return response.data.data;
      } catch (err) {
        if (err && typeof err === 'object' && 'response' in err) {
          const error = err as { response: { data: ApiResponse<never> } };
          if (!error.response.data.success) {
            throw new Error(error.response.data.message);
          }
        }
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate all persona list queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: PERSONA_KEYS.lists() });
    },
  });
};

export const useUpdatePersona = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePersonaInput) => {
      try {
        const response = await axiosInstance.put<ApiResponse<Persona>>('/persona', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to update persona');
        }
        return response.data.data;
      } catch (err) {
        if (err && typeof err === 'object' && 'response' in err) {
          const error = err as { response: { data: ApiResponse<never> } };
          if (!error.response.data.success) {
            throw new Error(error.response.data.message);
          }
        }
        throw err;
      }
    },
    onSuccess: (updatedPersona: Persona) => {
      queryClient.setQueriesData(
        { queryKey: PERSONA_KEYS.lists() },
        (oldData: { pages: PaginatedPersonasResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages) return oldData;
          const updatedPages = oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((p: Persona) =>
              p.id === updatedPersona.id ? { ...p, ...updatedPersona } : p
            ),
          }));
          return {
            pages: updatedPages,
            pageParams: oldData.pageParams || updatedPages.map((_, index) => index + 1),
          };
        }
      );
    },
  });
};

export const useDeletePersona = () => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: DeletePersonaInput) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await axiosInstance.delete('/persona', {
          data,
          signal: controller.signal,
        });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete persona');
        }
        return data.id;
      } catch (err) {
        if (axios.isCancel(err)) {
          throw new Error('Delete request was cancelled');
        }
        if (err && typeof err === 'object' && 'response' in err) {
          const error = err as { response: { data: ApiResponse<never> } };
          if (!error.response.data.success) {
            throw new Error(error.response.data.message);
          }
        }
        throw err;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    onSuccess: () => {
      // Invalidate all persona list queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: PERSONA_KEYS.lists() });
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { ...mutation, cancel };
};
