import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, Play, ChevronDown, ChevronRight, Upload, FileText,
  CheckCircle2, XCircle, Clock, Loader2, Download, Plus, Trash2,
  Eye, AlertCircle, CheckCircle, X, Home, Layers, Settings,
  RotateCcw, Pause, ChevronLeft, User, Users, Send, GitBranch,
  History, CheckSquare, Search, Edit2, MessageCircle,
  Sparkles, Star, FolderOpen,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const mockSummaryData = {
  requirementCoverage: 87,
  rtmCount: 42,
  errorCount: 7,
  scenarioCount: 12,
};

const mockTestHistory = [
  { id: '시나리오 그룹 #1', pass: 18, fail: 3, hitlPending: 2, notRun: 2, date: '2026-04-26 14:23' },
  { id: '시나리오 그룹 #2', pass: 20, fail: 5, hitlPending: 1, notRun: 0, date: '2026-04-25 22:15' },
  { id: '시나리오 그룹 #3', pass: 23, fail: 7, hitlPending: 0, notRun: 0, date: '2026-04-24 09:42' },
];

const mockTestGroups = [
  { id: 'TG-001', name: '나의 진행 중인 테스트', scenarios: ['TS1', 'TS2'], tcCount: 10, status: 'active' as const, createdDate: '2026-04-20', executionCount: 3, tags: ['회귀', '로그인'] },
  { id: 'TG-002', name: '시나리오 TS1-TS3 범위', scenarios: ['TS1', 'TS2', 'TS3'], tcCount: 15, status: 'active' as const, createdDate: '2026-04-22', executionCount: 5, tags: ['스모크'] },
  { id: 'TG-003', name: '전체 시나리오 검증', scenarios: ['TS1', 'TS2', 'TS3', 'TS4'], tcCount: 23, status: 'archived' as const, createdDate: '2026-04-18', executionCount: 8, tags: ['전체'] },
];

const mockFiles = [
  { id: 1, name: 'PRD', version: 'v1.0', reflected: true, date: '2026-04-20' },
  { id: 2, name: '인터페이스 정의서', version: 'v1.1', reflected: true, date: '2026-04-22' },
  { id: 3, name: 'WBS', version: 'v1.0', reflected: false, date: '2026-04-15' },
];

const mockHITL = [
  { id: 1, description: '로그인 버튼 색상이 스펙과 다름 - 승인 필요', type: 'UI오류' },
  { id: 2, description: 'API 응답 시간 초과 처리 방법 확인 필요', type: 'API오류' },
];

const mockScenarios = [
  { id: 'TS1', name: '사용자 로그인', status: 'completed', testCases: 4, hasChanges: true },
  { id: 'TS2', name: '제품 검색', status: 'running', testCases: 6, hasChanges: false },
  { id: 'TS3', name: '장바구니 추가', status: 'failed', testCases: 5, hasChanges: true },
  { id: 'TS4', name: '결제 프로세스', status: 'pending', testCases: 8, hasChanges: false },
];

// AI가 생성한 TS 항목 (trigger: 'file' | 'chatbot' | 'code')
const mockAIItems: Record<string, { reason: string; trigger: 'file' | 'chatbot' | 'code'; timestamp: string }> = {
  'TS2': { reason: 'FR-003 관련 TC#2 엣지 케이스 2건 추가', trigger: 'chatbot', timestamp: '2026-04-27 09:15' },
  'TS3': { reason: 'PRD v1.1 업데이트로 인한 시나리오 자동 갱신', trigger: 'file', timestamp: '2026-04-26 14:20' },
};

const mockRTMData = [
  { frId: 'FR-001', requirement: '사용자는 이메일로 로그인할 수 있다', ts: 'TS1', tc: 'TC1', result: 'PASS' },
  { frId: 'FR-002', requirement: '비밀번호는 8자 이상이어야 한다', ts: 'TS1', tc: 'TC2', result: 'PASS' },
  { frId: 'FR-003', requirement: '검색어 입력 시 자동완성 제공', ts: 'TS2', tc: 'TC1', result: 'FAIL' },
  { frId: 'FR-004', requirement: '장바구니에 최대 99개 상품 추가 가능', ts: 'TS3', tc: 'TC3', result: 'PASS' },
  { frId: 'FR-005', requirement: '결제 시 쿠폰 적용 가능', ts: '-', tc: '-', result: 'UNCOVERED' },
];

const mockTestCases: Record<string, Array<{ id: string; name: string; status: string; testVariables: Array<{ id: string; name: string; status: string }> }>> = {
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

const mockTestLogs = [
  { time: '14:32:01', action: 'navigate to https://example.com/login', apiMethod: 'GET', endpoint: '/api/init', status: 200, responseTime: '124ms', isError: false, hitl: false },
  { time: '14:32:02', action: 'fill input[name="email"] with "test@example.com"', apiMethod: '', endpoint: '', status: null, responseTime: '', isError: false, hitl: false },
  { time: '14:32:03', action: 'fill input[name="password"] with "********"', apiMethod: '', endpoint: '', status: null, responseTime: '', isError: false, hitl: false },
  { time: '14:32:04', action: 'click button[type="submit"]', apiMethod: 'POST', endpoint: '/api/auth/login', status: 200, responseTime: '342ms', isError: false, hitl: false },
  { time: '14:32:05', action: 'wait for navigation', apiMethod: 'GET', endpoint: '/api/user/profile', status: 500, responseTime: '98ms', isError: true, hitl: true },
];

const mockNotifications = [
  { id: 1, message: 'TEST #3 실행 완료', time: '10분 전', read: false },
  { id: 2, message: 'HITL 요청 2건 대기 중', time: '1시간 전', read: false },
  { id: 3, message: '시나리오 TS4 자동 생성 완료', time: '2시간 전', read: true },
  { id: 4, message: 'PRD v1.1 업데이트 감지', time: '어제', read: true },
];

const mockScenarioHistory = [
  { id: 1, timestamp: '2026-04-27 10:23', changeType: '코드 변경 감지', description: 'login.tsx에서 비밀번호 검증 로직 변경 감지', affectedScenario: 'TS1 > TC#2', tag: 'blue' },
  { id: 2, timestamp: '2026-04-27 09:15', changeType: '자연어 입력', description: 'FR-003 관련 TC#2 엣지 케이스 2건 추가', affectedScenario: 'TS2 > TC#2', tag: 'purple' },
  { id: 3, timestamp: '2026-04-26 16:42', changeType: 'HITL 반영', description: '로그인 버튼 색상 검증 로직 승인 반영', affectedScenario: 'TS1 > TC#1', tag: 'gradient' },
  { id: 4, timestamp: '2026-04-26 14:20', changeType: '파일 버전 업데이트', description: 'PRD v1.1 업데이트로 인한 시나리오 자동 갱신', affectedScenario: 'TS2, TS3', tag: 'orange' },
];

const mockPipelineStages = ['시나리오', '테스트', '원인분석', 'Report'];
const mockRunningTestGroups = [
  { groupNumber: '#1', status: 'completed', position: 0 },
  { groupNumber: '#2', status: 'running', position: 1 },
  { groupNumber: '#3', status: 'running', position: 2 },
  { groupNumber: '#4', status: 'pending', position: 3 },
];

const mockExecutionHistory = [
  { id: 'exec-1', groupId: '시나리오 그룹 #1', executionNumber: 1, startDate: '2026-04-26 14:23', pass: 18, fail: 3, hitlPending: 2, notRun: 0 },
  { id: 'exec-2', groupId: '시나리오 그룹 #1', executionNumber: 2, startDate: '2026-04-25 22:15', pass: 20, fail: 1, hitlPending: 0, notRun: 2 },
  { id: 'exec-3', groupId: '시나리오 그룹 #2', executionNumber: 1, startDate: '2026-04-24 09:42', pass: 23, fail: 7, hitlPending: 1, notRun: 0 },
];

const mockScenarioVersions = [
  { id: 'v1.0', label: 'v1.0', date: '04-20', hasChange: false, isFavorite: false },
  { id: 'v1.1', label: 'v1.1', date: '04-22', hasChange: false, isFavorite: true },
  { id: 'change-1', label: '', date: '04-24', hasChange: true, isFavorite: false, changeDesc: 'login.tsx 비밀번호 검증 로직 변경 감지' },
  { id: 'v1.2', label: 'v1.2', date: '04-26', hasChange: false, isFavorite: false },
  { id: 'change-2', label: '', date: '04-27', hasChange: true, isFavorite: false, changeDesc: 'FR-003 관련 TC#2 엣지 케이스 2건 추가' },
];

const mockNetworkNodes = [
  // TS column: x=90, spread y 80~420 (4 nodes, gap~113)
  { id: 'ts_TS1', type: 'TS', label: 'TS1', sub: '사용자 로그인',   x: 90,  y: 80,  status: 'completed', hasChange: true  },
  { id: 'ts_TS2', type: 'TS', label: 'TS2', sub: '제품 검색',      x: 90,  y: 200, status: 'running',   hasChange: false },
  { id: 'ts_TS3', type: 'TS', label: 'TS3', sub: '장바구니 추가',   x: 90,  y: 330, status: 'failed',    hasChange: true  },
  { id: 'ts_TS4', type: 'TS', label: 'TS4', sub: '결제 프로세스',   x: 90,  y: 430, status: 'pending',   hasChange: false },
  // TC column: x=380, spread y 55~450 (7 nodes, gap~66)
  { id: 'tc_TS1_TC1', type: 'TC', label: 'TC1', sub: '정상 로그인',    x: 380, y: 55,  status: 'completed' },
  { id: 'tc_TS1_TC2', type: 'TC', label: 'TC2', sub: '비밀번호 오류',   x: 380, y: 140, status: 'failed'    },
  { id: 'tc_TS2_TC1', type: 'TC', label: 'TC1', sub: '상품 검색',       x: 380, y: 210, status: 'running'   },
  { id: 'tc_TS3_TC1', type: 'TC', label: 'TC1', sub: '장바구니 담기',   x: 380, y: 290, status: 'completed' },
  { id: 'tc_TS3_TC2', type: 'TC', label: 'TC2', sub: '수량 변경',       x: 380, y: 360, status: 'failed'    },
  { id: 'tc_TS3_TC3', type: 'TC', label: 'TC3', sub: '상품 추가',       x: 380, y: 415, status: 'failed'    },
  { id: 'tc_TS4_TC1', type: 'TC', label: 'TC1', sub: '결제 진행',       x: 380, y: 455, status: 'pending'   },
  // TV column: x=670, spread y 50~380 (6 nodes, gap~66)
  { id: 'tv_TC1_TV1',  type: 'TV', label: 'TV1', sub: '유효한 이메일',   x: 670, y: 50,  status: 'completed' },
  { id: 'tv_TC1_TV2',  type: 'TV', label: 'TV2', sub: '유효한 비밀번호', x: 670, y: 110, status: 'completed' },
  { id: 'tv_TC2_TV2',  type: 'TV', label: 'TV2', sub: '잘못된 비밀번호', x: 670, y: 175, status: 'failed'    },
  { id: 'tv_TC3_TV1',  type: 'TV', label: 'TV1', sub: '검색어 입력',     x: 670, y: 220, status: 'running'   },
  { id: 'tv_TC4_TV1',  type: 'TV', label: 'TV1', sub: '상품 선택',       x: 670, y: 300, status: 'completed' },
  { id: 'tv_TC5_TV1',  type: 'TV', label: 'TV1', sub: '수량 입력',       x: 670, y: 370, status: 'failed'    },
];

const mockNetworkEdges = [
  { from: 'ts_TS1', to: 'tc_TS1_TC1' }, { from: 'ts_TS1', to: 'tc_TS1_TC2' },
  { from: 'ts_TS2', to: 'tc_TS2_TC1' },
  { from: 'ts_TS2', to: 'tc_TS3_TC1' },
  { from: 'ts_TS3', to: 'tc_TS3_TC1' }, { from: 'ts_TS3', to: 'tc_TS3_TC2' }, { from: 'ts_TS3', to: 'tc_TS3_TC3' },
  { from: 'ts_TS4', to: 'tc_TS4_TC1' }, { from: 'ts_TS4', to: 'tc_TS3_TC3' },
  { from: 'tc_TS1_TC1', to: 'tv_TC1_TV1' }, { from: 'tc_TS1_TC1', to: 'tv_TC1_TV2' },
  { from: 'tc_TS1_TC2', to: 'tv_TC1_TV1' }, { from: 'tc_TS1_TC2', to: 'tv_TC2_TV2' },
  { from: 'tc_TS2_TC1', to: 'tv_TC3_TV1' },
  { from: 'tc_TS3_TC1', to: 'tv_TC4_TV1' },
  { from: 'tc_TS3_TC2', to: 'tv_TC5_TV1' }, { from: 'tc_TS3_TC1', to: 'tv_TC5_TV1' },
];

const mockRTMVersions = [
  { id: 'v1.1', label: 'RTM v1.1 (최신)', date: '2026-04-26', basedOn: 'PRD v1.1, 인터페이스 정의서 v1.1' },
  { id: 'v1.0', label: 'RTM v1.0', date: '2026-04-20', basedOn: 'PRD v1.0' },
];

const mockRTMRequirements = [
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

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusIcon = (status: string, size = 'w-4 h-4') => {
  if (status === 'completed') return <CheckCircle className={`${size} text-[#9AB17A]`} />;
  if (status === 'failed') return <XCircle className={`${size} text-[#FF9A86]`} />;
  if (status === 'running') return <Loader2 className={`${size} text-[#f78ca0] animate-spin`} />;
  return <Clock className={`${size} text-[#BFC6C4]`} />;
};

const FourColorBar = ({ pass, fail, hitl, notRun, onClickFail, onClickHitl }: {
  pass: number; fail: number; hitl: number; notRun: number;
  onClickFail?: () => void; onClickHitl?: () => void;
}) => {
  const total = pass + fail + hitl + notRun || 1;
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
      <div className="bg-[#9AB17A] transition-all" style={{ width: `${(pass / total) * 100}%` }} title={`PASS: ${pass}`} />
      <div className={`bg-[#FF9A86] transition-all ${onClickFail ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={{ width: `${(fail / total) * 100}%` }} onClick={onClickFail} title={`FAIL: ${fail}`} />
      <div className={`bg-[#FFF0BE] transition-all ${onClickHitl ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={{ width: `${(hitl / total) * 100}%` }} onClick={onClickHitl} title={`HITL: ${hitl}`} />
      <div className="bg-[#BFC6C4] transition-all" style={{ width: `${(notRun / total) * 100}%` }} title={`미실행: ${notRun}`} />
    </div>
  );
};

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  // navigation
  const [currentPage, setCurrentPage] = useState<string>('HOME');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [scenarioSubmenuExpanded, setScenarioSubmenuExpanded] = useState(false);

  // pipeline header
  const [currentPipelineStage] = useState<number>(1);

  // scenario page
  const [selectedScenario, setSelectedScenario] = useState('TS1');
  const [scenarioPageTab, setScenarioPageTab] = useState<'TOTAL' | 'CHANGE'>('TOTAL');
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState('');
  const [scenarioChangeFilter, setScenarioChangeFilter] = useState(false);
  const [selectedScenarioVersion, setSelectedScenarioVersion] = useState('change-2');
  const [favoriteVersionIds, setFavoriteVersionIds] = useState<Set<string>>(new Set(['v1.1']));
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);
  const [selectedNetworkNodeId, setSelectedNetworkNodeId] = useState<string | null>(null);
  const [expandedTSForTC, setExpandedTSForTC] = useState<string[]>(['TS1']);
  const [selectedTCIds, setSelectedTCIds] = useState<string[]>([]);
  const [expandedTC, setExpandedTC] = useState<string[]>(['TC1']);
  const [showTestGroupModal, setShowTestGroupModal] = useState(false);
  const [showLinkedFiles, setShowLinkedFiles] = useState(false);
  const [changeItemActions, setChangeItemActions] = useState<Record<number, 'approved' | 'deferred'>>({});
  const [aiItemActions, setAiItemActions] = useState<Record<string, 'approved' | 'deferred' | 'rejected'>>({});
  const [codeChangeDetected, setCodeChangeDetected] = useState(false);
  const [dynamicScenarios, setDynamicScenarios] = useState([...mockScenarios]);
  const [dynamicAIItems, setDynamicAIItems] = useState<Record<string, { reason: string; trigger: 'file' | 'chatbot' | 'code'; timestamp: string }>>({ ...mockAIItems });
  const [dynamicTestCases, setDynamicTestCases] = useState<typeof mockTestCases>({ ...mockTestCases });
  const [loadingItemKey, setLoadingItemKey] = useState<string | null>(null);
  const [editingDetailItem, setEditingDetailItem] = useState<{ type: 'ts' | 'tc' | 'tv'; key: string; value: string } | null>(null);
  const [selectedTvId, setSelectedTvId] = useState<string | null>(null);
  const [selectedScenarioNode, setSelectedScenarioNode] = useState<{ level: 'TS' | 'TC' | 'TV'; tsId: string; tcId?: string; tvId?: string }>({ level: 'TS', tsId: 'TS1' });
  const [highlightedScenarioRow, setHighlightedScenarioRow] = useState<string | null>(null);
  const [scenarioQuickOpen, setScenarioQuickOpen] = useState(false);
  const [scenarioHistoryOpen, setScenarioHistoryOpen] = useState(false);

  // scenario manager panel
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: '테스트할 기능을 자연어로 설명해 주세요. 시나리오와 테스트 케이스를 자동으로 생성/수정해 드립니다.' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiContextPrefill, setAiContextPrefill] = useState('');

  // test group management
  const [testDepth, setTestDepth] = useState<0 | 1>(0);
  const [selectedTestGroup, setSelectedTestGroup] = useState<string | null>(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [completedAgentStages, setCompletedAgentStages] = useState<string[]>([]);
  const [currentAgentStage, setCurrentAgentStage] = useState<string>('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [scenarioSidebarTab, setScenarioSidebarTab] = useState<'TOTAL' | 'FILTERED'>('TOTAL');
  const [scenarioFilter] = useState<string>('TOTAL');
  const [expandedScenarios, setExpandedScenarios] = useState<string[]>(['TS1']);
  const [expandedTestCases, setExpandedTestCases] = useState<string[]>(['TC1']);
  const [highlightedLogIdx, setHighlightedLogIdx] = useState<number | null>(null);

  // detail panel & accordion for scenario page redesign
  const [detailPanelRow, setDetailPanelRow] = useState<{ level: 'TS' | 'TC' | 'TV'; tsId: string; tcId?: string; tvId?: string } | null>(null);
  const [expandedTSMain, setExpandedTSMain] = useState<string[]>(['TS1', 'TS2', 'TS3', 'TS4']);
  const [expandedTCMain, setExpandedTCMain] = useState<string[]>([]);

  // scenario bottom chatbot
  const chatbarClosedRef = useRef(false); // prevents hover zone from immediately reopening after X
  const [chatbarActive, setChatbarActive] = useState(false);
  const [chatPanelExpanded, setChatPanelExpanded] = useState(false);
  const [chatHistoryPanelOpen, setChatHistoryPanelOpen] = useState(false);
  const [quickChipsOpen, setQuickChipsOpen] = useState(false);
  const [chatContextTag, setChatContextTag] = useState<string | null>(null);
  const [inlineDiffId, setInlineDiffId] = useState<string | null>(null);
  const [highlightedBotRow, setHighlightedBotRow] = useState<string | null>(null);

  // 테스트 페이지 (진행중 / 이력)
  const [testSubTab, setTestSubTab] = useState<'INPROGRESS' | 'HISTORY'>('INPROGRESS');
  const [testSubmenuExpanded, setTestSubmenuExpanded] = useState(false);
  const [runningTests, setRunningTests] = useState<Array<{
    id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed';
  }>>([
    { id: 'run-001', name: '나의 진행 중인 테스트', groupId: 'TG-001', startTime: '14:32', status: 'running' },
  ]);
  const [selectedRunningTestId, setSelectedRunningTestId] = useState<string | null>('run-001');
  const [retestCheckedIds, setRetestCheckedIds] = useState<Set<string>>(new Set());
  const [showRetestNavModal, setShowRetestNavModal] = useState(false);

  // 테스트 결과
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedFailTC, setSelectedFailTC] = useState<string | null>(null);
  const [historyDetailTab, setHistoryDetailTab] = useState<'FAIL' | 'PASS'>('FAIL');

  // RTM
  const [expandedRTMItems, setExpandedRTMItems] = useState<string[]>([]);

  // derived
  const unreadNotifications = mockNotifications.filter(n => !n.read).length;
  const visibleChangeItems = mockScenarioHistory.filter(h => changeItemActions[h.id] !== 'approved');
  const pendingHistoryCount = visibleChangeItems.length;

  const allTCIds = dynamicScenarios.flatMap(ts =>
    (dynamicTestCases[ts.id] || []).map(tc => `${ts.id}_${tc.id}`)
  );
  const allTCsSelected = allTCIds.length > 0 && allTCIds.every(id => selectedTCIds.includes(id));
  const someSelected = selectedTCIds.length > 0;

  const parallelDone = ['UI', 'API', 'DB'].every(s => completedAgentStages.includes(s));
  const getNodeStatus = (stage: string): 'inactive' | 'running' | 'complete' => {
    if (completedAgentStages.includes(stage)) return 'complete';
    const isParallel = ['UI', 'API', 'DB'].includes(stage);
    if (isParallel && !parallelDone) return 'running';
    if (!isParallel && parallelDone && currentAgentStage === stage) return 'running';
    return 'inactive';
  };

  const navigateToHistory = (filter: string) => {
    setHistoryFilter(filter);
    setSelectedExecutionId(null);
    setCurrentPage('실행이력');
  };

  const sendAiMessage = (text: string) => {
    setAiMessages(prev => [...prev, { role: 'user', text }]);
    setAiInput('');
    setTimeout(() => {
      setAiMessages(prev => [...prev, { role: 'assistant', text: `"${text}" 관련 시나리오를 분석하고 있습니다...` }]);
    }, 500);
    if (currentPage === '시나리오') {
      setTimeout(() => {
        setAiMessages(prev => [...prev, { role: 'assistant', text: '시나리오 초안을 생성했습니다. 사이드바에서 확인 후 승인해 주세요.' }]);
        const newId = `TS${dynamicScenarios.length + 1}`;
        const label = text.length > 20 ? text.slice(0, 20) + '...' : text;
        setDynamicScenarios(prev => [...prev, { id: newId, name: label, status: 'pending', testCases: 2, hasChanges: false }]);
        setDynamicAIItems(prev => ({ ...prev, [newId]: { reason: text.slice(0, 50), trigger: 'chatbot', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ') } }));
        setDynamicTestCases(prev => ({
          ...prev,
          [newId]: [
            { id: 'TC1', name: 'AI 기본 케이스', status: 'pending', testVariables: [{ id: 'TV1', name: '정상 입력', status: 'pending' }, { id: 'TV2', name: '경계값 입력', status: 'pending' }] },
            { id: 'TC2', name: 'AI 엣지 케이스', status: 'pending', testVariables: [{ id: 'TV1', name: '오류 입력', status: 'pending' }] },
          ],
        }));
        setExpandedTSForTC(prev => [...prev, newId]);
      }, 1500);
    }
  };

  const openAiWithContext = (context: string) => {
    setAiContextPrefill(context);
    setAiPanelOpen(true);
    setScenarioQuickOpen(false);
    setAiMessages(prev => [...prev,
      { role: 'user', text: `[수정 요청] ${context}` },
      { role: 'assistant', text: `해당 변경사항에 대한 시나리오를 수정하겠습니다. 구체적인 요구사항을 알려주세요.` },
    ]);
  };

  useEffect(() => {
    if (!highlightedScenarioRow) return;

    const target = document.getElementById(`scenario-row-${highlightedScenarioRow}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const timer = window.setTimeout(() => setHighlightedScenarioRow(null), 1500);
    return () => window.clearTimeout(timer);
  }, [highlightedScenarioRow]);

  useEffect(() => {
    if (currentPage !== '시나리오') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if (!isTypingTarget && (event.key === 'Enter' || event.key === ' ') && !chatbarClosedRef.current) {
        setChatbarActive(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage]);

  const advanceAgentStage = () => {
    const order = ['UI', 'API', 'DB', 'Cross-check', '원인 분석', 'Report 생성'];
    const nextIncomplete = order.find(s => !completedAgentStages.includes(s));
    if (!nextIncomplete) return;
    const newCompleted = [...completedAgentStages, nextIncomplete];
    setCompletedAgentStages(newCompleted);
    const newParallelDone = ['UI', 'API', 'DB'].every(s => newCompleted.includes(s));
    if (newParallelDone) {
      const seq = ['Cross-check', '원인 분석', 'Report 생성'];
      const nextSeq = seq.find(s => !newCompleted.includes(s));
      setCurrentAgentStage(nextSeq || '');
      if (!nextSeq) setShowCompletionModal(true);
    }
  };

  // ── LeftNavigation ──────────────────────────────────────────────────────────

  const LeftNavigation = () => {
    const bottomNavItems = [
      { id: 'RTM', icon: CheckSquare, label: 'RTM' },
      { id: '설정', icon: Settings, label: '설정' },
    ];
    const isTestPage = currentPage === '테스트';

    return (
      <div className="h-full w-14 bg-white border-r border-[#f0f0f0] flex flex-col py-6 transition-all duration-300">
        <div className="flex flex-col h-full">
          {/* Home */}
          <div className="flex flex-col items-center mb-4">
            <button
              onClick={() => { setCurrentPage('HOME'); setScenarioSubmenuExpanded(false); setTestSubmenuExpanded(false); }}
              title="대시보드"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                currentPage === 'HOME'
                  ? 'bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white shadow-lg'
                  : 'text-[#9ca3af] hover:text-[#6b7280] hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
            </button>
          </div>

          <div className="border-t border-[#f0f0f0] mb-4" />

          {/* 시나리오 Menu with Submenu */}
          <div className="flex flex-col items-center mb-4">
            <button
              onClick={() => {
                setScenarioSubmenuExpanded(!scenarioSubmenuExpanded);
                setTestSubmenuExpanded(false);
                if (!scenarioSubmenuExpanded) setCurrentPage('시나리오');
              }}
              title="시나리오"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                currentPage === '시나리오' || currentPage === '테스트그룹'
                  ? 'bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white shadow-lg'
                  : 'text-[#9ca3af] hover:text-[#6b7280] hover:bg-gray-50'
              }`}
            >
              <Layers className="w-5 h-5" />
            </button>
            {scenarioSubmenuExpanded && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="h-6 w-px bg-[#f0f0f0]" />
                <button onClick={() => setCurrentPage('시나리오')} title="시나리오 목록"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    currentPage === '시나리오' ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] shadow-sm' : 'text-[#6b7280] hover:bg-gray-50 hover:text-[#1a1a2e]'
                  }`}><FileText className="w-4 h-4" /></button>
                <button onClick={() => { setCurrentPage('테스트그룹'); setTestDepth(0); }} title="시나리오 그룹"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    currentPage === '테스트그룹' ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] shadow-sm' : 'text-[#6b7280] hover:bg-gray-50 hover:text-[#1a1a2e]'
                  }`}><Users className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          <div className="border-t border-[#f0f0f0] mb-4" />

          {/* 테스트 Menu with Submenu */}
          <div className="flex flex-col items-center mb-4">
            <button
              onClick={() => {
                setTestSubmenuExpanded(!testSubmenuExpanded);
                setScenarioSubmenuExpanded(false);
                if (!testSubmenuExpanded) setCurrentPage('테스트');
              }}
              title="테스트"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                isTestPage
                  ? 'bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white shadow-lg'
                  : 'text-[#9ca3af] hover:text-[#6b7280] hover:bg-gray-50'
              }`}
            >
              <Play className="w-5 h-5" />
            </button>
            {testSubmenuExpanded && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="h-6 w-px bg-[#f0f0f0]" />
                <button
                  onClick={() => { setCurrentPage('테스트'); setTestSubTab('INPROGRESS'); }}
                  title="진행중"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 relative ${
                    isTestPage && testSubTab === 'INPROGRESS' ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] shadow-sm' : 'text-[#6b7280] hover:bg-gray-50 hover:text-[#1a1a2e]'
                  }`}
                >
                  <Loader2 className="w-4 h-4" />
                  {runningTests.filter(t => t.status === 'running').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {runningTests.filter(t => t.status === 'running').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setCurrentPage('테스트'); setTestSubTab('HISTORY'); }}
                  title="이력"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    isTestPage && testSubTab === 'HISTORY' ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] shadow-sm' : 'text-[#6b7280] hover:bg-gray-50 hover:text-[#1a1a2e]'
                  }`}
                ><History className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          <div className="border-t border-[#f0f0f0] mb-4" />

          {/* RTM / 설정 */}
          <div className="flex flex-col gap-4 flex-1 items-center">
            {bottomNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button key={item.id}
                  onClick={() => { setCurrentPage(item.id); setScenarioSubmenuExpanded(false); setTestSubmenuExpanded(false); }}
                  title={item.label}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    isActive ? 'bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white shadow-lg' : 'text-[#9ca3af] hover:text-[#6b7280] hover:bg-gray-50'
                  }`}
                ><Icon className="w-5 h-5" /></button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── NavBar ──────────────────────────────────────────────────────────────────

  const NavBar = () => (
    <div className="h-16 bg-white border-b border-[#f0f0f0] flex items-center justify-between px-6">
      <div className="text-xl font-semibold bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] bg-clip-text text-transparent">
        QApilot
      </div>

      {/* 2-Layer Pipeline */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 h-6">
          {mockRunningTestGroups.map((group, idx) => (
            <div key={group.groupNumber} className="flex flex-col items-center" style={{ marginLeft: idx === 0 ? '120px' : '0' }}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${
                group.status === 'completed' ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white' :
                group.status === 'running' ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-lg shadow-pink-300' :
                'bg-gray-300 text-gray-600'
              }`}>
                {group.groupNumber}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {mockPipelineStages.map((stage, idx) => {
            const isCompleted = idx < currentPipelineStage;
            const isCurrent = idx === currentPipelineStage;
            return (
              <div key={stage} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full transition-all ${
                    isCompleted || isCurrent ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]' : 'bg-gray-300'
                  } ${isCurrent ? 'animate-pulse shadow-lg shadow-pink-300' : ''}`} />
                  <span className={`text-xs mt-1 whitespace-nowrap ${isCompleted || isCurrent ? 'text-[#1a1a2e] font-medium' : 'text-[#9ca3af]'}`}>
                    {stage}
                  </span>
                </div>
                {idx < mockPipelineStages.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 mb-4 ${isCompleted ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]' : 'border-t-2 border-dashed border-gray-300'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button onClick={() => setNotificationOpen(!notificationOpen)} className="p-2 hover:bg-gray-50 rounded-full relative">
            <Bell className="w-5 h-5 text-[#6b7280]" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>
          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#f0f0f0] z-50">
              <div className="p-4 border-b border-[#f0f0f0] font-semibold">알림</div>
              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.map(notif => (
                  <div key={notif.id} className={`p-4 border-b border-[#f0f0f0] hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`}>
                    <div className="text-sm text-[#1a1a2e]">{notif.message}</div>
                    <div className="text-xs text-[#6b7280] mt-1">{notif.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] flex items-center justify-center text-white">
          <User className="w-4 h-4" />
        </div>
      </div>
    </div>
  );

  // ── 시나리오 관리봇 Panel ───────────────────────────────────────────────────

  const ScenarioManagerPanel = () => {
    if (!aiPanelOpen) {
      return (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-32 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-l-lg shadow-lg flex items-center justify-center z-40 hover:w-12 transition-all"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-sm font-semibold">시나리오 관리봇</span>
        </button>
      );
    }
    return (
      <div className="w-80 h-full bg-white border-l border-[#f0f0f0] flex flex-col shadow-lg flex-shrink-0">
        <div className="p-4 border-b border-[#f0f0f0] flex justify-between items-center bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10">
          <div className="font-semibold text-[#1a1a2e]">시나리오 관리봇</div>
          <button onClick={() => setAiPanelOpen(false)} className="p-1 hover:bg-white/50 rounded">
            <ChevronRight className="w-5 h-5 text-[#6b7280]" />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {aiMessages.map((msg, idx) => (
            <div key={idx}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white'
                    : 'bg-gray-100 text-[#1a1a2e]'
                }`}>{msg.text}</div>
              </div>
              {msg.role === 'assistant' && idx > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {['시나리오에 추가', '기존 시나리오 수정 반영', '다시 생성'].map(label => (
                    <button key={label} className="px-2 py-1 text-xs bg-white border border-[#f0f0f0] rounded hover:bg-gray-50">
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-[#f0f0f0] bg-gray-50">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['시나리오 생성', '엣지 케이스 추가', 'TC 세분화', '시나리오에 반영'].map(chip => (
              <button key={chip} onClick={() => sendAiMessage(chip)}
                className="px-2.5 py-1 text-xs bg-white border border-[#f0f0f0] rounded-full hover:bg-gray-50 transition-colors">
                {chip}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
              placeholder="예) 사용자가 이메일로 로그인하는 시나리오를 만들어줘"
              className="flex-1 p-2 border border-[#f0f0f0] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#f78ca0]/20"
              onKeyDown={e => { if (e.key === 'Enter' && aiInput.trim()) sendAiMessage(aiInput); }}
            />
            <button onClick={() => { if (aiInput.trim()) sendAiMessage(aiInput); }}
              className="p-2 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded hover:shadow-md transition-shadow">
              <Send className="w-4 h-4" />
            </button>
          </div>
          {aiContextPrefill && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              컨텍스트: {aiContextPrefill}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── HomePage ────────────────────────────────────────────────────────────────

  const PageTitle = ({ title }: { title: string }) => (
    <div className="bg-white border-b border-[#f0f0f0] px-6 py-3 flex-shrink-0">
      <div className="text-base font-semibold text-[#1a1a2e]">{title}</div>
    </div>
  );

  const HomePage = () => (
    <div className="h-full flex flex-col bg-gray-50">
      <PageTitle title="대시보드" />
      <div className="flex-1 overflow-y-auto p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div onClick={() => setCurrentPage('RTM')}
          className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] cursor-pointer hover:shadow-md transition-shadow">
          <div className="text-[#6b7280] text-sm mb-2">RTM 이행률</div>
          <div className="text-3xl font-semibold text-[#1a1a2e]">{mockSummaryData.requirementCoverage}%</div>
        </div>
        <div onClick={() => setCurrentPage('시나리오')}
          className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] cursor-pointer hover:shadow-md transition-shadow">
          <div className="text-[#6b7280] text-sm mb-2">전체 시나리오 수</div>
          <div className="text-3xl font-semibold text-[#1a1a2e]">{mockSummaryData.scenarioCount}개</div>
        </div>
        <div onClick={() => navigateToHistory('FAIL')}
          className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] cursor-pointer hover:shadow-md transition-shadow">
          <div className="text-[#6b7280] text-sm mb-2">에러</div>
          <div className="text-3xl font-semibold text-[#FF9A86]">{mockSummaryData.errorCount}건</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* HISTORY */}
        <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0]">
          <div className="font-semibold mb-4">HISTORY</div>
          <div className="space-y-5">
            {mockTestHistory.map(test => (
              <div key={test.id} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm">{test.id}</div>
                  <span className="text-[#6b7280] text-xs">{test.date}</span>
                </div>
                <div className="text-xs text-[#6b7280]">
                  PASS {test.pass} · FAIL {test.fail} · HITL {test.hitlPending} · 미실행 {test.notRun}
                </div>
                <FourColorBar
                  pass={test.pass} fail={test.fail} hitl={test.hitlPending} notRun={test.notRun}
                  onClickFail={() => navigateToHistory('FAIL')}
                  onClickHitl={() => navigateToHistory('HITL')}
                />
              </div>
            ))}
          </div>
        </div>

        {/* FILES + HITL */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0]">
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">FILES</div>
              <button className="px-3 py-1.5 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> 파일 추가
              </button>
            </div>
            <div className="space-y-3">
              {mockFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded border border-[#f0f0f0] hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#6b7280]" />
                    <div>
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-[#6b7280]">{file.version} • {file.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.reflected
                      ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">시나리오 반영됨</span>
                      : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">미반영</span>}
                    <button className="px-3 py-1 bg-white border border-[#f0f0f0] rounded text-sm hover:bg-gray-50 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> 업데이트 +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0]">
            <div className="font-semibold mb-4">HITL 처리</div>
            <div className="space-y-3">
              {mockHITL.map(item => (
                <div key={item.id} className="p-4 rounded border border-[#f0f0f0] hover:bg-gray-50">
                  <div className="text-sm mb-3">{item.description}</div>
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded text-sm">승인</button>
                    <button className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded text-sm hover:bg-gray-50">거절</button>
                    <button className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded text-sm hover:bg-gray-50">수정 후 승인</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  // ── ScenarioPage ────────────────────────────────────────────────────────────

  const ScenarioPage = () => {
    // Resizable left sidebar
    const [leftSidebarWidth, setLeftSidebarWidth] = React.useState(256);
    const leftDragRef = React.useRef(false);
    const leftStartX = React.useRef(0);
    const leftStartW = React.useRef(0);
    const handleLeftDragStart = (e: React.MouseEvent) => {
      leftDragRef.current = true;
      leftStartX.current = e.clientX;
      leftStartW.current = leftSidebarWidth;
      const onMove = (ev: MouseEvent) => {
        if (!leftDragRef.current) return;
        setLeftSidebarWidth(Math.max(160, Math.min(480, leftStartW.current + ev.clientX - leftStartX.current)));
      };
      const onUp = () => { leftDragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    // Resizable right detail panel
    const [rightPanelWidth, setRightPanelWidth] = React.useState(288);
    const rightDragRef = React.useRef(false);
    const rightStartX = React.useRef(0);
    const rightStartW = React.useRef(0);
    const handleRightDragStart = (e: React.MouseEvent) => {
      rightDragRef.current = true;
      rightStartX.current = e.clientX;
      rightStartW.current = rightPanelWidth;
      const onMove = (ev: MouseEvent) => {
        if (!rightDragRef.current) return;
        setRightPanelWidth(Math.max(200, Math.min(520, rightStartW.current - (ev.clientX - rightStartX.current))));
      };
      const onUp = () => { rightDragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    const tagColors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
      gradient: 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white',
      orange: 'bg-orange-100 text-orange-700',
    };

    const selectedTCs = selectedTCIds
      .filter(id => id.split('_').length === 2)
      .map(id => {
        const [tsId, tcId] = id.split('_');
        const ts = dynamicScenarios.find(s => s.id === tsId);
        const tc = (dynamicTestCases[tsId] || []).find(t => t.id === tcId);
        return { tsId, tcId, tsName: ts?.name, tcName: tc?.name };
      });

    const toggleTSSelection = (tsId: string) => {
      const tsTCs = (dynamicTestCases[tsId] || []).map(tc => `${tsId}_${tc.id}`);
      const allSelected = tsTCs.every(id => selectedTCIds.includes(id));
      if (allSelected) {
        setSelectedTCIds(prev => prev.filter(id => !tsTCs.includes(id)));
      } else {
        setSelectedTCIds(prev => [...new Set([...prev, ...tsTCs])]);
      }
    };

    const toggleTCSelection = (key: string) => {
      setSelectedTCIds(prev =>
        prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
      );
    };

    const toggleTVSelection = (key: string) => {
      setSelectedTCIds(prev =>
        prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
      );
    };

    const mockValidationConditions: Record<string, string[]> = {
      'TS1_TC1_TV1': ['입력: 유효한 이메일 (test@example.com)', '기대: 로그인 성공, 대시보드 이동', '제한: 3초 이내'],
      'TS1_TC1_TV2': ['입력: 유효한 비밀번호 (8자 이상)', '기대: 인증 성공 (200 OK)', '검증: JWT 토큰 발급'],
      'TS1_TC2_TV1': ['입력: 유효한 이메일', '기대: 입력 필드 유효성 통과'],
      'TS1_TC2_TV2': ['입력: 잘못된 비밀번호 (5자 미만)', '기대: 오류 메시지 표시', '코드: 401 Unauthorized'],
    };

    // ── 사이드바 필터링 ────────────────────────────────────────────
    const filteredScenarios = dynamicScenarios.filter(s => {
      const q = scenarioSearchQuery.toLowerCase();
      const matchSearch = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      // AI 필터: dynamicAIItems에 있고 아직 승인/거절 안 된 항목만
      const matchChange = !scenarioChangeFilter || (!!dynamicAIItems[s.id] && aiItemActions[s.id] !== 'approved' && aiItemActions[s.id] !== 'rejected');
      return matchSearch && matchChange;
    });

    // ── 네트워크 그래프 연결 노드 계산 ───────────────────────────
    const getConnectedIds = (nodeId: string | null): Set<string> => {
      if (!nodeId) return new Set();
      const connected = new Set<string>([nodeId]);
      mockNetworkEdges.forEach(e => {
        if (e.from === nodeId) connected.add(e.to);
        if (e.to === nodeId) connected.add(e.from);
      });
      return connected;
    };
    const connectedIds = getConnectedIds(selectedNetworkNodeId);

    const nodeStatusColor = (status: string) => {
      if (status === 'completed') return '#9AB17A';
      if (status === 'failed') return '#FF9A86';
      if (status === 'running') return '#f78ca0';
      return '#BFC6C4';
    };

    // ── 네트워크 노드 클릭 → detailPanel 연결 ─────────────────────
    const handleNetworkNodeClick = (nodeId: string) => {
      const isSelected = selectedNetworkNodeId === nodeId;
      if (isSelected) { setSelectedNetworkNodeId(null); setDetailPanelRow(null); return; }
      setSelectedNetworkNodeId(nodeId);
      const parts = nodeId.split('_');
      if (parts[0] === 'ts') {
        const tsId = parts[1];
        setDetailPanelRow({ level: 'TS', tsId });
      } else if (parts[0] === 'tc') {
        const tsId = parts[1]; const tcId = parts[2];
        setDetailPanelRow({ level: 'TC', tsId, tcId });
      } else if (parts[0] === 'tv') {
        const tcId = parts[1] + '_' + parts[2];
        const parentEdge = mockNetworkEdges.find(e => e.to === nodeId);
        if (parentEdge) {
          const tcParts = parentEdge.from.split('_');
          setDetailPanelRow({ level: 'TC', tsId: tcParts[1], tcId: tcParts[2] });
        }
      }
    };

    // ── 사이드바 아이템 메뉴 ──────────────────────────────────────
    const [openItemMenuId, setOpenItemMenuId] = React.useState<string | null>(null);

    // ── 버전 팝업 hover 유지 (timer) ──────────────────────────────
    const versionHoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleVersionEnter = (id: string) => {
      if (versionHoverTimer.current) clearTimeout(versionHoverTimer.current);
      setHoveredVersionId(id);
    };
    const handleVersionLeave = () => {
      versionHoverTimer.current = setTimeout(() => setHoveredVersionId(null), 180);
    };

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]" onClick={() => setOpenItemMenuId(null)}>

        {/* ── Top Toolbar ── */}
        <div className="bg-white border-b border-[#f0f0f0] px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
          <span className="font-semibold text-sm text-[#1a1a2e]">시나리오</span>
          {someSelected && (
            <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] rounded-full border border-[#f78ca0]/20">
              {selectedTCIds.length}개 선택됨
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => { if (someSelected) setShowTestGroupModal(true); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                someSelected
                  ? 'bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white shadow-sm hover:shadow-md'
                  : 'bg-white border border-[#f0f0f0] text-[#9ca3af] cursor-default'
              }`}>
              <Users className="w-3.5 h-3.5" /> 시나리오 그룹 생성
            </button>
            <button onClick={() => setCurrentPage('테스트그룹')}
              className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> E2E TEST
            </button>
            <div className="w-px h-5 bg-[#f0f0f0]" />
            <button onClick={() => setShowLinkedFiles(true)}
              className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" /> Files
            </button>
            <button
              onClick={() => setCodeChangeDetected(true)}
              className={`px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                codeChangeDetected
                  ? 'bg-blue-50 border border-blue-200 text-blue-600'
                  : 'bg-white border border-[#f0f0f0] hover:bg-gray-50 text-[#6b7280]'
              }`}>
              <GitBranch className="w-3.5 h-3.5" /> 코드 변경 탐지
              {codeChangeDetected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── [1] Version Timeline — 맨 좌측 ── */}
          <div className="w-14 bg-[#F3F4F6] border-r border-[#e5e7eb] flex flex-col items-center py-4 flex-shrink-0" style={{ overflow: 'visible', zIndex: 20 }}>
            <div className="text-[9px] text-[#9ca3af] font-semibold uppercase tracking-wide mb-4">VER</div>
            {/* 수직 연결선 */}
            <div className="relative flex flex-col items-center w-full" style={{ overflow: 'visible' }}>
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-[#e5e7eb]" style={{ zIndex: 0 }} />
              {/* 변경 감지 시 맨 위에만 점선 동그라미 1개 */}
              {mockScenarioVersions.some(v => v.hasChange) && (() => {
                const latestChange = [...mockScenarioVersions].reverse().find(v => v.hasChange)!;
                const isSelected = selectedScenarioVersion === latestChange.id;
                return (
                  <div className="relative flex flex-col items-center mb-5" style={{ zIndex: 10, overflow: 'visible' }}
                    onMouseEnter={() => handleVersionEnter(latestChange.id)}
                    onMouseLeave={handleVersionLeave}>
                    <button onClick={() => setSelectedScenarioVersion(latestChange.id)} className="relative flex items-center justify-center">
                      <svg width={20} height={20} style={{ overflow: 'visible' }}>
                        <circle cx={10} cy={10} r={8}
                          fill={isSelected ? '#f78ca0' : 'white'}
                          stroke="#f78ca0" strokeWidth={1.5} strokeDasharray="4 2.5" />
                      </svg>
                    </button>
                    <span className="text-[8px] text-[#c4c9d4]">{latestChange.date}</span>
                    {hoveredVersionId === latestChange.id && (
                      <div className="absolute left-full ml-1 top-0 bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-3 w-52"
                        style={{ zIndex: 9999 }}
                        onMouseEnter={() => handleVersionEnter(latestChange.id)}
                        onMouseLeave={handleVersionLeave}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#f78ca0]" />
                          <span className="text-xs font-semibold text-[#1a1a2e]">변경 감지</span>
                        </div>
                        <div className="text-[10px] text-[#6b7280] mb-3 leading-relaxed">{latestChange.changeDesc}</div>
                        <div className="text-[10px] font-semibold text-[#1a1a2e] mb-2">버전을 분리할까요?</div>
                        <div className="flex gap-2">
                          <button onClick={() => setHoveredVersionId(null)}
                            className="flex-1 px-2 py-1.5 bg-white border border-[#e5e7eb] rounded-lg text-[10px] hover:bg-gray-50 font-medium">No</button>
                          <button onClick={() => setHoveredVersionId(null)}
                            className="flex-1 px-2 py-1.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-[10px] font-medium">Yes</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {mockScenarioVersions.filter(v => !v.hasChange).map(ver => {
                const isSelected = selectedScenarioVersion === ver.id;
                const isFav = favoriteVersionIds.has(ver.id);
                return (
                  <div key={ver.id} className="relative flex flex-col items-center mb-5" style={{ zIndex: 10, overflow: 'visible' }}
                    onMouseEnter={() => handleVersionEnter(ver.id)}
                    onMouseLeave={handleVersionLeave}>
                    {/* Dot */}
                    <button onClick={() => setSelectedScenarioVersion(ver.id)} className="relative flex items-center justify-center">
                      <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                        isSelected ? 'bg-[#f78ca0] border-[#f78ca0] shadow-md shadow-pink-200' : 'bg-white border-[#d1d5db] hover:border-[#f78ca0]'
                      }`} />
                      {isFav && <Star className="absolute -right-3 -top-1 w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    </button>
                    {ver.label && (
                      <span className={`text-[9px] mt-0.5 font-medium leading-none ${isSelected ? 'text-[#f78ca0]' : 'text-[#9ca3af]'}`}>{ver.label}</span>
                    )}
                    <span className="text-[8px] text-[#c4c9d4]">{ver.date}</span>

                    {/* Popup — 오른쪽으로 열림 */}
                    {hoveredVersionId === ver.id && (
                      <div
                        className="absolute left-full ml-1 top-0 bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-3 w-52"
                        style={{ zIndex: 9999 }}
                        onMouseEnter={() => handleVersionEnter(ver.id)}
                        onMouseLeave={handleVersionLeave}>
                        <div>
                          <div className="text-[10px] font-semibold text-[#1a1a2e] mb-0.5">{ver.label || '버전'}</div>
                          <div className="text-[9px] text-[#9ca3af] mb-3">{ver.date}</div>
                          <div className="space-y-0.5">
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-[11px] text-[#6b7280] hover:text-[#1a1a2e]">
                              <RotateCcw className="w-3 h-3 flex-shrink-0" /> 되돌리기
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-[11px] text-[#6b7280] hover:text-[#1a1a2e]">
                              <Trash2 className="w-3 h-3 flex-shrink-0" /> 삭제
                            </button>
                            <button
                              onClick={() => setFavoriteVersionIds(prev => { const n = new Set(prev); n.has(ver.id) ? n.delete(ver.id) : n.add(ver.id); return n; })}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-yellow-50 text-[11px] text-[#6b7280] hover:text-yellow-600">
                              <Star className={`w-3 h-3 flex-shrink-0 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              즐겨찾기 {isFav ? '해제' : '추가'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── [2] Left Sidebar — TS/TC/TV Tree ── */}
          <div className="bg-white flex flex-col flex-shrink-0" style={{ width: leftSidebarWidth }}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f0] bg-gray-50 flex-shrink-0">
              <input type="checkbox" checked={allTCsSelected}
                onChange={e => setSelectedTCIds(e.target.checked ? allTCIds : [])}
                className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0" />
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
                <input type="text" value={scenarioSearchQuery} onChange={e => setScenarioSearchQuery(e.target.value)}
                  placeholder="검색..."
                  className="w-full pl-6 pr-2 py-1 text-[11px] border border-[#f0f0f0] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30" />
              </div>
              <button onClick={() => setScenarioChangeFilter(!scenarioChangeFilter)} title="변경사항 필터"
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  scenarioChangeFilter ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white' : 'text-[#9ca3af] hover:text-[#f78ca0] hover:bg-[#f78ca0]/10'
                }`}>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {/* 보류 항목 고정 영역 — aiItemActions 기반 */}
              {Object.entries(aiItemActions).filter(([, v]) => v === 'deferred').length > 0 && (
                <div className="mx-2 mb-2 rounded-lg border border-purple-200 bg-purple-50/40">
                  <div className="px-2.5 py-1.5 border-b border-purple-100 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                    <span className="text-[10px] font-semibold text-purple-700">보류 항목</span>
                  </div>
                  {Object.entries(aiItemActions).filter(([, v]) => v === 'deferred').map(([tsId]) => {
                    const ai = dynamicAIItems[tsId];
                    const sc = dynamicScenarios.find(s => s.id === tsId);
                    if (!ai || !sc) return null;
                    const triggerLabel = ai.trigger === 'chatbot' ? '챗봇 질의' : ai.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';
                    return (
                      <div key={`deferred-${tsId}`} className="px-2.5 py-1.5 border-b border-purple-100/60 last:border-0 text-[10px]">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          <span className="font-semibold text-purple-700">{tsId} · {sc.name}</span>
                          <span className="ml-auto text-[#9ca3af]">{ai.timestamp.split(' ')[0]}</span>
                        </div>
                        <div className="text-purple-800 mb-1 leading-relaxed">{triggerLabel} · {ai.reason}</div>
                        <div className="flex gap-1">
                          <button onClick={() => setAiItemActions(prev => ({ ...prev, [tsId]: 'approved' }))}
                            className="px-2 py-0.5 bg-purple-500 text-white rounded text-[9px] font-medium">승인</button>
                          <button onClick={() => setAiItemActions(prev => ({ ...prev, [tsId]: 'rejected' }))}
                            className="px-2 py-0.5 bg-white border border-purple-200 text-purple-600 rounded text-[9px] hover:bg-red-50 hover:text-red-500 hover:border-red-200">거절</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {filteredScenarios.map(scenario => {
                const tcs = dynamicTestCases[scenario.id] || [];
                const allTCKeys = tcs.map(tc => `${scenario.id}_${tc.id}`);
                const tsAllSel = allTCKeys.length > 0 && allTCKeys.every(k => selectedTCIds.includes(k));
                const tsSomeSel = allTCKeys.some(k => selectedTCIds.includes(k));
                const isExpanded = expandedTSForTC.includes(scenario.id);
                const tsMenuId = `ts-${scenario.id}`;

                // AI 생성 항목 여부 (코드 변경 감지 버튼으로 생성된 임시 항목 포함)
                const isCodeChangeItem = codeChangeDetected && scenario.id === 'TS1' && !aiItemActions['TS1'] && !dynamicAIItems['TS1'];
                const aiInfo = isCodeChangeItem
                  ? { reason: 'login.tsx 비밀번호 검증 로직 변경 감지', trigger: 'code' as const, timestamp: '2026-04-27 10:23' }
                  : dynamicAIItems[scenario.id];
                const isAIItem = !!aiInfo && aiItemActions[scenario.id] !== 'approved' && aiItemActions[scenario.id] !== 'rejected';
                const isDeferredItem = aiItemActions[scenario.id] === 'deferred';

                // 거절된 항목 스킵
                if (aiItemActions[scenario.id] === 'rejected') return null;
                // 보류된 항목은 위 섹션에 표시됨 — 여기선 렌더링 안 함
                if (isDeferredItem) return null;

                const triggerLabel = aiInfo?.trigger === 'chatbot' ? '챗봇 질의' : aiInfo?.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';

                const tsBadge = isAIItem ? 'bg-purple-100 text-purple-700' : 'bg-[#f78ca0]/10 text-[#f78ca0]';
                const tcBadge = isAIItem ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500';
                const tvBadge = isAIItem ? 'bg-purple-50/60 text-purple-400' : 'bg-gray-100 text-[#9ca3af]';

                const tsRowContent = (
                  <>
                    {/* TS 행 */}
                    <div className={`group flex items-center gap-1.5 px-2 py-2 ${isAIItem ? 'bg-purple-50/60' : 'hover:bg-gray-50'} border-b ${isAIItem ? 'border-purple-100' : 'border-[#f0f0f0]/60'} ${
                      !isAIItem && selectedScenario === scenario.id ? 'bg-[#f78ca0]/5 border-l-2 border-l-[#f78ca0]' : ''
                    }`}>
                      {isAIItem && <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                      <input type="checkbox" checked={tsAllSel}
                        ref={el => { if (el) el.indeterminate = tsSomeSel && !tsAllSel; }}
                        onChange={() => toggleTSSelection(scenario.id)}
                        className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0"
                        onClick={e => e.stopPropagation()} />
                      <button onClick={e => { e.stopPropagation(); setExpandedTSForTC(prev => prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]); }} className="flex-shrink-0">
                        {isExpanded ? <ChevronDown className={`w-3.5 h-3.5 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3.5 h-3.5 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} />}
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedScenario(scenario.id); setDetailPanelRow({ level: 'TS', tsId: scenario.id }); }}>
                        <div className="flex items-center gap-1">
                          <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tsBadge}`}>TS</span>
                          <span className={`text-xs font-semibold ${isAIItem ? 'text-purple-800' : 'text-[#1a1a2e]'}`}>{scenario.id}</span>
                          <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-600' : 'text-[#6b7280]'}`}>{scenario.name}</span>
                        </div>
                      </div>
                      {!isAIItem && (
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === tsMenuId ? null : tsMenuId); }}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-[#9ca3af] text-xs font-bold transition-opacity">
                            ···
                          </button>
                          {openItemMenuId === tsMenuId && (
                            <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-[#e5e7eb] py-1 w-32 z-[200]"
                              onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setOpenItemMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-xs text-[#6b7280]">
                                <Edit2 className="w-3 h-3" /> 수정
                              </button>
                              <button onClick={() => { setChatContextTag(`${scenario.id} — ${scenario.name}`); setChatbarActive(true); setChatPanelExpanded(true); setOpenItemMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f78ca0]/5 text-xs text-[#f78ca0]">
                                <MessageCircle className="w-3 h-3" /> 컨텍스트 입력
                              </button>
                              <button onClick={() => { setOpenItemMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-xs text-red-500">
                                <Trash2 className="w-3 h-3" /> 삭제
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI 항목 승인/보류/거절 버튼 */}
                    {isAIItem && (
                      <div className="px-2.5 py-1.5 bg-purple-50/40 border-b border-purple-100 flex items-center gap-1.5">
                        <span className="text-[9px] text-purple-500 flex-shrink-0">{triggerLabel}</span>
                        <span className="text-[9px] text-purple-400 truncate flex-1">{aiInfo!.reason}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => setAiItemActions(prev => ({ ...prev, [scenario.id]: 'approved' }))}
                            className="px-2 py-0.5 bg-purple-500 text-white rounded text-[9px] font-medium hover:bg-purple-600">승인</button>
                          <button onClick={() => setAiItemActions(prev => ({ ...prev, [scenario.id]: 'deferred' }))}
                            className="px-2 py-0.5 bg-white border border-purple-200 text-purple-600 rounded text-[9px] hover:bg-purple-50">보류</button>
                          <button onClick={() => setAiItemActions(prev => ({ ...prev, [scenario.id]: 'rejected' }))}
                            className="px-2 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] hover:bg-red-50">거절</button>
                        </div>
                      </div>
                    )}

                    {/* TC 행 */}
                    {isExpanded && tcs.map(tc => {
                      const tcKey = `${scenario.id}_${tc.id}`;
                      const tcMenuId = `tc-${tcKey}`;
                      const isTCExpanded = expandedTCMain.includes(tcKey);
                      return (
                        <div key={tc.id}>
                          <div className={`group flex items-center gap-1.5 pl-7 pr-2 py-1.5 border-b ${isAIItem ? 'bg-purple-50/30 border-purple-100/50' : `${highlightedBotRow === `tc-${tcKey}` ? 'bg-[#f78ca0]/10' : 'bg-[#F9FAFB]'} border-[#f0f0f0]/40`} hover:bg-opacity-80`}>
                            <input type="checkbox" checked={selectedTCIds.includes(tcKey)}
                              onChange={() => toggleTCSelection(tcKey)}
                              className="w-3 h-3 accent-[#f78ca0] flex-shrink-0"
                              onClick={e => e.stopPropagation()} />
                            <button onClick={e => { e.stopPropagation(); setExpandedTCMain(prev => prev.includes(tcKey) ? prev.filter(id => id !== tcKey) : [...prev, tcKey]); }} className="flex-shrink-0">
                              {tc.testVariables.length > 0
                                ? (isTCExpanded ? <ChevronDown className={`w-3 h-3 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3 h-3 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} />)
                                : <span className="w-3" />}
                            </button>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailPanelRow({ level: 'TC', tsId: scenario.id, tcId: tc.id })}>
                              <div className="flex items-center gap-1">
                                <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tcBadge}`}>TC</span>
                                <span className={`text-[11px] font-medium ${isAIItem ? 'text-purple-800' : 'text-[#1a1a2e]'}`}>{tc.id}</span>
                                <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-500' : 'text-[#6b7280]'}`}>{tc.name}</span>
                              </div>
                            </div>
                            {!isAIItem && (
                              <div className="relative flex-shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === tcMenuId ? null : tcMenuId); }}
                                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-[#9ca3af] text-xs font-bold transition-opacity">
                                  ···
                                </button>
                                {openItemMenuId === tcMenuId && (
                                  <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-[#e5e7eb] py-1 w-32 z-[200]"
                                    onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setOpenItemMenuId(null)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-xs text-[#6b7280]">
                                      <Edit2 className="w-3 h-3" /> 수정
                                    </button>
                                    <button onClick={() => { setChatContextTag(`${scenario.id} › ${tc.id} — ${tc.name}`); setChatbarActive(true); setChatPanelExpanded(true); setOpenItemMenuId(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f78ca0]/5 text-xs text-[#f78ca0]">
                                      <MessageCircle className="w-3 h-3" /> 컨텍스트 입력
                                    </button>
                                    <button onClick={() => setOpenItemMenuId(null)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-xs text-red-500">
                                      <Trash2 className="w-3 h-3" /> 삭제
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* TV 행 */}
                          {isTCExpanded && tc.testVariables.map(tv => {
                            const tvKey = `${scenario.id}_${tc.id}_${tv.id}`;
                            const tvMenuId = `tv-${tvKey}`;
                            return (
                              <div key={tv.id}
                                className={`group flex items-center gap-1.5 pr-2 py-1.5 border-b ${isAIItem ? 'bg-purple-50/20 border-purple-100/30' : `${highlightedBotRow === `tv-${tvKey}` ? 'bg-[#f78ca0]/8' : 'bg-[#FAFAFA]'} border-[#f0f0f0]/30 hover:bg-gray-50`} cursor-pointer`}
                                style={{ paddingLeft: '3.25rem' }}
                                onClick={() => { setDetailPanelRow({ level: 'TC', tsId: scenario.id, tcId: tc.id }); setSelectedTvId(tv.id); }}>
                                <input type="checkbox" checked={selectedTCIds.includes(tvKey)}
                                  onChange={() => toggleTVSelection(tvKey)}
                                  className="w-3 h-3 accent-[#f78ca0] flex-shrink-0"
                                  onClick={e => e.stopPropagation()} />
                                <div className="flex-1 min-w-0 flex items-center gap-1">
                                  <span className={`px-1 py-0.5 text-[9px] rounded font-medium ${tvBadge}`}>TV</span>
                                  <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-500' : 'text-[#6b7280]'}`}>{tv.id}: {tv.name}</span>
                                </div>
                                {!isAIItem && (
                                  <div className="relative flex-shrink-0">
                                    <button
                                      onClick={e => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === tvMenuId ? null : tvMenuId); }}
                                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-[#9ca3af] text-xs font-bold transition-opacity">
                                      ···
                                    </button>
                                    {openItemMenuId === tvMenuId && (
                                      <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-[#e5e7eb] py-1 w-32 z-[200]"
                                        onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setOpenItemMenuId(null)}
                                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-xs text-[#6b7280]">
                                          <Edit2 className="w-3 h-3" /> 수정
                                        </button>
                                        <button onClick={() => { setChatContextTag(`${scenario.id} › ${tc.id} › ${tv.id}`); setChatbarActive(true); setChatPanelExpanded(true); setOpenItemMenuId(null); }}
                                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f78ca0]/5 text-xs text-[#f78ca0]">
                                          <MessageCircle className="w-3 h-3" /> 컨텍스트 입력
                                        </button>
                                        <button onClick={() => setOpenItemMenuId(null)}
                                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-xs text-red-500">
                                          <Trash2 className="w-3 h-3" /> 삭제
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                );
                return <div key={scenario.id}>{tsRowContent}</div>;
              })}
            </div>
          </div>

          {/* Left drag handle */}
          <div className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleLeftDragStart} />

          {/* ── [3] Center: Network Graph ── */}
          <div className="flex-1 bg-[#F2F3F5] overflow-hidden relative"
            onClick={() => { setSelectedNetworkNodeId(null); setDetailPanelRow(null); setOpenItemMenuId(null); }}>
            <div className="absolute top-3 left-3 flex items-center gap-3 z-10 pointer-events-none">
              <span className="text-[10px] text-[#9ca3af] font-medium bg-white/60 px-2 py-1 rounded-full">노드 클릭 → 연결 강조 + 상세 보기</span>
            </div>
            {selectedNetworkNodeId && (
              <button
                onClick={e => { e.stopPropagation(); setSelectedNetworkNodeId(null); setDetailPanelRow(null); }}
                className="absolute top-3 right-3 z-10 text-[10px] text-[#f78ca0] bg-white/80 px-2 py-1 rounded-full border border-[#f78ca0]/30 hover:bg-white">
                선택 해제 ×
              </button>
            )}

            <svg width="100%" height="100%" viewBox="0 0 800 510" preserveAspectRatio="xMidYMid meet">
              {/* 컬럼 배경 */}
              {[
                { x: 50,  w: 80,  color: 'rgba(247,140,160,0.04)', label: '시나리오 (TS)', lc: '#f78ca0' },
                { x: 335, w: 90,  color: 'rgba(107,140,219,0.04)', label: '테스트케이스 (TC)', lc: '#6b8cdb' },
                { x: 625, w: 90,  color: 'rgba(156,163,175,0.04)', label: '테스트변수 (TV)', lc: '#9ca3af' },
              ].map(col => (
                <g key={col.label}>
                  <rect x={col.x} y={20} width={col.w} height={465} rx={12} fill={col.color} />
                  <text x={col.x + col.w / 2} y={13} textAnchor="middle" fontSize={9} fill={col.lc} fontWeight="600">{col.label}</text>
                </g>
              ))}

              {/* 범례 */}
              <g transform="translate(12, 492)">
                <circle cx={7} cy={7} r={5} fill="none" stroke="#f78ca0" strokeWidth={1.2} />
                <text x={16} y={11} fontSize={8.5} fill="#9ca3af">완료</text>
                <circle cx={65} cy={7} r={5} fill="none" stroke="#FF9A86" strokeWidth={1.2} />
                <text x={74} y={11} fontSize={8.5} fill="#9ca3af">실패</text>
                <circle cx={112} cy={7} r={5} fill="none" stroke="#BFC6C4" strokeWidth={1.2} />
                <text x={121} y={11} fontSize={8.5} fill="#9ca3af">대기</text>
                <circle cx={160} cy={7} r={8} fill="none" stroke="#f78ca0" strokeWidth={1.2} strokeDasharray="3 2" />
                <text x={172} y={11} fontSize={8.5} fill="#9ca3af">변경감지</text>
              </g>

              {/* Edges */}
              {mockNetworkEdges.map((edge, i) => {
                const from = mockNetworkNodes.find(n => n.id === edge.from);
                const to = mockNetworkNodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                const isHighlighted = !!(selectedNetworkNodeId && connectedIds.has(edge.from) && connectedIds.has(edge.to));
                const isFaded = !!(selectedNetworkNodeId && !isHighlighted);
                return (
                  <line key={i}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isHighlighted ? '#f78ca0' : '#D1D5DB'}
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeDasharray={to.type === 'TV' ? '5 3' : undefined}
                    opacity={isFaded ? 0.12 : isHighlighted ? 1 : 0.65}
                    style={{ transition: 'all 0.25s' }}
                  />
                );
              })}

              {/* Nodes */}
              {mockNetworkNodes.map(node => {
                const isSelected = selectedNetworkNodeId === node.id;
                const isConnected = selectedNetworkNodeId ? connectedIds.has(node.id) : true;
                const isFaded = !!(selectedNetworkNodeId && !isConnected);
                const statusColor = nodeStatusColor(node.status);
                const r = node.type === 'TS' ? 26 : node.type === 'TC' ? 18 : 12;
                const strokeColor = node.type === 'TS' ? '#f78ca0' : node.type === 'TC' ? '#6b8cdb' : '#9ca3af';
                const bgFill = isSelected ? strokeColor : (node.type === 'TS' ? 'rgba(247,140,160,0.15)' : node.type === 'TC' ? 'rgba(107,140,219,0.15)' : 'rgba(156,163,175,0.12)');
                const hasChange = (node as any).hasChange;

                return (
                  <g key={node.id}
                    style={{ cursor: 'pointer', transition: 'opacity 0.25s' }}
                    opacity={isFaded ? 0.18 : 1}
                    onClick={e => { e.stopPropagation(); handleNetworkNodeClick(node.id); }}>
                    {/* Change ring */}
                    {hasChange && (
                      <circle cx={node.x} cy={node.y} r={r + 8}
                        fill="none" stroke="#f78ca0" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.55} />
                    )}
                    {/* Main circle */}
                    <circle cx={node.x} cy={node.y} r={r}
                      fill={bgFill} stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : 1.8}
                    />
                    {/* Status indicator */}
                    <circle cx={node.x + r * 0.68} cy={node.y - r * 0.68} r={4.5}
                      fill={statusColor} stroke="white" strokeWidth={1.5} />
                    {/* Node label */}
                    <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={node.type === 'TS' ? 11 : 9.5}
                      fontWeight="700"
                      fill={isSelected ? 'white' : strokeColor}>
                      {node.label}
                    </text>
                    {/* Sub-label below */}
                    <text x={node.x} y={node.y + r + 13} textAnchor="middle"
                      fontSize={8.5} fill={isSelected ? strokeColor : '#b0b7c0'}>
                      {node.sub.length > 7 ? node.sub.slice(0, 7) + '…' : node.sub}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right drag handle — only when detail panel is open */}
          {detailPanelRow && (
            <div className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleRightDragStart} />
          )}

          {/* ── [4] Right Detail Panel ── */}
          {detailPanelRow && (() => {
            const { level, tsId, tcId } = detailPanelRow;
            const ts = dynamicScenarios.find(s => s.id === tsId);
            const tc = tcId ? (dynamicTestCases[tsId] || []).find(t => t.id === tcId) : undefined;
            const frMapped = mockRTMData.filter(r => r.ts === tsId);

            const editKey = level === 'TS' ? tsId : `${tsId}_${tcId}`;
            const isEditingName = editingDetailItem?.key === editKey;
            const isLoading = loadingItemKey === editKey;

            const saveName = (newName: string) => {
              setEditingDetailItem(null);
              setLoadingItemKey(editKey);
              setTimeout(() => {
                if (level === 'TS') {
                  setDynamicScenarios(prev => prev.map(s => s.id === tsId ? { ...s, name: newName } : s));
                  // 하위 TC 이름도 갱신 시뮬레이션
                  setDynamicTestCases(prev => ({ ...prev }));
                } else if (level === 'TC' && tcId) {
                  setDynamicTestCases(prev => ({
                    ...prev,
                    [tsId]: (prev[tsId] || []).map(t => t.id === tcId ? { ...t, name: newName } : t),
                  }));
                }
                setLoadingItemKey(null);
              }, 1200);
            };

            const saveTVName = (tvId: string, newName: string) => {
              setEditingDetailItem(null);
              const tvKey = `${tsId}_${tcId}_${tvId}`;
              setLoadingItemKey(tvKey);
              setTimeout(() => {
                setDynamicTestCases(prev => ({
                  ...prev,
                  [tsId]: (prev[tsId] || []).map(t =>
                    t.id === tcId
                      ? { ...t, testVariables: t.testVariables.map(v => v.id === tvId ? { ...v, name: newName } : v) }
                      : t
                  ),
                }));
                setLoadingItemKey(null);
              }, 1000);
            };

            return (
              <div className="bg-white border-l border-[#f0f0f0] flex flex-col flex-shrink-0" style={{ width: rightPanelWidth }}>
                {/* Header */}
                <div className="p-4 border-b border-[#f0f0f0] flex justify-between items-center bg-gradient-to-r from-[#f78ca0]/5 to-[#fe9a8b]/5 flex-shrink-0">
                  <div className="font-semibold text-sm text-[#1a1a2e] truncate pr-2">
                    {level === 'TC' ? `${tsId} › ${tcId}` : tsId}
                  </div>
                  <button onClick={() => { setDetailPanelRow(null); setSelectedNetworkNodeId(null); setSelectedTvId(null); }} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
                    <X className="w-4 h-4 text-[#6b7280]" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* 기본 정보 + 인라인 수정 */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest">기본 정보</div>
                      {!isLoading && !isEditingName && (
                        <button onClick={() => setEditingDetailItem({ type: level === 'TS' ? 'ts' : 'tc', key: editKey, value: (level === 'TS' ? ts?.name : tc?.name) ?? '' })}
                          className="p-1 rounded hover:bg-gray-100">
                          <Edit2 className="w-3 h-3 text-[#9ca3af]" />
                        </button>
                      )}
                      {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#f78ca0] animate-spin" />}
                    </div>
                    <div className="space-y-0 text-xs divide-y divide-[#f0f0f0]">
                      {level === 'TS' && ts && (<>
                        <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">ID</span><span className="font-mono font-semibold">{ts.id}</span></div>
                        <div className="flex justify-between items-start py-2 gap-2">
                          <span className="text-[#9ca3af] flex-shrink-0">이름</span>
                          {isEditingName ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input autoFocus value={editingDetailItem!.value} onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onKeyDown={e => { if (e.key === 'Enter') saveName(editingDetailItem!.value); if (e.key === 'Escape') setEditingDetailItem(null); }}
                                className="flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 min-w-0" />
                              <button onClick={() => saveName(editingDetailItem!.value)} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                              <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                            </div>
                          ) : (
                            <span className={`font-medium text-right ${isLoading ? 'text-[#9ca3af] animate-pulse' : ''}`}>{ts.name}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">TC 수</span><span className="font-medium">{(dynamicTestCases[ts.id] || []).length}개</span></div>
                        <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">상태</span>{statusIcon(ts.status, 'w-3.5 h-3.5')}</div>
                      </>)}
                      {level === 'TC' && tc && (<>
                        <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">ID</span><span className="font-mono font-semibold">{tc.id}</span></div>
                        <div className="flex justify-between items-start py-2 gap-2">
                          <span className="text-[#9ca3af] flex-shrink-0">이름</span>
                          {isEditingName ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input autoFocus value={editingDetailItem!.value} onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onKeyDown={e => { if (e.key === 'Enter') saveName(editingDetailItem!.value); if (e.key === 'Escape') setEditingDetailItem(null); }}
                                className="flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 min-w-0" />
                              <button onClick={() => saveName(editingDetailItem!.value)} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                              <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                            </div>
                          ) : (
                            <span className={`font-medium text-right ${isLoading ? 'text-[#9ca3af] animate-pulse' : ''}`}>{tc.name}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">상위 TS</span><span className="font-mono font-medium">{tsId}</span></div>
                        <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">상태</span>{statusIcon(tc.status, 'w-3.5 h-3.5')}</div>
                      </>)}
                    </div>
                  </div>

                  {/* TV 목록 (TC 상세에서만) */}
                  {level === 'TC' && tc && tc.testVariables.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest mb-2.5">테스트 변수 (TV)</div>
                      <div className="space-y-1.5">
                        {tc.testVariables.map(tv => {
                          const tvEditKey = `${tsId}_${tcId}_${tv.id}`;
                          const isTVSelected = selectedTvId === tv.id;
                          const isTVEditing = editingDetailItem?.key === tvEditKey;
                          const isTVLoading = loadingItemKey === tvEditKey;
                          const validKey = `${tsId}_${tcId}_${tv.id}`;
                          const validations = mockValidationConditions[validKey] || [];
                          return (
                            <div key={tv.id}
                              className={`rounded-lg border transition-all ${isTVSelected ? 'border-[#f78ca0]/40 bg-[#f78ca0]/5' : 'border-[#f0f0f0] bg-gray-50/50 hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                                onClick={() => setSelectedTvId(isTVSelected ? null : tv.id)}>
                                <span className="px-1 py-0.5 bg-gray-100 text-[#9ca3af] text-[9px] rounded font-medium flex-shrink-0">TV</span>
                                <span className="text-xs font-medium text-[#1a1a2e] flex-1 truncate">{tv.id}: {isTVLoading ? <span className="text-[#9ca3af] animate-pulse">{tv.name}</span> : tv.name}</span>
                                {isTVLoading && <Loader2 className="w-3 h-3 text-[#f78ca0] animate-spin flex-shrink-0" />}
                                {!isTVLoading && !isTVEditing && (
                                  <button onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'tv', key: tvEditKey, value: tv.name }); setSelectedTvId(tv.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 flex-shrink-0">
                                    <Edit2 className="w-2.5 h-2.5 text-[#9ca3af]" />
                                  </button>
                                )}
                                {isTVSelected ? <ChevronDown className="w-3 h-3 text-[#9ca3af] flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#9ca3af] flex-shrink-0" />}
                              </div>
                              {isTVSelected && (
                                <div className="px-3 pb-2.5 space-y-2 border-t border-[#f0f0f0]/60">
                                  {/* TV 이름 인라인 수정 */}
                                  <div className="pt-2">
                                    {isTVEditing ? (
                                      <div className="flex items-center gap-1">
                                        <input autoFocus value={editingDetailItem!.value}
                                          onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                                          onKeyDown={e => { if (e.key === 'Enter') saveTVName(tv.id, editingDetailItem!.value); if (e.key === 'Escape') setEditingDetailItem(null); }}
                                          className="flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30" />
                                        <button onClick={() => saveTVName(tv.id, editingDetailItem!.value)} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                                        <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-[#6b7280]">{tv.name}</span>
                                        <button onClick={() => setEditingDetailItem({ type: 'tv', key: tvEditKey, value: tv.name })}
                                          className="p-0.5 rounded hover:bg-gray-200">
                                          <Edit2 className="w-2.5 h-2.5 text-[#9ca3af]" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {/* 검증 조건 */}
                                  {validations.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wide">검증 조건</div>
                                      {validations.map((v, i) => (
                                        <div key={i} className="flex gap-1.5 p-2 bg-white rounded border border-[#f0f0f0] text-[10px]">
                                          <span className="text-[#f78ca0] flex-shrink-0 font-bold">•</span>
                                          <span className="text-[#6b7280] leading-relaxed">{v}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {validations.length === 0 && (
                                    <div className="text-[10px] text-[#9ca3af]">검증 조건 없음</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* FR 매핑 */}
                  <div>
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest mb-2.5">FR 매핑</div>
                    {frMapped.length === 0
                      ? <div className="text-xs text-[#9ca3af]">매핑된 요구사항 없음</div>
                      : (
                        <div className="space-y-1.5">
                          {frMapped.map(fr => (
                            <div key={fr.frId} className="p-2.5 bg-gray-50 rounded-lg border border-[#f0f0f0]">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-mono text-[10px] font-bold">{fr.frId}</span>
                                {fr.result === 'PASS' && <span className="text-[10px] text-[#9AB17A] font-semibold">PASS</span>}
                                {fr.result === 'FAIL' && <span className="text-[10px] text-[#FF9A86] font-semibold">FAIL</span>}
                                {fr.result === 'UNCOVERED' && <span className="text-[10px] text-[#9ca3af] font-semibold">미커버</span>}
                              </div>
                              <div className="text-[10px] text-[#6b7280] leading-relaxed">{fr.requirement}</div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Test Group Modal */}
        {showTestGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
              <div className="font-semibold mb-4 text-base">시나리오 그룹 생성</div>
              <div className="text-sm text-[#6b7280] mb-2">선택된 TC ({selectedTCs.length}개):</div>
              <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
                {selectedTCs.map(({ tsId, tcId, tsName, tcName }) => (
                  <div key={`${tsId}_${tcId}`} className="text-sm p-2 bg-gray-50 rounded">
                    {tsId} ({tsName}) → {tcId} {tcName}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowTestGroupModal(false); setSelectedTCIds([]); setCurrentPage('테스트그룹'); setTestDepth(0); }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg font-medium">
                  생성 확인
                </button>
                <button onClick={() => setShowTestGroupModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50">
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── TestGroupPage ───────────────────────────────────────────────────────────

  const TestGroupPage = () => {
    // Depth 0 — Group List
    if (testDepth === 0) {
      const filteredGroups = mockTestGroups.filter(g =>
        g.id.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
        g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
      );

      const totalTCs = filteredGroups.reduce((sum, g) => sum + g.tcCount, 0);

      const statusConfig = {
        active:   { label: '활성',  bg: 'bg-green-50',  text: 'text-[#9AB17A]',  border: 'border-green-200' },
        inactive: { label: '비활성', bg: 'bg-gray-100',  text: 'text-[#9ca3af]',  border: 'border-gray-200' },
        archived: { label: '보관',  bg: 'bg-amber-50',  text: 'text-amber-600',   border: 'border-amber-200' },
      };

      return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
          <PageTitle title="시나리오 그룹 관리" />

          {/* Controls bar */}
          <div className="bg-white border-b border-[#f0f0f0] px-6 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
              <input
                type="text" value={groupSearchQuery} onChange={e => setGroupSearchQuery(e.target.value)}
                placeholder="그룹명 검색..."
                className="pl-8 pr-3 py-1.5 border border-[#f0f0f0] rounded text-sm w-52 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 transition-colors"
              />
            </div>
            <span className="text-xs text-[#9ca3af]">
              {filteredGroups.length}개 그룹 · 총 {totalTCs}개 TC
            </span>
            <div className="ml-auto">
              <button className="px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                <Plus className="w-4 h-4" /> 새 시나리오 그룹 생성
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="bg-white rounded-xl border border-[#f0f0f0] shadow-sm overflow-hidden divide-y divide-[#f5f5f5]">
              {filteredGroups.length === 0 && (
                <div className="py-16 text-center text-sm text-[#9ca3af]">검색 결과가 없습니다.</div>
              )}
              {filteredGroups.map(group => {
                const isEditing = editingGroupId === group.id;
                const displayName = groupNames[group.id] || group.name;
                const sc = statusConfig[group.status] ?? statusConfig.inactive;

                return (
                  <div key={group.id} className="px-5 py-4 hover:bg-gray-50/70 transition-colors">

                    {/* ── Row 1: ID · Name · Status · Run button ── */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-[10px] font-mono text-[#c4c9d4] flex-shrink-0 w-10">
                        {group.id}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text" value={editingGroupName}
                            onChange={e => setEditingGroupName(e.target.value)}
                            className="px-2 py-0.5 border border-[#f78ca0] rounded text-sm font-semibold focus:outline-none flex-1 max-w-xs"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') { setGroupNames(prev => ({ ...prev, [group.id]: editingGroupName })); setEditingGroupId(null); }
                              if (e.key === 'Escape') setEditingGroupId(null);
                            }}
                          />
                          <button onClick={() => { setGroupNames(prev => ({ ...prev, [group.id]: editingGroupName })); setEditingGroupId(null); }}
                            className="p-0.5 bg-[#9AB17A] text-white rounded flex-shrink-0">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingGroupId(null)} className="p-0.5 bg-gray-200 rounded flex-shrink-0">
                            <X className="w-3.5 h-3.5 text-[#6b7280]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingGroupId(group.id); setEditingGroupName(displayName); }}
                          className="flex items-center gap-1 text-left flex-1 group/name min-w-0"
                        >
                          <span className="text-sm font-semibold text-[#1a1a2e] truncate">{displayName}</span>
                          <Edit2 className="w-3 h-3 text-[#c4c9d4] flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                        </button>
                      )}

                      {/* Status badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                        {sc.label}
                      </span>

                      {/* Run button */}
                      <button
                        onClick={() => {
                          const newRun = {
                            id: `run-${Date.now()}`,
                            name: displayName,
                            groupId: group.id,
                            startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                            status: 'running' as const,
                          };
                          setRunningTests(prev => [...prev, newRun]);
                          setSelectedRunningTestId(newRun.id);
                          setSelectedTestGroup(displayName);
                          setCompletedAgentStages([]);
                          setCurrentAgentStage('');
                          setIsTestRunning(false);
                          setCurrentPage('테스트');
                          setTestSubTab('INPROGRESS');
                          setTestSubmenuExpanded(true);
                          setScenarioSubmenuExpanded(false);
                        }}
                        className="ml-2 px-3 py-1.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <Play className="w-3 h-3" /> 즉시 실행
                      </button>
                    </div>

                    {/* ── Row 2: Scenarios · TC count · Tags · Meta ── */}
                    <div className="flex items-center gap-2 pl-[52px] flex-wrap">
                      {/* Scenario chips */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {group.scenarios.map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-[#6b7280] text-[10px] rounded font-mono">
                            {s}
                          </span>
                        ))}
                      </div>

                      <span className="text-[#d1d5db] text-xs">·</span>
                      <span className="text-[10px] text-[#6b7280] flex-shrink-0">{group.tcCount}개 TC</span>

                      {/* Tags */}
                      {group.tags.length > 0 && (
                        <>
                          <span className="text-[#d1d5db] text-xs">·</span>
                          <div className="flex gap-1">
                            {group.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] text-[10px] rounded border border-[#f78ca0]/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Meta: created + execution count */}
                      <div className="ml-auto flex items-center gap-3 text-[10px] text-[#9ca3af] flex-shrink-0">
                        <span>생성 {group.createdDate}</span>
                        <span className="flex items-center gap-0.5">
                          <History className="w-3 h-3" />
                          {group.executionCount}회 실행
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Depth 1 — Execution Screen
    if (testDepth === 1) {
      const selectedScenariosForTest = mockScenarios.filter(s =>
        scenarioSidebarTab === 'TOTAL' || s.id === scenarioFilter
      );

      // Resizable sidebar state
      const [depth1SidebarWidth, setDepth1SidebarWidth] = React.useState(288);
      const depth1DragRef = React.useRef(false);
      const depth1StartX = React.useRef(0);
      const depth1StartW = React.useRef(0);
      const handleDepth1DragStart = (e: React.MouseEvent) => {
        depth1DragRef.current = true;
        depth1StartX.current = e.clientX;
        depth1StartW.current = depth1SidebarWidth;
        const onMove = (ev: MouseEvent) => {
          if (!depth1DragRef.current) return;
          setDepth1SidebarWidth(Math.max(180, Math.min(500, depth1StartW.current + ev.clientX - depth1StartX.current)));
        };
        const onUp = () => { depth1DragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };

      return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="bg-white border-b border-[#f0f0f0] p-4 flex-shrink-0">
            <button onClick={() => setTestDepth(0)}
              className="flex items-center gap-2 text-[#6b7280] hover:text-[#1a1a2e]">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{selectedTestGroup || 'TEST GROUP'}</span>
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar — resizable */}
            <div className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0" style={{ width: depth1SidebarWidth }}>
              <div className="flex gap-2 px-4 pt-3 border-b border-[#f0f0f0]">
                {(['TOTAL', 'FILTERED'] as const).map(tab => (
                  <button key={tab} onClick={() => setScenarioSidebarTab(tab)}
                    className={`px-3 py-2 text-sm relative ${scenarioSidebarTab === tab ? 'text-[#1a1a2e] font-medium' : 'text-[#6b7280]'}`}>
                    {tab === 'FILTERED' ? '⊗' : tab}
                    {scenarioSidebarTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]" />}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {selectedScenariosForTest.map(scenario => {
                  const isExpanded = expandedScenarios.includes(scenario.id);
                  const tcs = mockTestCases[scenario.id] || [];
                  return (
                    <div key={scenario.id} className="border border-[#f0f0f0] rounded">
                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedScenarios(prev =>
                          prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                        )}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{scenario.id} {scenario.name}</div>
                        </div>
                        {statusIcon(scenario.status)}
                      </div>
                      {isExpanded && tcs.map(tc => {
                        const isTCExpanded = expandedTestCases.includes(`${scenario.id}_${tc.id}`);
                        return (
                          <div key={tc.id} className="ml-6 border-l-2 border-gray-200">
                            <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                const key = `${scenario.id}_${tc.id}`;
                                setExpandedTestCases(prev =>
                                  prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
                                );
                                const logIdx = mockTestLogs.findIndex(l => l.isError);
                                if (tc.status === 'failed' && logIdx >= 0) setHighlightedLogIdx(logIdx);
                              }}>
                              {isTCExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                              </div>
                              {statusIcon(tc.status, 'w-3 h-3')}
                            </div>
                            {isTCExpanded && tc.testVariables.map(tv => (
                              <div key={tv.id} className="ml-5 flex items-center gap-2 p-1.5 text-xs text-[#6b7280] cursor-pointer hover:bg-gray-50"
                                onClick={() => { if (tv.status === 'failed') setHighlightedLogIdx(4); }}>
                                <div className="flex-1 truncate">{tv.id}: {tv.name}</div>
                                {statusIcon(tv.status, 'w-3 h-3')}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Execution Controls */}
              <div className="p-4 border-t border-[#f0f0f0] space-y-2">
                <div className="flex gap-2 justify-center items-center">
                  <button
                    onClick={() => setIsTestRunning(!isTestRunning)}
                    className="px-4 py-2 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                    {isTestRunning ? <><Pause className="w-4 h-4" /> 정지</> : <><Play className="w-4 h-4" /> 실행</>}
                  </button>
                  <button
                    onClick={() => { setCompletedAgentStages([]); setCurrentAgentStage(''); setIsTestRunning(false); }}
                    className="px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4" /> 전체 재실행
                  </button>
                </div>
                {isTestRunning && (
                  <button onClick={advanceAgentStage}
                    className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-[#6b7280] transition-colors">
                    단계 진행 (시뮬레이션)
                  </button>
                )}
              </div>
            </div>

            {/* Drag handle */}
            <div
              className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors"
              onMouseDown={handleDepth1DragStart}
            />

            {/* Main Panel */}
            <div className="flex-1 flex overflow-hidden">
              {/* Test UI Preview (62%) */}
              <div className="w-[62%] p-4 bg-white border-r border-[#f0f0f0]">
                <div className="font-semibold mb-3 text-sm">TEST UI Preview</div>
                <div className="w-full h-[calc(100vh-14rem)] bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center">
                  {isTestRunning ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-[#6b7280] animate-spin mx-auto mb-2" />
                      <div className="text-sm text-[#6b7280]">실시간 브라우저 화면</div>
                    </div>
                  ) : (
                    <div className="text-center text-[#6b7280]">
                      <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <div className="text-sm">테스트 실행 중 실시간 화면이 표시됩니다</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Runtime Log (38%) */}
              <div className="w-[38%] p-4 bg-gray-50 overflow-y-auto">
                {/* Agent Progress Bar */}
                <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4 mb-4">
                  <div className="text-[11px] font-semibold text-[#6b7280] mb-3 uppercase tracking-wide">에이전트 실행 흐름</div>
                  <div className="flex items-center w-full gap-2">
                    {/* Parallel nodes — vertical */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {[
                        { stage: 'UI',  label: 'UI 테스트 Tool', short: 'UI' },
                        { stage: 'API', label: 'API 추적 Tool',  short: 'AP' },
                        { stage: 'DB',  label: 'DB 테스트 Tool', short: 'DB' },
                      ].map(n => {
                        const st = getNodeStatus(n.stage);
                        return (
                          <div key={n.stage} className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${
                              st === 'complete' ? 'bg-[#9AB17A] text-white' :
                              st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                              'bg-gray-200 text-gray-400'
                            }`}>
                              {st === 'complete' ? <CheckCircle className="w-3 h-3" /> : n.short}
                            </div>
                            <span className="text-[10px] text-[#6b7280] whitespace-nowrap">{n.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* merge connector */}
                    <div className="text-[#9ca3af] text-sm select-none flex-shrink-0">+</div>
                    {/* Sequential pipeline — flex-1 so it fills remaining space */}
                    <div className="flex items-center flex-1 min-w-0">
                      {[
                        { stage: 'Cross-check', label: 'Cross-check', short: 'Cr'  },
                        { stage: '원인 분석',    label: '원인 분석',    short: '원인' },
                        { stage: 'Report 생성', label: 'Report 생성', short: 'Re'  },
                      ].map((node, i) => {
                        const st = getNodeStatus(node.stage);
                        const prevDone = i > 0 && completedAgentStages.includes(
                          ['Cross-check', '원인 분석', 'Report 생성'][i - 1]
                        );
                        return (
                          <React.Fragment key={node.stage}>
                            {i > 0 && (
                              <div className={`flex-1 h-0 mx-2 ${
                                prevDone ? 'border-t-2 border-[#f78ca0]' : 'border-t-2 border-dashed border-gray-400'
                              }`} />
                            )}
                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                st === 'complete' ? 'bg-[#9AB17A] text-white' :
                                st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                                'bg-gray-200 text-gray-400'
                              }`}>
                                {st === 'complete' ? <CheckCircle className="w-3.5 h-3.5" /> : node.short}
                              </div>
                              <span className="text-[8px] text-[#9ca3af] whitespace-nowrap leading-tight">{node.label}</span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Playwright Logs */}
                <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4">
                  <div className="font-semibold mb-3 text-sm">Test Runtime Log</div>
                  <div className="space-y-2">
                    {mockTestLogs.map((log, idx) => (
                      <div key={idx} className={`p-2.5 rounded text-xs ${
                        idx === highlightedLogIdx ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                        log.isError ? 'bg-red-50 border-l-4 border-red-400' :
                        'bg-gray-50'
                      }`}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[#9ca3af]">{log.time}</span>
                          {log.apiMethod && (
                            <span>
                              <span className="font-semibold">{log.apiMethod}</span> {log.endpoint} ·{' '}
                              <span className={log.status === 200 ? 'text-[#9AB17A]' : 'text-[#FF9A86]'}>{log.status}</span> · {log.responseTime}
                            </span>
                          )}
                        </div>
                        <code className="block text-[#1a1a2e]">{log.action}</code>
                        {log.hitl && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            <AlertCircle className="w-3 h-3" /> HITL 플래그
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Completion Modal */}
          {showCompletionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <CheckCircle2 className="w-12 h-12 text-[#9AB17A] mx-auto mb-4" />
                <div className="font-semibold text-lg mb-2">테스트 실행이 완료되었습니다.</div>
                <div className="text-sm text-[#6b7280] mb-6">결과 페이지로 이동하시겠습니까?</div>
                <div className="flex gap-3">
                  <button onClick={() => {
                    setShowCompletionModal(false);
                    setRunningTests(prev => prev.map(t => t.id === selectedRunningTestId ? { ...t, status: 'completed' } : t));
                    setCurrentPage('테스트');
                    setTestSubTab('HISTORY');
                    setTestSubmenuExpanded(true);
                    setHistoryFilter('ALL');
                  }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg font-medium">
                    이동
                  </button>
                  <button onClick={() => setShowCompletionModal(false)}
                    className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50">
                    나중에
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ── TestPage (진행중 / 이력) ──────────────────────────────────────────────────

  const TestPage = () => {
    // 진행중: 실행 중인 테스트 목록 + 실행 상세
    const InProgressView = () => {
      const activeRuns = runningTests.filter(t => t.status === 'running');
      const selectedRun = runningTests.find(t => t.id === selectedRunningTestId);
      const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);

      // Resizable inner scenario sidebar
      const [innerSidebarWidth, setInnerSidebarWidth] = React.useState(288);
      const innerDragRef = React.useRef(false);
      const innerStartX = React.useRef(0);
      const innerStartW = React.useRef(0);
      const handleInnerDragStart = (e: React.MouseEvent) => {
        innerDragRef.current = true;
        innerStartX.current = e.clientX;
        innerStartW.current = innerSidebarWidth;
        const onMove = (ev: MouseEvent) => {
          if (!innerDragRef.current) return;
          setInnerSidebarWidth(Math.max(160, Math.min(500, innerStartW.current + ev.clientX - innerStartX.current)));
        };
        const onUp = () => { innerDragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };

      return (
        <div className="flex h-full">
          {/* 좌측: 실행 중인 테스트 목록 (접기 가능) */}
          <div className={`bg-[#F3F4F6] border-r border-[#e5e7eb] flex flex-col flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-10' : 'w-56'}`}>
            {sidebarCollapsed ? (
              <div className="border-b border-[#f0f0f0] flex items-center justify-center py-3 px-1 flex-shrink-0">
                <button onClick={() => setSidebarCollapsed(false)}
                  className="relative w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#9ca3af]"
                  title="펼치기">
                  <ChevronRight className="w-4 h-4" />
                  {activeRuns.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {activeRuns.length}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="px-3 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#1a1a2e]">진행중</span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-[#f78ca0]/20 to-[#fe9a8b]/20 text-[#f78ca0] text-xs rounded-full font-medium">{activeRuns.length}건</span>
                </div>
                <button onClick={() => setSidebarCollapsed(true)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[#9ca3af]"
                  title="접기">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeRuns.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <Clock className="w-8 h-8 text-[#9ca3af] mb-3 opacity-50" />
                    <div className="text-sm text-[#9ca3af]">진행 중인 테스트 없음</div>
                    <div className="text-xs text-[#c4c9d4] mt-1">시나리오 그룹에서 즉시 실행</div>
                  </div>
                )}
                {activeRuns.map(run => {
                  const isSelected = selectedRunningTestId === run.id;
                  return (
                    <button key={run.id}
                      onClick={() => { setSelectedRunningTestId(run.id); setSelectedTestGroup(run.name); }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#f78ca0] bg-gradient-to-r from-[#f78ca0]/15 to-[#fe9a8b]/15 shadow-sm'
                          : 'border-[#e5e7eb] hover:border-[#f78ca0]/50 hover:bg-[#f78ca0]/5'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Loader2 className="w-3 h-3 text-[#f78ca0] animate-spin flex-shrink-0" />
                        <span className={`text-xs font-semibold truncate flex-1 ${isSelected ? 'text-[#d9506b]' : 'text-[#1a1a2e]'}`}>{run.name}</span>
                      </div>
                      <div className="text-[10px] text-[#6b7280] pl-5">시작 {run.startTime}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {/* 접힌 상태: 아이콘만 세로로 */}
            {sidebarCollapsed && (
              <div className="flex-1 flex flex-col items-center py-3 gap-2 overflow-hidden">
                {activeRuns.map(run => {
                  const isSelected = selectedRunningTestId === run.id;
                  return (
                    <button key={run.id}
                      onClick={() => { setSelectedRunningTestId(run.id); setSidebarCollapsed(false); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] shadow-md shadow-pink-200' : 'bg-[#f78ca0]/15 hover:bg-[#f78ca0]/25'
                      }`}
                      title={run.name}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우측: 실행 상세 — 원본 testDepth=1 레이아웃 그대로 */}
          {selectedRun ? (
            <div className="flex-1 flex overflow-hidden">
              {/* 시나리오 사이드바 — resizable */}
              <div className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0" style={{ width: innerSidebarWidth }}>
                <div className="flex gap-2 px-4 pt-3 border-b border-[#f0f0f0]">
                  {(['TOTAL', 'FILTERED'] as const).map(tab => (
                    <button key={tab} onClick={() => setScenarioSidebarTab(tab)}
                      className={`px-3 py-2 text-sm relative ${scenarioSidebarTab === tab ? 'text-[#1a1a2e] font-medium' : 'text-[#6b7280]'}`}>
                      {tab === 'FILTERED' ? '⊗' : tab}
                      {scenarioSidebarTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]" />}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {mockScenarios.map(scenario => {
                    const isExpanded = expandedScenarios.includes(scenario.id);
                    const tcs = mockTestCases[scenario.id] || [];
                    return (
                      <div key={scenario.id} className="border border-[#f0f0f0] rounded">
                        <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedScenarios(prev =>
                            prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                          )}>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{scenario.id} {scenario.name}</div>
                          </div>
                          {statusIcon(scenario.status)}
                        </div>
                        {isExpanded && tcs.map(tc => {
                          const isTCExpanded = expandedTestCases.includes(`${scenario.id}_${tc.id}`);
                          return (
                            <div key={tc.id} className="ml-6 border-l-2 border-gray-200">
                              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  const key = `${scenario.id}_${tc.id}`;
                                  setExpandedTestCases(prev =>
                                    prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
                                  );
                                  const logIdx = mockTestLogs.findIndex(l => l.isError);
                                  if (tc.status === 'failed' && logIdx >= 0) setHighlightedLogIdx(logIdx);
                                }}>
                                {isTCExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                                </div>
                                {statusIcon(tc.status, 'w-3 h-3')}
                              </div>
                              {isTCExpanded && tc.testVariables.map(tv => (
                                <div key={tv.id} className="ml-5 flex items-center gap-2 p-1.5 text-xs text-[#6b7280] cursor-pointer hover:bg-gray-50"
                                  onClick={() => { if (tv.status === 'failed') setHighlightedLogIdx(4); }}>
                                  <div className="flex-1 truncate">{tv.id}: {tv.name}</div>
                                  {statusIcon(tv.status, 'w-3 h-3')}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-[#f0f0f0] space-y-2">
                  <div className="flex gap-2 justify-center items-center">
                    <button onClick={() => setIsTestRunning(!isTestRunning)}
                      className="px-4 py-2 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                      {isTestRunning ? <><Pause className="w-4 h-4" /> 정지</> : <><Play className="w-4 h-4" /> 실행</>}
                    </button>
                    <button onClick={() => { setCompletedAgentStages([]); setCurrentAgentStage(''); setIsTestRunning(false); }}
                      className="px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" /> 전체 재실행
                    </button>
                  </div>
                  {isTestRunning && (
                    <button onClick={advanceAgentStage}
                      className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-[#6b7280] transition-colors">
                      단계 진행 (시뮬레이션)
                    </button>
                  )}
                </div>
              </div>

              {/* Drag handle */}
              <div
                className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors"
                onMouseDown={handleInnerDragStart}
              />

              {/* 메인 패널 (원본과 동일) */}
              <div className="flex-1 flex overflow-hidden">
                {/* Test UI Preview (62%) */}
                <div className="w-[62%] p-4 bg-white border-r border-[#f0f0f0]">
                  <div className="font-semibold mb-3 text-sm">TEST UI Preview</div>
                  <div className="w-full h-[calc(100vh-14rem)] bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center">
                    {isTestRunning ? (
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-[#6b7280] animate-spin mx-auto mb-2" />
                        <div className="text-sm text-[#6b7280]">실시간 브라우저 화면</div>
                      </div>
                    ) : (
                      <div className="text-center text-[#6b7280]">
                        <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <div className="text-sm">테스트 실행 중 실시간 화면이 표시됩니다</div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Test Runtime Log (38%) — 원본과 동일 */}
                <div className="w-[38%] p-4 bg-gray-50 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4 mb-4">
                    <div className="text-[11px] font-semibold text-[#6b7280] mb-3 uppercase tracking-wide">에이전트 실행 흐름</div>
                    <div className="flex items-center w-full gap-2">
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {[
                          { stage: 'UI',  label: 'UI 테스트 Tool', short: 'UI' },
                          { stage: 'API', label: 'API 추적 Tool',  short: 'AP' },
                          { stage: 'DB',  label: 'DB 테스트 Tool', short: 'DB' },
                        ].map(n => {
                          const st = getNodeStatus(n.stage);
                          return (
                            <div key={n.stage} className="flex items-center gap-1.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${
                                st === 'complete' ? 'bg-[#9AB17A] text-white' :
                                st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                                'bg-gray-200 text-gray-400'
                              }`}>
                                {st === 'complete' ? <CheckCircle className="w-3 h-3" /> : n.short}
                              </div>
                              <span className="text-[10px] text-[#6b7280] whitespace-nowrap">{n.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[#9ca3af] text-sm select-none flex-shrink-0">+</div>
                      <div className="flex items-center flex-1 min-w-0">
                        {[
                          { stage: 'Cross-check', label: 'Cross-check', short: 'Cr'  },
                          { stage: '원인 분석',    label: '원인 분석',    short: '원인' },
                          { stage: 'Report 생성', label: 'Report 생성', short: 'Re'  },
                        ].map((node, i) => {
                          const st = getNodeStatus(node.stage);
                          const prevDone = i > 0 && completedAgentStages.includes(
                            ['Cross-check', '원인 분석', 'Report 생성'][i - 1]
                          );
                          return (
                            <React.Fragment key={node.stage}>
                              {i > 0 && (
                                <div className={`flex-1 h-0 mx-2 ${
                                  prevDone ? 'border-t-2 border-[#f78ca0]' : 'border-t-2 border-dashed border-gray-400'
                                }`} />
                              )}
                              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                  st === 'complete' ? 'bg-[#9AB17A] text-white' :
                                  st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                                  'bg-gray-200 text-gray-400'
                                }`}>
                                  {st === 'complete' ? <CheckCircle className="w-3.5 h-3.5" /> : node.short}
                                </div>
                                <span className="text-[8px] text-[#9ca3af] whitespace-nowrap leading-tight">{node.label}</span>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4">
                    <div className="font-semibold mb-3 text-sm">Test Runtime Log</div>
                    <div className="space-y-2">
                      {mockTestLogs.map((log, idx) => (
                        <div key={idx} className={`p-2.5 rounded text-xs ${
                          idx === highlightedLogIdx ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                          log.isError ? 'bg-red-50 border-l-4 border-red-400' :
                          'bg-gray-50'
                        }`}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#9ca3af]">{log.time}</span>
                            {log.apiMethod && (
                              <span>
                                <span className="font-semibold">{log.apiMethod}</span> {log.endpoint} ·{' '}
                                <span className={log.status === 200 ? 'text-[#9AB17A]' : 'text-[#FF9A86]'}>{log.status}</span> · {log.responseTime}
                              </span>
                            )}
                          </div>
                          <code className="block text-[#1a1a2e]">{log.action}</code>
                          {log.hitl && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                              <AlertCircle className="w-3 h-3" /> HITL 플래그
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#EDEEF0]">
              <div className="text-center text-[#9ca3af]">
                <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <div className="text-sm">좌측에서 실행 중인 테스트를 선택하세요</div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="h-[calc(100vh-4rem)] overflow-hidden">
        {testSubTab === 'INPROGRESS' && <InProgressView />}
        {testSubTab === 'HISTORY' && <ExecutionHistoryPage />}
      </div>
    );
  };

  // ── ExecutionHistoryPage ────────────────────────────────────────────────────

  const ExecutionHistoryPage = () => {
    // Extended mock detail errors for sidebar richness
    const mockDetailErrors = [
      {
        id: 'TS3_TC1', scenario: 'TS3', testCase: 'TC1', tcName: '상품 추가',
        category: 'UI오류',
        description: '장바구니 아이콘 수량 표시 오류',
        details: '장바구니에 상품 3개 추가 후 아이콘에 표시되는 수량이 2개로 잘못 표시됨',
        analysis: 'UI 상태 업데이트 로직에서 마지막 추가 항목이 반영되지 않음',
        solutions: [
          '1. CartIcon 컴포넌트의 useEffect 의존성 배열에 cartItems 추가',
          '2. Redux store의 cartSlice에서 addItem action 후 즉시 count 재계산',
          '3. API 응답 후 UI 강제 리렌더링 트리거',
        ],
        errorLog: 'Error: Cart count mismatch\n  at CartIcon.updateCount (CartIcon.tsx:42:15)\n  at Array.forEach (<anonymous>)\n  at updateState (store.js:128:8)',
      },
      {
        id: 'TS1_TC2', scenario: 'TS1', testCase: 'TC2', tcName: '비밀번호 오류',
        category: 'API오류',
        description: '비밀번호 오류 메시지 미표시',
        details: '잘못된 비밀번호 입력 시 오류 메시지가 표시되지 않고 빈 화면 상태 유지됨',
        analysis: 'API /auth/login 응답의 error 필드가 UI 컴포넌트에 바인딩되지 않음',
        solutions: [
          '1. AuthForm 컴포넌트에서 API error 응답 처리 로직 추가',
          '2. error state를 useState로 관리하고 렌더링 조건 수정',
        ],
        errorLog: 'TypeError: Cannot read property "message" of undefined\n  at AuthForm.handleError (AuthForm.tsx:88:22)\n  at async login (auth.ts:34:5)',
      },
      {
        id: 'TS2_TC1', scenario: 'TS2', testCase: 'TC1', tcName: '검색어 입력',
        category: '데이터불일치',
        description: '검색 자동완성 목록 누락',
        details: '3자 이상 입력 시 자동완성 API 호출은 성공하나 목록이 UI에 반영되지 않음',
        analysis: 'AutoComplete 컴포넌트의 useEffect에서 deps 배열 누락으로 재렌더링 안됨',
        solutions: [
          '1. useEffect deps 배열에 searchQuery 추가',
          '2. 자동완성 목록 상태를 부모 컴포넌트로 lift up',
        ],
        errorLog: 'Warning: Missing dependency "searchQuery" in useEffect hook\n  at AutoComplete (AutoComplete.tsx:56)\n  Expected items to update but state was stale',
      },
    ];

    // Mock PASS cases
    const mockPassCases = [
      { id: 'TS1_TC1', scenario: 'TS1', testCase: 'TC1', tcName: '로그인 성공', runtimeLog: 'PASS: navigate to /login\nPASS: fill email\nPASS: fill password\nPASS: click submit\nPASS: assert redirect to /dashboard' },
      { id: 'TS2_TC2', scenario: 'TS2', testCase: 'TC2', tcName: '상품 목록 조회', runtimeLog: 'PASS: navigate to /products\nPASS: assert list length > 0\nPASS: assert image src exists\nPASS: GET /api/products 200 142ms' },
      { id: 'TS3_TC2', scenario: 'TS3', testCase: 'TC2', tcName: '결제 완료', runtimeLog: 'PASS: navigate to /cart\nPASS: click checkout\nPASS: POST /api/orders 201 320ms\nPASS: assert success message' },
    ];

    // Group by TS for sidebar
    const failsByTS = mockDetailErrors.reduce((acc, err) => {
      if (!acc[err.scenario]) acc[err.scenario] = [];
      acc[err.scenario].push(err);
      return acc;
    }, {} as Record<string, typeof mockDetailErrors>);

    const passByTS = mockPassCases.reduce((acc, p) => {
      if (!acc[p.scenario]) acc[p.scenario] = [];
      acc[p.scenario].push(p);
      return acc;
    }, {} as Record<string, typeof mockPassCases>);

    const filtered = mockExecutionHistory.filter(exec => {
      if (historyFilter === 'ALL') return true;
      if (historyFilter === 'FAIL') return exec.fail > 0;
      if (historyFilter === 'HITL') return exec.hitlPending > 0;
      if (historyFilter === 'PASS') return exec.pass > 0;
      if (historyFilter === '미실행') return exec.notRun > 0;
      return true;
    });

    // ── Detail View ─────────────────────────────────────────────────────────
    if (selectedExecutionId) {
      const exec = mockExecutionHistory.find(e => e.id === selectedExecutionId);
      if (!exec) return null;

      const activeError = historyDetailTab === 'FAIL' ? (mockDetailErrors.find(e => e.id === selectedFailTC) ?? mockDetailErrors[0]) : null;
      const activePass = historyDetailTab === 'PASS' ? (mockPassCases.find(p => p.id === selectedFailTC) ?? null) : null;

      return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="bg-white border-b border-[#f0f0f0] px-5 py-3 flex items-center gap-4 flex-shrink-0">
            <button onClick={() => { setSelectedExecutionId(null); setSelectedFailTC(null); setRetestCheckedIds(new Set()); setHistoryDetailTab('FAIL'); }}
              className="flex items-center gap-1.5 text-[#6b7280] hover:text-[#1a1a2e]">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
            <div className="w-px h-4 bg-[#e5e7eb]" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{exec.groupId}</span>
              <span className="text-xs text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]">{exec.executionNumber}번째 실행</span>
              <span className="text-xs text-[#9ca3af]">{exec.startDate}</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="px-3 py-1.5 bg-white border border-[#f0f0f0] rounded text-xs hover:bg-gray-50 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button className="px-3 py-1.5 bg-white border border-[#f0f0f0] rounded text-xs hover:bg-gray-50 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar — FAIL / PASS Tree */}
            <div className="w-64 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">
              {/* FAIL / PASS 탭 */}
              <div className="px-4 border-b border-[#f0f0f0] flex items-center gap-0 flex-shrink-0">
                {([
                  { id: 'FAIL' as const, label: 'FAIL', count: exec.fail, color: 'text-[#FF9A86]' },
                  { id: 'PASS' as const, label: 'PASS', count: exec.pass, color: 'text-[#9AB17A]' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setHistoryDetailTab(tab.id); setSelectedFailTC(null); }}
                    className={`px-4 py-3 text-xs font-semibold relative flex items-center gap-1.5 transition-colors ${
                      historyDetailTab === tab.id ? tab.color : 'text-[#9ca3af] hover:text-[#6b7280]'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                      historyDetailTab === tab.id
                        ? (tab.id === 'FAIL' ? 'bg-red-100 text-[#FF9A86]' : 'bg-green-100 text-[#9AB17A]')
                        : 'bg-gray-100 text-[#9ca3af]'
                    }`}>{tab.count}</span>
                    {historyDetailTab === tab.id && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.id === 'FAIL' ? 'bg-[#FF9A86]' : 'bg-[#9AB17A]'}`} />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {/* FAIL 항목 */}
                {historyDetailTab === 'FAIL' && Object.entries(failsByTS).map(([tsId, errors]) => (
                  <div key={tsId}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                      <input type="checkbox"
                        checked={errors.every(e => retestCheckedIds.has(e.id))}
                        onChange={checked => {
                          const next = new Set(retestCheckedIds);
                          errors.forEach(e => checked.target.checked ? next.add(e.id) : next.delete(e.id));
                          setRetestCheckedIds(next);
                        }}
                        className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0"
                      />
                      <XCircle className="w-3.5 h-3.5 text-[#FF9A86] flex-shrink-0" />
                      <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                      <span className="ml-auto text-xs text-[#FF9A86]">FAIL {errors.length}</span>
                    </div>
                    {errors.map(err => {
                      const isActive = (selectedFailTC ?? mockDetailErrors[0].id) === err.id;
                      const isChecked = retestCheckedIds.has(err.id);
                      return (
                        <div
                          key={err.id}
                          onClick={() => setSelectedFailTC(err.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                            isActive ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 border-l-2 border-l-[#f78ca0]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input type="checkbox"
                            checked={isChecked}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const next = new Set(retestCheckedIds);
                              e.target.checked ? next.add(err.id) : next.delete(err.id);
                              setRetestCheckedIds(next);
                            }}
                            className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0"
                          />
                          <XCircle className="w-3.5 h-3.5 text-[#FF9A86] flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-[#1a1a2e] truncate">{err.testCase}</div>
                            <div className="text-[10px] text-[#9ca3af] truncate">{err.tcName}</div>
                          </div>
                          {/* 재테스트 트리거 버튼 */}
                          <button
                            onClick={e => { e.stopPropagation(); setShowRetestNavModal(true); setRetestCheckedIds(new Set([err.id])); }}
                            title="재테스트 실행"
                            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[#9ca3af] hover:text-[#f78ca0] hover:bg-[#f78ca0]/10 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* PASS 항목 */}
                {historyDetailTab === 'PASS' && Object.entries(passByTS).map(([tsId, passes]) => (
                  <div key={tsId}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#9AB17A] flex-shrink-0" />
                      <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                      <span className="ml-auto text-xs text-[#9AB17A]">PASS {passes.length}</span>
                    </div>
                    {passes.map(p => {
                      const isActive = selectedFailTC === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedFailTC(p.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                            isActive ? 'bg-gradient-to-r from-[#9AB17A]/10 to-[#9AB17A]/5 border-l-2 border-l-[#9AB17A]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-[#9AB17A] flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                            <div className="text-[10px] text-[#9ca3af] truncate">{p.tcName}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* 재시나리오 그룹 생성 버튼 */}
              {historyDetailTab === 'FAIL' && retestCheckedIds.size > 0 && (
                <div className="p-3 border-t border-[#f0f0f0] flex-shrink-0">
                  <button
                    onClick={() => setShowRetestNavModal(true)}
                    className="w-full px-3 py-2 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    재시나리오 그룹 생성 ({retestCheckedIds.size}건)
                  </button>
                </div>
              )}
            </div>

            {/* Center — Error Detail / Pass Detail */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
              {historyDetailTab === 'FAIL' && activeError && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-[#FF9A86]" />
                    <span className="font-semibold text-[#1a1a2e]">{activeError.scenario} › {activeError.testCase}</span>
                    <span className="px-2 py-0.5 text-xs rounded font-medium bg-red-100 text-red-700">{activeError.category}</span>
                  </div>
                  <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                    <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">① 장애 분류</div>
                    <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-sm rounded border border-red-200 font-medium">
                      {activeError.category}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                    <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">② 장애 분류 상세</div>
                    <div className="text-sm font-medium text-[#1a1a2e] mb-1">{activeError.description}</div>
                    <div className="text-sm text-[#6b7280]">{activeError.details}</div>
                  </div>
                  <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                    <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">③ 원인 분석</div>
                    <div className="text-sm text-[#6b7280]">{activeError.analysis}</div>
                  </div>
                  <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                    <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">④ 해결 방안</div>
                    <div className="space-y-2">
                      {activeError.solutions.map((sol, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded border border-[#f0f0f0]">
                          <span className="w-5 h-5 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="text-sm text-[#6b7280]">{sol.replace(/^\d+\.\s*/, '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {historyDetailTab === 'PASS' && (
                activePass ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#9AB17A]" />
                      <span className="font-semibold text-[#1a1a2e]">{activePass.scenario} › {activePass.testCase}</span>
                      <span className="px-2 py-0.5 text-xs rounded font-medium bg-green-100 text-[#9AB17A]">PASS</span>
                    </div>
                    <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                      <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">테스트 결과</div>
                      <div className="text-sm font-medium text-[#9AB17A]">모든 검증 항목 통과</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
                    <CheckCircle className="w-8 h-8 mb-2 opacity-25" />
                    <div className="text-sm">좌측에서 PASS 항목을 선택하세요</div>
                  </div>
                )
              )}
            </div>

            {/* Right Panel — UI 캡처 + Runtime 로그 */}
            <div className="w-64 bg-white border-l border-[#f0f0f0] flex flex-col overflow-y-auto flex-shrink-0">
              <div className="p-4 border-b border-[#f0f0f0]">
                <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">UI 캡처</div>
                <div className="w-full h-36 bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center">
                  <div className="text-center text-[#9ca3af]">
                    <Eye className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <div className="text-xs">스크린샷</div>
                  </div>
                </div>
              </div>
              <div className="p-4 flex-1">
                <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">
                  {historyDetailTab === 'PASS' ? 'Runtime 로그' : 'Runtime 에러 로그'}
                </div>
                <div className="bg-[#1e1e2e] rounded p-3 overflow-x-auto">
                  {historyDetailTab === 'FAIL' && activeError && activeError.errorLog.split('\n').map((line, i) => (
                    <div key={i} className={`font-mono text-[10px] leading-5 ${
                      i === 0 ? 'text-[#FF9A86] font-semibold' : 'text-[#9ca3af]'
                    }`}>{line}</div>
                  ))}
                  {historyDetailTab === 'PASS' && activePass && activePass.runtimeLog.split('\n').map((line, i) => (
                    <div key={i} className="font-mono text-[10px] leading-5 text-[#9AB17A]">{line}</div>
                  ))}
                  {historyDetailTab === 'PASS' && !activePass && (
                    <div className="text-[10px] text-[#6b7280]">항목을 선택하면 로그가 표시됩니다</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── List View ─────────────────────────────────────────────────────────────
    const overallStatus = (exec: typeof mockExecutionHistory[0]) => {
      if (exec.fail > 0) return 'fail';
      if (exec.hitlPending > 0) return 'hitl';
      return 'pass';
    };

    // 시나리오 그룹별 색상
    const groupColors: Record<string, string> = {
      '시나리오 그룹 #1': '#f78ca0',
      '시나리오 그룹 #2': '#6b8cdb',
      '시나리오 그룹 #3': '#9AB17A',
    };

    // Chart data — x=날짜, y=pass비율(%) per 시나리오 그룹
    const allGroups = [...new Set(mockExecutionHistory.map(e => e.groupId))];
    const allDates = [...new Set(mockExecutionHistory.map(e => e.startDate.slice(5, 10)))].sort();
    const chartData = allDates.map(date => {
      const point: Record<string, any> = { date };
      allGroups.forEach(g => {
        const exec = mockExecutionHistory.find(e => e.startDate.slice(5, 10) === date && e.groupId === g);
        if (exec) {
          const total = exec.pass + exec.fail + exec.hitlPending + exec.notRun;
          point[g] = total > 0 ? Math.round((exec.pass / total) * 100) : 0;
        } else {
          point[g] = null;
        }
      });
      return point;
    });

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;
      return (
        <div className="bg-white border border-[#f0f0f0] rounded-lg shadow-lg px-3 py-2 text-xs">
          <div className="font-semibold text-[#1a1a2e] mb-1">{label}</div>
          {payload.filter((p: any) => p.value != null).map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-[#6b7280]">{p.dataKey.replace('시나리오 그룹 ', 'SG')}</span>
              <span className="font-semibold ml-auto pl-3 text-[#1a1a2e]">{p.value}%</span>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        {/* ── Title + controls ── */}
        <div className="border-b border-[#f0f0f0] px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="font-semibold text-base text-[#1a1a2e]">테스트 결과</div>
          <div className="text-xs text-[#9ca3af]">총 {filtered.length}건</div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
              <input type="text" placeholder="그룹명 검색..."
                className="pl-8 pr-3 py-1.5 border border-[#f0f0f0] rounded text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30" />
            </div>
            <select
              value={historyFilter}
              onChange={e => setHistoryFilter(e.target.value)}
              className="pl-3 pr-7 py-1.5 border border-[#f0f0f0] rounded text-sm text-[#6b7280] bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
              <option value="ALL">전체</option>
              <option value="FAIL">FAIL</option>
              <option value="HITL">HITL</option>
              <option value="PASS">PASS</option>
              <option value="미실행">미실행</option>
            </select>
          </div>
        </div>

        {/* ── Pass 비율 Line Chart ── */}
        <div className="border-b border-[#f0f0f0] px-6 pt-3 pb-2 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#9ca3af] font-medium">일자별 PASS 비율 (%)</span>
            <div className="flex items-center gap-3">
              {allGroups.map(g => (
                <div key={g} className="flex items-center gap-1.5 text-[10px] text-[#6b7280]">
                  <span className="w-5 h-0.5 rounded inline-block" style={{ background: groupColors[g] ?? '#9ca3af' }} />
                  {g.replace('시나리오 그룹 ', 'SG')}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={v => `${v}%`} width={36} />
              <Tooltip content={<CustomTooltip />} />
              {allGroups.map(g => (
                <Line key={g} type="monotone" dataKey={g}
                  stroke={groupColors[g] ?? '#9ca3af'} strokeWidth={2}
                  dot={{ r: 4, fill: groupColors[g] ?? '#9ca3af', strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 5 }} connectNulls={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Column headers */}
          <div className="grid items-center px-6 py-2 border-b border-[#f0f0f0] bg-gray-50"
            style={{ gridTemplateColumns: '24px 1fr 130px 90px 120px 80px' }}>
            <div />
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
              실행 정보
              <span className="text-[#c4c9d4]">⇅</span>
            </div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
              실행 일시
              <span className="text-[#c4c9d4]">⇅</span>
            </div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">상태</div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
              count
              <span className="text-[#c4c9d4]">⇅</span>
            </div>
            <div />
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[#9ca3af]">조건에 맞는 실행 이력이 없습니다.</div>
          )}

          {filtered.map(exec => {
            const st = overallStatus(exec);
            const total = exec.pass + exec.fail + exec.hitlPending + exec.notRun;
            return (
              <div key={exec.id}
                className="grid items-center px-6 py-3.5 border-b border-[#f5f5f5] hover:bg-gray-50/60 transition-colors cursor-pointer group"
                style={{ gridTemplateColumns: '24px 1fr 130px 90px 120px 80px' }}
                onClick={() => { setSelectedExecutionId(exec.id); setSelectedFailTC(null); }}>

                {/* Status dot */}
                <div className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    st === 'fail' ? 'bg-[#FF9A86]' :
                    st === 'hitl' ? 'bg-[#B8860B]' :
                    'bg-[#9AB17A]'
                  }`} />
                </div>

                {/* Execution info — monospace style like reference */}
                <div>
                  <div className="font-mono text-sm text-[#1a1a2e]">
                    {exec.groupId.replace('시나리오 그룹', 'SG')}
                    <span className="text-[#9ca3af] font-sans"> · </span>
                    <span className="text-[#6b7280] text-xs font-sans">{exec.executionNumber}번째 실행</span>
                  </div>
                </div>

                {/* Date */}
                <div className="text-xs text-[#6b7280] font-mono">{exec.startDate}</div>

                {/* Status badge */}
                <div>
                  {st === 'fail' && (
                    <span className="text-xs font-medium text-[#FF9A86]">
                      FAIL {Math.round((exec.fail / total) * 100)}%
                    </span>
                  )}
                  {st === 'hitl' && (
                    <span className="text-xs font-medium text-[#B8860B]">HITL 대기</span>
                  )}
                  {st === 'pass' && (
                    <span className="text-xs font-medium text-[#9AB17A]">PASS</span>
                  )}
                </div>

                {/* Count breakdown */}
                <div className="text-xs text-[#9ca3af] font-mono space-x-2">
                  <span className="text-[#9AB17A]">P{exec.pass}</span>
                  <span className="text-[#FF9A86]">F{exec.fail}</span>
                  <span className="text-[#B8860B]">H{exec.hitlPending}</span>
                  <span>N{exec.notRun}</span>
                </div>

                {/* Chevron */}
                <div className="flex justify-end">
                  <ChevronRight className="w-4 h-4 text-[#c4c9d4] group-hover:text-[#9ca3af] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── RTMPage ─────────────────────────────────────────────────────────────────

  const RTMPage = () => {
    const [selectedFrId, setSelectedFrId] = useState(mockRTMRequirements[0].frId);
    const [selectedRtmVersion, setSelectedRtmVersion] = useState(mockRTMVersions[0].id);
    const [rtmVersionOpen, setRtmVersionOpen] = useState(false);

    const currentRtmVersion = mockRTMVersions.find(v => v.id === selectedRtmVersion) ?? mockRTMVersions[0];

    const selectedFr = mockRTMRequirements.find(r => r.frId === selectedFrId) ?? mockRTMRequirements[0];
    const totalReqs = mockRTMRequirements.length;
    const metReqs = mockRTMRequirements.filter(r => r.status === '충족').length;
    const unmetReqs = mockRTMRequirements.filter(r => r.status === '미충족').length;
    const unrunReqs = mockRTMRequirements.filter(r => r.totalCount === 0).length;

    const overallPassTotal = mockRTMRequirements.reduce((s, r) => s + r.passCount, 0);
    const overallTotal = mockRTMRequirements.reduce((s, r) => s + r.totalCount, 0);
    const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;
    const overallPieData = overallTotal > 0
      ? [{ value: overallPassTotal }, { value: overallTotal - overallPassTotal }]
      : [{ value: 0 }, { value: 1 }];

    const mockTesters: Record<string, string> = {
      'TS1_TC1': '김지수', 'TS1_TC2': '이민준', 'TS1_TC3': '박서연',
      'TS2_TC1': '최현우', 'TS3_TC3': '정유진',
    };

    return (
      <div className="flex h-[calc(100vh-4rem)]">

        {/* ── Left Panel — FR list ── */}
        <div className="w-72 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">

          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setRtmVersionOpen(!rtmVersionOpen)}
                className="flex items-center gap-1.5 group"
              >
                <span className="font-semibold text-sm text-[#1a1a2e]">RTM</span>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 group-hover:bg-gray-200 transition-colors">
                  <span className="text-[10px] font-medium text-[#6b7280]">{currentRtmVersion.id}</span>
                  <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
                </div>
              </button>
              {rtmVersionOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-[#f0f0f0] z-50">
                  <div className="p-2">
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide px-2 py-1.5">RTM 버전 선택</div>
                    {mockRTMVersions.map(ver => (
                      <button
                        key={ver.id}
                        onClick={() => { setSelectedRtmVersion(ver.id); setRtmVersionOpen(false); }}
                        className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left hover:bg-gray-50 transition-colors ${
                          selectedRtmVersion === ver.id ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/5' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${selectedRtmVersion === ver.id ? 'bg-[#f78ca0]' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold ${selectedRtmVersion === ver.id ? 'text-[#f78ca0]' : 'text-[#1a1a2e]'}`}>
                            {ver.label}
                          </div>
                          <div className="text-[10px] text-[#9ca3af] mt-0.5">{ver.date} · {ver.basedOn}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="px-3 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          {/* Overall donut + summary */}
          <div className="px-5 py-5 border-b border-[#f0f0f0] flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
                <PieChart width={120} height={120}>
                  <Pie data={overallPieData} cx={55} cy={55} innerRadius={36} outerRadius={54}
                    dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    <Cell fill="#9AB17A" />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#1a1a2e]">{overallPct}%</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[#9ca3af] w-8">전체</span>
                  <span className="font-semibold text-[#1a1a2e]">{totalReqs}건</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9AB17A] flex-shrink-0" />
                  <span className="text-[#9ca3af] w-8">충족</span>
                  <span className="font-semibold text-[#9AB17A]">{metReqs}건</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9A86] flex-shrink-0" />
                  <span className="text-[#9ca3af] w-8">미충족</span>
                  <span className="font-semibold text-[#FF9A86]">{unmetReqs}건</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#BFC6C4] flex-shrink-0" />
                  <span className="text-[#9ca3af] w-8">미실행</span>
                  <span className="font-semibold text-[#9ca3af]">{unrunReqs}건</span>
                </div>
              </div>
            </div>
          </div>

          {/* FR list */}
          <div className="flex-1 overflow-y-auto">
            {mockRTMRequirements.map(req => {
              const isActive = selectedFrId === req.frId;
              const pct = req.totalCount > 0 ? Math.round((req.passCount / req.totalCount) * 100) : 0;
              const pieData = req.totalCount > 0
                ? [{ value: req.passCount }, { value: req.totalCount - req.passCount }]
                : [{ value: 0 }, { value: 1 }];
              const fillColor = req.totalCount === 0 ? '#BFC6C4' : req.status === '충족' ? '#9AB17A' : '#FF9A86';
              const statusLabel = req.totalCount === 0 ? '미실행' : req.status;
              const statusClass = req.totalCount === 0
                ? 'bg-gray-100 text-[#9ca3af]'
                : req.status === '충족' ? 'bg-green-100 text-[#9AB17A]' : 'bg-red-100 text-[#FF9A86]';

              return (
                <button
                  key={req.frId}
                  onClick={() => setSelectedFrId(req.frId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#f0f0f0] ${
                    isActive
                      ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/8 border-l-[3px] border-l-[#f78ca0]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Mini donut */}
                  <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
                    <svg width={40} height={40}>
                      <circle cx={20} cy={20} r={16} fill="none" stroke="#E5E7EB" strokeWidth={4} />
                      <circle
                        cx={20} cy={20} r={16}
                        fill="none"
                        stroke={fillColor}
                        strokeWidth={4}
                        strokeDasharray={`${2 * Math.PI * 16 * pct / 100} ${2 * Math.PI * 16}`}
                        strokeLinecap="round"
                        transform="rotate(-90 20 20)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-bold leading-none" style={{ color: fillColor }}>
                        {req.totalCount > 0 ? `${pct}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#f78ca0]' : 'text-[#9ca3af]'}`}>
                        {req.frId}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-xs text-[#1a1a2e] truncate leading-snug">{req.content}</div>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? 'text-[#f78ca0]' : 'text-[#d1d5db]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right — TC execution history table ── */}
        <div className="flex-1 flex flex-col bg-[#EDEEF0] overflow-hidden">

          {/* Selected FR header */}
          <div className="bg-white border-b border-[#f0f0f0] px-6 py-4 flex items-center gap-3 flex-shrink-0">
            <span className="font-mono text-sm font-bold text-[#1a1a2e]">{selectedFr.frId}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              selectedFr.totalCount === 0 ? 'bg-gray-100 text-[#9ca3af]' :
              selectedFr.status === '충족' ? 'bg-green-100 text-[#9AB17A]' : 'bg-red-100 text-[#FF9A86]'
            }`}>{selectedFr.totalCount === 0 ? '미실행' : selectedFr.status}</span>
            <span className="text-sm text-[#6b7280] flex-1 min-w-0 truncate">{selectedFr.content}</span>
            <span className="text-xs text-[#9ca3af] flex-shrink-0 font-mono">
              {selectedFr.passCount}/{selectedFr.totalCount} PASS
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {selectedFr.history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
                <Clock className="w-8 h-8 mb-2 opacity-25" />
                <div className="text-sm">실행 이력이 없습니다</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[#E4E5E8] border-b border-[#D5D6DA] z-10">
                  <tr>
                    {['TS', 'TC', '최신실행 이력 ID', '최근테스트자', 'PASS / FAIL'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#f0f0f0]">
                  {selectedFr.history.map((row, i) => {
                    const tester = mockTesters[`${row.ts}_${row.tc}`] ?? '—';
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.ts}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.tc}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-[#6b7280]">{row.latestTest}</div>
                          <div className="text-[10px] text-[#9ca3af] mt-0.5">{row.date}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#f78ca0]/20 to-[#fe9a8b]/20 flex items-center justify-center text-[10px] font-semibold text-[#f78ca0] flex-shrink-0">
                              {tester !== '—' ? tester[0] : '?'}
                            </div>
                            <span className="text-xs text-[#6b7280]">{tester}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            row.pass ? 'bg-green-100 text-[#9AB17A]' : 'bg-red-100 text-[#FF9A86]'
                          }`}>
                            {row.pass
                              ? <CheckCircle className="w-3 h-3" />
                              : <XCircle className="w-3 h-3" />
                            }
                            {row.pass ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── SettingsPage ────────────────────────────────────────────────────────────

  const SettingsPage = () => (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      <PageTitle title="설정" />
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-[#f0f0f0] space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Git 연동</label>
          <input type="text" placeholder="GitHub Repository URL" className="w-full p-2 border border-[#f0f0f0] rounded mb-2" />
          <input type="password" placeholder="API Key" className="w-full p-2 border border-[#f0f0f0] rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">야간 자동 루프</label>
          <div className="flex gap-4">
            <input type="time" className="p-2 border border-[#f0f0f0] rounded" defaultValue="22:00" />
            <select className="p-2 border border-[#f0f0f0] rounded">
              <option>매일</option>
              <option>주중만</option>
              <option>주말만</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">실행 대상 시나리오 범위</label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-[#f0f0f0] rounded p-3">
            {mockScenarios.map(scenario => (
              <label key={scenario.id} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span className="text-sm">{scenario.id} - {scenario.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">결과 수신 방법</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="w-4 h-4" /><span className="text-sm">알림</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="w-4 h-4" /><span className="text-sm">이메일</span></label>
          </div>
          <input type="email" placeholder="email@example.com" className="w-full p-2 border border-[#f0f0f0] rounded" />
        </div>
        <button className="w-full px-4 py-3 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded font-medium">
          저장
        </button>
      </div>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <LeftNavigation />

      <div className="flex-1 flex flex-col overflow-hidden">
        <NavBar />
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            {currentPage === 'HOME' && <HomePage />}
            {currentPage === '시나리오' && <ScenarioPage />}
            {currentPage === '테스트그룹' && <TestGroupPage />}
            {currentPage === '테스트' && <TestPage />}
            {currentPage === 'RTM' && <RTMPage />}
            {currentPage === '설정' && <SettingsPage />}
          </div>
        </div>
      </div>

      {/* Files Modal */}
      {showLinkedFiles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkedFiles(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#6b7280]" />
                <span className="font-semibold text-[#1a1a2e]">FILES</span>
              </div>
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded text-xs flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> 파일 추가
              </button>
            </div>
            {/* File list */}
            <div className="px-6 py-4 space-y-3">
              {mockFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-[#f0f0f0] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#6b7280] flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm text-[#1a1a2e]">{file.name}</div>
                      <div className="text-xs text-[#6b7280]">{file.version} · {file.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.reflected
                      ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">시나리오 반영됨</span>
                      : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">미반영</span>}
                    <button className="px-3 py-1 bg-white border border-[#f0f0f0] rounded text-xs hover:bg-gray-50 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> 업데이트 +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center gap-3">
              <button onClick={() => setShowLinkedFiles(false)}
                className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg text-sm hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={() => { setShowLinkedFiles(false); setChatbarActive(true); setChatPanelExpanded(true); setChatContextTag('연관 파일 변경 반영'); }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                수정
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 재테스트 이동 모달 ── */}
      {showRetestNavModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div className="font-semibold text-[#1a1a2e] mb-2">재테스트 시나리오 그룹이 생성되었습니다</div>
            <div className="text-sm text-[#6b7280] mb-6">
              선택한 {retestCheckedIds.size}건의 FAIL 케이스로 재테스트 시나리오 그룹을 생성했습니다.<br />
              테스트 실행 페이지로 이동하겠습니까?
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const newRun = {
                    id: `run-retest-${Date.now()}`,
                    name: `재테스트 시나리오 그룹 (${retestCheckedIds.size}건)`,
                    groupId: 'RETEST',
                    startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                    status: 'running' as const,
                  };
                  setRunningTests(prev => [...prev, newRun]);
                  setSelectedRunningTestId(newRun.id);
                  setSelectedTestGroup(newRun.name);
                  setCompletedAgentStages([]);
                  setCurrentAgentStage('');
                  setIsTestRunning(false);
                  setRetestCheckedIds(new Set());
                  setShowRetestNavModal(false);
                  setCurrentPage('테스트');
                  setTestSubTab('INPROGRESS');
                  setTestSubmenuExpanded(true);
                  setScenarioSubmenuExpanded(false);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg font-medium text-sm"
              >
                이동
              </button>
              <button
                onClick={() => setShowRetestNavModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50 text-sm"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scenario Chatbot (bottom bar) ── */}
      {currentPage === '시나리오' && (
        <>
          {/* Hover-trigger zone at the bottom of the content area */}
          <div
            className="fixed bottom-0 z-30 pointer-events-auto"
            style={{ left: '3.5rem', right: 0, height: '4.5rem' }}
            onMouseEnter={() => { if (!chatbarClosedRef.current) setChatbarActive(true); }}
          />

          {/* Color-blur backdrop — appears when chatbar is active */}
          <div
            className="fixed bottom-0 z-30 pointer-events-none transition-opacity duration-300"
            style={{
              left: '3.5rem', right: 0, height: '7rem',
              opacity: chatbarActive ? 1 : 0,
              background: 'linear-gradient(to top, rgba(249,250,251,0.97) 0%, rgba(249,250,251,0.6) 65%, transparent 100%)',
              backdropFilter: chatbarActive ? 'blur(8px)' : 'none',
              WebkitBackdropFilter: chatbarActive ? 'blur(8px)' : 'none',
            }}
          />

          {/* Quick chips panel */}
          {chatbarActive && quickChipsOpen && (
            <div
              className="fixed z-50 flex flex-col gap-1.5"
              style={{ bottom: '5rem', left: 'calc(3.5rem + 1rem)' }}
            >
              {['엣지 케이스 추가', 'TC 세분화', '시나리오 생성', '오류 분석'].map(chip => (
                <button key={chip}
                  onClick={() => { setAiInput(chip); setQuickChipsOpen(false); setChatPanelExpanded(true); }}
                  className="px-4 py-2 bg-white rounded-full shadow-lg border border-[#f0f0f0] text-sm text-[#1a1a2e] hover:shadow-xl hover:border-[#f78ca0]/30 text-left transition-all">
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Chat history panel */}
          {chatbarActive && chatHistoryPanelOpen && (
            <div
              className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-[#f0f0f0] overflow-hidden flex flex-col"
              style={{ bottom: '5.2rem', left: 'calc(3.5rem + 4.5rem)', width: '280px', maxHeight: '300px' }}
            >
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold text-[#1a1a2e]">대화 히스토리</span>
                <button onClick={() => setChatHistoryPanelOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-3.5 h-3.5 text-[#9ca3af]" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {[
                  { date: '2026-04-27 10:23', summary: 'TS2 TC1 수정 — 검색 자동완성 조건 추가' },
                  { date: '2026-04-26 16:42', summary: 'TS1 TC2 엣지 케이스 추가' },
                  { date: '2026-04-25 09:15', summary: 'TS3 전체 시나리오 재생성 요청' },
                ].map((h, i) => (
                  <button key={i}
                    onClick={() => { setChatHistoryPanelOpen(false); setChatPanelExpanded(true); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-[#f0f0f0] transition-colors">
                    <div className="text-xs font-medium text-[#1a1a2e] mb-0.5 truncate">{h.summary}</div>
                    <div className="text-[10px] text-[#9ca3af]">{h.date}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat conversation panel — slides up when input is focused */}
          {chatbarActive && chatPanelExpanded && (
            <div
              className="fixed z-50 flex justify-center"
              style={{ bottom: '5.2rem', left: '3.5rem', right: 0 }}
            >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-[#f0f0f0] overflow-hidden flex flex-col w-full"
              style={{
                maxWidth: '672px',
                maxHeight: '300px',
                animation: 'slideUpFade 0.22s ease-out',
                marginLeft: '4.5rem',
                marginRight: '2.5rem',
              }}
            >
              <style>{`@keyframes slideUpFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-[#f78ca0]/5 to-[#fe9a8b]/5">
                <span className="text-sm font-semibold text-[#1a1a2e]">시나리오 관리봇</span>
                <button onClick={() => setChatPanelExpanded(false)} className="p-1 hover:bg-gray-100 rounded">
                  <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {aiMessages.map((msg, idx) => (
                  <div key={idx}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white'
                          : 'bg-gray-100 text-[#1a1a2e]'
                      }`}>{msg.text}</div>
                    </div>
                    {msg.role === 'assistant' && idx > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {['시나리오에 추가', '기존 시나리오 수정 반영', '다시 생성'].map(label => (
                          <button key={label}
                            onClick={() => {
                              setInlineDiffId('TS1_TC2');
                              setHighlightedBotRow('tc-TS1_TC2');
                              setTimeout(() => setHighlightedBotRow(null), 2000);
                            }}
                            className="px-2.5 py-1 text-xs bg-white border border-[#f0f0f0] rounded-full hover:bg-gray-50 hover:border-[#f78ca0]/30 transition-colors">
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}

          {/* ── Chatbar pill ── */}
          <div
            className="fixed z-50 flex justify-center transition-all duration-300"
            style={{
              left: '3.5rem', right: 0, bottom: '1rem',
              opacity: chatbarActive ? 1 : 0,
              transform: chatbarActive ? 'translateY(0)' : 'translateY(1rem)',
              pointerEvents: chatbarActive ? 'auto' : 'none',
            }}
          >
            <div className="flex items-center gap-2 w-full max-w-2xl px-4">

              {/* (+) outside-left: quick chips */}
              <button
                onClick={() => { setQuickChipsOpen(p => !p); setChatHistoryPanelOpen(false); }}
                className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center flex-shrink-0 transition-all hover:shadow-xl ${
                  quickChipsOpen
                    ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white border-transparent'
                    : 'bg-white border-[#f0f0f0] text-[#6b7280] hover:border-[#f78ca0]/30'
                }`}>
                <Plus className="w-5 h-5" />
              </button>

              {/* Pill bar */}
              <div className="flex-1 flex items-center bg-white rounded-full shadow-xl border border-[#f0f0f0] px-4 py-2.5 gap-3 hover:shadow-2xl transition-shadow">

                {/* History toggle — inside-left */}
                <button
                  onClick={() => { setChatHistoryPanelOpen(p => !p); setQuickChipsOpen(false); }}
                  className={`flex-shrink-0 transition-colors p-0.5 rounded-full ${chatHistoryPanelOpen ? 'text-[#f78ca0]' : 'text-[#9ca3af] hover:text-[#6b7280]'}`}
                  title="대화 히스토리">
                  <History className="w-4 h-4" />
                </button>

                {/* Divider */}
                {(chatContextTag || true) && <div className="w-px h-4 bg-[#f0f0f0] flex-shrink-0" />}

                {/* Context tag (pink) — shown when clicking speech bubble on a row */}
                {chatContextTag && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#f78ca0]/15 text-[#f78ca0] rounded-full text-xs flex-shrink-0 max-w-[200px] border border-[#f78ca0]/20">
                    <span className="truncate font-medium">{chatContextTag}</span>
                    <button onClick={() => setChatContextTag(null)} className="flex-shrink-0 ml-0.5 opacity-60 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Text input */}
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onFocus={() => { setChatPanelExpanded(true); setChatHistoryPanelOpen(false); }}
                  placeholder={chatContextTag ? '수정 내용을 입력하세요...' : 'TC/TV에 대해 질문하거나 수정 요청하기...'}
                  className="flex-1 bg-transparent focus:outline-none text-sm placeholder-[#c4c9d4] min-w-0"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && aiInput.trim()) {
                      sendAiMessage(aiInput);
                      setChatPanelExpanded(true);
                      if (chatContextTag?.includes('TC2')) {
                        setTimeout(() => {
                          setInlineDiffId('TS1_TC2');
                          setHighlightedBotRow('tc-TS1_TC2');
                          setTimeout(() => setHighlightedBotRow(null), 2000);
                        }, 700);
                      }
                    }
                  }}
                />

                {/* Send button */}
                <button
                  onClick={() => { if (aiInput.trim()) { sendAiMessage(aiInput); setChatPanelExpanded(true); } }}
                  className={`p-1.5 rounded-full flex-shrink-0 transition-all ${
                    aiInput.trim()
                      ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white shadow-sm hover:shadow-md'
                      : 'bg-gray-100 text-[#c4c9d4]'
                  }`}>
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Close chatbar */}
              <button
                onClick={() => {
                  chatbarClosedRef.current = true;
                  setChatbarActive(false);
                  setChatPanelExpanded(false);
                  setQuickChipsOpen(false);
                  setChatHistoryPanelOpen(false);
                  setChatContextTag(null);
                  setTimeout(() => { chatbarClosedRef.current = false; }, 700);
                }}
                className="w-9 h-9 rounded-full bg-white shadow-md border border-[#f0f0f0] flex items-center justify-center flex-shrink-0 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
