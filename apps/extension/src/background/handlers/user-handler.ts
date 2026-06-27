import type { AxiosInstance } from 'axios';
import type { ExtensionMessage, ApiResponse, UserPublic } from '@repo/shared-types';
import { AUTH_STORAGE_KEY, type StoredAuth } from '@repo/shared-types';

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL;
const WEB_APP_PORT = import.meta.env.VITE_WEB_APP_PORT || '';
const FULL_WEB_APP_URL = `${WEB_APP_URL}${WEB_APP_PORT ? `:${WEB_APP_PORT}` : ''}`;

/**
 * Send auth state change to the web app tab
 */
async function sendAuthStateToWebApp(authData: StoredAuth | null): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: `${FULL_WEB_APP_URL}/*` });
    const tabId = tabs[0]?.id;
    if (tabId) {
      await chrome.tabs.sendMessage(tabId, {
        action: 'AUTH_STATE_CHANGED',
        payload: authData,
      });
      console.log('[Auth Sync] Sent auth state to web app tab');
    } else {
      console.log('[Auth Sync] No web app tab found to send auth state');
    }
  } catch (error) {
    console.error('[Auth Sync] Error sending auth state to web app:', error);
  }
}

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
    chrome.storage.session.get([AUTH_STORAGE_KEY], (result) => {
      const authData = result[AUTH_STORAGE_KEY] as StoredAuth | undefined;
      sendResponse({ isAuthenticated: !!authData?.token });
    });
    return true;
  }

  if (message.action === 'CHECK_AUTH_WITH_TIMESTAMP') {
    chrome.storage.session.get([AUTH_STORAGE_KEY], (result) => {
      const authData = result[AUTH_STORAGE_KEY] as StoredAuth | undefined;
      sendResponse({
        isAuthenticated: !!authData?.token,
        authData: authData || null,
      });
    });
    return true;
  }

  if (message.action === 'SEND_CODE') {
    const { email } = message.payload;

    api
      .post<ApiResponse>('/user/send-code', { email })
      .then((response) => {
        const { data } = response;
        if (data.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: data.message || 'Failed to send code' });
        }
      })
      .catch((error) => {
        console.error('Send code error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true;
  }

  if (message.action === 'VERIFY_CODE') {
    const { email, code } = message.payload;

    api
      .post<ApiResponse<{ token: string; id: string; email: string }>>('/user/verify-code', {
        email,
        code,
      })
      .then((response) => {
        const { data } = response;

        if (data.success && data.data?.token) {
          const timestamp = Date.now();
          const authData: StoredAuth = {
            token: data.data.token,
            timestamp,
          };

          chrome.storage.session.set({ [AUTH_STORAGE_KEY]: authData }, () => {
            sendResponse({
              success: true,
              token: data.data?.token,
              authData,
              user: { id: data.data?.id, email: data.data?.email },
            });
            sendAuthStateToWebApp(authData);
          });
        } else {
          sendResponse({ success: false, error: data.message || 'Verification failed' });
        }
      })
      .catch((error) => {
        console.error('Verify code error:', error);
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
          const timestamp = Date.now();
          const authData: StoredAuth = {
            token: data.data.token,
            timestamp,
          };

          // Store in session storage (token + timestamp only)
          chrome.storage.session.set({ [AUTH_STORAGE_KEY]: authData }, () => {
            sendResponse({ success: true, token: data.data?.token, authData });
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
        chrome.storage.session.remove(AUTH_STORAGE_KEY, () => {
          sendResponse({ success: true });
          sendAuthStateToWebApp(null);
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

  if (message.action === 'GOOGLE_LOGIN_INTERACTIVE') {
    const handleGoogleLoginInteractive = () => {
      const redirectUri = chrome.identity.getRedirectURL();
      const clientId = import.meta.env.VITE_EXT_CLIENT_ID;

      // Same scopes as in manifest.json
      const scopes = encodeURIComponent(
        'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      );

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${scopes}&` +
        `prompt=select_account`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            console.error('Google auth flow error:', chrome.runtime.lastError);
            sendResponse({
              success: false,
              error: chrome.runtime.lastError?.message || 'Authentication flow failed',
            });
            return;
          }

          // Extract the access token from the response URL hash
          try {
            const url = new URL(responseUrl);
            const params = new URLSearchParams(url.hash.substring(1));
            const token = params.get('access_token');

            if (!token) {
              sendResponse({ success: false, error: 'No access token received' });
              return;
            }

            // Send the access token to the backend to authenticate
            const callbackResponse = await api.post<
              ApiResponse<{ token: string; id: string; email: string }>
            >('/user/extension/google/callback', { accessToken: token });

            const { data } = callbackResponse;

            if (data.success && data.data?.token) {
              const timestamp = Date.now();
              const authData: StoredAuth = {
                token: data.data.token,
                timestamp,
              };

              // Store in session storage and notify web app
              chrome.storage.session.set({ [AUTH_STORAGE_KEY]: authData }, () => {
                sendResponse({
                  success: true,
                  token: data.data?.token,
                  authData,
                  user: { id: data.data?.id, email: data.data?.email },
                });
                sendAuthStateToWebApp(authData);
              });
            } else {
              sendResponse({ success: false, error: data.message || 'Authentication failed' });
            }
          } catch (err) {
            console.error('Backend auth error:', err);
            sendResponse({
              success: false,
              error: err instanceof Error ? err.message : 'Authentication failed',
            });
          }
        }
      );
    };

    handleGoogleLoginInteractive();
    return true;
  }

  return false;
}
