import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '../config/env';

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

export const api: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  response => {
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
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const envelope = error.response?.data;
    if (envelope && typeof envelope === 'object' && envelope.error) {
      return Promise.reject(
        new ApiError(envelope.error.code, envelope.error.message, error.response?.status),
      );
    }
    return Promise.reject(error);
  },
);
