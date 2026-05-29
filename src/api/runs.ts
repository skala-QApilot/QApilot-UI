import { api } from './client';

export interface Run {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'aborted' | string;
  startTime: string;
  completedAt?: string;
  error?: string | null;
  result_summary?: Record<string, unknown>;
}

export interface RunCreatePayload {
  scenario_ids?: string[];
  filter?: 'all' | 'failed' | 'affected' | string;
  tags?: string[];
  /** 지정된 trace 의 완료 TC 는 새 실행에서 자동 skip — 이어서 실행. */
  resume_from_trace?: string;
}

export interface AgentProgress {
  stages: unknown[];
  pass: number;
  fail: number;
  hitl_pending: number;
  status: string;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/runs`;
}

export async function startRun(
  serviceId: string,
  payload: RunCreatePayload,
): Promise<Run> {
  const res = await api.post<{ run_id: string; status: string }>(basePath(serviceId), payload);
  return {
    id: res.data.run_id,
    name: `test - ${res.data.run_id.slice(0, 8)}`,
    status: res.data.status,
    startTime: new Date().toISOString(),
  };
}

export async function listActiveRuns(serviceId: string): Promise<Run[]> {
  const res = await api.get<{ runs: Run[]; count: number }>(`${basePath(serviceId)}/active`);
  return res.data.runs;
}

/** 새로고침 후 이력 복원용 — running + completed 모든 test run. */
export async function listAllRuns(serviceId: string): Promise<Run[]> {
  const res = await api.get<{ runs: Run[]; count: number }>(basePath(serviceId));
  return res.data.runs;
}

export async function getRun(serviceId: string, runId: string): Promise<Run> {
  const res = await api.get<{ run: Run }>(
    `${basePath(serviceId)}/${encodeURIComponent(runId)}`,
  );
  return res.data.run;
}

export async function getAgentProgress(
  serviceId: string,
  runId: string,
): Promise<AgentProgress> {
  const res = await api.get<AgentProgress>(
    `${basePath(serviceId)}/${encodeURIComponent(runId)}/agent-progress`,
  );
  return res.data;
}

export interface RunProgressItem {
  ts_id: string;
  tc_id: string;
  ui?: Record<string, unknown> | null;
  api?: Record<string, unknown> | null;
  db?: Record<string, unknown> | null;
}

export interface RunProgress {
  trace_id: string;
  items: RunProgressItem[];
  count: number;
}

/** Layer 2 진행 상황 — 디스크 results 스캔 결과. UI 의 1초 폴링이 호출. */
export async function getRunProgress(
  serviceId: string,
  runId: string,
): Promise<RunProgress> {
  const res = await api.get<RunProgress>(
    `${basePath(serviceId)}/${encodeURIComponent(runId)}/run-progress`,
  );
  return res.data;
}

/**
 * 가장 최근 PNG 스크린샷을 Blob URL 로 반환. 결과 없으면 null.
 * 호출자는 사용 후 `URL.revokeObjectURL()` 로 메모리 해제 필요.
 */
export async function fetchLatestScreenshotUrl(
  serviceId: string,
  runId: string,
): Promise<string | null> {
  const res = await api.get<Blob>(
    `${basePath(serviceId)}/${encodeURIComponent(runId)}/screenshot/latest`,
    { responseType: 'blob' },
  );
  if (!res.data || res.data.size === 0) return null;
  return URL.createObjectURL(res.data);
}
