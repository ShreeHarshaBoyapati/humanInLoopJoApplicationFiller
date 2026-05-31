import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type { PaginatedResultResponse, ResultDetail, ApiResponse } from '@repo/shared-types';

export const RESULT_KEYS = {
  all: ['results'] as const,
  lists: () => [...RESULT_KEYS.all, 'list'] as const,
  byJob: (jobId: string) => [...RESULT_KEYS.lists(), { jobId }] as const,
  detail: (resultId: string) => [...RESULT_KEYS.all, 'detail', resultId] as const,
};

// 10 minutes in milliseconds
const STALE_TIME = 10 * 60 * 1000;

export const useResults = (jobId: string, limit: number = 10, searchQuery: string = '') => {
  return useInfiniteQuery({
    queryKey: [...RESULT_KEYS.byJob(jobId), { search: searchQuery }],
    initialPageParam: 1,
    maxPages: 2,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<PaginatedResultResponse>>(
        `/job/${jobId}/results`,
        {
          params: { page: pageParam, limit, search: searchQuery || undefined },
        }
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch results');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: PaginatedResultResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedResultResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
    enabled: !!jobId,
    staleTime: STALE_TIME,
  });
};

export const useResultDetail = (resultId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: RESULT_KEYS.detail(resultId),
    queryFn: async () => {
      const response = await axiosInstance.get<ApiResponse<ResultDetail>>(`/result/${resultId}`);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch result detail');
      }
      return response.data.data;
    },
    enabled: enabled && !!resultId,
    staleTime: STALE_TIME,
  });
};
