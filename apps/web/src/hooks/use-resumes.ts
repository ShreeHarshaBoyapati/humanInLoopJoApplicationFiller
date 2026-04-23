import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ResumeMetadata,
  CreateResumeParams,
  UpdateResumeParams,
  DeleteResumeParams,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';

const RESUME_KEYS = {
  all: ['resumes'] as const,
  lists: () => [...RESUME_KEYS.all, 'list'] as const,
  byPersona: (personaId: string) => [...RESUME_KEYS.lists(), { personaId }] as const,
};

export interface PaginatedResumeResponse {
  items: ResumeMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useResumes = (personaId: string, limit: number = 10, searchQuery: string = '') => {
  return useInfiniteQuery({
    queryKey: [...RESUME_KEYS.byPersona(personaId), { search: searchQuery }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<PaginatedResumeResponse>>('/resume', {
        params: { page: pageParam, limit, personaId, search: searchQuery || undefined },
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch resumes');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: PaginatedResumeResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedResumeResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
    enabled: !!personaId,
  });
};

export const useDeleteResume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteResumeParams) => {
      const response = await axiosInstance.delete('/resume', { data });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete resume');
      }
      return data.id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.setQueriesData(
        { queryKey: RESUME_KEYS.lists() },
        (oldData: { pages: PaginatedResumeResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages || oldData.pages.length === 0) return oldData;

          const firstPage = oldData.pages[0];
          if (!firstPage) return oldData;

          const limit = firstPage.limit;

          // Collect all items from all pages
          const allItems = oldData.pages.flatMap((page) => page.items);

          // Check if the deleted resume was active
          const deletedWasActive = allItems.some((r) => r.id === deletedId && r.active);

          // Filter out the deleted resume
          const remainingItems = allItems.filter((r) => r.id !== deletedId);

          // Calculate new total and totalPages
          const newTotal = Math.max(0, firstPage.total - 1);
          const newTotalPages = Math.ceil(newTotal / limit) || 1;

          // Re-paginate the remaining items
          const newPages: PaginatedResumeResponse[] = [];
          for (let pageNum = 1; pageNum <= newTotalPages; pageNum++) {
            const start = (pageNum - 1) * limit;
            const end = start + limit;
            const pageItems = remainingItems.slice(start, end);

            // If this is the first page and deleted was active, set the first item as active
            const updatedPageItems = pageItems.map((item, index) => ({
              ...item,
              active: deletedWasActive && pageNum === 1 && index === 0 ? true : item.active,
            }));

            newPages.push({
              ...firstPage,
              page: pageNum,
              items: updatedPageItems,
              total: newTotal,
              totalPages: newTotalPages,
            });
          }

          return { pages: newPages, pageParams: newPages.map((_, index) => index + 1) };
        }
      );
    },
  });
};

export const useSetActiveResume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.post<ApiResponse<ResumeMetadata>>('/resume/set-active', {
        id,
      });
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to set active resume');
      }
      return response.data.data;
    },
    onSuccess: (activeResume: ResumeMetadata) => {
      queryClient.setQueriesData(
        { queryKey: RESUME_KEYS.lists() },
        (oldData: { pages: PaginatedResumeResponse[]; pageParams?: number[] } | undefined) => {
          if (!oldData?.pages) return oldData;
          const updatedPages = oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((r) => ({
              ...r,
              active: r.id === activeResume.id,
            })),
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
