import { api } from './client';

/**
 * Spring `ServiceCreateRequest` 와 wire 포맷 일치.
 * branch/role 미입력 시 null — FastAPI 가 default 적용 ("main" / URL-derived).
 */
export interface RepoConfigPayload {
  repo_url: string;
  token?: string | null;
  branch?: string | null;
  role?: string | null;
}

export interface CreateServicePayload {
  name: string;
  description?: string;
  target_root?: string;
  repos?: RepoConfigPayload[];
  staging_url?: string;
}

export interface ServiceResponse {
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

/** 새 서비스 등록 — Spring POST /api/services. */
export async function createService(
  payload: CreateServicePayload,
  accessToken: string,
): Promise<ServiceResponse> {
  const res = await api.post<{ service: ServiceResponse }>(
    '/api/services',
    payload,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.data.service;
}
