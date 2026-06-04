import { api } from './client';

export interface ScenarioVersion {
  versionId: string;
  serviceId: string;
  label: string;
  description?: string;
  scenariosSnapshot?: Array<Record<string, unknown>>;
  isFavorite: boolean;
  createdAt: string;
}

export interface CreateScenarioVersionPayload {
  label: string;
  description?: string;
  scenariosSnapshot?: Array<Record<string, unknown>>;
  isFavorite?: boolean;
}

export interface UpdateScenarioVersionPayload {
  label?: string;
  description?: string;
  isFavorite?: boolean;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/scenario-versions`;
}

export async function listScenarioVersions(serviceId: string): Promise<ScenarioVersion[]> {
  const res = await api.get<{ versions: ScenarioVersion[]; count: number }>(basePath(serviceId));
  return res.data.versions;
}

export async function createScenarioVersion(
  serviceId: string,
  payload: CreateScenarioVersionPayload,
): Promise<ScenarioVersion> {
  const res = await api.post<{ version: ScenarioVersion }>(basePath(serviceId), payload);
  return res.data.version;
}

export async function updateScenarioVersion(
  serviceId: string,
  versionId: string,
  payload: UpdateScenarioVersionPayload,
): Promise<ScenarioVersion> {
  const res = await api.patch<{ version: ScenarioVersion }>(
    `${basePath(serviceId)}/${encodeURIComponent(versionId)}`,
    payload,
  );
  return res.data.version;
}

export async function deleteScenarioVersion(
  serviceId: string,
  versionId: string,
): Promise<void> {
  await api.delete(`${basePath(serviceId)}/${encodeURIComponent(versionId)}`);
}

export async function restoreScenarioVersion(
  serviceId: string,
  versionId: string,
): Promise<{ restoredCount: number }> {
  const res = await api.post<{ restoredCount: number }>(
    `${basePath(serviceId)}/${encodeURIComponent(versionId)}/restore`,
  );
  return res.data;
}
