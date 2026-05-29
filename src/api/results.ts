import { api } from './client';

export interface TestResult {
  trace_id: string;
  command: string;
  status: 'running' | 'completed' | 'aborted' | string;
  started_at: string;
  completed_at: string;
  error?: string | null;
  confidence?: number | null;
  total_cost: number;
  result_summary?: Record<string, unknown>;
  pass_count: number;
  fail_count: number;
  total_tc_count: number;
}

export interface ResultStatistics {
  total: number;
  passed: number;
  failed: number;
  passRate: number | null;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/results`;
}

export async function listResults(
  serviceId: string,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ results: TestResult[]; count: number; total: number }> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get<{ results: TestResult[]; count: number; total: number }>(
    `${basePath(serviceId)}${suffix}`,
  );
  return res.data;
}

export async function getResult(serviceId: string, traceId: string): Promise<TestResult> {
  const res = await api.get<{ result: TestResult }>(
    `${basePath(serviceId)}/${encodeURIComponent(traceId)}`,
  );
  return res.data.result;
}

export async function getStatistics(serviceId: string): Promise<ResultStatistics> {
  const res = await api.get<{ statistics: ResultStatistics }>(
    `${basePath(serviceId)}/statistics`,
  );
  return res.data.statistics;
}
