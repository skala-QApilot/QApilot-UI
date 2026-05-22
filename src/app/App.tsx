import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router';
import { SubHeader } from './components/common/SubHeader';
import { SearchBar } from './components/common/SearchBar';
import { LeftNavigation } from './components/common/LeftNavigation';
import { NavBar } from './components/common/NavBar';
import { HomePage, type ProjectMeta, type ProjectSummary } from './pages/HomePage';
import { TestRunningPage } from './pages/TestRunningPage';
import { TestResultPage } from './pages/TestResultPage';
import { RTMPage } from './pages/RTMPage';
import { TestPage } from './pages/TestPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { DashHomePage, type Service } from './pages/DashHomePage';
import { ServiceSetupPage, type ServiceSetupPayload } from './pages/ServiceSetupPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import {
  ChevronDown,
  BarChart2, Users, Settings,
  Network, GitBranch, Download,
  FolderOpen, Sparkles, RotateCcw,
} from 'lucide-react';
import { FileList } from './components/common/FileList';
import AgentTracePanel from './components/AgentTracePanel';
import { ScenarioManagerPanel } from './components/ScenarioManagerPanel';
import { ScenarioChatbar } from './components/ScenarioChatbar';
import { LinkedFilesModal } from './components/LinkedFilesModal';
import { RetestNavModal } from './components/RetestNavModal';
import { getProject, type ProjectDashboardResponse } from '../api/projects';
import { useProjectStore } from '../store/projectStore';
import { useNotificationStore } from '../store/notificationStore';
import { ApiError, onAuthExpired } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useScenarioState } from './hooks/useScenarioState';
import {
  mockFiles,
  mockRTMVersions,
  type TestCaseMap,
} from './data/mockData';
const qapilotAgent = new URL('../assets/qapilot-agent.png', import.meta.url).href;

// 예약 최상위 경로(프로젝트 slug가 아닌 라우트)
const RESERVED_TOP_SEGMENTS = new Set(['login', 'services', 'setup']);

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
  if (pathname.startsWith('/setup')) return 'SETUP';
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
  const navigate = useNavigate();
  const location = useLocation();

  // ── Derive routing state from URL ─────────────────────────────────────────

  const currentSlug = useMemo(() => getProjectSlugFromPath(location.pathname), [location.pathname]);
  // HEAD 시절 변수명 호환 — 대부분의 child component prop 이 projectSlug 로 받음.
  const projectSlug = currentSlug;
  const isProjectRoute = Boolean(currentSlug);
  const currentPage = useMemo(() => getCurrentPageFromPath(location.pathname), [location.pathname]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const setCurrentPage = useCallback((page: string) => {
    const path = buildPagePath(page, currentSlug);
    if (path) navigate(path);
  }, [navigate, currentSlug]);

  // TestPage 의 in-progress/history 서브탭 라우팅 (main 브랜치에서 도입).
  const setTestSubTab = useCallback((tab: 'INPROGRESS' | 'HISTORY') => {
    navigate(tab === 'INPROGRESS' ? `/${currentSlug}/test/running` : `/${currentSlug}/test`);
  }, [navigate, currentSlug]);

  // 401 만료 → 로그인 페이지로 강제 이동
  useEffect(() => {
    return onAuthExpired(() => {
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  // ── Top-level app state ──────────────────────────────────────────────────

  const [services, setServices] = useState<Service[]>(
    isProjectRoute
      ? []
      : [
          { id: 'svc-1', name: 'Frontend App', isNew: false, createdAt: '2026-01-15' },
          { id: 'svc-2', name: 'Backend API', isNew: false, createdAt: '2026-02-20' },
        ]
  );
  // 로컬에서 직접 생성된 서비스 — API 인증 체크 불필요 (main 브랜치 도입).
  const localServiceIds = useRef(new Set(['svc-1', 'svc-2']));
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(currentSlug || 'svc-1');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [homeTab, setHomeTab] = useState('overview');
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const [projectCredentials, setProjectCredentials] = useState<{ dashboard_url: string; server_auth_token: string } | null>(null);
  const [showAuthForProject, setShowAuthForProject] = useState(false);
  const [authRetry, setAuthRetry] = useState(0);
  const [projectLoadState, setProjectLoadState] = useState<'idle' | 'loading' | 'loaded' | 'missing' | 'error'>(
    isProjectRoute ? 'loading' : 'idle'
  );
  const [showAgentTrace, setShowAgentTrace] = useState(false);

  // ── RTM state ────────────────────────────────────────────────────────────

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
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedRunningForDetail, setSelectedRunningForDetail] = useState<string | null>(null);
  const [selectedFailTC, setSelectedFailTC] = useState<string | null>(null);
  const [historyDetailTab, setHistoryDetailTab] = useState<'FAIL' | 'PASS'>('FAIL');
  const [rtmSearchQuery, setRtmSearchQuery] = useState('');
  const [selectedRtmVersion, setSelectedRtmVersion] = useState(mockRTMVersions[0].id);
  const [rtmVersionOpen, setRtmVersionOpen] = useState(false);
  const currentRtmVersion = mockRTMVersions.find(v => v.id === selectedRtmVersion) ?? mockRTMVersions[0];

  // ── main 브랜치 hooks 보충 ────────────────────────────────────────────────
  // HEAD inline state 와 중복되지 않는 state 만 destructure (중복은 hook 안의 값을 무시).
  const {
    selectedScenario, setSelectedScenario,
    scenarioPageTab, setScenarioPageTab,
    scenarioSearchQuery, setScenarioSearchQuery,
    scenarioChangeFilter, setScenarioChangeFilter,
    selectedScenarioVersion, setSelectedScenarioVersion,
    scenarioVersions, setScenarioVersions,
    favoriteVersionIds, setFavoriteVersionIds,
    hoveredVersionId, setHoveredVersionId,
    selectedNetworkNodeId, setSelectedNetworkNodeId,
    expandedTSForTC, setExpandedTSForTC,
    selectedTCIds, setSelectedTCIds,
    expandedTC, setExpandedTC,
    showTestGroupModal, setShowTestGroupModal,
    showLinkedFiles, setShowLinkedFiles,
    changeItemActions, setChangeItemActions,
    aiItemActions, setAiItemActions,
    showDeferredAIItems, setShowDeferredAIItems,
    codeChangeDetected, setCodeChangeDetected,
    dynamicScenarios, setDynamicScenarios,
    dynamicAIItems, setDynamicAIItems,
    dynamicTestCases, setDynamicTestCases,
    loadingItemKey, setLoadingItemKey,
    editingDetailItem, setEditingDetailItem,
    selectedTvId, setSelectedTvId,
    selectedScenarioNode, setSelectedScenarioNode,
    highlightedScenarioRow, setHighlightedScenarioRow,
    scenarioQuickOpen, setScenarioQuickOpen,
    scenarioHistoryOpen, setScenarioHistoryOpen,
    scenarioViewMode, setScenarioViewMode,
  } = useScenarioState();
  // useTestState / useChatbotState / useAgentRunState 는 import 제거됨 — 모든 state 가 HEAD inline 으로 이미 선언되어 hook wrapper 불필요.

  // ── Project auth/load effect ─────────────────────────────────────────────

  useEffect(() => {
    if (!projectSlug) return;

    // 로컬에서 생성된 서비스(svc-1, svc-2)는 API 호출 없이 바로 loaded — main 브랜치 도입.
    if (localServiceIds.current.has(projectSlug)) {
      setProjectLoadState('loaded');
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      setProjectLoadState('idle');
      setShowAuthForProject(true);
      return;
    }

    let cancelled = false;
    setProjectLoadState('loading');
    setShowAuthForProject(false);

    void token; // axios interceptor 가 token 자동 첨부 — getProject 시그니처엔 직접 전달 X
    getProject(projectSlug)
      .then((data: ProjectDashboardResponse) => {
        if (cancelled) return;
        setProjectMeta(data.project);
        setProjectSummary(data.summary);
        if (data.credentials) setProjectCredentials(data.credentials);
        setServices([{
          id: data.project.project_slug,
          name: data.project.display_name,
          isNew: false,
          createdAt: (data.project.updated_at || data.project.created_at || '').slice(0, 10),
        }]);
        setSelectedServiceId(data.project.project_slug);
        // currentPage 는 이미 URL 에서 도출되므로 별도 setCurrentPage 불필요
        setProjectLoadState('loaded');
      })
      .catch(error => {
        if (cancelled) return;
        const status = error instanceof ApiError ? error.status : undefined;
        if (status === 401) {
          useAuthStore.getState().logout();
          setShowAuthForProject(true);
          setProjectLoadState('idle');
        } else if (status === 404) {
          setProjectLoadState('missing');
        } else {
          setProjectLoadState('error');
        }
      });

    return () => { cancelled = true; };
  }, [projectSlug, authRetry]);

  // ── Side-effects ─────────────────────────────────────────────────────────

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
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
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

  useEffect(() => {
    if (currentPage !== '테스트') {
      setSelectedRunningForDetail(null);
      setSelectedExecutionId(null);
    }
  }, [currentPage]);

  // ── Derived values ───────────────────────────────────────────────────────

  // 알림 — notificationStore 에서 derive (Phase 1 회귀 복구).
  const rawNotifications = useNotificationStore((s) => s.notifications);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const notifications = useMemo(
    () => rawNotifications.map((n) => ({
      id: n.notificationId,
      message: n.message || n.title,
      time: n.createdAt,
      read: n.isRead,
    })),
    [rawNotifications],
  );

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

  const selectedService = services.find(s => s.id === selectedServiceId) ?? null;

  // ── Business logic ────────────────────────────────────────────────────────

  const navigateToHistory = (filter: string) => {
    setHistoryFilter(filter);
    setSelectedExecutionId(null);
    navigate(`/${currentSlug}/test`);
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
      { role: 'assistant', text: '해당 변경사항에 대한 시나리오를 수정하겠습니다. 구체적인 요구사항을 알려주세요.' },
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
        TS1: prev.TS1 ?? { reason: 'login.tsx 비밀번호 검증 로직 변경 감지', trigger: 'code', timestamp: '2026-04-27 10:23' },
      }));
      setExpandedTSForTC(prev => prev.includes('TS1') ? prev : [...prev, 'TS1']);
      setCodeChangeDetected(false);
      codeChangeTimerRef.current = null;
    }, 1800);
  };

  const triggerFileChangeDetection = () => {
    setShowLinkedFiles(false);
    navigate(`/${currentSlug}/scenarios`);
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

  // ── Service navigation helpers ────────────────────────────────────────────

  // 시나리오 생성 overlay 표시 여부 — ScenarioPage 의 showGeneratingOverlay prop 으로 흘려준다.
  const [showScenarioGenerating, setShowScenarioGenerating] = useState(false);

  const handleServiceSelect = (service: Service) => {
    setSelectedServiceId(service.id);
    navigate(`/${service.id}`);
  };

  /**
   * ServiceSetupPage "테스트 대시보드 생성하기" 클릭 시 Spring `POST /api/services`
   * 호출하여 실제 서비스 등록 + GitHub 정보 영속화 후 services 목록에 push.
   * 실패 시 콘솔 에러만 남기고 화면 머무름 (toast 는 후속 작업).
   */
  const handleSetupComplete = async (payload: ServiceSetupPayload) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.warn('handleSetupComplete: no access token, falling back to local-only service.');
      const slug = payload.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || `svc-${Date.now()}`;
      const today = new Date().toISOString().slice(0, 10);
      const fallback: Service = { id: slug, name: payload.name, isNew: false, createdAt: today };
      localServiceIds.current.add(slug);
      setServices(prev => [...prev, fallback]);
      setSelectedServiceId(slug);
      navigate(`/${slug}`);
      return;
    }
    try {
      // projectStore 가 axios interceptor 통해 토큰 첨부 + store 자체 업데이트.
      const created = await useProjectStore.getState().createService({
        name: payload.name,
        repos: payload.repos.length
          ? payload.repos.map(r => ({
              repo_url: r.url,
              token: r.token || null,
              branch: null,   // ServiceSetupPage 가 아직 branch 입력 UI 없음 — FastAPI 가 "main" default 적용
              role: null,     // 동일 — URL 에서 자동 유추
            }))
          : undefined,
        staging_url: payload.stagingUrl || undefined,
      });
      // App.tsx 로컬 services 배열에도 mirror (DashHomePage 가 props 로 받음)
      const mirror: Service = {
        id: created.id,
        name: created.name,
        isNew: created.isNew ?? false,
        createdAt: created.createdAt,
      };
      setServices(prev => [...prev, mirror]);
      setSelectedServiceId(created.id);
      navigate(`/${created.id}`);
    } catch (error) {
      console.error('서비스 생성 실패', error);
    }
  };

  const handleRetestConfirm = () => {
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
    setSelectedRunningForDetail(newRun.id);
    navigate(`/${currentSlug}/test`);
  };

  // ── Auth / project load screens (fullscreen, bypass main layout) ──────────

  if (location.pathname === '/') {
    return <LandingPage onGetStarted={() => navigate('/login')} />;
  }

  if (location.pathname === '/login') {
    return (
      <LoginPage
        onLogin={() => navigate('/services')}
        onBack={() => navigate('/')}
      />
    );
  }

  if (isProjectRoute && showAuthForProject) {
    return (
      <LoginPage
        onLogin={() => {
          setShowAuthForProject(false);
          setAuthRetry(n => n + 1);
        }}
        onBack={() => navigate('/services')}
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



  // ── 시나리오 관리봇 Panel ───────────────────────────────────────────────────


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

  // ── Main app layout ───────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar
        selectedService={selectedService}
        scheduledAlarms={scheduledAlarms}
        notificationOpen={notificationOpen}
        setNotificationOpen={setNotificationOpen}
        unreadNotifications={unreadNotifications}
        notifications={notifications}
        agentImageSrc={qapilotAgent}
      />

      {currentPage === 'SERVICES' ? (
        <DashHomePage
          services={services}
          onServiceSelect={handleServiceSelect}
          onAddNew={() => navigate('/setup')}
        />
      ) : currentPage === 'SETUP' ? (
        <ServiceSetupPage onGenerateScenarios={handleSetupComplete} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <LeftNavigation
            slug={projectSlug!}
            runningTests={runningTests}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            {showAgentTrace && (
              <AgentTracePanel
                items={[]}
                onClose={() => setShowAgentTrace(false)}
              />
            )}

            {currentPage !== '테스트' && (
              <SubHeader
                title={
                  currentPage === 'HOME' ? '대시보드' :
                  currentPage === '시나리오' ? '시나리오' :
                  currentPage === 'RTM' ? 'RTM' : ''
                }
                titleExtra={currentPage === 'RTM' ? (
                  <div className="relative ml-1">
                    <button
                      onClick={() => setRtmVersionOpen(v => !v)}
                      className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#3615CF]/10 hover:bg-[#3615CF]/15 transition-colors"
                    >
                      <span className="text-[11px] font-semibold text-[#3615CF]">{currentRtmVersion.id}</span>
                      <ChevronDown className="w-3 h-3 text-[#3615CF]" />
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
                                selectedRtmVersion === ver.id ? 'bg-[#3615CF]/8' : ''
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${selectedRtmVersion === ver.id ? 'bg-[#3615CF]' : 'bg-gray-300'}`} />
                              <div className="min-w-0">
                                <div className={`text-xs font-semibold ${selectedRtmVersion === ver.id ? 'text-[#3615CF]' : 'text-[#1a1a2e]'}`}>
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
                  setShowScenarioGenerating(v);
                  // 오버레이 닫힘 — 시나리오 데이터는 scenarioStore 로 재로드해야 하지만,
                  // 현 시점에서 dynamic* 는 hook 내부 local state 이므로 mock-reset 로직 자체 제거.
                  // 실제 데이터는 generation 완료 후 trace polling 이 scenarioStore.loadAll() 트리거.
                }}
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


      {/* ── Scenario Manager Panel ── */}
      {currentPage === '시나리오' && (
        <ScenarioManagerPanel
          aiPanelOpen={aiPanelOpen}
          setAiPanelOpen={setAiPanelOpen}
          aiMessages={aiMessages}
          aiInput={aiInput}
          setAiInput={setAiInput}
          aiContextPrefill={aiContextPrefill}
          sendAiMessage={sendAiMessage}
        />
      )}

      {/* ── Modals ── */}
      <LinkedFilesModal
        open={showLinkedFiles}
        onClose={() => setShowLinkedFiles(false)}
        onRequestChange={triggerFileChangeDetection}
      />

      <RetestNavModal
        open={showRetestNavModal}
        retestCheckedIds={retestCheckedIds}
        onConfirm={handleRetestConfirm}
        onDismiss={() => setShowRetestNavModal(false)}
      />

      {/* ── Scenario Chatbar ── */}
      {currentPage === '시나리오' && !showLinkedFiles && (
        <ScenarioChatbar
          chatbarClosedRef={chatbarClosedRef}
          chatbarActive={chatbarActive}
          setChatbarActive={setChatbarActive}
          chatPanelExpanded={chatPanelExpanded}
          setChatPanelExpanded={setChatPanelExpanded}
          chatHistoryPanelOpen={chatHistoryPanelOpen}
          setChatHistoryPanelOpen={setChatHistoryPanelOpen}
          quickChipsOpen={quickChipsOpen}
          setQuickChipsOpen={setQuickChipsOpen}
          chatContextTag={chatContextTag}
          setChatContextTag={setChatContextTag}
          aiMessages={aiMessages}
          aiInput={aiInput}
          setAiInput={setAiInput}
          setInlineDiffId={setInlineDiffId}
          setHighlightedBotRow={setHighlightedBotRow}
          sendAiMessage={sendAiMessage}
        />
      )}
    </div>
    </ProtectedRoute>
  );
}
