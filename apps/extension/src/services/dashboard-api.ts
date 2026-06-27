/**
 * Thin wrapper around `chrome.runtime.sendMessage` for dashboard messages.
 * The background handler is responsible for calling the backend API.
 */

import type { OnboardingResponse, DashboardResponse } from '@repo/shared-types';

export interface FetchOnboardingResponse {
  success: boolean;
  data?: OnboardingResponse;
  error?: string;
}

export interface FetchDashboardSummaryResponse {
  success: boolean;
  data?: DashboardResponse;
  error?: string;
}

const isChromeRuntimeAvailable = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage);

export function fetchOnboarding(): Promise<FetchOnboardingResponse> {
  return new Promise((resolve) => {
    if (!isChromeRuntimeAvailable()) {
      resolve({ success: false, error: 'Chrome runtime unavailable' });
      return;
    }
    chrome.runtime.sendMessage({ action: 'DASHBOARD_FETCH_ONBOARDING' }, (response) => {
      resolve(response ?? { success: false, error: 'No response from background' });
    });
  });
}

export function fetchDashboardSummary(
  range: 'month' | 'threeMonths' | 'all' = 'month'
): Promise<FetchDashboardSummaryResponse> {
  return new Promise((resolve) => {
    if (!isChromeRuntimeAvailable()) {
      resolve({ success: false, error: 'Chrome runtime unavailable' });
      return;
    }
    chrome.runtime.sendMessage(
      { action: 'DASHBOARD_FETCH_SUMMARY', payload: { range } },
      (response) => {
        resolve(response ?? { success: false, error: 'No response from background' });
      }
    );
  });
}
