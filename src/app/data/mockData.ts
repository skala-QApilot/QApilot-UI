/**
 * UI-only mock data.
 *
 * C10 정리 후 — Spring/FastAPI 에 해당 도메인이 없어 store wire-up 이 불가한 항목만 남김.
 * 향후 백엔드 도메인 추가 시:
 *  - mockTestLogs       → 테스트 실행 step 이벤트/로그 스트리밍 API
 *  - mockScenarioHistory → 변경 이력 피드 (코드 변경 감지/파일 업데이트) 통합 API
 *  - mockTVEndpoints    → TV 별 endpoint 명세 (요청/응답 샘플) API
 *  - mockTSFlows        → 시나리오 흐름 그래프 (TS 간 edge) API
 *  - mockAgentTrace     → Agent 사고/도구호출 trace (실시간 스트리밍) API
 *
 * 이외 wire-up 완료 항목은 각 store 에서 derive:
 *  - mockScenarios / mockTestCases / mockAIItems / mockScenarioVersions / mockTestGroups → scenarioStore
 *  - mockRTMVersions / mockRTMRequirements / mockRTMData → rtmStore
 *  - mockExecutionHistory / mockPassHistory                → testStore
 *  - mockFiles                                             → fileStore
 *  - mockNotifications                                     → notificationStore
 */

export const mockTestLogs = [
  { time: '14:32:01', action: 'navigate to https://example.com/login', apiMethod: 'GET', endpoint: '/api/init', status: 200, responseTime: '124ms', isError: false, hitl: false },
  { time: '14:32:02', action: 'fill input[name="email"] with "test@example.com"', apiMethod: '', endpoint: '', status: null, responseTime: '', isError: false, hitl: false },
  { time: '14:32:03', action: 'fill input[name="password"] with "********"', apiMethod: '', endpoint: '', status: null, responseTime: '', isError: false, hitl: false },
  { time: '14:32:04', action: 'click button[type="submit"]', apiMethod: 'POST', endpoint: '/api/auth/login', status: 200, responseTime: '342ms', isError: false, hitl: false },
  { time: '14:32:05', action: 'wait for navigation', apiMethod: 'GET', endpoint: '/api/user/profile', status: 500, responseTime: '98ms', isError: true, hitl: true },
];

export const mockScenarioHistory = [
  { id: 1, timestamp: '2026-04-27 10:23', changeType: '코드 변경 감지', description: 'login.tsx에서 비밀번호 검증 로직 변경 감지', affectedScenario: 'TS1 > TC#2', tag: 'blue' },
  { id: 2, timestamp: '2026-04-27 09:15', changeType: '자연어 입력', description: 'FR-003 관련 TC#2 엣지 케이스 2건 추가', affectedScenario: 'TS2 > TC#2', tag: 'purple' },
  { id: 3, timestamp: '2026-04-26 16:42', changeType: 'HITL 반영', description: '로그인 버튼 색상 검증 로직 승인 반영', affectedScenario: 'TS1 > TC#1', tag: 'gradient' },
  { id: 4, timestamp: '2026-04-26 14:20', changeType: '파일 버전 업데이트', description: 'PRD v1.1 업데이트로 인한 시나리오 자동 갱신', affectedScenario: 'TS2, TS3', tag: 'orange' },
];

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TVEndpoint {
  method: HttpMethod;
  path: string;
  requestBody?: Record<string, unknown>;
  statusCode: number;
  responseBody?: Record<string, unknown>;
}

export const mockTVEndpoints: Record<string, TVEndpoint> = {
  'TS1_TC1_TV1': {
    method: 'POST', path: '/api/auth/login',
    requestBody: { email: 'test@example.com', password: 'validPass123' },
    statusCode: 200,
    responseBody: { token: 'eyJhbGciOiJIUzI1NiJ9...', redirect: '/dashboard' },
  },
  'TS1_TC1_TV2': {
    method: 'POST', path: '/api/auth/login',
    requestBody: { email: 'test@example.com', password: 'validPass123!@' },
    statusCode: 200,
    responseBody: { token: 'eyJhbGciOiJIUzI1NiJ9...', userId: 42 },
  },
  'TS1_TC2_TV1': {
    method: 'POST', path: '/api/auth/login',
    requestBody: { email: 'test@example.com', password: 'bad' },
    statusCode: 401,
    responseBody: { code: 'INVALID_PASSWORD', message: '비밀번호는 8자 이상이어야 합니다' },
  },
  'TS1_TC2_TV2': {
    method: 'POST', path: '/api/auth/login',
    requestBody: { email: 'test@example.com', password: '123' },
    statusCode: 401,
    responseBody: { code: 'INVALID_PASSWORD', message: '비밀번호 오류' },
  },
  'TS2_TC1_TV1': {
    method: 'GET', path: '/api/products/search',
    requestBody: { q: '노트북', category: 'electronics', limit: 20 },
    statusCode: 200,
    responseBody: { total: 42, items: [{ id: 'P001', name: '맥북 프로' }] },
  },
  'TS3_TC1_TV1': {
    method: 'POST', path: '/api/cart/items',
    requestBody: { productId: 'P001', quantity: 1 },
    statusCode: 201,
    responseBody: { cartId: 'C100', itemCount: 1 },
  },
  'TS3_TC2_TV1': {
    method: 'PATCH', path: '/api/cart/items/:id',
    requestBody: { quantity: 3 },
    statusCode: 200,
    responseBody: { cartId: 'C100', itemCount: 3, subtotal: 3900000 },
  },
};

export type TSFlowEdgeType = 'success' | 'failure' | 'branch' | 'default';

export interface TSFlowEdge {
  from: string;
  to: string;
  label?: string;
  type: TSFlowEdgeType;
}

export const mockTSFlows: TSFlowEdge[] = [
  { from: 'TS1', to: 'TS2', label: '로그인 성공',  type: 'success' },
  { from: 'TS1', to: 'TS1', label: '인증 실패',    type: 'failure' },
  { from: 'TS2', to: 'TS3', label: '상품 선택',    type: 'default' },
  { from: 'TS2', to: 'TS1', label: '세션 만료',    type: 'failure' },
  { from: 'TS3', to: 'TS4', label: '결제 진행',    type: 'success' },
  { from: 'TS3', to: 'TS2', label: '검색 계속',    type: 'branch'  },
  { from: 'TS4', to: 'TS2', label: '결제 후 쇼핑', type: 'branch'  },
];

export type AgentStage = '시나리오' | '테스트' | '원인분석';
export type TraceItemType = 'think' | 'tool' | 'mcp' | 'stage_start' | 'stage_done';

export interface AgentTraceItem {
  id: string;
  type: TraceItemType;
  stage: AgentStage;
  label: string;
  subLabel?: string;
  params?: string;
  result?: string;
  duration?: string;
  mcpServer?: string;
  status: 'done' | 'running' | 'error';
}

export const mockAgentTrace: AgentTraceItem[] = [
  // ── 시나리오 단계 ──────────────────────────────
  { id: 't1',  type: 'stage_start', stage: '시나리오', label: '시나리오 생성 시작', status: 'done' },
  { id: 't2',  type: 'think', stage: '시나리오', label: '코드베이스 변경사항을 먼저 확인한 뒤 영향받는 시나리오를 식별해야 합니다.', status: 'done' },
  { id: 't3',  type: 'mcp',  stage: '시나리오', label: 'list_commits', subLabel: '최근 커밋 목록 조회', mcpServer: 'github', duration: '38ms',
    params: '{ "repo": "auth-service", "branch": "main", "limit": 5 }',
    result: '[{ "sha": "a1b2c3", "msg": "Fix: 비밀번호 검증 조건 7→8자 변경" },\n { "sha": "d4e5f6", "msg": "Refactor: login 미들웨어 분리" }]',
    status: 'done' },
  { id: 't4',  type: 'tool', stage: '시나리오', label: 'analyze_code_diff', subLabel: '변경된 로직 분석', duration: '112ms',
    params: '{ "sha": "a1b2c3", "file": "src/auth/password.ts" }',
    result: '{ "affected": ["비밀번호 길이 검증", "특수문자 필수 조건"], "risk": "HIGH" }',
    status: 'done' },
  { id: 't5',  type: 'think', stage: '시나리오', label: 'TS1 TC2 (비밀번호 오류) 케이스에 특수문자 엣지 케이스가 누락되어 있습니다. TC3을 신규 생성하겠습니다.', status: 'done' },
  { id: 't6',  type: 'tool', stage: '시나리오', label: 'get_scenario', subLabel: '기존 시나리오 조회', duration: '21ms',
    params: '{ "tsId": "TS1" }',
    result: '{ "tcs": [{ "id": "TC1", "name": "정상 로그인" }, { "id": "TC2", "name": "비밀번호 오류" }] }',
    status: 'done' },
  { id: 't9',  type: 'stage_done', stage: '시나리오', label: '시나리오 업데이트 완료 — TC 1개 신규 생성', status: 'done' },

  // ── 테스트 단계 ──────────────────────────────
  { id: 't10', type: 'stage_start', stage: '테스트', label: '테스트 실행 시작', status: 'done' },
  { id: 't13', type: 'tool', stage: '테스트', label: 'fill_and_submit', subLabel: 'TC1 TV1 실행', duration: '340ms',
    params: '{ "email": "test@example.com", "password": "validPass123" }',
    result: '{ "redirect": "/dashboard", "status": "PASS" }',
    status: 'done' },
  { id: 't18', type: 'stage_done', stage: '테스트', label: '테스트 완료 — TC1 PASS · TC2 PASS · TC3 FAIL', status: 'done' },

  // ── 원인분석 단계 ──────────────────────────────
  { id: 't19', type: 'stage_start', stage: '원인분석', label: '원인 분석 시작', status: 'done' },
  { id: 't26', type: 'stage_done', stage: '원인분석', label: '원인 분석 완료 — 수정 제안 1건 생성', status: 'running' },
];
