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
