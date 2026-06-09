import { api } from './client';
import type { ProjectMeta, ProjectSummary } from '../app/pages/HomePage';

export interface ProjectDashboardResponse {
  project: ProjectMeta;
  summary: ProjectSummary;
  credentials?: {
    dashboard_url: string;
    server_auth_token: string;
  };
}

export async function getProject(projectSlug: string): Promise<ProjectDashboardResponse> {
  const res = await api.get<ProjectDashboardResponse>(
    `/api/projects/${encodeURIComponent(projectSlug)}`,
  );
  return res.data;
}

export async function deleteService(serviceId: string): Promise<void> {
  await api.delete(`/api/services/${encodeURIComponent(serviceId)}`);
}
