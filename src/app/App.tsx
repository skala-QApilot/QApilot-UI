import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import ScenarioNetworkGraph from './components/ScenarioNetworkGraph';
import { StatusIcon } from './components/common/StatusIcon';
import { SubHeader } from './components/common/SubHeader';
import { SearchBar } from './components/common/SearchBar';
import { LeftNavigation } from './components/common/LeftNavigation';
import { FileList } from './components/common/FileList';
import { NavBar } from './components/common/NavBar';
import { HomePage, type ProjectMeta, type ProjectSummary } from './pages/HomePage';
import { TestRunningPage } from './pages/TestRunningPage';
import { TestResultPage } from './pages/TestResultPage';
import { RTMPage } from './pages/RTMPage';
import { TestPage } from './pages/TestPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { DashHomePage, type Service } from './pages/DashHomePage';
import { ServiceSetupPage } from './pages/ServiceSetupPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import {
  ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Plus,
  Eye, AlertCircle, CheckCircle, X,
  RotateCcw, Pause, Send,
  History, BarChart2, Users, Settings,
  Network, GitBranch, Download,
  Sparkles, Star, FolderOpen,
} from 'lucide-react';
import AgentTracePanel from './components/AgentTracePanel';
import { onAuthExpired, ApiError } from '../api/client';
import { startScenarioGeneration } from '../api/agent';
import { useTracePolling } from '../hooks/useTracePolling';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useRtmStore } from '../store/rtmStore';
import {
  useScenarioStore,
  toUiScenario,
  toUiTestCase,
  toUiVersion,
  toUiAIItemsByScenario,
  type UiScenario,
  type UiTestCase,
  type UiScenarioVersion,
  type UiAIItem,
} from '../store/scenarioStore';
import { ProtectedRoute } from '../components/ProtectedRoute';
import {
  mockAgentTrace,
  mockFiles,
  mockNotifications,
  mockScenarioHistory,
  mockExecutionHistory,
  mockTestLogs,
} from './data/mockData';
// 시나리오 도메인 데이터 (scenarios/TC/versions/AI items) 는 scenarioStore 에서 derive.
// 로컬 편집 상태는 동일 shape 의 useState 로 유지하며, 서비스 진입 시 store 로 한 번 sync.
type TestCaseMap = Record<string, UiTestCase[]>;
const qapilotAgent = new URL('../assets/qapilot-agent.png', import.meta.url).href;

// 예약 최상위 경로(프로젝트 slug가 아닌 라우트)
const RESERVED_TOP_SEGMENTS = new Set(['login', 'services']);

function getProjectSlugFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/') return null;
  const segment = normalized.split('/').filter(Boolean)[0] || '';
  if (!segment || RESERVED_TOP_SEGMENTS.has(segment)) return null;
  return segment;
}

function getProjectPageFromPath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const segments = normalized.split('/').filter(Boolean);
  const pageSegment = segments[1]?.toLowerCase() || '';
  if (pageSegment === 'setup') return 'SETUP';
  if (pageSegment === 'scenarios') return '시나리오';
  if (pageSegment === 'results' || pageSegment === 'test') return '테스트';
  if (pageSegment === 'rtm') return 'RTM';
  return 'HOME';
}

// URL pathname을 보고 현재 페이지 키(currentPage 값)를 도출한다.
function getCurrentPageFromPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'LANDING';
  if (pathname.startsWith('/login')) return 'LOGIN';
  if (pathname.startsWith('/services')) return 'SERVICES';
  return getProjectPageFromPath(pathname);
}

// currentPage 키를 navigate 경로로 변환한다.
function buildPagePath(page: string, slug: string | null): string | null {
  switch (page) {
    case 'LANDING': return '/';
    case 'LOGIN': return '/login';
    case 'SERVICES': return '/services';
    case 'HOME':
      return slug ? `/${slug}` : null;
    case 'SETUP':
      return slug ? `/${slug}/setup` : null;
    case '시나리오':
      return slug ? `/${slug}/scenarios` : null;
    case '테스트':
    case '실행이력':
      return slug ? `/${slug}/test` : null;
    case 'RTM':
      return slug ? `/${slug}/rtm` : null;
    default:
      return null;
  }
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const projectSlug = getProjectSlugFromPath(location.pathname);
  const isProjectRoute = Boolean(projectSlug);
  const currentPage = getCurrentPageFromPath(location.pathname);

  const setCurrentPage = (page: string) => {
    const path = buildPagePath(page, projectSlug);
    if (path) navigate(path);
  };

  // 401 만료 → 로그인 페이지로 강제 이동
  useEffect(() => {
    return onAuthExpired(() => {
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  // ── project domain (projectStore) ─────────────────────────────────────────
  const services = useProjectStore((s) => s.services);
  const projectMeta = useProjectStore((s) => s.projectMeta);
  const projectSummary = useProjectStore((s) => s.projectSummary);
  const projectCredentials = useProjectStore((s) => s.projectCredentials);
  const projectLoadState = useProjectStore((s) => s.loadState);
  const showAuthForProject = useProjectStore((s) => s.showAuthForProject);
  const loadServices = useProjectStore((s) => s.loadServices);
  const loadProject = useProjectStore((s) => s.loadProject);
  const createServiceInStore = useProjectStore((s) => s.createService);
  const markServiceSetupDone = useProjectStore((s) => s.markServiceSetupDone);
  const setShowAuthForProject = useProjectStore((s) => s.setShowAuthForProject);
  const clearProjectAuth = useProjectStore((s) => s.clearProjectAuth);

  /** URL slug 가 selectedServiceId 의 역할을 한다 (NavBar 등 호환용). */
  const selectedServiceId = projectSlug;
  const setSelectedServiceId = (_id: string | null) => {
    /* URL-driven — handler 가 navigate 로 처리 */
  };

  const [authRetry, setAuthRetry] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [homeTab, setHomeTab] = useState('overview');
  const [scenarioViewMode, setScenarioViewMode] = useState<'table' | 'graph'>('table');

  // pipeline header
  const [showAgentTrace, setShowAgentTrace] = useState(false);

  // scenario page
  const [selectedScenario, setSelectedScenario] = useState('TS1');
  const [scenarioPageTab, setScenarioPageTab] = useState<'TOTAL' | 'CHANGE'>('TOTAL');
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState('');
  const [scenarioChangeFilter, setScenarioChangeFilter] = useState(false);
  const [selectedScenarioVersion, setSelectedScenarioVersion] = useState('change-2');
  const [scenarioVersions, setScenarioVersions] = useState<UiScenarioVersion[]>([]);
  const [favoriteVersionIds, setFavoriteVersionIds] = useState<Set<string>>(new Set());
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);
  const [selectedNetworkNodeId, setSelectedNetworkNodeId] = useState<string | null>(null);
  const [expandedTSForTC, setExpandedTSForTC] = useState<string[]>(['TS1']);
  const [selectedTCIds, setSelectedTCIds] = useState<string[]>([]);
  const [expandedTC, setExpandedTC] = useState<string[]>(['TC1']);
  const [showTestGroupModal, setShowTestGroupModal] = useState(false);
  const [showLinkedFiles, setShowLinkedFiles] = useState(false);
  const [changeItemActions, setChangeItemActions] = useState<Record<number, 'approved' | 'deferred'>>({});
  const [aiItemActions, setAiItemActions] = useState<Record<string, 'approved' | 'deferred' | 'rejected'>>({});
  const [showDeferredAIItems, setShowDeferredAIItems] = useState(false);
  const [codeChangeDetected, setCodeChangeDetected] = useState(false);
  const [dynamicScenarios, setDynamicScenarios] = useState<UiScenario[]>([]);
  const [dynamicAIItems, setDynamicAIItems] = useState<Record<string, UiAIItem>>({});
  const [dynamicTestCases, setDynamicTestCases] = useState<TestCaseMap>({});
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
  const [scenarioSidebarTab, setScenarioSidebarTab] = useState<'TOTAL' | 'PASS' | 'FILTERED'>('TOTAL');
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
  const codeChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fileChangeDetected, setFileChangeDetected] = useState(false);

  // 테스트 페이지 (진행중 / 이력)
  const [runningTests, setRunningTests] = useState<Array<{
    id: string; name: string; groupId: string | null; startTime: string; status: 'running' | 'completed';
  }>>([
    { id: 'run-001', name: '나의 진행 중인 테스트', groupId: 'TG-001', startTime: '2026-05-12 14:32', status: 'running' },
  ]);
  const [selectedRunningTestId, setSelectedRunningTestId] = useState<string | null>('run-001');
  const [retestCheckedIds, setRetestCheckedIds] = useState<Set<string>>(new Set());
  const [showRetestNavModal, setShowRetestNavModal] = useState(false);

  // 시나리오 그룹 선택 & 예약 설정
  const [selectedScenarioGroupId, setSelectedScenarioGroupId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAlarms, setScheduledAlarms] = useState<Array<{ time: string; id: string }>>([]);

  // 테스트 결과
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [rtmSearchQuery, setRtmSearchQuery] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedRunningForDetail, setSelectedRunningForDetail] = useState<string | null>(null);
  const [selectedFailTC, setSelectedFailTC] = useState<string | null>(null);
  const [historyDetailTab, setHistoryDetailTab] = useState<'FAIL' | 'PASS'>('FAIL');

  // RTM (rtmStore)
  const rtmVersions = useRtmStore((s) => s.versions);
  const selectedRtmVersion = useRtmStore((s) => s.selectedVersionId);
  const setSelectedRtmVersion = useRtmStore((s) => s.selectVersion);
  const loadRtmVersions = useRtmStore((s) => s.loadVersions);
  const currentRtmVersion = useRtmStore((s) => s.getSelectedVersion());
  const [expandedRTMItems, setExpandedRTMItems] = useState<string[]>([]);
  const [rtmVersionOpen, setRtmVersionOpen] = useState(false);

  /** 현재 URL slug 에 해당하는 백엔드 service_id (RTM/runs 등 service-scope API 호출용) */
  const currentServiceId = useProjectStore(
    (s) => s.services.find((svc) => svc.id === projectSlug)?.serviceId ?? null,
  );

  useEffect(() => {
    if (!currentServiceId) return;
    if (!useAuthStore.getState().isAuthenticated()) return;
    loadRtmVersions(currentServiceId);
  }, [currentServiceId, loadRtmVersions]);

  // 시나리오 도메인 (scenarios / TC / versions / change-requests / groups) 동기화.
  // 서비스 진입 시 한 번 로드한 후, 로컬 편집 state (dynamicScenarios 등) 으로 스냅한다.
  // 이후 사용자가 UI 에서 편집한 내용은 로컬 state 에만 머무름 (write API 통합은 후속 PR).
  const loadScenarioDomain = useScenarioStore((s) => s.loadAll);
  useEffect(() => {
    if (!currentServiceId) return;
    if (!useAuthStore.getState().isAuthenticated()) return;
    let cancelled = false;
    loadScenarioDomain(currentServiceId).then(() => {
      if (cancelled) return;
      const s = useScenarioStore.getState();
      setDynamicScenarios(s.scenarios.map(toUiScenario));
      const tcMap: TestCaseMap = {};
      for (const [tsId, list] of Object.entries(s.testCasesByTs)) {
        tcMap[tsId] = list.map(toUiTestCase);
      }
      setDynamicTestCases(tcMap);
      setDynamicAIItems(toUiAIItemsByScenario(s.changeRequests));
      setScenarioVersions(s.versions.map(toUiVersion));
    });
    return () => {
      cancelled = true;
    };
  }, [currentServiceId, loadScenarioDomain]);

  // 인증된 상태에서 서비스 목록 1회 로드 (DashHomePage 진입 시 사용)
  useEffect(() => {
    if (useAuthStore.getState().isAuthenticated()) {
      loadServices().catch(() => {/* 목록 실패는 화면별로 처리 */});
    }
  }, [loadServices]);

  // 프로젝트 라우트 진입 시 메타/요약 로드
  useEffect(() => {
    if (!projectSlug) return;
    if (!useAuthStore.getState().isAuthenticated()) {
      setShowAuthForProject(true);
      return;
    }
    loadProject(projectSlug);
  }, [projectSlug, authRetry, loadProject, setShowAuthForProject]);

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
            { id: 'TC1', name: 'AI 기본 케이스', status: 'pending', values: [{ id: 'TV1', name: '정상 입력', status: 'pending' }, { id: 'TV2', name: '경계값 입력', status: 'pending' }] },
            { id: 'TC2', name: 'AI 엣지 케이스', status: 'pending', values: [{ id: 'TV1', name: '오류 입력', status: 'pending' }] },
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

  const onReviewConfirm = () => {
    const stableVersions = scenarioVersions.filter(v => !v.hasChange);
    const latestLabel = stableVersions[stableVersions.length - 1]?.label ?? 'v1.0';
    const match = latestLabel.match(/^v(\d+)\.(\d+)$/);
    const [major, minor] = match ? [parseInt(match[1]), parseInt(match[2])] : [1, 0];
    const newLabel = `v${major}.${minor + 1}`;
    const today = new Date();
    const date = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setScenarioVersions([
      ...stableVersions,
      { id: newLabel, label: newLabel, date, hasChange: false, isFavorite: false },
    ]);
    setSelectedScenarioVersion(newLabel);
    setAiItemActions({});
    setDynamicAIItems({});
  };

  const triggerCodeChangeDetection = () => {
    if (codeChangeTimerRef.current) window.clearTimeout(codeChangeTimerRef.current);
    setCodeChangeDetected(true);

    codeChangeTimerRef.current = window.setTimeout(() => {
      setDynamicAIItems(prev => ({
        ...prev,
        TS1: prev.TS1 ?? {
          reason: 'login.tsx 비밀번호 검증 로직 변경 감지',
          trigger: 'code',
          timestamp: '2026-04-27 10:23',
        },
      }));
      setExpandedTSForTC(prev => prev.includes('TS1') ? prev : [...prev, 'TS1']);
      setCodeChangeDetected(false);
      codeChangeTimerRef.current = null;
    }, 1800);
  };

  const triggerFileChangeDetection = () => {
    setShowLinkedFiles(false);
    setCurrentPage('시나리오');
    if (fileChangeTimerRef.current) window.clearTimeout(fileChangeTimerRef.current);
    setFileChangeDetected(true);

    fileChangeTimerRef.current = window.setTimeout(() => {
      const unreflected = mockFiles.filter(f => !f.reflected);
      unreflected.forEach(file => {
        const targetId = 'TS2';
        setDynamicAIItems(prev => ({
          ...prev,
          [targetId]: prev[targetId] ?? {
            reason: `${file.name} ${file.version} 업데이트 내용 시나리오 반영 필요`,
            trigger: 'file' as const,
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          },
        }));
        setExpandedTSForTC(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
      });
      setFileChangeDetected(false);
      fileChangeTimerRef.current = null;
    }, 1800);
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

  useEffect(() => {
    return () => {
      if (codeChangeTimerRef.current) window.clearTimeout(codeChangeTimerRef.current);
      if (fileChangeTimerRef.current) window.clearTimeout(fileChangeTimerRef.current);
    };
  }, []);

  // 테스트 페이지 밖으로 나가면 detail 상태 초기화 → SubHeader 정상 표시
  useEffect(() => {
    if (currentPage !== '테스트') {
      setSelectedRunningForDetail(null);
      setSelectedExecutionId(null);
    }
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

  // ── Service navigation helpers ──────────────────────────────────────────────

  const selectedService = services.find(s => s.id === selectedServiceId) ?? null;

  if (isProjectRoute && showAuthForProject) {
    return (
      <LoginPage
        onLogin={() => {
          setShowAuthForProject(false);
          setAuthRetry(n => n + 1);
        }}
        onBack={() => {}}
        projectSlug={projectSlug ?? undefined}
      />
    );
  }

  if (isProjectRoute && !selectedService && (projectLoadState === 'loading' || projectLoadState === 'idle')) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#ffffff_60%)] text-[#1a1a2e] flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-[2rem] border border-[#ece9fb] bg-white/90 shadow-xl px-8 py-10 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9ca3af]">QApilot</div>
          <h1 className="mt-3 text-3xl font-bold">프로젝트 대시보드를 불러오는 중입니다</h1>
          <p className="mt-3 text-sm text-[#6b7280]">/{projectSlug} 등록 정보와 코드 인덱스 요약을 확인하고 있어요.</p>
        </div>
      </div>
    );
  }

  if (isProjectRoute && !selectedService && projectLoadState === 'missing') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_58%)] text-[#1a1a2e] flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-[2rem] border border-[#f5d6c0] bg-white shadow-xl px-8 py-10">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#d97706]">Project Missing</div>
          <h1 className="mt-3 text-3xl font-bold">등록되지 않은 프로젝트입니다</h1>
          <p className="mt-3 text-sm text-[#6b7280]">
            <span className="font-semibold text-[#1a1a2e]">/{projectSlug}</span> 에 해당하는 프로젝트를 찾지 못했습니다.
            먼저 로컬 레포에서 <code className="rounded bg-[#f9f8ff] px-1.5 py-0.5">qapilot init</code> 을 실행해 등록해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (isProjectRoute && projectLoadState === 'error') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fee2e2_0%,#ffffff_58%)] text-[#1a1a2e] flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-[2rem] border border-[#fecaca] bg-white shadow-xl px-8 py-10">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#dc2626]">Load Error</div>
          <h1 className="mt-3 text-3xl font-bold">프로젝트 대시보드를 불러오지 못했습니다</h1>
          <p className="mt-3 text-sm text-[#6b7280]">
            QApilot API 서버가 실행 중인지 확인하고, 다시 <code className="rounded bg-[#fff1f2] px-1.5 py-0.5">/{projectSlug}</code> 로 접속해 주세요.
          </p>
        </div>
      </div>
    );
  }

  const handleServiceSelect = (service: Service) => {
    navigate(service.isNew ? `/${service.id}/setup` : `/${service.id}`);
  };

  const handleCreateService = async (name: string) => {
    try {
      const service = await createServiceInStore({ name });
      navigate(`/${service.id}/setup`);
    } catch (error) {
      console.error('서비스 생성 실패', error);
    }
  };

  const [showScenarioGenerating, setShowScenarioGenerating] = useState(false);
  const [scenarioGenTraceId, setScenarioGenTraceId] = useState<string | null>(null);
  const [scenarioGenError, setScenarioGenError] = useState<string | null>(null);

  // 시나리오 생성 trace 폴링 — trace 가 완료/실패 되면 상태 변경.
  const scenarioGenPolling = useTracePolling(currentServiceId, scenarioGenTraceId);

  // 폴링 완료/실패 → 데이터 재로드 + 오버레이 닫기 처리.
  useEffect(() => {
    if (!scenarioGenTraceId) return;
    if (scenarioGenPolling.status === 'completed') {
      if (currentServiceId) {
        loadScenarioDomain(currentServiceId).then(() => {
          const s = useScenarioStore.getState();
          setDynamicScenarios(s.scenarios.map(toUiScenario));
          const tcMap: TestCaseMap = {};
          for (const [tsId, list] of Object.entries(s.testCasesByTs)) {
            tcMap[tsId] = list.map(toUiTestCase);
          }
          setDynamicTestCases(tcMap);
          setDynamicAIItems(toUiAIItemsByScenario(s.changeRequests));
          setScenarioVersions(s.versions.map(toUiVersion));
        });
      }
      // overlay 가 'completed' 상태에서 자체 onComplete 콜백 호출 → 닫기
    } else if (
      scenarioGenPolling.status === 'failed' ||
      scenarioGenPolling.status === 'error'
    ) {
      const msg = scenarioGenPolling.error?.message ?? '시나리오 생성에 실패했습니다.';
      setScenarioGenError(msg);
    }
  }, [scenarioGenPolling.status, scenarioGenTraceId, currentServiceId, loadScenarioDomain]);

  const handleGenerateScenarios = async () => {
    if (!currentServiceId) {
      console.warn('handleGenerateScenarios: serviceId 미확보');
      return;
    }
    // 라우팅 + 로컬 상태 초기화 (이전 결과 화면 보존 X)
    markServiceSetupDone(projectSlug || selectedServiceId || '');
    navigate(`/${projectSlug || selectedServiceId}/scenarios`);
    setDynamicScenarios([]);
    setDynamicAIItems({});
    setDynamicTestCases({});
    setScenarioGenError(null);
    setShowScenarioGenerating(true);

    try {
      // 초기 셋업 직후의 생성은 trigger='init' 으로 호출.
      const accessToken = useAuthStore.getState().accessToken;
      if (!accessToken) throw new Error('인증 토큰이 없습니다.');
      const resp = await startScenarioGeneration(
        currentServiceId,
        { trigger: 'init' },
        accessToken,
      );
      setScenarioGenTraceId(resp.trace_id);
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : '시나리오 생성 요청에 실패했습니다.';
      setScenarioGenError(msg);
    }
  };

  const closeScenarioGeneratingOverlay = () => {
    setShowScenarioGenerating(false);
    setScenarioGenTraceId(null);
    setScenarioGenError(null);
  };


  // ── 시나리오 관리봇 Panel ───────────────────────────────────────────────────

  const ScenarioManagerPanel = () => {
    if (!aiPanelOpen) {
      return (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-32 bg-[#3615CF] text-white rounded-l-lg shadow-lg flex items-center justify-center z-40 hover:w-12 transition-all"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="text-sm font-semibold">시나리오 관리봇</span>
        </button>
      );
    }
    return (
      <div className="w-80 h-full bg-white border-l border-[#f0f0f0] flex flex-col shadow-lg flex-shrink-0">
        <div className="p-4 flex justify-between items-center bg-[#EAE8F9]">
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
                    ? 'bg-[#EAE8F9] text-[#3615CF]'
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
              className="flex-1 p-2 border border-[#f0f0f0] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3615CF]/20"
              onKeyDown={e => { if (e.key === 'Enter' && aiInput.trim()) sendAiMessage(aiInput); }}
            />
            <button onClick={() => { if (aiInput.trim()) sendAiMessage(aiInput); }}
              className="p-2 bg-[#3615CF] text-white rounded hover:shadow-md transition-shadow">
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

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isProjectRoute && currentPage === 'LANDING') {
    return <LandingPage onGetStarted={() => setCurrentPage('LOGIN')} />;
  }

  if (!isProjectRoute && currentPage === 'LOGIN') {
    return (
      <LoginPage
        onLogin={() => setCurrentPage('SERVICES')}
        onBack={() => setCurrentPage('LANDING')}
      />
    );
  }

  return (
    <ProtectedRoute>
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        selectedService={selectedService}
        scheduledAlarms={scheduledAlarms}
        notificationOpen={notificationOpen}
        setNotificationOpen={setNotificationOpen}
        unreadNotifications={unreadNotifications}
        notifications={mockNotifications}
        agentImageSrc={qapilotAgent}
      />

      {currentPage === 'SERVICES' ? (
        <DashHomePage
          services={services}
          onServiceSelect={handleServiceSelect}
          onCreateService={handleCreateService}
        />
      ) : (
      <div className="flex-1 flex overflow-hidden">
        <LeftNavigation
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          runningTests={runningTests}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {showAgentTrace && (
            <AgentTracePanel
              items={mockAgentTrace}
              onClose={() => setShowAgentTrace(false)}
            />
          )}
          {currentPage !== '테스트' && currentPage !== 'SETUP' && (
            <SubHeader
              title={
                currentPage === 'HOME' ? '대시보드' :
                currentPage === '시나리오' ? '시나리오' :
                currentPage === 'RTM' ? 'RTM' :
                currentPage === '설정' ? '설정' : ''
              }
              titleExtra={currentPage === 'RTM' && currentRtmVersion ? (
                <div className="relative ml-1">
                  <button
                    onClick={() => setRtmVersionOpen(v => !v)}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#3615CF]/10 hover:bg-[#3615CF]/15 transition-colors"
                  >
                    <span className="text-[11px] font-semibold text-[#3615CF]">{currentRtmVersion.label}</span>
                    <ChevronDown className="w-3 h-3 text-[#3615CF]" />
                  </button>
                  {rtmVersionOpen && (
                    <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-[#f0f0f0] z-50">
                      <div className="p-2">
                        <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide px-2 py-1.5">RTM 버전 선택</div>
                        {rtmVersions.map(ver => (
                          <button
                            key={ver.rtmVersionId}
                            onClick={() => { setSelectedRtmVersion(ver.rtmVersionId); setRtmVersionOpen(false); }}
                            className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left hover:bg-gray-50 transition-colors ${
                              selectedRtmVersion === ver.rtmVersionId ? 'bg-[#3615CF]/8' : ''
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${selectedRtmVersion === ver.rtmVersionId ? 'bg-[#3615CF]' : 'bg-gray-300'}`} />
                            <div className="min-w-0">
                              <div className={`text-xs font-semibold ${selectedRtmVersion === ver.rtmVersionId ? 'text-[#3615CF]' : 'text-[#1a1a2e]'}`}>
                                {ver.label}
                              </div>
                              <div className="text-[10px] text-[#9ca3af] mt-0.5">{(ver.createdAt || '').slice(0, 10)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : undefined}
              tabs={currentPage === 'HOME' ? [
                { key: 'overview', label: 'Overview', icon: BarChart2 },
                { key: 'people',   label: 'People',   icon: Users, count: 6 },
                { key: 'settings', label: 'Settings', icon: Settings },
              ] : undefined}
              activeTab={homeTab}
              onTabChange={setHomeTab}
              rightContent={
                currentPage === 'RTM' ? (
                  <>
                    <SearchBar
                      value={rtmSearchQuery}
                      onChange={setRtmSearchQuery}
                      placeholder="요구사항 검색..."
                      className="w-52"
                    />
                    <button className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors">
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  </>
                ) : currentPage === '시나리오' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScenarioViewMode(scenarioViewMode === 'table' ? 'graph' : 'table')}
                    title={scenarioViewMode === 'table' ? '그래프 보기' : '목록 보기'}
                    className={`inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs leading-none transition-colors ${
                      scenarioViewMode === 'graph'
                        ? 'bg-[#3615CF] text-white'
                        : 'text-[#9ca3af] hover:text-[#3615CF] hover:bg-[#3615CF]/8'
                    }`}>
                    <Network className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-[#e5e7eb]" />
                  <button
                    onClick={() => setShowLinkedFiles(true)}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs leading-none text-[#6b7280] hover:text-[#6b7280] hover:bg-[#fef3c7] transition-colors">
                    <FolderOpen className="w-3.5 h-3.5" /> Files
                  </button>
                  <button
                    onClick={triggerCodeChangeDetection}
                    disabled={codeChangeDetected}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs leading-none transition-colors ${
                      codeChangeDetected
                        ? 'text-[#6b7280] bg-[#fef3c7]'
                        : 'text-[#6b7280] hover:text-[#6b7280] hover:bg-[#fef3c7]'
                    }`}>
                    <GitBranch className="w-3.5 h-3.5" /> 코드 변경 탐지
                    {codeChangeDetected && <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />}
                  </button>
                </div>
              ) : undefined}
            />
          )}
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-hidden">
            {currentPage === 'HOME' && (
              <HomePage
                setCurrentPage={setCurrentPage}
                navigateToHistory={navigateToHistory}
                activeTab={homeTab}
                serviceName={selectedService?.name}
                projectSlug={projectMeta?.project_slug || projectSlug || undefined}
                projectMeta={projectMeta}
                projectSummary={projectSummary}
                projectCredentials={projectCredentials}
              />
            )}
            {currentPage === '시나리오' && (
              <ScenarioPage
                selectedScenario={selectedScenario}
                setSelectedScenario={setSelectedScenario}
                scenarioPageTab={scenarioPageTab}
                setScenarioPageTab={setScenarioPageTab}
                scenarioSearchQuery={scenarioSearchQuery}
                setScenarioSearchQuery={setScenarioSearchQuery}
                scenarioChangeFilter={scenarioChangeFilter}
                setScenarioChangeFilter={setScenarioChangeFilter}
                selectedScenarioVersion={selectedScenarioVersion}
                setSelectedScenarioVersion={setSelectedScenarioVersion}
                scenarioVersions={scenarioVersions}
                onReviewConfirm={onReviewConfirm}
                favoriteVersionIds={favoriteVersionIds}
                setFavoriteVersionIds={setFavoriteVersionIds}
                hoveredVersionId={hoveredVersionId}
                setHoveredVersionId={setHoveredVersionId}
                selectedNetworkNodeId={selectedNetworkNodeId}
                setSelectedNetworkNodeId={setSelectedNetworkNodeId}
                expandedTSForTC={expandedTSForTC}
                setExpandedTSForTC={setExpandedTSForTC}
                selectedTCIds={selectedTCIds}
                setSelectedTCIds={setSelectedTCIds}
                expandedTC={expandedTC}
                setExpandedTC={setExpandedTC}
                showTestGroupModal={showTestGroupModal}
                setShowTestGroupModal={setShowTestGroupModal}
                setShowLinkedFiles={setShowLinkedFiles}
                aiItemActions={aiItemActions}
                setAiItemActions={setAiItemActions}
                showDeferredAIItems={showDeferredAIItems}
                setShowDeferredAIItems={setShowDeferredAIItems}
                codeChangeDetected={codeChangeDetected}
                dynamicScenarios={dynamicScenarios}
                setDynamicScenarios={setDynamicScenarios}
                dynamicAIItems={dynamicAIItems}
                dynamicTestCases={dynamicTestCases}
                setDynamicTestCases={setDynamicTestCases}
                loadingItemKey={loadingItemKey}
                setLoadingItemKey={setLoadingItemKey}
                editingDetailItem={editingDetailItem}
                setEditingDetailItem={setEditingDetailItem}
                selectedTvId={selectedTvId}
                setSelectedTvId={setSelectedTvId}
                selectedScenarioNode={selectedScenarioNode}
                setSelectedScenarioNode={setSelectedScenarioNode}
                highlightedScenarioRow={highlightedScenarioRow}
                detailPanelRow={detailPanelRow}
                setDetailPanelRow={setDetailPanelRow}
                expandedTSMain={expandedTSMain}
                setExpandedTSMain={setExpandedTSMain}
                expandedTCMain={expandedTCMain}
                setExpandedTCMain={setExpandedTCMain}
                allTCsSelected={allTCsSelected}
                someSelected={someSelected}
                openAiWithContext={openAiWithContext}
                triggerCodeChangeDetection={triggerCodeChangeDetection}
                ScenarioManagerPanel={ScenarioManagerPanel}
                setCurrentPage={setCurrentPage}
                setTestDepth={setTestDepth}
                highlightedBotRow={highlightedBotRow}
                setHighlightedBotRow={setHighlightedBotRow}
                selectedScenarioGroupId={selectedScenarioGroupId}
                setSelectedScenarioGroupId={setSelectedScenarioGroupId}
                setRunningTests={setRunningTests}
                setSelectedRunningTestId={setSelectedRunningTestId}
                setSelectedTestGroup={setSelectedTestGroup}
                setSelectedRunningForDetail={setSelectedRunningForDetail}
                viewMode={scenarioViewMode}
                setViewMode={setScenarioViewMode}
                showGeneratingOverlay={showScenarioGenerating}
                setShowGeneratingOverlay={(v: boolean) => {
                  if (!v) {
                    closeScenarioGeneratingOverlay();
                  } else {
                    setShowScenarioGenerating(true);
                  }
                }}
                scenarioGenStatus={scenarioGenPolling.status}
                scenarioGenError={scenarioGenError}
                onScenarioGenClose={closeScenarioGeneratingOverlay}
              />
            )}
            {currentPage === '테스트' && (
              selectedRunningTestId ? (
                <TestRunningPage
                  runningTests={runningTests}
                  selectedRunningTestId={selectedRunningTestId}
                  setSelectedRunningTestId={setSelectedRunningTestId}
                  isTestRunning={isTestRunning}
                  setIsTestRunning={setIsTestRunning}
                  setCompletedAgentStages={setCompletedAgentStages}
                  setCurrentAgentStage={setCurrentAgentStage}
                  highlightedLogIdx={highlightedLogIdx}
                  setHighlightedLogIdx={setHighlightedLogIdx}
                  setSelectedRunningForDetail={setSelectedRunningForDetail}
                  advanceAgentStage={advanceAgentStage}
                  getNodeStatus={getNodeStatus}
                  setShowCompletionModal={setShowCompletionModal}
                  selectedRunningForDetail={selectedRunningForDetail}
                  showCompletionModal={showCompletionModal}
                  setRunningTests={setRunningTests}
                  scenarioSidebarTab={scenarioSidebarTab}
                  setScenarioSidebarTab={setScenarioSidebarTab}
                  expandedScenarios={expandedScenarios}
                  setExpandedScenarios={setExpandedScenarios}
                  expandedTestCases={expandedTestCases}
                  setExpandedTestCases={setExpandedTestCases}
                  setSelectedExecutionId={setSelectedExecutionId}
                />
              ) : selectedExecutionId ? (
                <TestResultPage
                  selectedExecutionId={selectedExecutionId}
                  setSelectedExecutionId={setSelectedExecutionId}
                  selectedFailTC={selectedFailTC}
                  setSelectedFailTC={setSelectedFailTC}
                  historyDetailTab={historyDetailTab}
                  setHistoryDetailTab={setHistoryDetailTab}
                  retestCheckedIds={retestCheckedIds}
                  setRetestCheckedIds={setRetestCheckedIds}
                  setShowRetestNavModal={setShowRetestNavModal}
                />
              ) : (
                <TestPage
                  runningTests={runningTests}
                  setSelectedRunningTestId={setSelectedRunningTestId}
                  setSelectedTestGroup={setSelectedTestGroup}
                  historyFilter={historyFilter}
                  setHistoryFilter={setHistoryFilter}
                  historySearchQuery={historySearchQuery}
                  setHistorySearchQuery={setHistorySearchQuery}
                  setSelectedExecutionId={setSelectedExecutionId}
                />
              )
            )}
            {currentPage === 'RTM' && <RTMPage />}
            {currentPage === 'SETUP' && selectedService && (
              <ServiceSetupPage
                serviceName={selectedService.name}
                projectSlug={projectMeta?.project_slug}
                projectMeta={projectMeta}
                projectSummary={projectSummary}
                onGenerateScenarios={handleGenerateScenarios}
              />

            )}
          </div>
        </div>
      </div>
      </div>
      )}

    {/* Files Modal */}
      {showLinkedFiles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkedFiles(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-7 pb-5">
              <FileList />
            </div>
            <div className="px-6 pb-5 flex items-center gap-3">
              <button onClick={() => setShowLinkedFiles(false)}
                className="flex-1 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm hover:bg-gray-50">
                닫기
              </button>
              <button
                onClick={triggerFileChangeDetection}
                className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:shadow-md transition-shadow">
                수정 요청
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
            <div className="w-12 h-12 rounded-full bg-[#3615CF] flex items-center justify-center mx-auto mb-4">
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
                    startTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
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
                  setSelectedRunningForDetail(newRun.id);
                  setSelectedRunningForDetail(newRun.id);
                }}
                className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg font-medium text-sm hover:shadow-md transition-shadow"
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
      {currentPage === '시나리오' && !showLinkedFiles && (
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
              left: '3.5rem', right: 0, height: '5rem',
              opacity: chatbarActive ? 1 : 0,
              background: 'linear-gradient(to top, rgba(249,250,251,0.88) 0%, rgba(249,250,251,0.46) 42%, rgba(249,250,251,0.14) 72%, rgba(249,250,251,0) 100%)',
              backdropFilter: chatbarActive ? 'blur(6px)' : 'none',
              WebkitBackdropFilter: chatbarActive ? 'blur(6px)' : 'none',
              maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.24) 78%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.24) 78%, transparent 100%)',
            }}
          />

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
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0 bg-[#EAE8F9]/40">
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
                          ? 'bg-[#EAE8F9] text-[#3615CF]'
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
                            className="px-2.5 py-1 text-xs bg-white border border-[#f0f0f0] rounded-full hover:bg-gray-50 hover:border-[#3615CF]/30 transition-colors">
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
              <div className="relative flex-shrink-0">
                {chatbarActive && quickChipsOpen && (
                  <div className="absolute z-50 flex flex-col gap-1.5 right-full bottom-0 mr-3">
                    {['엣지 케이스 추가', 'TC 세분화', '시나리오 생성', '오류 분석'].map(chip => (
                      <button key={chip}
                        onClick={() => { setAiInput(chip); setQuickChipsOpen(false); setChatPanelExpanded(true); }}
                        className="w-max min-w-[132px] px-4 py-2.5 bg-white rounded-full shadow-lg border border-[#f0f0f0] text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap hover:shadow-xl hover:border-[#3615CF]/30 text-left transition-all">
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setQuickChipsOpen(p => !p); setChatHistoryPanelOpen(false); }}
                  className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all hover:shadow-xl ${
                    quickChipsOpen
                      ? 'bg-[#3615CF] text-white border-transparent'
                      : 'bg-white border-[#f0f0f0] text-[#6b7280] hover:border-[#3615CF]/30'
                  }`}>
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Pill bar */}
              <div className="flex-1 flex items-center bg-white rounded-full shadow-xl border border-[#f0f0f0] px-4 py-2.5 gap-3 hover:shadow-2xl transition-shadow">

                {/* History toggle — inside-left */}
                <button
                  onClick={() => { setChatHistoryPanelOpen(p => !p); setQuickChipsOpen(false); }}
                  className={`flex-shrink-0 transition-colors p-0.5 rounded-full ${chatHistoryPanelOpen ? 'text-[#3615CF]' : 'text-[#9ca3af] hover:text-[#6b7280]'}`}
                  title="대화 히스토리">
                  <History className="w-4 h-4" />
                </button>

                {/* Divider */}
                {(chatContextTag || true) && <div className="w-px h-4 bg-[#f0f0f0] flex-shrink-0" />}

                {/* Context tag (pink) — shown when clicking speech bubble on a row */}
                {chatContextTag && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#EAE8F9] text-[#3615CF] rounded-full text-xs flex-shrink-0 max-w-[200px] border border-[#3615CF]/20">
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
                      ? 'bg-[#3615CF] text-white shadow-sm hover:shadow-md'
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
    </ProtectedRoute>
  );
}
