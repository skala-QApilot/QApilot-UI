import { api } from './client';

export interface Run {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | string;
  startTime: string;
  completedAt?: string;
  error?: string | null;
  result_summary?: Record<string, unknown>;
}

export interface RunCreatePayload {
  scenario_ids?: string[];
  filter?: 'all' | 'failed' | 'affected' | string;
  tags?: string[];
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
