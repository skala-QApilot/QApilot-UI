import { api } from './client';

export interface RtmRequirementHistoryEntry {
  [key: string]: unknown;
}

export interface RtmRequirement {
  frId: string;
  content: string;
  status: string; // '충족' | '미충족' | '미측정' 등
  passCount: number;
  totalCount: number;
  history: RtmRequirementHistoryEntry[];
}

export interface RtmSummary {
  total: number;
  satisfied: number;
  unsatisfied: number;
  unmeasured: number;
}

export interface RtmVersion {
  rtmVersionId: string;
  serviceId: string;
  label: string;
  traceId?: string | null;
  requirements: RtmRequirement[];
  summary?: RtmSummary;
  createdAt: string;
}

export interface CreateRtmVersionPayload {
  label: string;
  trace_id?: string;
  requirements?: RtmRequirement[];
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/rtm-versions`;
}

export async function listRtmVersions(serviceId: string): Promise<RtmVersion[]> {
  const res = await api.get<{ versions: RtmVersion[]; count: number }>(basePath(serviceId));
  return res.data.versions;
}

export async function getRtmVersion(
  serviceId: string,
  rtmVersionId: string,
): Promise<RtmVersion> {
  const res = await api.get<{ version: RtmVersion }>(
    `${basePath(serviceId)}/${encodeURIComponent(rtmVersionId)}`,
  );
  return res.data.version;
}

export async function getRtmRequirements(
  serviceId: string,
  rtmVersionId: string,
): Promise<RtmRequirement[]> {
  const res = await api.get<{ requirements: RtmRequirement[]; count: number }>(
    `${basePath(serviceId)}/${encodeURIComponent(rtmVersionId)}/requirements`,
  );
  return res.data.requirements;
}

export async function createRtmVersion(
  serviceId: string,
  payload: CreateRtmVersionPayload,
): Promise<RtmVersion> {
  const res = await api.post<{ version: RtmVersion }>(basePath(serviceId), payload);
  return res.data.version;
}

/** RTM 내보내기 — Spring 가 raw JSON 문자열로 반환 */
export async function exportRtm(serviceId: string, rtmVersionId: string): Promise<string> {
  const res = await api.get<string>(
    `${basePath(serviceId)}/${encodeURIComponent(rtmVersionId)}/export`,
    { responseType: 'text', transformResponse: (data) => data },
  );
  return res.data;
}
