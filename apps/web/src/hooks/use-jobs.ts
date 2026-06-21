import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../utils/axios.ts';
import { EVENT_KEYS } from './use-events.ts';
import type {
  Job,
  ApiResponse,
  JobList,
  PaginatedJobsResponse,
  UseJobsParams,
  CreateJobInput,
  UpdateJobInput,
  DeleteJobInput,
} from '@repo/shared-types';

export const JOB_KEYS = {
  all: ['jobs'] as const,
  lists: () => [...JOB_KEYS.all, 'list'] as const,
};

const ACTIVE_STATUSES = ['draft', 'applied', 'interview'];

export const requiresListInvalidation = (previousStatus?: string, newStatus?: string): boolean => {
  if (!previousStatus || !newStatus || previousStatus === newStatus) return false;

  const previousIsActive = ACTIVE_STATUSES.includes(previousStatus);
  const newIsActive = ACTIVE_STATUSES.includes(newStatus);

  return previousIsActive !== newIsActive;
};

export const getStatusTransitionMessage = (
  previousStatus?: string,
  newStatus?: string
): string | null => {
  if (!previousStatus || !newStatus || previousStatus === newStatus) return null;

  const previousIsActive = ACTIVE_STATUSES.includes(previousStatus);
  const newIsActive = ACTIVE_STATUSES.includes(newStatus);

  if (previousIsActive && !newIsActive) {
    return 'Job moved to Archived';
  }
  if (!previousIsActive && newIsActive) {
    return 'Job moved to Active';
  }
  return null;
};

export const useJobs = (params: UseJobsParams = {}) => {
  const { limit = 10, searchQuery = '', status, persona, favorite, sortBy, sortOrder, id } = params;

  return useInfiniteQuery({
    queryKey: [
      ...JOB_KEYS.lists(),
      { search: searchQuery, status, persona, favorite, sortBy, sortOrder, id },
    ],
    initialPageParam: 1,
    maxPages: 3,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<JobList>>('/job', {
        params: {
          page: pageParam,
          limit,
          search: searchQuery || undefined,
          status: status || undefined,
          persona: persona || undefined,
          favorite: favorite !== undefined ? favorite : undefined,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
          id: id || undefined,
        },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch jobs');
      }
      // Transform JobList to PaginatedJobsResponse
      const jobList = response.data.data;
      return {
        items: jobList.jobs,
        page: jobList.pagination.page,
        limit: jobList.pagination.limit,
        total: jobList.pagination.total,
        totalPages: jobList.pagination.totalPages,
        hasNextPage: jobList.pagination.hasNextPage,
        hasPrevPage: jobList.pagination.hasPrevPage,
      } as PaginatedJobsResponse;
    },
    getNextPageParam: (lastPage: PaginatedJobsResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedJobsResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJobInput) => {
      try {
        const response = await axiosInstance.post<ApiResponse<{ id: string }>>('/job', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to create job');
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
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.lists() });
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateJobInput) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { invalidateQueries: _invalidate, previousStatus: _previousStatus, ...apiData } = data;
      try {
        const response = await axiosInstance.put<ApiResponse<Job>>('/job', apiData);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to update job');
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
    onSuccess: (updatedJob: Job, variables: UpdateJobInput) => {
      const shouldInvalidate =
        variables.invalidateQueries ||
        requiresListInvalidation(variables.previousStatus, variables.status);

      if (shouldInvalidate) {
        queryClient.invalidateQueries({ queryKey: JOB_KEYS.lists() });
      } else {
        queryClient.setQueriesData(
          { queryKey: JOB_KEYS.lists() },
          (oldData: { pages: PaginatedJobsResponse[]; pageParams?: number[] } | undefined) => {
            if (!oldData?.pages) return oldData;
            const updatedPages = oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((job: Job) => (job.id === updatedJob.id ? updatedJob : job)),
            }));

            return {
              pages: updatedPages,
              pageParams: oldData.pageParams || updatedPages.map((_, index) => index + 1),
            };
          }
        );
      }

      queryClient.invalidateQueries({
        queryKey: [...EVENT_KEYS.lists(), { jobId: updatedJob.id }],
      });
      queryClient.invalidateQueries({
        queryKey: [...EVENT_KEYS.all, 'dots', { jobId: updatedJob.id }],
      });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: DeleteJobInput) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await axiosInstance.delete('/job', {
          data,
          signal: controller.signal,
        });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete job');
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
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.lists() });
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { ...mutation, cancel };
};

function findJobInCache(queryClient: ReturnType<typeof useQueryClient>, jobId: string): Job | null {
  const entries = queryClient.getQueriesData<{ pages: PaginatedJobsResponse[] }>({
    queryKey: JOB_KEYS.lists(),
    exact: false,
  });
  for (const [, data] of entries) {
    if (!data?.pages) continue;
    for (const page of data.pages) {
      const match = page.items.find((job) => job.id === jobId);
      if (match) return match;
    }
  }
  return null;
}

export function useJobFromCache(jobId: string | undefined, initialJob: Job | null): Job | null {
  const queryClient = useQueryClient();

  return useSyncExternalStore(
    (callback) => {
      const unsubscribe = queryClient.getQueryCache().subscribe(callback);
      return () => unsubscribe();
    },
    () => (jobId ? (findJobInCache(queryClient, jobId) ?? initialJob) : initialJob),
    () => initialJob
  );
}
