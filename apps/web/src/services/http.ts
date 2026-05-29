import axios, { type AxiosRequestConfig } from 'axios';
import {
  clearStoredAuthSession,
  getStoredAuthTokens,
  getStoredAuthUser,
  setStoredAuthTokens,
  setStoredAuthUser,
  type StoredAuthTokens,
  type StoredAuthUser,
} from './authStorage';
import { axiosClient } from './api/axios';

export interface RequestConfig {
  url: string;
  baseURL?: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text';
}

async function performRequest<T>(config: RequestConfig): Promise<T> {
  const requestConfig: AxiosRequestConfig = {
    url: config.url,
    baseURL: config.baseURL,
    method: (config.method ?? 'GET') as AxiosRequestConfig['method'],
    data: config.data,
    headers: config.headers,
    responseType: config.responseType === 'blob' || config.responseType === 'text' ? config.responseType : 'json',
  };

  const response = await axiosClient.request<T>(requestConfig);
  const payload = response.data as unknown;
  if (config.responseType === 'blob' || config.responseType === 'text') {
    return payload as T;
  }

  return ((payload as { data?: T })?.data ?? payload) as T;
}

export async function requestJSON<T>(config: RequestConfig, fallback?: T): Promise<T> {
  try {
    return await performRequest<T>(config);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredAuthSession();
    }
    if (import.meta.env.VITE_USE_MOCKS === 'true' && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

export const api = {
  async get<T = unknown>(url: string, config: { responseType?: 'json' | 'blob' | 'text'; headers?: Record<string, string> } = {}) {
    const data = await requestJSON<T>({ url, method: 'GET', responseType: config.responseType, headers: config.headers });
    return { data };
  },
  async post<T = unknown>(url: string, data?: unknown, config: { headers?: Record<string, string> } = {}) {
    const result = await requestJSON<T>({ url, method: 'POST', data, headers: config.headers });
    return { data: result };
  },
  async put<T = unknown>(url: string, data?: unknown, config: { headers?: Record<string, string> } = {}) {
    const result = await requestJSON<T>({ url, method: 'PUT', data, headers: config.headers });
    return { data: result };
  },
  async delete<T = unknown>(url: string, config: { headers?: Record<string, string> } = {}) {
    const result = await requestJSON<T>({ url, method: 'DELETE', headers: config.headers });
    return { data: result };
  },
};

export {
  clearStoredAuthSession,
  getStoredAuthTokens,
  getStoredAuthUser,
  setStoredAuthTokens,
  setStoredAuthUser,
};
export type { StoredAuthTokens, StoredAuthUser };