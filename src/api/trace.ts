import { api } from './client';

export interface TraceResponse {
  trace_id: string;
  command: string;
  trigger?: string | null;
  service_id?: string;
  status: 'running' | 'completed' | 'aborted' | string;
  started_at?: string;
  completed_at?: string;
  state?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
}

export async function getTrace(
  serviceId: string,
  traceId: string,
  accessToken: string,
): Promise<TraceResponse> {
  const res = await api.get<{ trace: TraceResponse }>(
    `/api/services/${encodeURIComponent(serviceId)}/traces/${encodeURIComponent(traceId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.data.trace;
}
