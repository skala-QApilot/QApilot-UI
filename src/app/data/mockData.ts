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
  testVariables: Array<{ id: string; name: string; status: string }>;
};

export type TestCaseMap = Record<string, TestCase[]>;

export const mockTestCases: TestCaseMap = {
  TS1: [
    { id: 'TC1', name: '정상 로그인', status: 'completed', testVariables: [
      { id: 'TV1', name: '유효한 이메일', status: 'completed' },
      { id: 'TV2', name: '유효한 비밀번호', status: 'completed' },
    ]},
    { id: 'TC2', name: '비밀번호 오류', status: 'failed', testVariables: [
      { id: 'TV1', name: '유효한 이메일', status: 'completed' },
      { id: 'TV2', name: '잘못된 비밀번호', status: 'failed' },
    ]},
  ],
  TS2: [
    { id: 'TC1', name: '상품 검색', status: 'running', testVariables: [
      { id: 'TV1', name: '검색어 입력', status: 'running' },
    ]},
  ],
  TS3: [
    { id: 'TC1', name: '장바구니 담기', status: 'completed', testVariables: [
      { id: 'TV1', name: '상품 선택', status: 'completed' },
    ]},
    { id: 'TC2', name: '수량 변경', status: 'failed', testVariables: [
      { id: 'TV1', name: '수량 입력', status: 'failed' },
    ]},
    { id: 'TC3', name: '상품 추가', status: 'failed', testVariables: [] },
  ],
  TS4: [
    { id: 'TC1', name: '결제 진행', status: 'pending', testVariables: [] },
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
  { id: 'exec-1', groupId: '시나리오 그룹 #1', executionNumber: 1, startDate: '2026-04-26 14:23', pass: 18, fail: 3, hitlPending: 2, notRun: 0 },
  { id: 'exec-2', groupId: '시나리오 그룹 #1', executionNumber: 2, startDate: '2026-04-25 22:15', pass: 20, fail: 1, hitlPending: 0, notRun: 2 },
  { id: 'exec-3', groupId: '시나리오 그룹 #2', executionNumber: 1, startDate: '2026-04-24 09:42', pass: 23, fail: 7, hitlPending: 1, notRun: 0 },
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
