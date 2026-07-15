import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

const isAuthRequest = (url = '') => AUTH_PATHS.some((path) => url.includes(path));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const isAuth = isAuthRequest(config.url);

  console.log(`[Axios Request] URL: ${config.url} | isAuthRequest: ${isAuth} | Token Present: ${!!token}`);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!isAuth) {
    // Ensure Authorization header is present even if token is missing
    config.headers.Authorization = 'Bearer ';
    console.warn(`[Axios Warning] Sending request to protected path without accessToken: ${config.url}`);
  }

  console.log(`[Axios Request Header] Authorization: ${config.headers.Authorization ? 'Set (Bearer ...)' : 'Missing!'}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[Axios Response] Success URL: ${response.config.url} | Status: ${response.status}`);
    return response;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    console.error(`[Axios Response Error] URL: ${original?.url} | Status: ${status} | Message: ${error.message}`);

    // Do not run refresh/redirect logic for login/register failures
    if (!original || isAuthRequest(original.url) || status !== 401) {
      return Promise.reject(error);
    }

    if (original._retry) {
      console.warn(`[Axios Retry] Failed on retry for URL: ${original.url}`);
      return Promise.reject(error);
    }

    original._retry = true;
    console.log(`[Axios Security] Unauthorized (401). Attempting token refresh...`);

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.warn(`[Axios Security] Refresh token missing in localStorage. Forcing logout.`);
        throw new Error('No refresh token');
      }

      console.log(`[Axios Security] Sending refresh request to ${API_URL}/auth/refresh...`);
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      
      console.log(`[Axios Security] Token refresh successful. Storing new accessToken.`);
      localStorage.setItem('accessToken', data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      
      console.log(`[Axios Security] Retrying original request to ${original.url}...`);
      return api(original);
    } catch (refreshErr) {
      console.error(`[Axios Security] Token refresh failed:`, refreshErr.message || refreshErr);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (!window.location.pathname.includes('/login')) {
        console.log(`[Axios Security] Redirecting to login page.`);
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  }
);

export const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Cannot reach server. Make sure the backend is running on port 5001 (npm run dev).';
  }
  return error.response?.data?.message || fallback;
};
