import type { AxiosError, AxiosInstance } from 'axios';
import type {
  ExtensionMessage,
  ApiResponse,
  ResumeMetadata,
  ResumeFull,
  GetResumeParams,
  CreateResumeParams,
  UpdateResumeParams,
  DeleteResumeParams,
  GetResumeByIdParams,
} from '@repo/shared-types';

/**
 * Handles all resume-related background messages: GET_RESUMES, CREATE_RESUME, UPDATE_RESUME, DELETE_RESUME, GET_RESUME_BY_ID.
 * Returns `true` if the message was handled (caller should keep the channel open),
 * `false` if the message was not a resume-related action.
 */
export function handleResumeMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'GET_RESUMES') {
    const payload = message.payload as GetResumeParams | undefined;

    api
      .get<ApiResponse<ResumeMetadata[]>>('/resume', { params: payload })
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

  if (message.action === 'CREATE_RESUME') {
    (async () => {
      const payload = message.payload as CreateResumeParams;
      const formData = new FormData();
      formData.append('personaId', payload.personaId);

      const fileResponse = await fetch(payload.file.base64);
      const blob = await fileResponse.blob();
      formData.append('file', blob, payload.file.name);

      if (payload.keywords && payload.keywords.length > 0) {
        formData.append('keywords', JSON.stringify(payload.keywords));
      }

      api
        .post<ApiResponse<ResumeMetadata>>('/resume', formData)
        .then((response) => {
          const { data } = response;
          if (data.success) {
            sendResponse({ success: true, data: data.data, message: data.message });
          } else {
            sendResponse({ success: false, message: data.message || 'Failed to create resume' });
          }
        })
        .catch((error: AxiosError<ApiResponse>) => {
          console.error('Resume creation error:', error);
          sendResponse({ success: false, message: error.response?.data?.message || error.message });
        });
    })();

    return true;
  }

  if (message.action === 'UPDATE_RESUME') {
    (async () => {
      const payload = message.payload as UpdateResumeParams;
      const formData = new FormData();
      formData.append('id', payload.id);

      if (payload.file) {
        const fileResponse = await fetch(payload.file.base64);
        const blob = await fileResponse.blob();
        formData.append('file', blob, payload.file.name);
      }

      if (payload.keywords) {
        formData.append('keywords', JSON.stringify(payload.keywords));
      }

      api
        .put<ApiResponse<ResumeMetadata>>('/resume', formData)
        .then((response) => {
          const { data } = response;
          if (data.success) {
            sendResponse({ success: true, data: data.data, message: data.message });
          } else {
            sendResponse({ success: false, message: data.message || 'Failed to update resume' });
          }
        })
        .catch((error: AxiosError<ApiResponse>) => {
          console.error('Resume update error:', error);
          sendResponse({ success: false, message: error.response?.data?.message || error.message });
        });
    })();

    return true;
  }

  if (message.action === 'DELETE_RESUME') {
    const payload = message.payload as DeleteResumeParams;

    api
      .delete<ApiResponse<null>>('/resume', { data: payload })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, message: data.message });
        } else {
          sendResponse({ success: false, message: data.message || 'Failed to delete resume' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Resume deletion error:', error);
        sendResponse({ success: false, message: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'GET_RESUME_BY_ID') {
    const payload = message.payload as GetResumeByIdParams;

    api
      .get<ApiResponse<ResumeFull>>(`/resume/${payload.id}`)
      .then((response) => {
        const { data } = response;
        if (data.success && data.data) {
          // The file is returned as base64 string in JSON response
          const resumeData = data.data as ResumeFull & { file: { type: string; data: number[] } };
          const fileData = resumeData.file;

          // Convert array buffer to Uint8Array
          // [Removed unused byteArray]

          // Determine content type based on file extension
          const fileName = resumeData.fileName.toLowerCase();
          let contentType = 'application/octet-stream';
          if (fileName.endsWith('.pdf')) {
            contentType = 'application/pdf';
          } else if (fileName.endsWith('.doc')) {
            contentType = 'application/msword';
          } else if (fileName.endsWith('.docx')) {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          }

          // Send the raw array data and content type to the frontend to construct the Blob
          sendResponse({
            success: true,
            data: { array: fileData.data, contentType },
            fileName: resumeData.fileName,
          });
        } else {
          sendResponse({ success: false, message: data.message || 'Failed to get resume' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Resume fetch error:', error);
        sendResponse({ success: false, message: error.response?.data?.message || error.message });
      });

    return true;
  }

  return false;
}
