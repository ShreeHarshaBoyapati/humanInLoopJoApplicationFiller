import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ResumeMetadata,
  CreateResumeParams,
  DeleteResumeParams,
  SetActiveResumeParams,
  PaginatedResumeResponse,
  PaginatedResumeListItem,
  ResumeData,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';

const RESUME_KEYS = {
  all: ['resumes'] as const,
  lists: () => [...RESUME_KEYS.all, 'list'] as const,
  byPersona: (personaId: string) => [...RESUME_KEYS.lists(), { personaId }] as const,
};

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
      try {
        const response = await axiosInstance.delete('/resume', { data });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete resume');
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
    onSuccess: (data: DeleteResumeParams) => {
      const { id: deletedId, personaId } = data;

      // Get all cached resume list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: RESUME_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on personaId match
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same persona
        const personaIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'personaId' in k
        ) as { personaId: string } | undefined;

        const personaIdFromQuery = personaIdParam?.personaId;
        const personaMatches = !personaIdFromQuery || personaId === personaIdFromQuery;

        if (!personaMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedResumeResponse[]; pageParams?: number[] };

        if (!cacheData.pages || cacheData.pages.length === 0) return;

        const firstPage = cacheData.pages[0];
        if (!firstPage) return;

        const limit = firstPage.limit;

        // Collect all items from all pages
        const allItems = cacheData.pages.flatMap((page) => page.items);

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

        queryClient.setQueryData(queryKey, {
          pages: newPages,
          pageParams: newPages.map((_, index) => index + 1),
        });
      });
    },
  });
};

export const useSetActiveResume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetActiveResumeParams) => {
      try {
        const response = await axiosInstance.post<ApiResponse<ResumeMetadata>>(
          '/resume/set-active',
          {
            id: data.id,
          }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to set active resume');
        }
        return { resume: response.data.data, personaId: data.personaId };
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
    onSuccess: ({ resume: activeResume, personaId }) => {
      // Get all cached resume list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: RESUME_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on personaId match
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same persona
        const personaIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'personaId' in k
        ) as { personaId: string } | undefined;

        const personaIdFromQuery = personaIdParam?.personaId;
        const personaMatches = !personaIdFromQuery || personaId === personaIdFromQuery;

        if (!personaMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedResumeResponse[]; pageParams?: number[] };

        if (!cacheData.pages) return;

        const updatedPages = cacheData.pages.map((page) => ({
          ...page,
          items: page.items.map((r) => ({
            ...r,
            active: r.id === activeResume.id,
          })),
        }));

        queryClient.setQueryData(queryKey, {
          pages: updatedPages,
          pageParams: cacheData.pageParams || updatedPages.map((_, index) => index + 1),
        });
      });
    },
  });
};

export const useCreateResume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateResumeParams) => {
      try {
        const response = await axiosInstance.post<
          ApiResponse<ResumeMetadata & { fileSize: number }>
        >('/resume', data);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to create resume');
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
    onSuccess: (result: ResumeMetadata & { fileSize: number }, variables: CreateResumeParams) => {
      const { fileSize } = result;
      const { personaId } = variables;

      // Create the new list item immediately from the API response
      const newListItem: PaginatedResumeListItem = {
        id: result.id,
        fileName: result.fileName,
        active: result.active,
        versionsCount: 1,
        activeVersionFileSize: fileSize,
        updatedAt: result.updatedAt,
      };

      // Get all cached resume list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: RESUME_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on whether the new resume matches its search
      cachedQueries.forEach(([queryKey, data]) => {
        // Check if this query is for the same persona
        const personaIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'personaId' in k
        ) as { personaId: string } | undefined;

        const searchParams = queryKey.find((k) => k && typeof k === 'object' && 'search' in k) as
          | { search?: string }
          | undefined;
        const searchQuery = searchParams?.search ?? '';

        // Check if resume matches the search query
        const matchesSearch =
          !searchQuery || result.fileName.toLowerCase().includes(searchQuery.toLowerCase());

        // If there's a personaId in the query, check if it matches the new resume's personaId
        // If there's no personaId in the query (shouldn't happen normally), allow the update
        const personaIdFromQuery = personaIdParam?.personaId;
        const personaMatches = !personaIdFromQuery || personaId === personaIdFromQuery;

        // Handle the case when data is null or has no pages (initial state)
        if (!data || typeof data !== 'object') {
          if (personaMatches && matchesSearch) {
            queryClient.setQueryData(queryKey, {
              pages: [
                {
                  items: [newListItem],
                  total: 1,
                  totalPages: 1,
                  limit: 10,
                  page: 1,
                },
              ],
              pageParams: [1],
            });
          }
          return;
        }

        const cacheData = data as { pages?: PaginatedResumeResponse[]; pageParams?: number[] };

        // Handle empty pages array or pages with no items
        if (
          !cacheData.pages ||
          cacheData.pages.length === 0 ||
          (cacheData.pages[0] && cacheData.pages[0].total === 0)
        ) {
          if (personaMatches && matchesSearch) {
            queryClient.setQueryData(queryKey, {
              pages: [
                {
                  items: [newListItem],
                  total: 1,
                  totalPages: 1,
                  limit: cacheData.pages?.[0]?.limit ?? 10,
                  page: 1,
                },
              ],
              pageParams: [1],
            });
          }
          return;
        }

        const firstPage = cacheData.pages[0];
        if (!firstPage) return;

        if (!matchesSearch) return;
        if (!personaMatches) return;
        const limit = firstPage.limit;

        // Collect all items from all pages
        const allItems = cacheData.pages.flatMap((page) => page.items);

        // Check if there's an active resume in the list
        const hasActiveResume = allItems.some((r) => r.active);

        let updatedItems: PaginatedResumeListItem[];

        if (searchQuery) {
          // If there's a search query, add new resume at the front
          updatedItems = [newListItem, ...allItems];
        } else if (!hasActiveResume) {
          // No active resume exists, add new resume at the front
          updatedItems = [newListItem, ...allItems];
        } else {
          // An active resume exists, add new resume after the active one
          const activeIndex = allItems.findIndex((r) => r.active);
          const newItems = [...allItems];
          newItems.splice(activeIndex + 1, 0, newListItem);
          updatedItems = newItems;
        }

        // Calculate new total and totalPages
        const newTotal = firstPage.total + 1;
        const newTotalPages = Math.ceil(newTotal / limit) || 1;

        // Re-paginate the items
        const newPages: PaginatedResumeResponse[] = [];
        for (let pageNum = 1; pageNum <= newTotalPages; pageNum++) {
          const start = (pageNum - 1) * limit;
          const end = start + limit;
          const pageItems = updatedItems.slice(start, end);

          newPages.push({
            ...firstPage,
            page: pageNum,
            items: pageItems,
            total: newTotal,
            totalPages: newTotalPages,
          });
        }
        console.log('adding to the query key===>>', queryKey);
        queryClient.setQueryData(queryKey, {
          pages: newPages,
          pageParams: newPages.map((_, index) => index + 1),
        });
      });
    },
  });
};

export interface ParseResumeResponse {
  success: boolean;
  message: string;
  data?: ResumeData;
}

export const useParseResumeFile = () => {
  return useMutation({
    mutationFn: async (params: { file: File; signal?: AbortSignal }) => {
      try {
        const { file, signal } = params;
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post<ParseResumeResponse>(
          '/resume/versions/parse-file',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            signal,
          }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to parse resume file');
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

export interface UpdateResumeParamsWithPersona {
  id: string;
  fileName: string;
  personaId: string;
}

export const useUpdateResume = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateResumeParamsWithPersona) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { personaId, ...apiData } = data;
        const response = await axiosInstance.put<ApiResponse<ResumeMetadata>>('/resume', apiData);
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to update resume');
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
    onSuccess: (updatedResume: ResumeMetadata, variables: UpdateResumeParamsWithPersona) => {
      // Get all cached resume list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: RESUME_KEYS.lists(),
        exact: false,
      });

      // Update each cached query with the new fileName based on personaId
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same persona
        const personaIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'personaId' in k
        ) as { personaId: string } | undefined;

        const personaIdFromQuery = personaIdParam?.personaId;
        const personaMatches = !personaIdFromQuery || personaIdFromQuery === variables.personaId;

        if (!personaMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedResumeResponse[]; pageParams?: number[] };

        if (!cacheData.pages || cacheData.pages.length === 0) return;

        const updatedPages = cacheData.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === updatedResume.id ? { ...item, fileName: updatedResume.fileName } : item
          ),
        }));

        queryClient.setQueryData(queryKey, {
          pages: updatedPages,
          pageParams: cacheData.pageParams,
        });
      });
    },
  });
};
