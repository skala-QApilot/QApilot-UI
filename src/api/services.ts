import { api } from './client';

export interface ServiceDto {
  service_id: string;
  project_slug: string;
  display_name: string;
  description: string;
  target_root: string;
  qapilot_dir: string;
  dashboard_url: string;
  server_auth_token: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCreatePayload {
  name: string;
  description?: string;
  target_root?: string;
}

export interface ServiceSetupPayload {
  description?: string;
}

export async function listServices(): Promise<ServiceDto[]> {
  const res = await api.get<{ services: ServiceDto[]; count: number }>('/api/services');
  return res.data.services;
}

export async function getService(serviceId: string): Promise<ServiceDto> {
  const res = await api.get<{ service: ServiceDto }>(
    `/api/services/${encodeURIComponent(serviceId)}`,
  );
  return res.data.service;
}

export async function createService(payload: ServiceCreatePayload): Promise<ServiceDto> {
  const res = await api.post<{ service: ServiceDto }>('/api/services', payload);
  return res.data.service;
}

export async function setupService(
  serviceId: string,
  payload: ServiceSetupPayload,
): Promise<ServiceDto> {
  const res = await api.post<{ service: ServiceDto }>(
    `/api/services/${encodeURIComponent(serviceId)}/setup`,
    payload,
  );
  return res.data.service;
}
