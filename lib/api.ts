// lib/api.ts
// Typed REST client for the Earnicle FastAPI backend.
// All API calls go through this module (see AGENTS.md).
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://earnicle-backend.onrender.com';

// ---------------------------------------------------------------------------
// Token persistence (expo-secure-store; localStorage fallback for web)
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_KEY = 'earnicle_access_token';
const REFRESH_TOKEN_KEY = 'earnicle_refresh_token';

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Acceptance flag for Terms/Privacy (persisted per-device)
// ---------------------------------------------------------------------------
const ACCEPTED_TERMS_KEY = 'earnicle_accepted_terms';

export async function getAcceptedTerms(): Promise<boolean> {
  const v = await getItem(ACCEPTED_TERMS_KEY);
  return v === 'true';
}

export async function setAcceptedTerms(value: boolean): Promise<void> {
  await setItem(ACCEPTED_TERMS_KEY, value ? 'true' : 'false');
}

// ---------------------------------------------------------------------------
// Last auth action (signed_out) — used to direct UI after logout
// ---------------------------------------------------------------------------
const LAST_ACTION_KEY = 'earnicle_last_action';

export async function setLastAuthAction(value: string): Promise<void> {
  await setItem(LAST_ACTION_KEY, value);
}

export async function getLastAuthAction(): Promise<string | null> {
  return getItem(LAST_ACTION_KEY);
}

export async function clearLastAuthAction(): Promise<void> {
  await deleteItem(LAST_ACTION_KEY);
}

// ---------------------------------------------------------------------------
// Types (mirror the backend schemas)
// ---------------------------------------------------------------------------

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: 'reader' | 'writer' | 'both';
  bio: string | null;
  avatar_url: string | null;
  followers: number;
  following: number;
  total_earnings: number;
  total_stories: number;
  is_writer: boolean;
  is_top_writer: boolean;
  is_pro_member: boolean;
  created_at: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// fetch wrapper: JSON headers, auth header, error shaping, auto refresh-on-401
// ---------------------------------------------------------------------------

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return false;
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
          await clearTokens();
          return false;
        }
        const data = (await res.json()) as TokenResponse;
        await setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        await clearTokens();
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function request<T>(path: string, { method = 'GET', body, auth = false }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !path.startsWith('/auth/refresh')) {
    const ok = await refreshTokens();
    if (ok) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && typeof data.detail === 'string') detail = data.detail;
    } catch {
      // keep fallback message
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export const authApi = {
  signup: (full_name: string, email: string, password: string) =>
    request<TokenResponse>('/auth/signup', { method: 'POST', body: { full_name, email, password } }),

  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: { email, password } }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resendOtp: (email: string) =>
    request<{ message: string }>('/auth/resend-otp', { method: 'POST', body: { email } }),

  verifyOtp: (email: string, code: string) =>
    request<TokenResponse>('/auth/verify-otp', { method: 'POST', body: { email, code } }),

  resetPassword: (email: string, reset_token: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { email, reset_token, new_password },
    }),

  getMe: () => request<Profile>('/auth/me', { auth: true }),

  chooseRole: (role: Profile['role']) =>
    request<Profile>('/auth/choose-role', { method: 'POST', auth: true, body: { role } }),
};