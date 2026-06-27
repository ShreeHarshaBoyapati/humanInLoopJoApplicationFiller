/**
 * Background message handlers for the dashboard widgets.
 * Bridges the extension UI to the backend `/api/dashboard*` endpoints.
 */

import type { AxiosError, AxiosInstance } from 'axios';
import type {
  ExtensionMessage,
  ApiResponse,
  OnboardingResponse,
  DashboardResponse,
} from '@repo/shared-types';

export function handleDashboardMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'DASHBOARD_FETCH_ONBOARDING') {
    api
      .get<ApiResponse<OnboardingResponse>>('/dashboard/onboarding')
      .then((response) => {
        const { data } = response;
        if (data.success && data.data) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to fetch onboarding' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('DASHBOARD_FETCH_ONBOARDING error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || error.message || 'Failed to fetch onboarding',
        });
      });
    return true;
  }

  if (message.action === 'DASHBOARD_FETCH_SUMMARY') {
    const { range } = (message.payload ?? {}) as { range?: 'month' | 'threeMonths' | 'all' };
    api
      .get<ApiResponse<DashboardResponse>>('/dashboard', {
        params: { range: range ?? 'month' },
      })
      .then((response) => {
        const { data } = response;
        if (data.success && data.data) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to fetch dashboard' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('DASHBOARD_FETCH_SUMMARY error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || error.message || 'Failed to fetch dashboard',
        });
      });
    return true;
  }

  return false;
}
