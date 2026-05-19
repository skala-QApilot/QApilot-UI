/**
 * 환경변수 단일 진입점.
 *
 * - 개발: vite proxy로 `/api/*` 가 8080으로 포워딩되므로 baseURL은 비워두고 상대 경로 사용
 * - 배포: VITE_API_BASE_URL 절대 URL 지정
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  isDev: import.meta.env.DEV,
} as const;
