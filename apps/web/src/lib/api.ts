import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';

export type AuthContext = {
  getToken: (options?: { template?: string }) => Promise<string | null>;
};

export type ApiOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  token?: string;
  auth?: AuthContext;
};

const defaultHeaders = {
  'content-type': 'application/json',
};

const withBase = (baseUrl: string | undefined, path: string): string => {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

const resolveToken = async (options?: ApiOptions): Promise<string | undefined> => {
  if (!options) return undefined;
  if (options.token) return options.token;
  if (options.auth) {
    const token = await options.auth.getToken();
    return token ?? undefined;
  }
  return undefined;
};

async function request<T>(path: string, init?: RequestInit, options?: ApiOptions): Promise<T> {
  const url = withBase(options?.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '/api', path);
  const token = await resolveToken(options);

  const response = await fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) => request<T>(path, { method: 'GET' }, options),
  post: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      options
    ),
  put: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(
      path,
      {
        method: 'PUT',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      options
    ),
  patch: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(
      path,
      {
        method: 'PATCH',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      options
    ),
  delete: <T>(path: string, options?: ApiOptions) =>
    request<T>(path, { method: 'DELETE' }, options),
};

export const createAuthedApi = (auth: AuthContext, defaults?: Omit<ApiOptions, 'auth'>) => ({
  get: <T>(path: string, options?: Omit<ApiOptions, 'auth'>) =>
    api.get<T>(path, { ...defaults, ...options, auth }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiOptions, 'auth'>) =>
    api.post<T>(path, body, { ...defaults, ...options, auth }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiOptions, 'auth'>) =>
    api.put<T>(path, body, { ...defaults, ...options, auth }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiOptions, 'auth'>) =>
    api.patch<T>(path, body, { ...defaults, ...options, auth }),
  delete: <T>(path: string, options?: Omit<ApiOptions, 'auth'>) =>
    api.delete<T>(path, { ...defaults, ...options, auth }),
});

export const useApi = (defaults?: Omit<ApiOptions, 'auth'>) => {
  const auth = useAuth();
  return useMemo(() => createAuthedApi(auth, defaults), [auth, defaults]);
};
