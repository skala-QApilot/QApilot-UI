import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '../store/authStore';

/**
 * Spring `ApiResponse<T>` 봉투 형태.
 */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/**
 * 서버에서 success=false 로 내려준 비즈니스 에러.
 */
export class ApiError extends Error {
  constructor(public code: string, public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean;
  _skipAuth?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: 토큰 자동 첨부 ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const cfg = config as RetryableRequestConfig;
  if (cfg._skipAuth) return config;
  if (config.headers.Authorization) return config; // 호출자가 이미 지정함

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (env.isDev) {
    const headers = { ...(config.headers as Record<string, string>) };
    if (headers.Authorization) {
      headers.Authorization = '[REDACTED]';
    }
    console.log('[API REQUEST]', {
      method: config.method,
      url: config.url,
      accessToken: token,
      authorizationHeader: config.headers.Authorization,
      headers,
      body: config.data,
    });
  }

  return config;
});

// ── 401 refresh 동시성 가드 ────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = useAuthStore
      .getState()
      .refresh()
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// 인증 만료로 강제 로그아웃되었을 때 트리거 — App 쪽에서 구독해서 redirect
type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();
export function onAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.add(listener);
  return () => authExpiredListeners.delete(listener);
}
function emitAuthExpired() {
  authExpiredListeners.forEach((fn) => fn());
}

// ── Response interceptor: envelope unwrap + 401 refresh ───────────────────
api.interceptors.response.use(
  (response) => {
    if (env.isDev) {
      console.log('[API RESPONSE]', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    const body = response.data as ApiEnvelope<unknown> | unknown;
    if (body && typeof body === 'object' && 'success' in body) {
      const envelope = body as ApiEnvelope<unknown>;
      if (envelope.success === false && envelope.error) {
        return Promise.reject(
          new ApiError(envelope.error.code, envelope.error.message, response.status),
        );
      }
      response.data = envelope.data;
    }
    return response;
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    if (env.isDev) {
      console.log('[API RESPONSE ERROR]', {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      });
    }

    const status = error.response?.status;
    const original = error.config as RetryableRequestConfig | undefined;

    // 401 처리 — refresh 후 재시도
    if (
      status === 401 &&
      original &&
      !original._authRetry &&
      !original._skipAuth &&
      !isAuthEndpoint(original.url)
    ) {
      const newToken = await getRefreshedToken();
      if (newToken) {
        original._authRetry = true;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // refresh 실패 — 세션 만료
      useAuthStore.getState().logout();
      emitAuthExpired();
    }

    // 서버가 봉투로 내려준 비즈니스 에러는 ApiError 로 변환
    const envelope = error.response?.data;
    if (envelope && typeof envelope === 'object' && envelope.error) {
      return Promise.reject(
        new ApiError(envelope.error.code, envelope.error.message, status),
      );
    }
    return Promise.reject(error);
  },
);

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh')
  );
}
