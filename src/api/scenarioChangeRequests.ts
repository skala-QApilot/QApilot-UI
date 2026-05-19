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
