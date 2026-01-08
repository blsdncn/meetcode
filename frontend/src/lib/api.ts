/**
 * Centralized API client for Meetcode
 * 
 * IMPORTANT: This client has baseURL: '/api/', so all paths must be RELATIVE.
 * Do NOT include '/api/' prefix in your paths - it will be added automatically.
 * 
 * Examples:
 *   ✅ CORRECT:   api.get('user-auth/me')
 *   ✅ CORRECT:   api.post('reviews/', data)
 *   ❌ WRONG:     api.get('/api/user-auth/me')     // Creates /api/api/user-auth/me
 *   ❌ WRONG:     api.get(`${BACKEND_API_URL}...`) // Creates /api/http://...
 * 
 * All requests automatically include:
 * - Authentication headers (from NextAuth session)
 * - Error handling with automatic sign-out on 401
 * - Unified error message extraction via getApiErrorMessage()
 * 
 * For server-side NextAuth callbacks, use direct axios imports instead
 * (see frontend/src/lib/auth.tsx for examples).
 */

import axios, { AxiosError } from 'axios';
import { getSession, signOut } from 'next-auth/react';

// Create axios instance with base URL
// In development (local npm run dev), use nginx at https://localhost
// In production (Docker), use relative URLs which go through nginx
const getBaseURL = () => {
  // If running locally (not in Docker), use nginx directly
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Client-side: use nginx
    return 'https://localhost/api/';
  }
  // Server-side or Docker: use relative URL
  return '/api/';
};

const api = axios.create({
  baseURL: getBaseURL(),
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
      
      // Check if we're in solo mode - if so, don't redirect to login
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const isSoloMode = urlParams.get('mode') === 'solo';
        if (isSoloMode) {
          console.warn('Unauthorized in solo mode - continuing without auth');
          return Promise.reject(error);
        }
      }
      
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
