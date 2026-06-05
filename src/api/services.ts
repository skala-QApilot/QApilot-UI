import { api } from './client';

/** 응답용 repo 메타 — PAT 실제 값은 없고 존재 여부(token_set)만 내려온다. */
export interface RepoConfigResponse {
  repo_url: string;
  branch?: string | null;
  role?: string | null;
  token_set?: boolean;
}

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
  repos?: RepoConfigResponse[] | null;
  staging_url?: string | null;
}

/**
 * Spring `RepoConfig` 와 wire 포맷 일치. branch/role 미입력 시 null —
 * FastAPI 가 default 적용 ("main" / URL-derived).
 */
export interface RepoConfigPayload {
  repo_url: string;
  token?: string | null;
  branch?: string | null;
  role?: string | null;
}

export interface ServiceCreatePayload {
  name: string;
  description?: string;
  target_root?: string;
  repos?: RepoConfigPayload[];
  staging_url?: string;
}

export interface ServiceSetupPayload {
  description?: string;
}

/**
 * 서비스 수정 payload. 미입력(undefined) 필드는 서버가 변경하지 않는다.
 * repos 의 token 을 비우면(빈 문자열/null) 서버가 기존 PAT 를 그대로 보존한다.
 */
export interface ServiceUpdatePayload {
  name?: string;
  description?: string;
  repos?: RepoConfigPayload[];
  staging_url?: string;
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

export async function updateService(
  serviceId: string,
  payload: ServiceUpdatePayload,
): Promise<ServiceDto> {
  const res = await api.patch<{ service: ServiceDto }>(
    `/api/services/${encodeURIComponent(serviceId)}`,
    payload,
  );
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
