import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

const resolveApiBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL || 'https://app.may22sim.com';
  url = url.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    url = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
};

const API_URL = resolveApiBaseUrl();

/**
 * Axios instance pointed at the Laravel API.
 *
 * Auth uses Sanctum personal access tokens (Authorization: Bearer <token>),
 * which is the recommended setup for mobile clients — no cookies or CSRF
 * handling required. See README.md for the expected Laravel routes.
 */
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 60000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onKycRequired: ((status?: string) => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Registered by AuthContext so a 401 anywhere logs the user out. */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Registered by KycGateContext so a 403 kyc_required anywhere triggers the gate modal. */
export function setOnKycRequired(handler: ((status?: string) => void) | null) {
  onKycRequired = handler;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/** Normalized error shape for the UI, covering Laravel's 422 validation format. */
export class ApiError extends Error {
  status: number | null;
  /** Laravel validation errors: { field: ["message", ...] } */
  errors: Record<string, string[]>;

  constructor(message: string, status: number | null, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  firstError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string; kyc_status?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status ?? null;

    if (status === 401 && authToken && onUnauthorized) {
      onUnauthorized();
    }

    if (status === 403 && error.response?.data?.error === 'kyc_required') {
      onKycRequired?.(error.response?.data?.kyc_status);
    }

    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Connection timed out. Your network seems slow, please try again.';
      } else if (status === null || error.code === 'ERR_NETWORK') {
        message = 'No internet connection. Please check your network.';
      } else {
        message = `Request failed (${status}).`;
      }
    }

    throw new ApiError(message, status, error.response?.data?.errors ?? {});
  }
);

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function errorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
