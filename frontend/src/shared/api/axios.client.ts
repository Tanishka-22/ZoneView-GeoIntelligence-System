import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * The configured Axios instance for all ZoneView API calls.
 *
 * Features:
 * - Automatically attaches Authorization header from localStorage
 * - Intercepts 401 responses and transparently refreshes the access token
 * - Retries the original request after a successful refresh
 * - Redirects to login if the refresh token is also expired
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────
// Attach the access token to every outgoing request

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ────────────────────────────────────
// Handle 401 errors by refreshing the access token

let isRefreshing = false;
// Queue of requests waiting for the token refresh to complete
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if the failing request IS the refresh call
    if (originalRequest.url?.includes('/auth/refresh')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If a refresh is already in progress, queue this request
    // and wait for it to complete rather than making multiple refresh calls
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } =
        response.data.data.tokens;

      // Store new tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Retry all queued requests with the new token
      failedRequestsQueue.forEach(({ resolve }) => resolve(accessToken));
      failedRequestsQueue = [];

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed — session is over
      failedRequestsQueue.forEach(({ reject }) => reject(refreshError));
      failedRequestsQueue = [];
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;