import type { AxiosError, AxiosInstance } from 'axios';
import type {
  ExtensionMessage,
  ApiResponse,
  ApiKeyData,
  PaginatedApiKeysResponse,
} from '@repo/shared-types';
import { transitEncrypt, transitDecrypt } from '@repo/utils';

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

  if (message.action === 'DECRYPT_API_KEY') {
    const { encryptedKey } = message.payload;
    if (!encryptedKey) {
      sendResponse({ success: false, message: 'No key provided' });
      return true;
    }
    transitDecrypt(encryptedKey, TRANSIT_SECRET)
      .then((decryptedKey) => {
        sendResponse({ success: true, data: { decryptedKey } });
      })
      .catch((error) => {
        console.error('DECRYPT_API_KEY error:', error);
        sendResponse({ success: false, message: 'Failed to decrypt key' });
      });
    return true;
  }

  if (message.action === 'GET_CONFIGURED_PROVIDERS') {
    const { page = 1, limit = 10, search = '' } = message.payload ?? {};
    const params: Record<string, string | number> = { page, limit };
    if (search) {
      params.search = search;
    }

    api
      .get<ApiResponse<PaginatedApiKeysResponse>>('/api-key', { params })
      .then((response: { data: ApiResponse<PaginatedApiKeysResponse> }) => {
        const { data } = response;
        if (data.success && data.data) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to fetch providers' });
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

  if (message.action === 'SELECT_PROVIDER') {
    const { id } = message.payload;
    api
      .put<ApiResponse>(`/api-key/select/${id}`)
      .then((response) => {
        sendResponse({ success: response.data.success });
      })
      .catch((error: AxiosError<ApiResponse>) => {
        console.error('SELECT_PROVIDER error:', error);
        sendResponse({
          success: false,
          error: error.response?.data?.message || 'Failed to select provider',
        });
      });
    return true;
  }

  return false;
}
