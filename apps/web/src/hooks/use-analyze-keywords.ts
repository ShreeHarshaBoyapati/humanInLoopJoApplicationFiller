import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../utils/axios';
import type {
  AnalyzeKeywordsApiResponse,
  AnalysisResult,
  ApiResponse,
  Job,
} from '@repo/shared-types';
import { RESULT_KEYS } from './use-results';
import { JOB_KEYS } from './use-jobs';

export interface AnalyzeKeywordsParams {
  jobId: string;
  resumeVersionId: string;
  signal?: AbortSignal;
}

export interface AnalyzeKeywordsResult {
  data: AnalysisResult;
  message?: string;
  job?: Job;
}

export const useAnalyzeKeywords = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AnalyzeKeywordsParams) => {
      const { signal, ...data } = params;
      try {
        const response = await axiosInstance.post<AnalyzeKeywordsApiResponse>(
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
          job: response.data.job,
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
    onSuccess: (result: AnalyzeKeywordsResult, variables: AnalyzeKeywordsParams) => {
      queryClient.invalidateQueries({
        queryKey: RESULT_KEYS.byJob(variables.jobId),
      });

      if (result.job) {
        const updatedJob = result.job;
        queryClient.setQueriesData(
          { queryKey: JOB_KEYS.lists() },
          (oldData: { pages: Array<{ items: Job[] }>; pageParams?: number[] } | undefined) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                items: page.items.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
              })),
            };
          }
        );
      }
    },
  });
};
