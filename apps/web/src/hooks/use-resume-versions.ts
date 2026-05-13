import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ResumeVersionMetadata,
  PaginatedVersionResponse,
  CompareVersionsResponse,
  ResumeData,
  ViewDocumentResponse,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';

const VERSION_KEYS = {
  all: ['versions'] as const,
  lists: () => [...VERSION_KEYS.all, 'list'] as const,
  byResume: (resumeId: string) => [...VERSION_KEYS.lists(), { resumeId }] as const,
};

export const useResumeVersions = (
  resumeId: string,
  limit: number = 10,
  searchQuery: string = ''
) => {
  return useInfiniteQuery({
    queryKey: [...VERSION_KEYS.byResume(resumeId), { search: searchQuery }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await axiosInstance.get<ApiResponse<PaginatedVersionResponse>>(
        `/resume/${resumeId}/versions`,
        {
          params: { page: pageParam, limit, search: searchQuery || undefined },
        }
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch versions');
      }
      return response.data.data;
    },
    getNextPageParam: (lastPage: PaginatedVersionResponse) => {
      if (lastPage.page >= lastPage.totalPages) return undefined;
      return lastPage.page + 1;
    },
    getPreviousPageParam: (firstPage: PaginatedVersionResponse) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
    enabled: !!resumeId,
  });
};

export interface DeleteVersionParams {
  resumeId: string;
  versionId: string;
}

export const useDeleteVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteVersionParams) => {
      try {
        const response = await axiosInstance.delete(
          `/resume/${data.resumeId}/versions/${data.versionId}`,
          { data: { id: data.resumeId, versionId: data.versionId } }
        );
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete version');
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
    onSuccess: (data: DeleteVersionParams) => {
      const { versionId: deletedId, resumeId } = data;

      // Get all cached version list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: VERSION_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on resumeId match
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same resume
        const resumeIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'resumeId' in k
        ) as { resumeId: string } | undefined;

        const resumeIdFromQuery = resumeIdParam?.resumeId;
        const resumeMatches = !resumeIdFromQuery || resumeId === resumeIdFromQuery;

        if (!resumeMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedVersionResponse[]; pageParams?: number[] };

        if (!cacheData.pages || cacheData.pages.length === 0) return;

        const firstPage = cacheData.pages[0];
        if (!firstPage) return;

        const limit = firstPage.limit;

        // Collect all items from all pages
        const allItems = cacheData.pages.flatMap((page) => page.items);

        // Check if the deleted version was active
        const deletedWasActive = allItems.some((v) => v.id === deletedId && v.active);

        // Filter out the deleted version
        const remainingItems = allItems.filter((v) => v.id !== deletedId);

        // Calculate new total and totalPages
        const newTotal = Math.max(0, firstPage.total - 1);
        const newTotalPages = Math.ceil(newTotal / limit) || 1;

        // Re-paginate the remaining items
        const newPages: PaginatedVersionResponse[] = [];
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

export interface SetActiveVersionParams {
  resumeId: string;
  versionId: string;
}

export const useSetActiveVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetActiveVersionParams) => {
      try {
        const response = await axiosInstance.post<ApiResponse<ResumeVersionMetadata>>(
          `/resume/${data.resumeId}/versions/${data.versionId}/set-active`,
          { id: data.resumeId, versionId: data.versionId }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to set active version');
        }
        return { version: response.data.data, resumeId: data.resumeId };
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
    onSuccess: ({ version: activeVersion, resumeId }) => {
      // Get all cached version list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: VERSION_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on resumeId match
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same resume
        const resumeIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'resumeId' in k
        ) as { resumeId: string } | undefined;

        const resumeIdFromQuery = resumeIdParam?.resumeId;
        const resumeMatches = !resumeIdFromQuery || resumeId === resumeIdFromQuery;

        if (!resumeMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedVersionResponse[]; pageParams?: number[] };

        if (!cacheData.pages) return;

        const updatedPages = cacheData.pages.map((page) => ({
          ...page,
          items: page.items.map((v) => ({
            ...v,
            active: v.id === activeVersion.id,
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

export interface BranchVersionParams {
  resumeId: string;
  versionId: string;
  newFileName: string;
  commit?: string;
}

export const useBranchVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BranchVersionParams) => {
      try {
        const response = await axiosInstance.post<
          ApiResponse<{
            resume: {
              id: string;
              fileName: string;
              active: boolean;
              createdAt: Date;
              updatedAt: Date;
            };
            version: ResumeVersionMetadata;
          }>
        >(`/resume/${data.resumeId}/versions/${data.versionId}/branch`, {
          id: data.resumeId,
          versionId: data.versionId,
          newFileName: data.newFileName,
          commit: data.commit || undefined,
        });
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to branch version');
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
      // Invalidate resumes list to show the new branched resume
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
};

export interface CompareVersionsParams {
  resumeId: string;
  versionA: string;
  versionB: string;
}

export const useCompareVersions = () => {
  return useMutation({
    mutationFn: async (data: CompareVersionsParams) => {
      try {
        const response = await axiosInstance.post<ApiResponse<CompareVersionsResponse>>(
          `/resume/${data.resumeId}/versions/compare`,
          {
            id: data.resumeId,
            versionA: data.versionA,
            versionB: data.versionB,
          }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to compare versions');
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

export const useViewParsedData = () => {
  return useMutation({
    mutationFn: async (data: { resumeId: string; versionId: string }) => {
      try {
        const response = await axiosInstance.get<ApiResponse<ResumeData>>(
          `/resume/${data.resumeId}/versions/${data.versionId}/parsed`
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to get parsed data');
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

export interface CreateVersionParams {
  resumeId: string;
  file: { name: string; type: string; size: number; base64: string };
  keywords?: string[];
  parsedData?: ResumeData;
  comment?: string;
}

export const useCreateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVersionParams) => {
      try {
        const formData = new FormData();
        formData.append('id', data.resumeId);
        formData.append(
          'file',
          new Blob([Uint8Array.from(atob(data.file.base64), (c) => c.charCodeAt(0))], {
            type: data.file.type,
          }),
          data.file.name
        );
        if (data.keywords && data.keywords.length > 0) {
          formData.append('keywords', JSON.stringify(data.keywords));
        }
        if (data.parsedData) {
          formData.append('parsedData', JSON.stringify(data.parsedData));
        }
        if (data.comment) {
          formData.append('comment', data.comment);
        }

        const response = await axiosInstance.post<ApiResponse<ResumeVersionMetadata>>(
          `/resume/${data.resumeId}/versions`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to create version');
        }
        return { version: response.data.data, resumeId: data.resumeId };
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
    onSuccess: ({ version: newVersion, resumeId }) => {
      // Get all cached version list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: VERSION_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on resumeId match
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same resume
        const resumeIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'resumeId' in k
        ) as { resumeId: string } | undefined;

        const searchParams = queryKey.find((k) => k && typeof k === 'object' && 'search' in k) as
          | { search?: string }
          | undefined;

        const resumeIdFromQuery = resumeIdParam?.resumeId;
        const resumeMatches = !resumeIdFromQuery || resumeId === resumeIdFromQuery;

        // Check if version matches the search query
        const searchQuery = searchParams?.search ?? '';
        const matchesSearch =
          !searchQuery || newVersion.versionName.toLowerCase().includes(searchQuery.toLowerCase());

        if (!resumeMatches) return;

        // Handle the case when data is null or has no pages (initial state)
        if (!oldData || typeof oldData !== 'object') {
          if (matchesSearch) {
            queryClient.setQueryData(queryKey, {
              pages: [
                {
                  items: [newVersion],
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

        const cacheData = oldData as { pages?: PaginatedVersionResponse[]; pageParams?: number[] };

        // Handle empty pages array or pages with no items
        if (
          !cacheData.pages ||
          cacheData.pages.length === 0 ||
          (cacheData.pages[0] && cacheData.pages[0].total === 0)
        ) {
          if (matchesSearch) {
            queryClient.setQueryData(queryKey, {
              pages: [
                {
                  items: [newVersion],
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

        if (!matchesSearch) return;

        const firstPage = cacheData.pages[0];
        if (!firstPage) return;

        const limit = firstPage.limit;

        // Collect all items from all pages
        const allItems = cacheData.pages.flatMap((page) => page.items);

        // Add new version at the front (newest first)
        const updatedItems = [newVersion, ...allItems];

        // Calculate new total and totalPages
        const newTotal = firstPage.total + 1;
        const newTotalPages = Math.ceil(newTotal / limit) || 1;

        // Re-paginate the items
        const newPages: PaginatedVersionResponse[] = [];
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

        queryClient.setQueryData(queryKey, {
          pages: newPages,
          pageParams: newPages.map((_, index) => index + 1),
        });
      });
    },
  });
};

export interface UpdateVersionParams {
  resumeId: string;
  versionId: string;
  file?: { name: string; type: string; size: number; base64: string };
  keywords?: string[];
  parsedData?: ResumeData;
  comment?: string;
}

export const useUpdateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateVersionParams) => {
      try {
        // If file is provided, use FormData for file upload
        if (data.file) {
          const formData = new FormData();
          formData.append('id', data.resumeId);
          formData.append('versionId', data.versionId);
          formData.append(
            'file',
            new Blob([Uint8Array.from(atob(data.file.base64), (c) => c.charCodeAt(0))], {
              type: data.file.type,
            }),
            data.file.name
          );
          if (data.keywords && data.keywords.length > 0) {
            formData.append('keywords', JSON.stringify(data.keywords));
          }
          if (data.parsedData) {
            formData.append('parsedData', JSON.stringify(data.parsedData));
          }
          if (data.comment) {
            formData.append('comment', data.comment);
          }

          const response = await axiosInstance.put<ApiResponse<ResumeVersionMetadata>>(
            `/resume/${data.resumeId}/versions/${data.versionId}`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
          if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || 'Failed to update version');
          }
          return { version: response.data.data, resumeId: data.resumeId };
        }

        // No file, use regular JSON payload
        const response = await axiosInstance.put<ApiResponse<ResumeVersionMetadata>>(
          `/resume/${data.resumeId}/versions/${data.versionId}`,
          {
            id: data.resumeId,
            versionId: data.versionId,
            keywords: data.keywords,
            parsedData: data.parsedData,
            comment: data.comment,
          }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to update version');
        }
        return { version: response.data.data, resumeId: data.resumeId };
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
    onSuccess: ({ version: updatedVersion, resumeId }) => {
      // Get all cached version list queries
      const cachedQueries = queryClient.getQueriesData({
        queryKey: VERSION_KEYS.lists(),
        exact: false,
      });

      // Update each cached query based on resumeId match
      cachedQueries.forEach(([queryKey, oldData]) => {
        // Check if this query is for the same resume
        const resumeIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'resumeId' in k
        ) as { resumeId: string } | undefined;

        const resumeIdFromQuery = resumeIdParam?.resumeId;
        const resumeMatches = !resumeIdFromQuery || resumeId === resumeIdFromQuery;

        if (!resumeMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedVersionResponse[]; pageParams?: number[] };

        if (!cacheData.pages || cacheData.pages.length === 0) return;

        const updatedPages = cacheData.pages.map((page) => ({
          ...page,
          items: page.items.map((v) =>
            v.id === updatedVersion.id
              ? {
                  ...v,
                  keywords: updatedVersion.keywords,
                  comment: updatedVersion.comment,
                  updatedAt: updatedVersion.updatedAt,
                }
              : v
          ),
        }));

        queryClient.setQueryData(queryKey, {
          pages: updatedPages,
          pageParams: cacheData.pageParams || updatedPages.map((_, index) => index + 1),
        });
      });
    },
  });
};

export const useParseVersionFile = () => {
  return useMutation({
    mutationFn: async (params: { file: File; signal?: AbortSignal }) => {
      try {
        const { file, signal } = params;
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post<ApiResponse<ResumeData>>(
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

// View document hook - fetches document for viewing in new tab
export interface ViewDocumentParams {
  resumeId: string;
  versionId: string;
}

export const useViewDocument = (params: ViewDocumentParams, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['resume', params.resumeId, 'versions', params.versionId, 'document'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiResponse<ViewDocumentResponse>>(
          `/resume/${params.resumeId}/versions/${params.versionId}/document`
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to view document');
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
    enabled: enabled && !!params.resumeId && !!params.versionId,
    gcTime: 0,
    staleTime: 0,
  });
};
