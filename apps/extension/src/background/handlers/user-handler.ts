import type { AxiosInstance } from 'axios';
import type { ExtensionMessage, ApiResponse, UserPublic } from '@repo/shared-types';

/**
 * Handles all user-related background messages: CHECK_AUTH, LOGIN, NewUser, LOGOUT.
 * Returns `true` if the message was handled (caller should keep the channel open),
 * `false` if the message was not a user-related action.
 */
export function handleUserMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void,
  api: AxiosInstance
): boolean {
  if (message.action === 'CHECK_AUTH') {
    chrome.storage.local.get(['token'], (result: { token?: string }) => {
      sendResponse({ isAuthenticated: !!result.token });
    });
    return true;
  }

  if (message.action === 'NewUser') {
    const { email, password } = message.payload;

    api
      .post<ApiResponse<UserPublic>>('/user', { email, password })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: data.message || 'Registration failed' });
        }
      })
      .catch((error) => {
        console.error('Registration error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'LOGIN') {
    const { email, password } = message.payload;

    api
      .post<ApiResponse<UserPublic>>('/user/login', { email, password })
      .then((response) => {
        const { data } = response;
        if (data.success && data.data?.token) {
          chrome.storage.local.set({ token: data.data.token }, () => {
            sendResponse({ success: true, token: data.data?.token });
          });
        } else {
          sendResponse({ success: false, error: data.message || 'Login failed' });
        }
      })
      .catch((error) => {
        console.error('Login error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'LOGOUT') {
    api
      .post<ApiResponse>('/user/logout')
      .then(() => {
        chrome.storage.local.remove('token', () => {
          sendResponse({ success: true });
        });
      })
      .catch((error) => {
        console.error('Logout error:', error);
        sendResponse({ success: false, error: error.message || 'Logout failed' });
      });

    return true;
  }

  if (message.action === 'GET_CURRENT_USER') {
    api
      .get<ApiResponse<UserPublic>>('/user/me')
      .then((response) => {
        const { data } = response;
        if (data.success && data.data) {
          sendResponse({ success: true, data: data.data });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to get user' });
        }
      })
      .catch((error) => {
        console.error('Get current user error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  return false;
}
