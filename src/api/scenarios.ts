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
  /** 이 값의 근거 — 문서/코드 출처 또는 "근거 없음". */
  evidence?: string;
}

/** TC 가 참조한 문서 검색 결과 (TS 단위, scenario.doc_search). */
export interface DocSearchSource {
  source: string;
  score: number;
  /** 실제 검색된 청크 텍스트 — TC 생성 근거로 사용된 원문 일부. */
  content?: string;
}

export interface DocSearch {
  query: string;
  sources: DocSearchSource[];
  analysis?: unknown[];
}

/** TC 가 참조한 코드 파일 + 실제 근거로 사용된 라인 범위. */
export interface CodebaseRefFile {
  file: string;
  line_start: number | null;
  line_end: number | null;
}

/** TC 가 참조한 코드 위치. */
export interface CodebaseRef {
  service_id: string;
  commit_sha: string | null;
  files: CodebaseRefFile[];
  table?: string | null;
}

/** TC 의 given/when/then 별 근거. */
export interface TestCaseEvidence {
  given: string;
  when: string;
  then: string;
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
  /** given/when/then 별 근거. */
  evidence?: TestCaseEvidence;
  /** 이 TC 가 참조한 코드 위치. */
  codebase_ref?: CodebaseRef;
  /** 이 TC 생성 prompt 에 실제로 들어간 schemas/selectors/patterns/db_snapshot. */
  tv_context?: TvContext;
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
  /** 이 TS 를 생성할 때 검색한 문서. */
  doc_search?: DocSearch;
  /** Spring enrichment. */
  last_run_status?: 'passed' | 'failed' | string | null;
  last_run_at?: string | null;
  has_pending_changes?: boolean;
}

/** TC 의 prompt 에 실제로 들어간 (필터링·마스킹된) 컨텍스트 — 참고 자료 표시용. */
export interface TvContext {
  schemas?: unknown;
  selectors?: unknown;
  patterns?: unknown;
  db_snapshot?: unknown;
}

export interface SourceContent {
  file: string;
  commit_sha: string;
  line_start: number | null;
  line_end: number | null;
  content: string;
}

/** action_mapping 의 실행 스텝 1개. */
export interface ActionStep {
  step_no: number;
  action: string;
  selector?: string | null;
  selector_type?: string | null;
  value?: string | null;
  expected?: string | null;
  api_endpoint?: string | null;
  target_name?: string | null;
  target_kind?: string | null;
}

export interface ActionMappingContextRouteRef {
  path?: string | null;
  component_file?: string | null;
  component_name?: string | null;
}

export interface ActionMappingContextSelectorRouteRef {
  route?: string | null;
  input_count?: number;
  button_count?: number;
  output_count?: number;
  dynamic_count?: number;
}

export interface ActionMappingContextSchemaRefs {
  request_schemas?: string[];
  response_schemas?: string[];
  db_models?: string[];
}

export interface ActionMappingContextSourceRef {
  file?: string | null;
  line_start?: number | null;
  line_end?: number | null;
}

export interface ActionMappingContextSourceCandidate {
  file?: string | null;
  line_start?: number | null;
  line_end?: number | null;
  reason?: string | null;
}

export interface ActionMappingContext {
  route_refs?: ActionMappingContextRouteRef[];
  selector_route_refs?: ActionMappingContextSelectorRouteRef[];
  schema_refs?: ActionMappingContextSchemaRefs;
  source_refs?: ActionMappingContextSourceRef[];
  source_status?: string;
  source_candidates?: ActionMappingContextSourceCandidate[];
}

/** TC 의 최신 action mapping — 테스트 실행 화면의 step 목록 표시용. */
export interface ActionMapping {
  tc_id: string;
  steps: ActionStep[];
  selector_confidence?: number;
  mapping_context?: ActionMappingContext;
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

/** 도메인 문서(PRD 등) 원문을 텍스트로 조회. */
export async function getDocumentContent(serviceId: string, filename: string): Promise<string> {
  const res = await api.get<string>(
    `${basePath(serviceId)}/documents/${encodeURIComponent(filename)}`,
    { responseType: 'text' },
  );
  return res.data;
}

/** TC 의 최신 action mapping (실행 스텝 시퀀스) 조회. */
export async function getActionMapping(serviceId: string, tcId: string): Promise<ActionMapping> {
  const res = await api.get<{ action_mapping: ActionMapping }>(
    `${basePath(serviceId)}/test-cases/${encodeURIComponent(tcId)}/action-mapping`,
  );
  return res.data.action_mapping;
}

/** codebase_ref 의 코드 본문 조회. */
export async function getSourceContent(
  serviceId: string,
  file: string,
  commitSha: string,
  options: { lineStart?: number; lineEnd?: number } = {},
): Promise<SourceContent> {
  const params = new URLSearchParams();
  params.set('file', file);
  params.set('commitSha', commitSha);
  if (options.lineStart != null) params.set('lineStart', String(options.lineStart));
  if (options.lineEnd != null) params.set('lineEnd', String(options.lineEnd));
  const res = await api.get<SourceContent>(
    `${basePath(serviceId)}/source?${params.toString()}`,
  );
  return res.data;
}
