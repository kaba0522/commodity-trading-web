/**
 * Reusable API client for the Commodity Trading backend
 * (D:\Tradding_backend, mounted at /api/v1).
 *
 * Backend contract (verified against routes/*, controllers/*, lib/*):
 * - Base URL: `${VITE_API_BASE_URL}` — set it to the /api/v1 prefix,
 *   e.g. http://localhost:3000/api/v1
 * - Auth: `Authorization: Bearer <accessToken>` (middleware/auth.js).
 *   Access tokens expire after 15m -> this client refreshes once via
 *   POST /auth/refresh { refreshToken } and retries the original request.
 * - Success envelope: { success: true, data, meta? } (lib/response.js).
 *   This client unwraps `data`; use requestWithMeta when you need `meta`.
 * - Error envelope: { success: false, error: { code, message } }
 *   (middleware/errorHandler.js). Notable codes: TOS_ACCEPTANCE_REQUIRED,
 *   Forbidden/UNAUTHORIZED.
 * - 204 No Content on category/commodity DELETE (empty body).
 */

import { clearSession, loadSession, saveAccessToken } from './tokenStore';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? '').replace(/\/$/, '');

export const isBackendConfigured = () => BASE_URL.length > 0;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

let onAuthExpired: (() => void) | null = null;
/** Registered by AuthContext so a dead refresh token signs the user out. */
export function setOnAuthExpired(fn: (() => void) | null) {
  onAuthExpired = fn;
}

/** Drop the persisted session and let AuthContext redirect to /login. */
function expireSession() {
  clearSession();
  onAuthExpired?.();
}

function parseErrorBody(body: unknown, status: number): { code: string; message: string } {
  if (body && typeof body === 'object') {
    const b = body as { error?: { code?: string; message?: string }; message?: string };
    if (b.error && (b.error.message || b.error.code)) {
      return { code: b.error.code ?? `HTTP_${status}`, message: b.error.message ?? `Request failed (${status})` };
    }
    if (typeof b.message === 'string') return { code: `HTTP_${status}`, message: b.message };
  }
  return { code: `HTTP_${status}`, message: `Request failed (${status})` };
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body) {
    return (body as unknown as { data: T }).data;
  }
  return body as T;
}

async function rawFetch(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function refreshAccessToken(): Promise<string | null> {
  const session = loadSession();
  if (!session?.refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const body = await readBody(res);
    if (!res.ok || !body) return null;
    const data = unwrap<{ accessToken: string }>(body);
    if (!data?.accessToken) return null;
    saveAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, 'NO_BACKEND', 'Backend not configured — set VITE_API_BASE_URL to enable live data.');
  }
  const token = loadSession()?.accessToken ?? null;
  let res: Response;
  try {
    res = await rawFetch(path, init, token);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the backend. Is it running?');
  }

  if (res.status === 401) {
    if (retry && loadSession()?.refreshToken) {
      const next = await refreshAccessToken();
      if (next) return request<T>(path, init, false);
    }
    // No refresh token, refresh failed, or the retried request was rejected:
    // the session is dead, so sign out and send the user to /login.
    expireSession();
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired — please sign in again.');
  }

  const body = await readBody(res);
  if (!res.ok) {
    const { code, message } = parseErrorBody(body, res.status);
    throw new ApiError(res.status, code, message);
  }
  return unwrap<T>(body);
}

export interface MetaResult<T> {
  data: T;
  meta: PageMeta | undefined;
}

async function requestWithMeta<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<MetaResult<T>> {
  if (!BASE_URL) {
    throw new ApiError(0, 'NO_BACKEND', 'Backend not configured — set VITE_API_BASE_URL to enable live data.');
  }
  const token = loadSession()?.accessToken ?? null;
  let res: Response;
  try {
    res = await rawFetch(path, init, token);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the backend. Is it running?');
  }
  if (res.status === 401) {
    if (retry && loadSession()?.refreshToken) {
      const next = await refreshAccessToken();
      // Only retry once so a rejected token can never loop forever.
      if (next) return requestWithMeta<T>(path, init, false);
    }
    expireSession();
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired — please sign in again.');
  }
  const body = await readBody(res);
  if (!res.ok) {
    const { code, message } = parseErrorBody(body, res.status);
    throw new ApiError(res.status, code, message);
  }
  const raw = body as { data: T; meta?: PageMeta };
  return { data: raw?.data as T, meta: raw?.meta };
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getPage: <T>(path: string) => requestWithMeta<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path: string) =>
    request<null>(path, { method: 'DELETE' }),
  /** DELETE that expects a JSON body in the response (soft-delete pattern). */
  delTyped: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
