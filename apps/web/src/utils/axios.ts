import axios from 'axios';
import { clearTokenAuth } from './auth-sync';
import { getRealtimeClientId } from '../realtime/realtime-client';

const API_URL = import.meta.env.VITE_WEB_BACKENDAPI || '';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add realtime client id
axiosInstance.interceptors.request.use(
  (config) => {
    const clientId = getRealtimeClientId();
    if (clientId) {
      config.headers['X-Realtime-Client-Id'] = clientId;
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
      clearTokenAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
