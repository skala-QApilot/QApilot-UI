import { api } from './client';

export interface Defect {
  id: string;
  service_id: string;
  run_id: string;
  tc_result_id: string | null;
  ts_id: string;
  tc_id: string;
  category: 'UI_ERROR' | 'API_ERROR' | 'DATA_MISMATCH' | 'INFRA' | 'DOMAIN_RULE' | string;
  // ①장애유형 — ②결정분류(category)와 분리된 서버 V19 필드. product 결함만 값(없으면 null).
  defect_type: 'UI_ERROR' | 'API_ERROR' | 'DATA_MISMATCH' | 'INFRA' | 'DOMAIN_RULE' | null;
  root_cause_top1: string | null;
  root_cause_confidence: number | null;
  solution_guide: string | null;
  assignee: string | null;
  file_location: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  created_at: string;
  updated_at: string;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/defects`;
}

export async function listDefects(
  serviceId: string,
  opts?: { runId?: string; status?: string },
): Promise<Defect[]> {
  const params = new URLSearchParams();
  if (opts?.runId) params.set('run_id', opts.runId);
  if (opts?.status) params.set('status', opts.status);
  const qs = params.toString();
  const url = qs ? `${basePath(serviceId)}?${qs}` : basePath(serviceId);
  const res = await api.get<{ defects: Defect[]; count: number }>(url);
  return res.data.defects;
}
