import { useCallback, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ResumeVersionMetadata,
  PaginatedVersionResponse,
  CompareVersionsResponse,
  ResumeData,
  ViewDocumentResponse,
  PaginatedResumeResponse,
  PaginatedResultResponse,
} from '@repo/shared-types';
import type { ApiResponse } from '@repo/shared-types';
import { RESUME_KEYS } from './use-resumes.ts';
import { PERSONA_KEYS } from './use-personas.ts';
import { RESULT_KEYS } from './use-results.ts';

export const VERSION_KEYS = {
  all: ['versions'] as const,
  lists: () => [...VERSION_KEYS.all, 'list'] as const,
  byResume: (resumeId: string) => [...VERSION_KEYS.lists(), { resumeId }] as const,
  byPersonaAndResume: (personaId: string, resumeId: string) =>
    [...VERSION_KEYS.all, { personaId }, { resumeId }] as const,
};

export const useResumeVersions = (
  resumeId: string,
  personaId: string,
  limit: number = 10,
  searchQuery: string = ''
) => {
  return useInfiniteQuery({
    queryKey: [...VERSION_KEYS.byPersonaAndResume(personaId, resumeId), { search: searchQuery }],
    initialPageParam: 1,
    maxPages: 2,
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
  personaId: string;
}

export const useDeleteVersion = () => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: DeleteVersionParams) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await axiosInstance.delete(
          `/resume/${data.resumeId}/versions/${data.versionId}`,
          { data: { id: data.resumeId, versionId: data.versionId }, signal: controller.signal }
        );
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to delete version');
        }
        return data;
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
    onSuccess: (_data: DeleteVersionParams, variables: DeleteVersionParams) => {
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.byPersonaAndResume(variables.personaId, variables.resumeId),
      });

      const cachedResumeQueries = queryClient.getQueriesData({
        queryKey: RESUME_KEYS.lists(),
        exact: false,
      });

      cachedResumeQueries.forEach(([queryKey, oldData]) => {
        const personaIdParam = queryKey.find(
          (k) => k && typeof k === 'object' && 'personaId' in k
        ) as { personaId: string } | undefined;

        const personaIdFromQuery = personaIdParam?.personaId;
        const personaMatches = !personaIdFromQuery || personaIdFromQuery === variables.personaId;

        if (!personaMatches) return;

        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as {
          pages?: PaginatedResumeResponse[];
          pageParams?: number[];
        };

        if (!cacheData.pages || cacheData.pages.length === 0) return;

        // Decrement versionsCount for the deleted version's resume
        const updatedPages = cacheData.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === variables.resumeId
              ? { ...item, versionsCount: Math.max(0, item.versionsCount - 1) }
              : item
          ),
        }));

        queryClient.setQueryData(queryKey, {
          pages: updatedPages,
          pageParams: cacheData.pageParams,
        });
      });
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { ...mutation, cancel };
};

export interface SetActiveVersionParams {
  resumeId: string;
  versionId: string;
  personaId: string;
}

export const useSetActiveVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetActiveVersionParams) => {
      try {
        const response = await axiosInstance.post<
          ApiResponse<
            ResumeVersionMetadata & {
              previousPersonaId: string | null;
              newPersonaId: string;
              previousResumeId: string | null;
              newResumeId: string;
            }
          >
        >(`/resume/${data.resumeId}/versions/${data.versionId}/set-active`, {
          id: data.resumeId,
          versionId: data.versionId,
        });
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to set active version');
        }
        return {
          version: response.data.data,
          resumeId: data.resumeId,
          personaId: data.personaId,
          previousPersonaId: response.data.data.previousPersonaId,
          newPersonaId: response.data.data.newPersonaId,
          previousResumeId: response.data.data.previousResumeId,
          newResumeId: response.data.data.newResumeId,
        };
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
    onSuccess: (
      result: {
        version: ResumeVersionMetadata;
        resumeId: string;
        personaId: string;
        previousPersonaId: string | null;
        newPersonaId: string;
        previousResumeId: string | null;
        newResumeId: string;
      },
      _variables: SetActiveVersionParams
    ) => {
      queryClient.invalidateQueries({
        queryKey: PERSONA_KEYS.lists(),
      });

      if (result.previousPersonaId && result.previousPersonaId !== result.newPersonaId) {
        queryClient.invalidateQueries({
          queryKey: RESUME_KEYS.byPersona(result.previousPersonaId),
        });
      }

      queryClient.invalidateQueries({
        queryKey: RESUME_KEYS.byPersona(result.newPersonaId),
      });

      if (result.previousResumeId && result.previousResumeId !== result.newResumeId) {
        queryClient.invalidateQueries({
          queryKey: VERSION_KEYS.byPersonaAndResume(result.newPersonaId, result.previousResumeId),
        });
      }

      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.byPersonaAndResume(result.newPersonaId, result.newResumeId),
      });
    },
  });
};

export interface BranchVersionParams {
  resumeId: string;
  versionId: string;
  newFileName: string;
  commit?: string;
  personaId: string;
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
    onSuccess: (_result: unknown, variables: BranchVersionParams) => {
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.byPersonaAndResume(variables.personaId, variables.resumeId),
      });
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
  personaId: string;
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
    onSuccess: (
      _result: { version: ResumeVersionMetadata; resumeId: string },
      variables: CreateVersionParams
    ) => {
      queryClient.invalidateQueries({
        queryKey: VERSION_KEYS.byPersonaAndResume(variables.personaId, variables.resumeId),
      });
    },
  });
};

export interface UpdateVersionParams {
  resumeId: string;
  versionId: string;
  personaId: string;
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
          return {
            version: response.data.data,
            resumeId: data.resumeId,
            personaId: data.personaId,
          };
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
        return { version: response.data.data, resumeId: data.resumeId, personaId: data.personaId };
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
    onSuccess: (
      _result: { version: ResumeVersionMetadata; resumeId: string; personaId: string },
      variables: UpdateVersionParams
    ) => {
      const cachedQueries = queryClient.getQueriesData({
        queryKey: VERSION_KEYS.byPersonaAndResume(variables.personaId, variables.resumeId),
        exact: false,
      });

      // Update each cached query
      cachedQueries.forEach(([queryKey, oldData]) => {
        if (!oldData || typeof oldData !== 'object') return;

        const cacheData = oldData as { pages?: PaginatedVersionResponse[]; pageParams?: number[] };

        if (!cacheData.pages || cacheData.pages.length === 0) return;

        const updatedVersion = _result.version;
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

      // Update result list caches for the affected resume version
      const cachedResultQueries = queryClient.getQueriesData({
        queryKey: RESULT_KEYS.lists(),
        exact: false,
      });

      cachedResultQueries.forEach(([resultQueryKey, resultOldData]) => {
        if (!resultOldData || typeof resultOldData !== 'object') return;

        const resultCacheData = resultOldData as {
          pages?: PaginatedResultResponse[];
          pageParams?: number[];
        };

        if (!resultCacheData.pages || resultCacheData.pages.length === 0) return;

        const updatedVersion = _result.version;
        let didUpdate = false;

        const updatedResultPages = resultCacheData.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => {
            if (item.resumeVersionId === updatedVersion.id) {
              didUpdate = true;
              return {
                ...item,
                resumeVersionDataUpdatedAt: updatedVersion.dataUpdatedAt,
              };
            }
            return item;
          }),
        }));

        if (!didUpdate) return;

        queryClient.setQueryData(resultQueryKey, {
          pages: updatedResultPages,
          pageParams: resultCacheData.pageParams || updatedResultPages.map((_, index) => index + 1),
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
