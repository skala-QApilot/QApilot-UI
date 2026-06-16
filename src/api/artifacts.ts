import { api } from './client';

export interface UiStep {
  step_no: number;
  action: string;
  status: 'pass' | 'fail' | 'skip' | string;
  screenshot_path?: string | null;
  console_logs?: string[];
  error?: string | null;
  duration_ms?: number;
}

export interface UiResult {
  tc_id: string;
  status: 'pass' | 'fail' | string;
  steps: UiStep[];
  total_duration_ms?: number;
}

function basePath(serviceId: string, traceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/results/${encodeURIComponent(traceId)}`;
}

/** TC 한 건의 ui_result.json 본문 — tc_results.payload (DB) 에서 즉시 읽음. */
export async function getTcResult(
  serviceId: string,
  traceId: string,
  tsId: string,
  tcId: string,
): Promise<UiResult | null> {
  const params = new URLSearchParams({ ts_id: tsId, tc_id: tcId });
  try {
    const res = await api.get<{ ui_result: UiResult }>(
      `${basePath(serviceId, traceId)}/tc-result?${params}`,
    );
    return res.data.ui_result ?? null;
  } catch {
    return null;
  }
}

/** 스크린샷 endpoint URL — <img src=...> 에 그대로 바인딩. step 기본 1 (fail step). */
export function tcScreenshotUrl(
  serviceId: string,
  traceId: string,
  tsId: string,
  tcId: string,
  step = 1,
): string {
  const params = new URLSearchParams({ ts_id: tsId, tc_id: tcId, step: String(step) });
  return `${basePath(serviceId, traceId)}/tc-screenshot?${params}`;
}

/**
 * 스크린샷을 Blob URL 로 반환 (정석). tc-screenshot 엔드포인트는 인증 필요라
 * <img src=endpoint> 로 직접 로드하면 브라우저가 Authorization 헤더를 못 실어 401.
 * authed `api` 클라이언트로 받아 objectURL 로 변환한다 (runs.fetchLatestScreenshotUrl 동일 패턴).
 * 호출자는 사용 후 URL.revokeObjectURL() 로 해제할 것.
 */
export async function fetchTcScreenshotUrl(endpointUrl: string): Promise<string | null> {
  try {
    const res = await api.get<Blob>(endpointUrl, { responseType: 'blob' });
    if (!res.data || res.data.size === 0) return null;
    return URL.createObjectURL(res.data);
  } catch {
    return null;
  }
}

export interface TcResultItem {
  ts_id: string;
  tc_id: string;
  kind: string;                          // ui / api / db
  status: string | null;                 // passed / failed / skipped
}

export interface ActionStep {
  step_no: number;
  action: string;                        // navigate / fill / click / assert ...
  target_name?: string | null;
  target_kind?: string | null;
  value?: string | null;
  api_endpoint?: string | null;          // 이 스텝이 호출하도록 매핑된 API
}

export interface ActionMapping {
  tc_id?: string;
  steps: ActionStep[];
}

export interface ApiCall {
  method: string;
  url: string;
  status_code?: number | null;
  latency_ms?: number | null;
  matched_step_no?: number | null;
}

export interface ApiResult {
  tc_id?: string;
  calls: ApiCall[];
  total_calls?: number;
  error_calls?: number;
}

/** TC 의 api_result (실제 API 호출 내역) — tc_results.payload(kind=api). */
export async function getApiResult(
  serviceId: string,
  traceId: string,
  tsId: string,
  tcId: string,
): Promise<ApiResult | null> {
  const params = new URLSearchParams({ ts_id: tsId, tc_id: tcId, kind: 'api' });
  try {
    const res = await api.get<{ ui_result: ApiResult }>(
      `${basePath(serviceId, traceId)}/tc-result?${params}`,
    );
    return res.data.ui_result ?? null;
  } catch {
    return null;
  }
}

/** TC 의 ActionMapping (어떤 동작 → 어떤 API) — action_mappings 최신 version. */
export async function getActionMapping(
  serviceId: string,
  traceId: string,
  tcId: string,
): Promise<ActionMapping | null> {
  const params = new URLSearchParams({ tc_id: tcId });
  try {
    const res = await api.get<{ action_mapping: ActionMapping }>(
      `${basePath(serviceId, traceId)}/tc-action-mapping?${params}`,
    );
    return res.data.action_mapping ?? null;
  } catch {
    return null;
  }
}

/** run 의 모든 TC 결과 목록 (kind/status) — PASS/FAIL 리스트 채우기용 (tc_results 직접조회). */
export async function listTcResults(
  serviceId: string,
  traceId: string,
): Promise<TcResultItem[]> {
  try {
    const res = await api.get<{ tc_results: TcResultItem[] }>(
      `${basePath(serviceId, traceId)}/tc-results`,
    );
    return res.data.tc_results ?? [];
  } catch {
    return [];
  }
}
