import { useCallback, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { transitEncrypt } from '@repo/utils';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ApiKeyData,
  PaginatedApiKeysResponse,
  TestConnectionResponse,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';

const TRANSIT_SECRET: string =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_TRANSIT_SECRET ??
  'jfp-default-transit-secret-change-in-prod';

export const API_KEY_KEYS = {
  all: ['api-keys'] as const,
  lists: () => [...API_KEY_KEYS.all, 'list'] as const,
};

export type { PaginatedApiKeysResponse };

export interface CreateApiKeyInput {
  providerName: string;
  credentials: Record<string, string>;
  model: string;
}

export interface UpdateApiKeyInput extends CreateApiKeyInput {
  id: string;
}

export const useApiKeys = (limit: number = 10, searchQuery: string = '') => {
  return useInfiniteQuery({
    queryKey: [...API_KEY_KEYS.lists(), { limit, search: searchQuery }],
    initialPageParam: 1,
    maxPages: 3,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<PaginatedApiKeysResponse>>('/api-key', {
        params: { page: pageParam, limit, search: searchQuery || undefined },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch API keys');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: PaginatedApiKeysResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedApiKeysResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateApiKeyInput) => {
      try {
        const payload = await encryptCredentials(data);
        const response = await axiosInstance.post<ApiResponse>('/api-key', payload);
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to create API key');
        }
        return;
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
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
};

export const useUpdateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateApiKeyInput) => {
      try {
        const payload = await encryptCredentials(data);
        const response = await axiosInstance.post<ApiResponse>('/api-key', payload);
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to update API key');
        }
        return data;
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
    onSuccess: (updatedApiKey: UpdateApiKeyInput) => {
      queryClient.setQueriesData(
        { queryKey: API_KEY_KEYS.lists() },
        (oldData: { pages: PaginatedApiKeysResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages) return oldData;
          const patch = {
            provider: updatedApiKey.providerName,
            credentials: updatedApiKey.credentials,
            model: updatedApiKey.model,
          };
          const updatedPages = oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((k: ApiKeyData) =>
              k.id === updatedApiKey.id ? { ...k, ...patch } : k
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

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await axiosInstance.delete(`/api-key/${id}`, {
          signal: controller.signal,
        });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete API key');
        }
        return id;
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
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { ...mutation, cancel };
};

export const useSelectApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const response = await axiosInstance.put<ApiResponse<ApiKeyData>>(`/api-key/select/${id}`);
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to select API key');
        }
        return id;
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
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.lists() });
    },
  });
};

async function encryptCredentials(
  data: CreateApiKeyInput | UpdateApiKeyInput
): Promise<CreateApiKeyInput | UpdateApiKeyInput> {
  if (!data.credentials.apiKey) return data;

  const encryptedKey = await transitEncrypt(data.credentials.apiKey, TRANSIT_SECRET);
  return {
    ...data,
    credentials: { ...data.credentials, apiKey: encryptedKey },
  };
}

export const useTestConnection = () => {
  return useMutation({
    mutationFn: async (data: { providerName: string; credentials: Record<string, string> }) => {
      try {
        const encryptedKey = data.credentials.apiKey
          ? await transitEncrypt(data.credentials.apiKey, TRANSIT_SECRET)
          : undefined;
        const payload = {
          ...data,
          credentials: encryptedKey
            ? { ...data.credentials, apiKey: encryptedKey }
            : data.credentials,
        };
        const response = await axiosInstance.post<ApiResponse<TestConnectionResponse>>(
          '/api-key/test-connection',
          payload
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to test connection');
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
  });
};
