import { api } from './client';

export interface AgentStartResponse {
  trace_id: string;
  run_id: string;
  status: string;
  session_id?: string;
}

export type ScenarioTrigger = 'init' | 'natural_lang' | 'doc_update';
export type RunFilter = 'all' | 'failed' | 'affected';

export interface ScenarioGenerationPayload {
  trigger: ScenarioTrigger;
  user_input?: string;
  session_id?: string;
  scenario_ids?: string[];
  filter?: RunFilter;
  tags?: string[];
}

export interface CodeGenerationPayload {
  scenario_ids?: string[];
}

export interface TestRunPayload {
  scenario_ids?: string[];
  filter?: RunFilter;
  tags?: string[];
}

async function startAgent<T>(
  serviceId: string,
  path: string,
  body: T | null,
  accessToken: string,
): Promise<AgentStartResponse> {
  const res = await api.post<{ agent: AgentStartResponse }>(
    `/api/services/${encodeURIComponent(serviceId)}/${path}`,
    body,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.data.agent;
}

export function startScenarioGeneration(
  serviceId: string,
  payload: ScenarioGenerationPayload,
  accessToken: string,
): Promise<AgentStartResponse> {
  return startAgent(serviceId, 'scenario-generation', payload, accessToken);
}

export function startCodeGeneration(
  serviceId: string,
  payload: CodeGenerationPayload | null,
  accessToken: string,
): Promise<AgentStartResponse> {
  return startAgent(serviceId, 'code-generation', payload, accessToken);
}

export function startCodeChangeDetection(
  serviceId: string,
  accessToken: string,
): Promise<AgentStartResponse> {
  return startAgent(serviceId, 'code-change-detection', null, accessToken);
}

export function startTestRun(
  serviceId: string,
  payload: TestRunPayload,
  accessToken: string,
): Promise<AgentStartResponse> {
  return startAgent(serviceId, 'test-run', payload, accessToken);
}
