import axios from 'axios';
import type { ExtensionMessage } from '@repo/shared-types';
import { handleUserMessage } from './handlers/user-handler.js';
import { handleJobMessage } from './handlers/job-handler.js';

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

// Listen for messages from the UI and content scripts — dispatch to entity handlers
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  // Quick Save from content script
  if (message.action === 'OPEN_SIDE_PANEL') {
    const url = message.payload?.url || '';
    chrome.storage.local.set({ quickSaveUrl: url }, () => {
      const tabId = sender.tab?.id;
      if (tabId) {
        chrome.sidePanel
          .open({ tabId })
          .then(() => sendResponse({ success: true }))
          .catch((err) => {
            console.error('Failed to open side panel:', err);
            sendResponse({ success: false, error: String(err) });
          });
      } else {
        sendResponse({ success: false, error: 'No tab id' });
      }
    });
    return true;
  }

  // User-related actions
  const handled = handleUserMessage(message, sendResponse, api);
  if (handled) return true;
  console.log('==========got here======+>>>>>>>');

  // Job-related actions
  const jobHandled = handleJobMessage(message, sendResponse, api);
  if (jobHandled) return true;
});
