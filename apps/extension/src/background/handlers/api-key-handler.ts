import type { AxiosError, AxiosInstance } from 'axios';
import type { ExtensionMessage, ApiResponse } from '@repo/shared-types';
import { transitEncrypt } from '@repo/utils';

// TRANSIT_SECRET must match the backend. In development the fallback is used.
// In production set VITE_EXT_TRANSIT_SECRET in the extension build environment.
const TRANSIT_SECRET: string =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_EXT_TRANSIT_SECRET ??
  'jfp-default-transit-secret-change-in-prod';

export function handleApiKeyMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'TEST_CONNECTION') {
    const { providerName, credentials } = message.payload;

    const encryptPromise = credentials?.apiKey
      ? transitEncrypt(credentials.apiKey, TRANSIT_SECRET)
      : Promise.resolve(credentials?.apiKey);

    encryptPromise
      .then((encryptedKey?: string) =>
        api.post<ApiResponse>('/api-key/test-connection', {
          providerName,
          credentials: { ...credentials, ...(encryptedKey ? { apiKey: encryptedKey } : {}) },
        })
      )
      .then((response: { data: ApiResponse<{ models: { label: string; value: string }[] }> }) => {
        const { data } = response;
        if (data.success && data.data?.models) {
          sendResponse({
            success: true,
            message: data.message || 'Connection successful',
            data: { models: data.data.models },
          });
        } else {
          sendResponse({ success: false, error: data.message || 'Connection failed' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('TEST_CONNECTION error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || error.message || 'Connection failed',
        });
      });

    return true;
  }

  if (message.action === 'SAVE_PROVIDER') {
    const { id, providerName, credentials, model } = message.payload;

    const encryptPromise = credentials?.apiKey
      ? transitEncrypt(credentials.apiKey, TRANSIT_SECRET)
      : Promise.resolve(credentials?.apiKey);

    encryptPromise
      .then((encryptedKey?: string) =>
        api.post<ApiResponse>('/api-key', {
          id,
          providerName,
          credentials: { ...credentials, ...(encryptedKey ? { apiKey: encryptedKey } : {}) },
          model,
        })
      )
      .then((response: { data: ApiResponse }) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to save provider' });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('SAVE_PROVIDER error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || error.message || 'Failed to save provider',
        });
      });

    return true;
  }

  if (message.action === 'GET_CONFIGURED_PROVIDERS') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api
      .get<ApiResponse<any[]>>('/api-key')
      .then((response: { data: ApiResponse<Record<string, unknown>[]> }) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message });
        }
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('GET_CONFIGURED_PROVIDERS error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || error.message || 'Failed to fetch providers',
        });
      });
    return true;
  }

  if (message.action === 'DELETE_PROVIDER') {
    const { id } = message.payload;
    api
      .delete<ApiResponse>(`/api-key/${id}`)
      .then((response) => {
        sendResponse({ success: response.data.success });
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('DELETE_PROVIDER error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || 'Failed to delete provider',
        });
      });
    return true;
  }

  return false;
}
