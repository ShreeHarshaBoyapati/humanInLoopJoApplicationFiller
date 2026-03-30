import type { AxiosError, AxiosInstance } from 'axios';
import type { ExtensionMessage, ApiResponse, AnalysisResult } from '@repo/shared-types';

/**
 * Handles AI-related background messages (ANALYZE_RESUME).
 * Returns true if handled, false otherwise.
 */
export function handleAiMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'ANALYZE_RESUME') {
    const { jobId, resumeId } = message.payload;

    api
      .post<ApiResponse<AnalysisResult>>('/ai/analyze-keywords', { jobId, resumeId })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message ?? 'Analysis failed' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
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

  return false;
}
