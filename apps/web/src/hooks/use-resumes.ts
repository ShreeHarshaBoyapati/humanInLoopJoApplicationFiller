import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios.ts';
import type {
  ResumeMetadata,
  CreateResumeParams,
  DeleteResumeParams,
  SetActiveResumeParams,
  PaginatedResumeResponse,
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
    maxPages: 20,
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
    onSuccess: (_data: DeleteResumeParams, variables: DeleteResumeParams) => {
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(variables.personaId) });
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
    onSuccess: (
      _result: { resume: ResumeMetadata; personaId: string },
      variables: SetActiveResumeParams
    ) => {
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(variables.personaId) });
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
    onSuccess: (_result: ResumeMetadata & { fileSize: number }, variables: CreateResumeParams) => {
      queryClient.invalidateQueries({ queryKey: RESUME_KEYS.byPersona(variables.personaId) });
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
