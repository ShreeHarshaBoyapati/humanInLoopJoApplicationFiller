import axios, { AxiosError } from 'axios';
import type { ExtensionMessage, ApiResponse } from '@repo/shared-types';
import { handleUserMessage } from './handlers/user-handler.js';
import { handleJobMessage } from './handlers/job-handler.js';
import { handleContentMessages } from './handlers/content-handler.js';
import { handleApiKeyMessage } from './handlers/api-key-handler.js';
import { handlePersonaMessage } from './handlers/persona-handler.js';
import { handleResumeMessage } from './handlers/resume-handler.js';

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

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.message || 'Session expired. Please log in again.';
      chrome.storage.local.remove('token', () => {
        chrome.runtime
          .sendMessage({
            action: 'LOGOUT_TRIGGERED',
            payload: { message },
          })
          .catch(() => {
            // Ignore error if no listeners are active
          });
      });
    }
    return Promise.reject(error);
  }
);

// Listen for messages from the UI and content scripts — dispatch to entity handlers
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const contentHandled = handleContentMessages(message, sender, sendResponse);
  if (contentHandled) return true;
  // User-related actions
  const handled = handleUserMessage(message, sendResponse, api);
  if (handled) return true;

  // Job-related actions
  const jobHandled = handleJobMessage(message, sendResponse, api);
  if (jobHandled) return true;

  // API key-related actions
  const apiKeyHandled = handleApiKeyMessage(message, sendResponse, api);
  if (apiKeyHandled) return true;

  // Persona-related actions
  const personaHandled = handlePersonaMessage(message, sendResponse, api);
  if (personaHandled) return true;

  // Resume-related actions
  const resumeHandled = handleResumeMessage(message, sendResponse, api);
  if (resumeHandled) return true;
});
