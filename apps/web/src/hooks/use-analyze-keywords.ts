import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios';
import type { ApiResponse, AnalysisResult } from '@repo/shared-types';
import { RESULT_KEYS } from './use-results';

export interface AnalyzeKeywordsParams {
  jobId: string;
  resumeVersionId: string;
  signal?: AbortSignal;
}

export interface AnalyzeKeywordsResult {
  data: AnalysisResult;
  message?: string;
}

export const useAnalyzeKeywords = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AnalyzeKeywordsParams) => {
      const { signal, ...data } = params;
      try {
        const response = await axiosInstance.post<ApiResponse<AnalysisResult>>(
          '/ai/analyze-keywords',
          {
            jobId: data.jobId,
            resumeVersionId: data.resumeVersionId,
          },
          {
            signal,
          }
        );
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.message || 'Failed to analyze keywords');
        }
        return {
          data: response.data.data,
          message: response.data.message,
        } as AnalyzeKeywordsResult;
      } catch (err) {
        // Handle abort errors
        if (err instanceof Error && err.name === 'CanceledError') {
          throw err;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          throw err;
        }
        if (err && typeof err === 'object' && 'response' in err) {
          const error = err as { response: { data: ApiResponse<never> } };
          if (!error.response.data.success) {
            throw new Error(error.response.data.message);
          }
        }
        throw err;
      }
    },
    onSuccess: (_result: AnalyzeKeywordsResult, variables: AnalyzeKeywordsParams) => {
      queryClient.invalidateQueries({
        queryKey: RESULT_KEYS.byJob(variables.jobId),
      });
    },
  });
};
