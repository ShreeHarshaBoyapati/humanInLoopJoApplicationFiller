import type { AxiosError, AxiosInstance } from 'axios';
import type { ExtensionMessage, ApiResponse, JobPublic, Job, JobList } from '@repo/shared-types';

const deleteControllers = new Map<string, AbortController>();

/**
 * Handles all job-related background messages: CREATE_JOB, UPDATE_JOB, DELETE_JOB, GET_JOBS.
 * Returns `true` if the message was handled (caller should keep the channel open),
 * `false` if the message was not a job-related action.
 */
export function handleJobMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'CREATE_JOB') {
    try {
      const payload = message.payload;

      api
        .post<ApiResponse<JobPublic>>('/job', payload)
        .then((response) => {
          console.log('CREATE_JOB success response:', response.status);
          const { data } = response;
          if (data.success) {
            sendResponse({ success: true, data: data.data });
          } else {
            sendResponse({ success: false, error: data.message || 'Failed to create job' });
          }
        })
        .catch((error: AxiosError<ApiResponse>) => {
          console.error('Job creation error (catch):', error);
          sendResponse({
            success: false,
            error: error.response?.data.message || error.message || 'Unknown network error',
          });
        });
    } catch (err) {
      console.error('Job creation synchronous error:', err);
      sendResponse({ success: false, error: 'Synchronous error' });
    }
    return true;
  }

  if (message.action === 'UPDATE_JOB') {
    const payload = message.payload;

    api
      .put<ApiResponse<Job>>('/job', payload)
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to update job' });
        }
      })
      // TODO: need to handle the proper error messages as we can't send the error.message only
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('Job update error:', error);
        sendResponse({ success: false, error: error.response?.data.message || error.message });
      });

    return true;
  }

  if (message.action === 'CANCEL_DELETE_JOB') {
    const { requestId } = message.payload || {};
    if (requestId && deleteControllers.has(requestId)) {
      deleteControllers.get(requestId)?.abort();
    }
    sendResponse({ cancelled: true });
    return true;
  }

  if (message.action === 'DELETE_JOB') {
    const { requestId, ...payload } = message.payload || {};
    const controller = new AbortController();
    if (requestId) {
      deleteControllers.set(requestId, controller);
    }

    api
      .delete<ApiResponse>('/job', {
        data: payload,
        fetchOptions: { signal: controller.signal },
      })
      .then((response) => {
        if (requestId) {
          deleteControllers.delete(requestId);
        }
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to delete job' });
        }
      })
      .catch((error) => {
        if (requestId) {
          deleteControllers.delete(requestId);
        }
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          sendResponse({ cancelled: true });
          return;
        }
        console.error('Job deletion error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'GET_JOBS') {
    const payload = message.payload;

    api
      .get<ApiResponse<JobList>>('/job', { params: payload })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to get jobs' });
        }
      })
      .catch((error) => {
        console.error('Job fetching error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  return false;
}
