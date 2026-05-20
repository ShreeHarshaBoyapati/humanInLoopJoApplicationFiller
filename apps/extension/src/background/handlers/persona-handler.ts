import type { AxiosError, AxiosInstance } from 'axios';
import type {
  ExtensionMessage,
  ApiResponse,
  Persona,
  PaginatedPersonasResponse,
  ResumeMetadata,
  ResumeVersionMetadata,
} from '@repo/shared-types';

/**
 * Handles all persona-related background messages: CREATE_PERSONA, UPDATE_PERSONA, DELETE_PERSONA, GET_PERSONAS.
 * Returns `true` if the message was handled (caller should keep the channel open),
 * `false` if the message was not a persona-related action.
 */
export function handlePersonaMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'CREATE_PERSONA') {
    const payload = message.payload;

    api
      .post<ApiResponse<Persona>>('/persona', payload)
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to create persona' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Persona creation error:', error);
        sendResponse({
          success: false,
          error: error.response?.data.message || error.message || 'Unknown network error',
        });
      });

    return true;
  }

  if (message.action === 'UPDATE_PERSONA') {
    const payload = message.payload;

    api
      .put<ApiResponse<Persona>>('/persona', payload)
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to update persona' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Persona update error:', error);
        sendResponse({ success: false, error: error.response?.data.message || error.message });
      });

    return true;
  }

  if (message.action === 'DELETE_PERSONA') {
    const payload = message.payload;

    api
      .delete<ApiResponse>('/persona', { data: payload })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to delete persona' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Persona deletion error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'GET_ACTIVE_PERSONA') {
    api
      .get<ApiResponse<Persona>>('/persona/active')
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to get active persona' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Get active persona error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

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
      api.get<ApiResponse<Persona>>('/persona/active').catch(() => null),
      api.get<ApiResponse<ResumeMetadata>>('/resume/active').catch(() => null),
      api.get<ApiResponse<ResumeVersionMetadata>>('/resume/versions/active').catch(() => null),
    ])
      .then(([personaRes, resumeRes, versionRes]) => {
        const personaData = personaRes?.data;
        const resumeData = resumeRes?.data;
        const versionData = versionRes?.data;

        sendResponse({
          success: true,
          data: {
            persona: personaData?.success && personaData.data ? personaData.data : null,
            resume: resumeData?.success && resumeData.data ? resumeData.data : null,
            version: versionData?.success && versionData.data ? versionData.data : null,
          },
        });
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Get active selection error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  return false;
}
