export const mockSummaryData = {
  requirementCoverage: 87,
  rtmCount: 42,
  errorCount: 7,
  scenarioCount: 12,
};

export const mockTestHistory = [
  { id: '시나리오 그룹 #1', pass: 18, fail: 3, hitlPending: 2, notRun: 2, date: '2026-04-26 14:23' },
  { id: '시나리오 그룹 #2', pass: 20, fail: 5, hitlPending: 1, notRun: 0, date: '2026-04-25 22:15' },
  { id: '시나리오 그룹 #3', pass: 23, fail: 7, hitlPending: 0, notRun: 0, date: '2026-04-24 09:42' },
];

export const mockTestGroups = [
  { id: 'TG-001', name: '나의 진행 중인 테스트', scenarios: ['TS1', 'TS2'], tcCount: 10, status: 'active' as const, createdDate: '2026-04-20', executionCount: 3, tags: ['회귀', '로그인'] },
  { id: 'TG-002', name: '시나리오 TS1-TS3 범위', scenarios: ['TS1', 'TS2', 'TS3'], tcCount: 15, status: 'active' as const, createdDate: '2026-04-22', executionCount: 5, tags: ['스모크'] },
  { id: 'TG-003', name: '전체 시나리오 검증', scenarios: ['TS1', 'TS2', 'TS3', 'TS4'], tcCount: 23, status: 'archived' as const, createdDate: '2026-04-18', executionCount: 8, tags: ['전체'] },
];

export const mockFiles = [
  { id: 1, name: 'PRD', version: 'v1.0', reflected: true, date: '2026-04-20' },
  { id: 2, name: '인터페이스 정의서', version: 'v1.1', reflected: true, date: '2026-04-22' },
  { id: 3, name: 'WBS', version: 'v1.0', reflected: false, date: '2026-04-15' },
];

export const mockHITL = [
  { id: 1, description: '로그인 버튼 색상이 스펙과 다름 - 승인 필요', type: 'UI오류' },
  { id: 2, description: 'API 응답 시간 초과 처리 방법 확인 필요', type: 'API오류' },
];

export const mockScenarios = [
  { id: 'TS1', name: '사용자 로그인', status: 'completed', testCases: 4, hasChanges: true },
  { id: 'TS2', name: '제품 검색', status: 'running', testCases: 6, hasChanges: false },
  { id: 'TS3', name: '장바구니 추가', status: 'failed', testCases: 5, hasChanges: true },
  { id: 'TS4', name: '결제 프로세스', status: 'pending', testCases: 8, hasChanges: false },
];

export type AIItem = {
  reason: string;
  trigger: 'file' | 'chatbot' | 'code';
  timestamp: string;
};

export const mockAIItems: Record<string, AIItem> = {
  TS2: { reason: 'FR-003 관련 TC#2 엣지 케이스 2건 추가', trigger: 'chatbot', timestamp: '2026-04-27 09:15' },
  TS3: { reason: 'PRD v1.1 업데이트로 인한 시나리오 자동 갱신', trigger: 'file', timestamp: '2026-04-26 14:20' },
};

export const mockRTMData = [
  { frId: 'FR-001', requirement: '사용자는 이메일로 로그인할 수 있다', ts: 'TS1', tc: 'TC1', result: 'PASS' },
  { frId: 'FR-002', requirement: '비밀번호는 8자 이상이어야 한다', ts: 'TS1', tc: 'TC2', result: 'PASS' },
  { frId: 'FR-003', requirement: '검색어 입력 시 자동완성 제공', ts: 'TS2', tc: 'TC1', result: 'FAIL' },
  { frId: 'FR-004', requirement: '장바구니에 최대 99개 상품 추가 가능', ts: 'TS3', tc: 'TC3', result: 'PASS' },
  { frId: 'FR-005', requirement: '결제 시 쿠폰 적용 가능', ts: '-', tc: '-', result: 'UNCOVERED' },
];

export type TestCase = {
  id: string;
  name: string;
  status: string;
  values: Array<{ id: string; name: string; status: string }>;
};

export type TestCaseMap = Record<string, TestCase[]>;

export const mockTestCases: TestCaseMap = {
  TS1: [
    { id: 'TC1', name: '정상 로그인', status: 'completed', values: [
      { id: 'TV1', name: '유효한 이메일', status: 'completed' },
      { id: 'TV2', name: '유효한 비밀번호', status: 'completed' },
    ]},
    { id: 'TC3', name: '로그아웃 성공', status: 'passed', values: [
      { id: 'TV1', name: '로그아웃 버튼 클릭', status: 'passed' },
      { id: 'TV2', name: '로그인 화면 이동 확인', status: 'passed' },
    ]},
    { id: 'TC2', name: '비밀번호 오류', status: 'failed', values: [
      { id: 'TV1', name: '유효한 이메일', status: 'completed' },
      { id: 'TV2', name: '잘못된 비밀번호', status: 'failed' },
    ]},
  ],
  TS2: [
    { id: 'TC2', name: '검색 결과 노출', status: 'passed', values: [
      { id: 'TV1', name: '검색 결과 목록 확인', status: 'passed' },
    ]},
    { id: 'TC1', name: '상품 검색', status: 'running', values: [
      { id: 'TV1', name: '검색어 입력', status: 'running' },
    ]},
  ],
  TS3: [
    { id: 'TC1', name: '장바구니 담기', status: 'completed', values: [
      { id: 'TV1', name: '상품 선택', status: 'completed' },
    ]},
    { id: 'TC2', name: '수량 변경', status: 'failed', values: [
      { id: 'TV1', name: '수량 입력', status: 'failed' },
    ]},
    { id: 'TC3', name: '상품 추가', status: 'failed', values: [] },
  ],
  TS4: [
    { id: 'TC1', name: '결제 진행', status: 'pending', values: [] },
  ],
};

export const mockTestLogs = [
  { time: '14:32:01', action: 'navigate to https://example.com/login', apiMethod: 'GET', endpoint: '/api/init', status: 200, responseTime: '124ms', isError: false, hitl: false },
  { time: '14:32:02', action: 'fill input[name="email"] with "test@example.com"', apiMethod: '', endpoint: '', status: null, responseTime: '', isError: false, hitl: false },
  { time: '14:32:03', action: 'fill input[name="password"] with "********"', apiMethod: '', endpoint: '', status: null, responseTime: '', isError: false, hitl: false },
  { time: '14:32:04', action: 'click button[type="submit"]', apiMethod: 'POST', endpoint: '/api/auth/login', status: 200, responseTime: '342ms', isError: false, hitl: false },
  { time: '14:32:05', action: 'wait for navigation', apiMethod: 'GET', endpoint: '/api/user/profile', status: 500, responseTime: '98ms', isError: true, hitl: true },
];

export const mockNotifications = [
  { id: 1, message: 'TEST #3 실행 완료', time: '10분 전', read: false },
  { id: 2, message: 'HITL 요청 2건 대기 중', time: '1시간 전', read: false },
  { id: 3, message: '시나리오 TS4 자동 생성 완료', time: '2시간 전', read: true },
  { id: 4, message: 'PRD v1.1 업데이트 감지', time: '어제', read: true },
];

export const mockScenarioHistory = [
  { id: 1, timestamp: '2026-04-27 10:23', changeType: '코드 변경 감지', description: 'login.tsx에서 비밀번호 검증 로직 변경 감지', affectedScenario: 'TS1 > TC#2', tag: 'blue' },
  { id: 2, timestamp: '2026-04-27 09:15', changeType: '자연어 입력', description: 'FR-003 관련 TC#2 엣지 케이스 2건 추가', affectedScenario: 'TS2 > TC#2', tag: 'purple' },
  { id: 3, timestamp: '2026-04-26 16:42', changeType: 'HITL 반영', description: '로그인 버튼 색상 검증 로직 승인 반영', affectedScenario: 'TS1 > TC#1', tag: 'gradient' },
  { id: 4, timestamp: '2026-04-26 14:20', changeType: '파일 버전 업데이트', description: 'PRD v1.1 업데이트로 인한 시나리오 자동 갱신', affectedScenario: 'TS2, TS3', tag: 'orange' },
];

export const mockPipelineStages = ['시나리오', '테스트', '원인분석', 'Report'];

export const mockRunningTestGroups = [
  { groupNumber: '#1', status: 'completed', position: 0 },
  { groupNumber: '#2', status: 'running', position: 1 },
  { groupNumber: '#3', status: 'running', position: 2 },
  { groupNumber: '#4', status: 'pending', position: 3 },
];

export const mockExecutionHistory = [
  { id: 'exec-1', groupId: '시나리오 그룹 #1', executionNumber: 1, startDate: '2026-04-26 14:23', duration: '2m 34s', pass: 18, fail: 3, hitlPending: 2, notRun: 0 },
  { id: 'exec-2', groupId: '시나리오 그룹 #1', executionNumber: 2, startDate: '2026-04-25 22:15', duration: '1m 58s', pass: 20, fail: 1, hitlPending: 0, notRun: 2 },
  { id: 'exec-3', groupId: '시나리오 그룹 #2', executionNumber: 1, startDate: '2026-04-24 09:42', duration: '3m 12s', pass: 23, fail: 7, hitlPending: 1, notRun: 0 },
];

export const mockPassHistory = [
  { date: '4/1',  pass: 55, fail: 28, total: 83 },
  { date: '4/2',  pass: 58, fail: 25, total: 83 },
  { date: '4/3',  pass: 60, fail: 23, total: 83 },
  { date: '4/4',  pass: 57, fail: 26, total: 83 },
  { date: '4/5',  pass: 62, fail: 21, total: 83 },
  { date: '4/6',  pass: 65, fail: 19, total: 84 },
  { date: '4/7',  pass: 63, fail: 20, total: 83 },
  { date: '4/8',  pass: 67, fail: 17, total: 84 },
  { date: '4/9',  pass: 69, fail: 16, total: 85 },
  { date: '4/10', pass: 68, fail: 17, total: 85 },
  { date: '4/11', pass: 71, fail: 15, total: 86 },
  { date: '4/12', pass: 70, fail: 16, total: 86 },
  { date: '4/13', pass: 73, fail: 14, total: 87 },
  { date: '4/14', pass: 74, fail: 13, total: 87 },
  { date: '4/15', pass: 72, fail: 15, total: 87 },
  { date: '4/16', pass: 76, fail: 12, total: 88 },
  { date: '4/17', pass: 75, fail: 13, total: 88 },
  { date: '4/18', pass: 78, fail: 11, total: 89 },
  { date: '4/19', pass: 74, fail: 14, total: 88 },
  { date: '4/20', pass: 72, fail: 15, total: 87 },
  { date: '4/21', pass: 75, fail: 14, total: 89 },
  { date: '4/22', pass: 78, fail: 11, total: 89 },
  { date: '4/23', pass: 80, fail: 10, total: 90 },
  { date: '4/24', pass: 77, fail: 13, total: 90 },
  { date: '4/25', pass: 83, fail: 7,  total: 90 },
  { date: '4/26', pass: 87, fail: 4,  total: 91 },
  { date: '4/27', pass: 85, fail: 6,  total: 91 },
  { date: '4/28', pass: 88, fail: 3,  total: 91 },
  { date: '4/29', pass: 90, fail: 2,  total: 92 },
  { date: '4/30', pass: 89, fail: 3,  total: 92 },
];

export const mockScenarioVersions = [
  { id: 'v1.0', label: 'v1.0', date: '04-20', hasChange: false, isFavorite: false },
  { id: 'v1.1', label: 'v1.1', date: '04-22', hasChange: false, isFavorite: true },
  { id: 'change-1', label: '', date: '04-24', hasChange: true, isFavorite: false, changeDesc: 'login.tsx 비밀번호 검증 로직 변경 감지' },
  { id: 'v1.2', label: 'v1.2', date: '04-26', hasChange: false, isFavorite: false },
  { id: 'change-2', label: '', date: '04-27', hasChange: true, isFavorite: false, changeDesc: 'FR-003 관련 TC#2 엣지 케이스 2건 추가' },
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
  { id: 't7',  type: 'mcp',  stage: '시나리오', label: 'search_docs', subLabel: 'PRD 요구사항 검색', mcpServer: 'notion', duration: '55ms',
    params: '{ "query": "비밀번호 정책", "database": "PRD-v1.1" }',
    result: '{ "FR-002": "비밀번호 8자 이상, 특수문자 1개 필수" }',
    status: 'done' },
  { id: 't8',  type: 'tool', stage: '시나리오', label: 'create_test_case', subLabel: 'TC 신규 생성', duration: '44ms',
    params: '{ "tsId": "TS1", "name": "특수문자 미포함 비밀번호", "variables": [{ "input": "password123", "expected": 400 }] }',
    result: '{ "id": "TC3", "status": "created" }',
    status: 'done' },
  { id: 't9',  type: 'stage_done', stage: '시나리오', label: '시나리오 업데이트 완료 — TC 1개 신규 생성', status: 'done' },

  // ── 테스트 단계 ──────────────────────────────
  { id: 't10', type: 'stage_start', stage: '테스트', label: '테스트 실행 시작', status: 'done' },
  { id: 't11', type: 'think', stage: '테스트', label: 'TS1 전체 TC를 순차 실행합니다. 브라우저 세션을 초기화하겠습니다.', status: 'done' },
  { id: 't12', type: 'mcp',  stage: '테스트', label: 'navigate', subLabel: '로그인 페이지 이동', mcpServer: 'playwright', duration: '210ms',
    params: '{ "url": "https://app.example.com/login" }',
    result: '{ "status": 200, "title": "로그인 - Example App" }',
    status: 'done' },
  { id: 't13', type: 'tool', stage: '테스트', label: 'fill_and_submit', subLabel: 'TC1 TV1 실행', duration: '340ms',
    params: '{ "email": "test@example.com", "password": "validPass123" }',
    result: '{ "redirect": "/dashboard", "status": "PASS" }',
    status: 'done' },
  { id: 't14', type: 'mcp',  stage: '테스트', label: 'POST /api/auth/login', subLabel: 'API 응답 검증', mcpServer: 'api-server', duration: '89ms',
    params: '{ "email": "test@example.com", "password": "validPass123" }',
    result: '{ "statusCode": 200, "body": { "token": "eyJhbGci..." } }',
    status: 'done' },
  { id: 't15', type: 'think', stage: '테스트', label: 'TC1 PASS. TC2 (비밀번호 오류) 케이스 실행합니다.', status: 'done' },
  { id: 't16', type: 'mcp',  stage: '테스트', label: 'POST /api/auth/login', subLabel: 'TC2 API 호출', mcpServer: 'api-server', duration: '91ms',
    params: '{ "email": "test@example.com", "password": "bad" }',
    result: '{ "statusCode": 401, "body": { "code": "INVALID_PASSWORD" } }',
    status: 'error' },
  { id: 't17', type: 'tool', stage: '테스트', label: 'assert_response', subLabel: 'TC2 응답 검증', duration: '8ms',
    params: '{ "expected": 401, "actual": 401, "bodyMatch": "INVALID_PASSWORD" }',
    result: '{ "status": "PASS" }',
    status: 'done' },
  { id: 't18', type: 'stage_done', stage: '테스트', label: '테스트 완료 — TC1 PASS · TC2 PASS · TC3 FAIL', status: 'done' },

  // ── 원인분석 단계 ──────────────────────────────
  { id: 't19', type: 'stage_start', stage: '원인분석', label: '원인 분석 시작', status: 'done' },
  { id: 't20', type: 'think', stage: '원인분석', label: 'TC3 (특수문자 미포함 비밀번호) FAIL. 서버 에러 로그와 코드 스냅샷을 비교하겠습니다.', status: 'done' },
  { id: 't21', type: 'mcp',  stage: '원인분석', label: 'get_error_events', subLabel: '에러 로그 수집', mcpServer: 'sentry', duration: '67ms',
    params: '{ "project": "auth-service", "timeRange": "1h", "level": "error" }',
    result: '[{ "type": "ValidationError", "msg": "password must include special char", "count": 3 }]',
    status: 'done' },
  { id: 't22', type: 'mcp',  stage: '원인분석', label: 'get_file_content', subLabel: '검증 로직 조회', mcpServer: 'github', duration: '41ms',
    params: '{ "repo": "auth-service", "path": "src/auth/password.ts", "ref": "HEAD" }',
    result: '{ "content": "// 특수문자 필수 검증\\nif (!SPECIAL_CHAR_REGEX.test(pw)) throw new ValidationError(...)" }',
    status: 'done' },
  { id: 't23', type: 'tool', stage: '원인분석', label: 'compare_with_snapshot', subLabel: '스냅샷 비교', duration: '23ms',
    params: '{ "current": "HEAD", "baseline": "v1.1.0" }',
    result: '{ "diff": "+  특수문자 필수 조건 추가됨 (2026-05-01)", "riskLevel": "HIGH" }',
    status: 'done' },
  { id: 't24', type: 'think', stage: '원인분석', label: '특수문자 조건이 v1.1.0 이후 추가됨. TC3 TV1의 입력값("password123")이 새 정책을 충족하지 않음. 테스트 데이터 수정 또는 정책 예외 처리 검토 필요.', status: 'done' },
  { id: 't25', type: 'tool', stage: '원인분석', label: 'generate_fix_suggestion', subLabel: '수정안 생성', duration: '88ms',
    params: '{ "failedTc": "TC3", "rootCause": "password_policy_change" }',
    result: '{ "suggestion": "TC3 TV1 input을 \\"password123!@\\"로 수정하거나, 정책 예외 TV 추가 권장", "prLink": null }',
    status: 'done' },
  { id: 't26', type: 'stage_done', stage: '원인분석', label: '원인 분석 완료 — 수정 제안 1건 생성', status: 'running' },
];

export const mockRTMVersions = [
  { id: 'v1.1', label: 'RTM v1.1 (최신)', date: '2026-04-26', basedOn: 'PRD v1.1, 인터페이스 정의서 v1.1' },
  { id: 'v1.0', label: 'RTM v1.0', date: '2026-04-20', basedOn: 'PRD v1.0' },
];

export const mockRTMRequirements = [
  {
    frId: 'FR-001', content: '사용자는 이메일로 로그인할 수 있다', status: '충족', passCount: 2, totalCount: 2,
    history: [
      { ts: 'TS1', tc: 'TC1', latestTest: '시나리오 그룹 #2 - 2번째 실행', date: '2026-04-26 14:23', pass: true },
      { ts: 'TS1', tc: 'TC2', latestTest: '시나리오 그룹 #2 - 2번째 실행', date: '2026-04-26 14:23', pass: true },
    ],
  },
  {
    frId: 'FR-002', content: '비밀번호는 8자 이상이어야 한다', status: '충족', passCount: 1, totalCount: 2,
    history: [
      { ts: 'TS1', tc: 'TC2', latestTest: '시나리오 그룹 #2 - 2번째 실행', date: '2026-04-26 14:23', pass: true },
      { ts: 'TS1', tc: 'TC3', latestTest: '시나리오 그룹 #1 - 1번째 실행', date: '2026-04-24 09:42', pass: false },
    ],
  },
  {
    frId: 'FR-003', content: '검색어 입력 시 자동완성 제공', status: '미충족', passCount: 0, totalCount: 1,
    history: [
      { ts: 'TS2', tc: 'TC1', latestTest: '시나리오 그룹 #1 - 1번째 실행', date: '2026-04-24 09:42', pass: false },
    ],
  },
  {
    frId: 'FR-004', content: '장바구니에 최대 99개 상품 추가 가능', status: '충족', passCount: 1, totalCount: 1,
    history: [
      { ts: 'TS3', tc: 'TC3', latestTest: '시나리오 그룹 #2 - 2번째 실행', date: '2026-04-26 14:23', pass: true },
    ],
  },
  {
    frId: 'FR-005', content: '결제 시 쿠폰 적용 가능', status: '미충족', passCount: 0, totalCount: 0,
    history: [],
  },
];
