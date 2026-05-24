import type { AxiosError, AxiosInstance } from 'axios';
import type {
  ExtensionMessage,
  ApiResponse,
  Persona,
  PaginatedPersonasResponse,
  ResumeMetadata,
  ResumeVersionMetadata,
} from '@repo/shared-types';

export function handlePersonaMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'GET_PERSONAS') {
    const payload = message.payload ?? {};
    const { page, limit, search } = payload as {
      page?: number;
      limit?: number;
      search?: string;
    };
    const params: Record<string, string | number> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    if (search !== undefined) params.search = search;

    api
      .get<ApiResponse<PaginatedPersonasResponse>>('/persona', { params })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to get personas' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Persona fetching error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'GET_ACTIVE_SELECTION') {
    // Fetch all three in parallel: active persona, active resume, active version
    Promise.all([
      api.get<ApiResponse<Persona>>('/persona/active'),
      api.get<ApiResponse<ResumeMetadata>>('/resume/active'),
      api.get<ApiResponse<ResumeVersionMetadata>>('/resume/versions/active'),
    ])
      .then(([personaRes, resumeRes, versionRes]) => {
        // Check persona response
        if (!personaRes?.data) {
          throw new Error('Failed to fetch active persona: No response data');
        }
        if (!personaRes.data.success) {
          throw new Error(
            'Failed to fetch active persona: ' + (personaRes.data.message || 'Unknown error')
          );
        }

        // Check resume response
        if (!resumeRes?.data) {
          throw new Error('Failed to fetch active resume: No response data');
        }
        if (!resumeRes.data.success) {
          throw new Error(
            'Failed to fetch active resume: ' + (resumeRes.data.message || 'Unknown error')
          );
        }

        // Check version response
        if (!versionRes?.data) {
          throw new Error('Failed to fetch active resume version: No response data');
        }
        if (!versionRes.data.success) {
          throw new Error(
            'Failed to fetch active resume version: ' + (versionRes.data.message || 'Unknown error')
          );
        }

        sendResponse({
          success: true,
          data: {
            persona: personaRes.data.data,
            resume: resumeRes.data.data,
            version: versionRes.data.data,
          },
        });
      })
      .catch((error: unknown) => {
        console.error('Get active selection error:', error);
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          const axiosError = error as AxiosError<ApiResponse>;
          errorMessage =
            axiosError.response?.data?.message || axiosError.message || 'Unknown error';
        }
        sendResponse({ success: false, error: errorMessage });
      });

    return true;
  }

  return false;
}
