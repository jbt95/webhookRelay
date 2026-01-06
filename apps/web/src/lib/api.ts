type ApiOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
};

const defaultHeaders = {
  'content-type': 'application/json',
};

const withBase = (baseUrl: string | undefined, path: string): string => {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

async function request<T>(path: string, init?: RequestInit, options?: ApiOptions): Promise<T> {
  const url = withBase(options?.baseUrl, path);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
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
