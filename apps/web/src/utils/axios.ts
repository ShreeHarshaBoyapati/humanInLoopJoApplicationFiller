import axios from 'axios';
import { WEB_APP_MESSAGE_KEY } from '@repo/shared-types';

const API_URL = import.meta.env.VITE_WEB_BACKENDAPI || '';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem(WEB_APP_MESSAGE_KEY);
    if (stored) {
      try {
        const authData = JSON.parse(stored);
        if (authData.token) {
          config.headers.Authorization = `Bearer ${authData.token}`;
        }
      } catch {
        // Invalid stored data, skip adding token
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 unauthorized globally
    if (error.response?.status === 401) {
      localStorage.removeItem(WEB_APP_MESSAGE_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
