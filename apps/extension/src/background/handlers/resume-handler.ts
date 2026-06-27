import type { AxiosError, AxiosInstance } from 'axios';
import type {
  ExtensionMessage,
  ApiResponse,
  GetResumeParams,
  ResumeData,
  PaginatedResumeResponse,
  GetResumeVersionsParams,
  SetActiveVersionParams,
  GetVersionParsedDataParams,
  PaginatedVersionResponse,
  ResumeVersionMetadata,
} from '@repo/shared-types';

export function handleResumeMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'GET_RESUMES') {
    const payload = message.payload as
      | (GetResumeParams & { page?: number; limit?: number; search?: string })
      | undefined;

    api
      .get<ApiResponse<PaginatedResumeResponse>>('/resume', { params: payload })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to get resumes' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Resume fetching error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  // Resume Version handlers
  if (message.action === 'GET_RESUME_VERSIONS') {
    const payload = message.payload as GetResumeVersionsParams;

    api
      .get<ApiResponse<PaginatedVersionResponse>>(`/resume/${payload.resumeId}/versions`, {
        params: { page: payload.page, limit: payload.limit, search: payload.search },
      })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to get resume versions' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Resume versions fetch error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'SET_ACTIVE_VERSION') {
    const payload = message.payload as SetActiveVersionParams;

    api
      .post<
        ApiResponse<
          ResumeVersionMetadata & {
            previousPersonaId: string | null;
            newPersonaId: string;
            previousResumeId: string | null;
            newResumeId: string;
          }
        >
      >(`/resume/${payload.resumeId}/versions/${payload.versionId}/set-active`, {
        id: payload.resumeId,
        versionId: payload.versionId,
      })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, message: data.message, data: data.data });
        } else {
          sendResponse({
            success: false,
            message: data.message || 'Failed to set active version',
          });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Set active version error:', error);
        sendResponse({ success: false, message: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'GET_VERSION_PARSED_DATA') {
    const payload = message.payload as GetVersionParsedDataParams;

    api
      .get<ApiResponse<ResumeData>>(
        `/resume/${payload.resumeId}/versions/${payload.versionId}/parsed`
      )
      .then((response) => {
        const { data } = response;
        if (data.success && data.data) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({
            success: false,
            error: data.message || 'Failed to get version parsed data',
          });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Get version parsed data error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  return false;
}
