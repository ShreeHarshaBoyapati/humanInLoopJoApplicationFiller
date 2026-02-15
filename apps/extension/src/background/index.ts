import axios from 'axios';
console.log('Background service worker started');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

const API_URL = import.meta.env.VITE_EXT_BACKENDAPI || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  adapter: 'fetch',
});

// Add a request interceptor to inject the token
api.interceptors.request.use(async (config) => {
  const result = await new Promise<{ token?: string }>((resolve) => {
    chrome.storage.local.get(['token'], (res) => resolve(res as { token?: string }));
  });

  if (result.token) {
    config.headers.Authorization = `Bearer ${result.token}`;
  }
  return config;
});

// Listen for messages from the UI
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'CHECK_AUTH') {
    chrome.storage.local.get(['token'], (result: { token?: string }) => {
      sendResponse({ isAuthenticated: !!result.token });
    });
    return true; // Indicates asynchronous response
  }

  if (message.action === 'LOGIN') {
    const { email, password } = message.payload;

    api
      .post('/user/login', {
        email,
        password,
      })
      .then((response) => {
        const { data } = response;
        if (data.success && data.data?.token) {
          chrome.storage.local.set({ token: data.data.token }, () => {
            sendResponse({ success: true, token: data.data.token });
          });
        } else {
          sendResponse({ success: false, error: data.message || 'Login failed' });
        }
      })
      .catch((error) => {
        console.error('Login error:', error);
        sendResponse({ success: false, error: error.response?.data?.message || error.message });
      });

    return true; // Keep channel open
  }

  if (message.action === 'LOGOUT') {
    api.post('/user/logout').finally(() => {
      // Always remove token even if server request fails
      chrome.storage.local.remove('token', () => {
        sendResponse({ success: true });
      });
    });

    return true;
  }
});
