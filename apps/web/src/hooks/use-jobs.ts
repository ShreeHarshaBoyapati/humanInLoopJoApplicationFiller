import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
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

const JOB_KEYS = {
  all: ['jobs'] as const,
  lists: () => [...JOB_KEYS.all, 'list'] as const,
};

export const useJobs = (params: UseJobsParams = {}) => {
  const { limit = 10, searchQuery = '', status, persona, favorite, sortBy, sortOrder } = params;

  return useInfiniteQuery({
    queryKey: [
      ...JOB_KEYS.lists(),
      { search: searchQuery, status, persona, favorite, sortBy, sortOrder },
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
      try {
        const response = await axiosInstance.put<ApiResponse<Job>>('/job', data);
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
    onSuccess: (updatedJob: Job) => {
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
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteJobInput) => {
      try {
        const response = await axiosInstance.delete('/job', { data });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete job');
        }
        return data.id;
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
