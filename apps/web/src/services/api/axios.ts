import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import {
  clearStoredAuthSession,
  getStoredAuthTokens,
  setStoredAuthTokens,
  type StoredAuthTokens,
} from '../authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let refreshRequest: Promise<StoredAuthTokens | null> | null = null;

function withAuthPath(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.replace(/^\//, '');
  return `${base}/${normalizedPath}`;
}

async function refreshAccessToken(refreshToken: string): Promise<StoredAuthTokens | null> {
  if (!refreshRequest) {
    refreshRequest = axios
      .post(withAuthPath('auth/refresh'), { refreshToken })
      .then((response) => {
        const payload = (response.data?.data ?? response.data) as Partial<StoredAuthTokens>;
        if (!payload.accessToken) return null;

        const current = getStoredAuthTokens();
        const nextTokens: StoredAuthTokens = {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken ?? refreshToken,
          expiresInSeconds: payload.expiresInSeconds ?? current?.expiresInSeconds,
        };
        setStoredAuthTokens(nextTokens);
        return nextTokens;
      })
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

axiosClient.interceptors.request.use((config) => {
  const tokens = getStoredAuthTokens();
  if (!tokens?.accessToken) return config;

  if (!(config.headers instanceof AxiosHeaders)) {
    config.headers = new AxiosHeaders(config.headers);
  }

  config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const tokens = getStoredAuthTokens();
    if (!tokens?.refreshToken) {
      clearStoredAuthSession();
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshedTokens = await refreshAccessToken(tokens.refreshToken);
    if (!refreshedTokens?.accessToken) {
      clearStoredAuthSession();
      return Promise.reject(error);
    }

    if (!(original.headers instanceof AxiosHeaders)) {
      original.headers = new AxiosHeaders(original.headers);
    }
    original.headers.set('Authorization', `Bearer ${refreshedTokens.accessToken}`);

    return axiosClient(original);
  },
);