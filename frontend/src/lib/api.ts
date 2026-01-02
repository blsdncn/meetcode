/**
 * Centralized API client for Meetcode
 * 
 * All API calls should use this client to ensure:
 * - Consistent authentication header injection
 * - Automatic token refresh handling
 * - Unified error handling
 * 
 * Usage:
 *   import api from '@/lib/api';
 *   const response = await api.get('/user-auth/me');
 *   const data = await api.post('/reviews/', reviewData);
 */

import axios, { AxiosError } from 'axios';
import { getSession, signOut } from 'next-auth/react';

// Create axios instance with relative base URL
// All requests go through Nginx proxy which routes to backend
const api = axios.create({
  baseURL: '/api/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - automatically add auth headers
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Response interceptor - handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - typically means token expired
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;
      
      // Attempt token refresh is handled by NextAuth
      // For now, redirect to login on 401
      console.warn('Unauthorized - redirecting to login');
      signOut({ callbackUrl: '/login' });
    }

    return Promise.reject(error);
  }
);

export default api;

// Helper to check if an error is an Axios error
export function isApiError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

// Helper to extract error message from API response
export function getApiErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const data = error.response?.data as { detail?: string; message?: string };
    return data?.detail || data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
