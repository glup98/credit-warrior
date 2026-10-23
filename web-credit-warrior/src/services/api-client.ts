import type { ValidationErrorItem } from '@/types/api.types';

/**
 * Normalized API error class representing HTTP errors and validation issues.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string | ValidationErrorItem[],
  ) {
    super(typeof detail === 'string' ? detail : 'Error de validación en los datos enviados');
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isDomainError(): boolean {
    return typeof this.detail === 'string';
  }

  get isValidationError(): boolean {
    return Array.isArray(this.detail);
  }

  get validationErrors(): ValidationErrorItem[] {
    return Array.isArray(this.detail) ? this.detail : [];
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Serializes query parameters into a query string, filtering out null, undefined, and empty values.
 */
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Base HTTP request execution handler with error normalization and 204 support.
 */
export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  queryParams?: Record<string, unknown>,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}${buildQueryString(queryParams)}`;

  const headers: Record<string, string> = {};
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.headers) {
    if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
      options.headers.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [key, val] of options.headers) {
        headers[key] = val;
      }
    } else {
      Object.assign(headers, options.headers as Record<string, string>);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    let errorDetail: string | ValidationErrorItem[] = 'Error en la petición';
    try {
      const errorBody = (await response.json()) as { detail?: string | ValidationErrorItem[] };
      if (errorBody && errorBody.detail !== undefined) {
        errorDetail = errorBody.detail;
      } else {
        errorDetail = response.statusText || 'Error inesperado del servidor';
      }
    } catch {
      errorDetail = response.statusText || 'Error inesperado del servidor';
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json();
}

/**
 * Typed API Client exposing standard HTTP methods.
 */
interface ApiClientCallable {
  <T>(endpoint: string, options?: RequestInit, queryParams?: Record<string, unknown>): Promise<T>;
  get<T>(endpoint: string, params?: Record<string, unknown>, init?: RequestInit): Promise<T>;
  post<T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T>;
  put<T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T>;
  patch<T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T>;
  delete<T = void>(endpoint: string, init?: RequestInit): Promise<T>;
}

const client = request as unknown as ApiClientCallable;

client.get = <T>(endpoint: string, params?: Record<string, unknown>, init?: RequestInit): Promise<T> =>
  request<T>(endpoint, { ...init, method: 'GET' }, params);

client.post = <T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T> =>
  request<T>(endpoint, {
    ...init,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

client.put = <T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T> =>
  request<T>(endpoint, {
    ...init,
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

client.patch = <T>(endpoint: string, body?: unknown, init?: RequestInit): Promise<T> =>
  request<T>(endpoint, {
    ...init,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

client.delete = <T = void>(endpoint: string, init?: RequestInit): Promise<T> =>
  request<T>(endpoint, { ...init, method: 'DELETE' });

export const apiClient = client;
