import { api } from './client';

/**
 * 테스트 값 (Test Value, "TV") — FastAPI scenario_generator_agent 가 생성하는
 * TC 별 실제 입력/기대 데이터. 도메인 명칭은 `values` 로 통일 (testVariables 폐기).
 */
export interface TestValue {
  field: string;
  value: string;
  type?: string;
  purpose?: string;
}

export interface TestCase {
  tc_id: string;
  name: string;
  given?: string;
  when?: string;
  then?: string;
  values?: TestValue[];
  tags?: string[];
  req_id?: string;
  /** 검증 대상 API (예: "POST /api/orders"). 시나리오↔엔드포인트 그래프 소스. */
  api?: string | null;
  /** Spring enrichment — 최근 실행 결과. 미실행 시 null. */
  last_run_status?: 'passed' | 'failed' | string | null;
  last_run_at?: string | null;
  /** 코드 변경 감지로 삭제 대기 중인 TC — 빨간 스타일로 표시 후 사용자 검토. */
  _pending_delete?: boolean;
}

export interface Scenario {
  ts_id: string;
  name: string;
  description: string;
  trigger: string;
  affected_files: string[];
  domain_rules_used: string[];
  test_cases: TestCase[];
  /** Spring enrichment. */
  last_run_status?: 'passed' | 'failed' | string | null;
  last_run_at?: string | null;
  has_pending_changes?: boolean;
}

function basePath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/scenarios`;
}

export async function listScenarios(
  serviceId: string,
  options: { search?: string; trigger?: string } = {},
): Promise<Scenario[]> {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.trigger) params.set('trigger', options.trigger);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get<{ scenarios: Scenario[]; count: number }>(
    `${basePath(serviceId)}${suffix}`,
  );
  return res.data.scenarios;
}

export async function getScenario(serviceId: string, scenarioId: string): Promise<Scenario> {
  const res = await api.get<{ scenario: Scenario }>(
    `${basePath(serviceId)}/${encodeURIComponent(scenarioId)}`,
  );
  return res.data.scenario;
}

export async function listTestCases(
  serviceId: string,
  scenarioId: string,
): Promise<TestCase[]> {
  const res = await api.get<{ test_cases: TestCase[]; count: number }>(
    `${basePath(serviceId)}/${encodeURIComponent(scenarioId)}/test-cases`,
  );
  return res.data.test_cases;
}

export async function createScenario(
  serviceId: string,
  scenario: Partial<Scenario>,
): Promise<Scenario> {
  const res = await api.post<{ scenario: Scenario }>(basePath(serviceId), scenario);
  return res.data.scenario;
}

export async function updateScenario(
  serviceId: string,
  scenarioId: string,
  patch: Partial<Scenario>,
): Promise<Scenario> {
  const res = await api.patch<{ scenario: Scenario }>(
    `${basePath(serviceId)}/${encodeURIComponent(scenarioId)}`,
    patch,
  );
  return res.data.scenario;
}

export async function deleteScenario(serviceId: string, scenarioId: string): Promise<void> {
  await api.delete(`${basePath(serviceId)}/${encodeURIComponent(scenarioId)}`);
}
