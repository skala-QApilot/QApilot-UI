import { api } from './client';

export interface Schedule {
  cron?: string;
  timezone?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface ScenarioGroup {
  groupId: string;
  name: string;
  scenarioIds: string[];
  tcIds: string[];
  schedule?: Schedule | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateScenarioGroupPayload {
  name: string;
  scenarioIds?: string[];
  tcIds?: string[];
}

export interface UpdateScenarioGroupPayload {
  name?: string;
  scenarioIds?: string[];
  tcIds?: string[];
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/scenario-groups`;
}

export async function listScenarioGroups(serviceId: string): Promise<ScenarioGroup[]> {
  const res = await api.get<{ groups: ScenarioGroup[]; count: number }>(basePath(serviceId));
  return res.data.groups;
}

export async function createScenarioGroup(
  serviceId: string,
  payload: CreateScenarioGroupPayload,
): Promise<ScenarioGroup> {
  const res = await api.post<{ group: ScenarioGroup }>(basePath(serviceId), payload);
  return res.data.group;
}

export async function updateScenarioGroup(
  serviceId: string,
  groupId: string,
  payload: UpdateScenarioGroupPayload,
): Promise<ScenarioGroup> {
  const res = await api.patch<{ group: ScenarioGroup }>(
    `${basePath(serviceId)}/${encodeURIComponent(groupId)}`,
    payload,
  );
  return res.data.group;
}

export async function deleteScenarioGroup(
  serviceId: string,
  groupId: string,
): Promise<void> {
  await api.delete(`${basePath(serviceId)}/${encodeURIComponent(groupId)}`);
}

export async function setScenarioGroupSchedule(
  serviceId: string,
  groupId: string,
  schedule: Schedule,
): Promise<ScenarioGroup> {
  const res = await api.post<{ group: ScenarioGroup }>(
    `${basePath(serviceId)}/${encodeURIComponent(groupId)}/schedule`,
    schedule,
  );
  return res.data.group;
}
