import type { AxiosError, AxiosInstance } from 'axios';
import type { ExtensionMessage, ApiResponse, AnalysisResult } from '@repo/shared-types';

const analysisControllers = new Map<string, AbortController>();

/**
 * Handles AI-related background messages (ANALYZE_RESUME, CANCEL_ANALYZE_RESUME).
 * Returns true if handled, false otherwise.
 */
export function handleAiMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'ANALYZE_RESUME') {
    const { jobId, resumeVersionId, requestId } = message.payload;
    const controller = new AbortController();

    if (requestId) {
      analysisControllers.set(requestId, controller);
    }

    api
      .post<ApiResponse<AnalysisResult>>(
        '/ai/analyze-keywords',
        { jobId, resumeVersionId },
        { signal: controller.signal }
      )
      .then((response) => {
        if (requestId) {
          analysisControllers.delete(requestId);
        }
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data, message: data.message });
        } else {
          sendResponse({ success: false, error: data.message ?? 'Analysis failed' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        if (requestId) {
          analysisControllers.delete(requestId);
        }
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          sendResponse({ cancelled: true });
          return;
        }
        console.error('Analysis error:', error);
        const errData = error.response?.data;
        const errMsg =
          errData && !errData.success
            ? errData.message
            : (error.message ?? 'Failed to analyze resume');
        sendResponse({ success: false, error: errMsg });
      });

    return true;
  }

  if (message.action === 'CANCEL_ANALYZE_RESUME') {
    const { requestId } = message.payload || {};
    if (requestId && analysisControllers.has(requestId)) {
      analysisControllers.get(requestId)?.abort();
    }
    sendResponse({ cancelled: true });
    return true;
  }

  return false;
}
