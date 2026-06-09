import { api } from './client';

export type ChangeRequestTrigger = 'file' | 'chatbot' | 'code' | string;
export type ChangeRequestStatus = 'approved' | 'deferred' | 'rejected' | null;

export interface ChangeRequest {
  requestId: string;
  scenarioId: string;
  reason: string;
  trigger: ChangeRequestTrigger;
  status: ChangeRequestStatus;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  reviewer?: string | null;
  /** 변경이 집중된 하위 대상 id (예: target_tc_id) — TS 전체가 아닌 특정 TC만 강조하고 싶을 때 사용 */
  targetId?: string | null;
  /** jsonb 직렬화 문자열. 예: '{"changed_tc_ids": ["TC-02"]}' — JSON.parse 후 사용 */
  content?: string | null;
}

export interface UpdateChangeRequestPayload {
  status?: 'approved' | 'deferred' | 'rejected';
  reviewer?: string;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/scenario-change-requests`;
}

export async function listChangeRequests(
  serviceId: string,
  options: { status?: string; trigger?: string } = {},
): Promise<ChangeRequest[]> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.trigger) params.set('trigger', options.trigger);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get<{ requests: ChangeRequest[]; count: number }>(
    `${basePath(serviceId)}${suffix}`,
  );
  return res.data.requests;
}

export async function updateChangeRequest(
  serviceId: string,
  requestId: string,
  payload: UpdateChangeRequestPayload,
): Promise<ChangeRequest> {
  const res = await api.patch<{ request: ChangeRequest }>(
    `${basePath(serviceId)}/${encodeURIComponent(requestId)}`,
    payload,
  );
  return res.data.request;
}
