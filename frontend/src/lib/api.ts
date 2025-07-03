import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
});

api.interceptors.request.use(async (config) => {
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    if (session?.refreshToken) {
      config.headers['X-Refresh-Token'] = session.refreshToken;
    }
    return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is due to an expired token, try to refresh it
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const session = await getSession();

      if (session?.refreshToken) {
        try {
          const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}user-auth/refresh`, {
            refresh_token: session.refreshToken,
          });

          // Update session with new tokens
          session.accessToken = response.data.access_token;
          session.refreshToken = response.data.refresh_token;

          // Update the request headers with new tokens
          originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
          originalRequest.headers['X-Refresh-Token'] = session.refreshToken;

          return api(originalRequest);
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          signOut({ callbackUrl: '/login' });
        }
      } else {
        signOut({ callbackUrl: '/login' });
      }
    }

    return Promise.reject(error);
  }
);

export default api;