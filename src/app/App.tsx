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
import { useRtmStore } from '../store/rtmStore';
import { useFileStore } from '../store/fileStore';
import { startScenarioGeneration, startCodeGeneration } from '../api/agent';
import { startRun, listAllRuns } from '../api/runs';
import { useTestStore } from '../store/testStore';
import { CodeGenConfirmModal } from './components/CodeGenConfirmModal';
import { useTracePolling } from '../hooks/useTracePolling';
import { useScenarioStore, toUiScenario, toUiTestCase, toUiVersion, toUiAIItemsByScenario } from '../store/scenarioStore';
import { ApiError, onAuthExpired } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useScenarioState } from './hooks/useScenarioState';
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

  // ── Services 목록 — projectStore 가 source of truth ─────────────────────────
  // 로그인된 상태(accessToken 존재) 면 마운트 시 1회 listServices() 호출.
  // 새 서비스 생성 후엔 store 가 자체 push 하므로 별도 reload 불필요.
  const storeServices = useProjectStore((s) => s.services);
  useEffect(() => {
    if (!useAuthStore.getState().accessToken) return;
    useProjectStore.getState().loadServices().catch((err) => {
      console.error('listServices 실패', err);
    });
  }, []);

  // ── Top-level app state ──────────────────────────────────────────────────

  const [services, setServices] = useState<Service[]>([]);
  // 로컬에서 직접 생성된 서비스 (인증 체크 skip 대상) — 현재는 사용 안 함 (Spring 응답이 source of truth).
  const localServiceIds = useRef<Set<string>>(new Set());
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(currentSlug);

  // store.services 변화 → local services 미러. handleSetupComplete 가 push 한 신규 항목과 머지.
  useEffect(() => {
    setServices((prev) => {
      const fromStore = storeServices.map((s) => ({
        id: s.id,
        name: s.name,
        isNew: s.isNew ?? false,
        createdAt: s.createdAt,
      }));
      // store에 없는 (로컬-only) 항목은 보존
      const storeIds = new Set(fromStore.map((s) => s.id));
      const localOnly = prev.filter((p) => !storeIds.has(p.id));
      return [...fromStore, ...localOnly];
    });
  }, [storeServices]);
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

  // 테스트 페이지 (진행중 / 이력) — status 의 의미:
  //   running   = 파이프라인 진행 중
  //   aborted   = 중간에 끊김 (Ctrl+C / 예외). 이어서 실행 가능.
  //   completed = 파이프라인 정상 종료. TC 별 pass/fail 는 별개 축.
  const [runningTests, setRunningTests] = useState<Array<{
    id: string; name: string; groupId: string | null; startTime: string; status: 'running' | 'aborted' | 'completed';
  }>>([]);
  const [selectedRunningTestId, setSelectedRunningTestId] = useState<string | null>(null);
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
  const [rtmVersionOpen, setRtmVersionOpen] = useState(false);

  // RTM 버전 selector — store 가 source of truth (selectedVersionId / versions).
  // dropdown JSX 가 기대하는 shape {id, label, date} 로 평탄화.
  const rtmStoreVersions = useRtmStore((s) => s.versions);
  const selectedRtmVersion = useRtmStore((s) => s.selectedVersionId) ?? '';
  const setSelectedRtmVersion = useRtmStore((s) => s.selectVersion);
  const uiRtmVersions = useMemo(
    () => rtmStoreVersions.map(v => ({
      id: v.rtmVersionId,
      label: v.label,
      date: (v.createdAt || '').slice(0, 10),
      basedOn: v.traceId ?? '',
    })),
    [rtmStoreVersions],
  );
  const currentRtmVersion = uiRtmVersions.find(v => v.id === selectedRtmVersion)
    ?? uiRtmVersions[0]
    ?? { id: '', label: '—', date: '', basedOn: '' };

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
        setDynamicScenarios(prev => [...prev, {
          id: newId, name: label, status: 'pending', testCases: 2, hasChanges: false, lastRunAt: null,
        }]);
        setDynamicAIItems(prev => ({ ...prev, [newId]: { reason: text.slice(0, 50), trigger: 'chatbot', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ') } }));
        setDynamicTestCases(prev => ({
          ...prev,
          [newId]: [
            { id: 'TC1', name: 'AI 기본 케이스', status: 'pending', values: [
              { id: 'TV1', name: '정상 입력', field: 'input', value: '', type: 'string', purpose: 'normal', status: 'pending' },
              { id: 'TV2', name: '경계값 입력', field: 'input', value: '', type: 'string', purpose: 'boundary', status: 'pending' },
            ] },
            { id: 'TC2', name: 'AI 엣지 케이스', status: 'pending', values: [
              { id: 'TV1', name: '오류 입력', field: 'input', value: '', type: 'string', purpose: 'edge', status: 'pending' },
            ] },
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
    // 검토 완료 → 코드 생성 시작 여부 확인 모달.
    setCodeGenConfirmOpen(true);
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
      const unreflected = useFileStore.getState().getUiFiles().filter(f => !f.reflected);
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

  // 시나리오 생성 trace 폴링 — handleSetupComplete 가 시나리오 생성을 트리거한 직후 trace_id 저장.
  // 폴링이 completed/failed 면 overlay 자동 닫기 + scenarioStore 새로고침.
  const [scenarioGenTraceId, setScenarioGenTraceId] = useState<string | null>(null);
  const scenarioGenPollingServiceId = useMemo(
    () => storeServices.find((s) => s.id === selectedServiceId)?.serviceId ?? null,
    [storeServices, selectedServiceId],
  );
  const scenarioGenPolling = useTracePolling(scenarioGenPollingServiceId, scenarioGenTraceId);

  /**
   * scenarioStore.loadAll(serviceId) 호출 + 결과를 dynamic* state 로 sync.
   * 사용처: 폴링 완료 시, 또는 페이지 진입/새로고침 시.
   */
  const syncScenarioFromStore = useCallback(async (serviceId: string) => {
    try {
      await useScenarioStore.getState().loadAll(serviceId);
      const s = useScenarioStore.getState();
      setDynamicScenarios(s.scenarios.map(toUiScenario));
      const tcMap: Record<string, ReturnType<typeof toUiTestCase>[]> = {};
      for (const [tsId, list] of Object.entries(s.testCasesByTs)) {
        tcMap[tsId] = list.map(toUiTestCase);
      }
      setDynamicTestCases(tcMap);
      // UiAIItem (5 fields) → dynamicAIItem shape (3 fields, trigger narrowed)
      const uiAi = toUiAIItemsByScenario(s.changeRequests);
      const aiMap: Record<string, { reason: string; trigger: 'file' | 'chatbot' | 'code'; timestamp: string }> = {};
      for (const [tsId, item] of Object.entries(uiAi)) {
        const trigger: 'file' | 'chatbot' | 'code' =
          item.trigger === 'file' || item.trigger === 'chatbot' || item.trigger === 'code'
            ? item.trigger : 'chatbot';
        aiMap[tsId] = { reason: item.reason, trigger, timestamp: item.timestamp };
      }
      setDynamicAIItems(aiMap);
      setScenarioVersions(s.versions.map(toUiVersion));
    } catch (err) {
      console.error('시나리오 reload 실패', err);
    }
  }, [setDynamicScenarios, setDynamicTestCases, setDynamicAIItems, setScenarioVersions]);

  // 페이지 진입/새로고침 시 자동 로드 — service 가 확정되면 1회.
  useEffect(() => {
    if (!scenarioGenPollingServiceId) return;
    syncScenarioFromStore(scenarioGenPollingServiceId);
  }, [scenarioGenPollingServiceId, syncScenarioFromStore]);

  // service UUID 가 확정되면 backend 에서 test runs 이력 복원 + testStore 로드.
  // 새로고침 후에도 실행중/완료된 테스트 목록을 그대로 표시한다.
  useEffect(() => {
    if (!scenarioGenPollingServiceId) return;
    let cancelled = false;
    (async () => {
      try {
        const runs = await listAllRuns(scenarioGenPollingServiceId);
        if (cancelled) return;
        const mapped = runs.map((r) => {
          const raw = String(r.status || '').toLowerCase();
          const status: 'running' | 'aborted' | 'completed' =
            raw === 'running' ? 'running'
            : raw === 'aborted' ? 'aborted'
            : 'completed';
          return {
            id: r.id,
            name: r.name,
            groupId: null as string | null,
            startTime: (r.startTime || '').slice(0, 16).replace('T', ' '),
            status,
          };
        });
        setRunningTests(mapped);
        // 가장 최근 running trace 가 있으면 그 trace 폴링 시작 (status 자동 갱신).
        const stillRunning = mapped.find((r) => r.status === 'running');
        if (stillRunning) setRunTraceId((prev) => prev ?? stillRunning.id);
      } catch (err) {
        console.error('test runs 이력 로드 실패', err);
      }
      try {
        await useTestStore.getState().loadAll(scenarioGenPollingServiceId);
      } catch (err) {
        console.error('test 도메인 loadAll 실패', err);
      }
    })();
    return () => { cancelled = true; };
  }, [scenarioGenPollingServiceId]);

  // 폴링이 completed/failed 면 overlay 닫기 + 생성된 시나리오 reload.
  useEffect(() => {
    if (!scenarioGenTraceId) return;
    if (scenarioGenPolling.status === 'completed') {
      if (scenarioGenPollingServiceId) {
        syncScenarioFromStore(scenarioGenPollingServiceId);
      }
      setShowScenarioGenerating(false);
      setScenarioGenTraceId(null);
    } else if (scenarioGenPolling.status === 'aborted' || scenarioGenPolling.status === 'error') {
      console.error('시나리오 생성 실패', scenarioGenPolling.error);
      setShowScenarioGenerating(false);
      setScenarioGenTraceId(null);
    }
  }, [scenarioGenPolling.status, scenarioGenPolling.error, scenarioGenTraceId, scenarioGenPollingServiceId, syncScenarioFromStore]);

  // ── Layer 1B: 코드 생성 (검토 확인 → 모달 → 트리거) ─────────────────────────
  const [codeGenConfirmOpen, setCodeGenConfirmOpen] = useState(false);
  const [showCodeGenerating, setShowCodeGenerating] = useState(false);
  const [codeGenTraceId, setCodeGenTraceId] = useState<string | null>(null);
  const codeGenPolling = useTracePolling(scenarioGenPollingServiceId, codeGenTraceId);
  useEffect(() => {
    if (!codeGenTraceId) return;
    if (codeGenPolling.status === 'completed') {
      // action-mappings / generated-code 도 같이 다시 로드 — store 가 scenarios endpoint 만 fetch 하므로
      // 사용자에게 보이는 시나리오는 동일. 후속 Layer 2 (테스트 실행) 가 디스크에서 직접 읽는다.
      if (scenarioGenPollingServiceId) {
        syncScenarioFromStore(scenarioGenPollingServiceId);
      }
      setShowCodeGenerating(false);
      setCodeGenTraceId(null);
    } else if (codeGenPolling.status === 'aborted' || codeGenPolling.status === 'error') {
      console.error('코드 생성 실패', codeGenPolling.error);
      setShowCodeGenerating(false);
      setCodeGenTraceId(null);
    }
  }, [codeGenPolling.status, codeGenPolling.error, codeGenTraceId, scenarioGenPollingServiceId, syncScenarioFromStore]);

  /** 모달의 "생성 시작" 클릭 시 호출 — Spring `POST /api/services/{id}/code-generation` 트리거. */
  const handleStartCodeGen = async () => {
    setCodeGenConfirmOpen(false);
    const token = useAuthStore.getState().accessToken;
    if (!token || !scenarioGenPollingServiceId) {
      console.warn('handleStartCodeGen: serviceId 또는 토큰 미확보');
      return;
    }
    try {
      setShowCodeGenerating(true);
      const resp = await startCodeGeneration(scenarioGenPollingServiceId, null, token);
      setCodeGenTraceId(resp.trace_id);
    } catch (err) {
      console.error('코드 생성 트리거 실패', err);
      setShowCodeGenerating(false);
    }
  };

  // ── Layer 2: 테스트 실행 (ScenarioPage 의 "실행" 버튼 → Spring POST /runs) ───
  const [runTraceId, setRunTraceId] = useState<string | null>(null);
  const runPolling = useTracePolling(scenarioGenPollingServiceId, runTraceId);
  useEffect(() => {
    if (!runTraceId) return;
    if (runPolling.status === 'completed') {
      setRunningTests(prev => prev.map(t =>
        t.id === runTraceId ? { ...t, status: 'completed' as const } : t,
      ));
      setRunTraceId(null);
    } else if (runPolling.status === 'aborted' || runPolling.status === 'error') {
      console.error('테스트 실행 중단/에러', runPolling.error);
      // 'aborted' 는 별개 status — "이어서 실행" 으로 재개 가능. 'completed' 로 강제하지 않는다.
      setRunningTests(prev => prev.map(t =>
        t.id === runTraceId ? { ...t, status: 'aborted' as const } : t,
      ));
      setRunTraceId(null);
    }
  }, [runPolling.status, runPolling.error, runTraceId]);

  /**
   * ScenarioPage 의 실행 트리거 — `POST /api/services/{id}/runs` 후 trace 폴링 시작.
   * scenarioIds 미입력 시 filter='all'. groupId 는 runningTests 표시용.
   */
  const handleStartRun = useCallback(async (
    scenarioIds: string[] | undefined,
    runName: string,
    groupId: string | null = null,
    resumeFromTrace: string | null = null,
  ) => {
    console.info('[handleStartRun] called', { runName, groupId, scenarioIds, resumeFromTrace, serviceUuid: scenarioGenPollingServiceId });
    const token = useAuthStore.getState().accessToken;
    if (!token || !scenarioGenPollingServiceId) {
      console.warn('[handleStartRun] aborted: no token or serviceId', { hasToken: !!token, serviceUuid: scenarioGenPollingServiceId });
      return;
    }
    try {
      const run = await startRun(scenarioGenPollingServiceId, {
        scenario_ids: scenarioIds,
        filter: scenarioIds && scenarioIds.length ? 'affected' : 'all',
        ...(resumeFromTrace ? { resume_from_trace: resumeFromTrace } : {}),
      });
      const startTime = (() => {
        const n = new Date();
        const p = (v: number) => String(v).padStart(2, '0');
        return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}`;
      })();
      setRunningTests(prev => [...prev, {
        id: run.id, name: runName, groupId, startTime, status: 'running' as const,
      }]);
      setSelectedRunningTestId(run.id);
      setSelectedRunningForDetail(run.id);
      setSelectedTestGroup(runName);
      setRunTraceId(run.id);
      navigate(`/${currentSlug}/test`);
    } catch (err) {
      console.error('테스트 실행 트리거 실패', err);
    }
  }, [scenarioGenPollingServiceId, currentSlug, navigate]);

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

      // 생성 직후 ScenarioPage 로 이동 (overlay 가 진행 상황 표시).
      navigate(`/${created.id}/scenarios`);

      // 시나리오 생성 자동 트리거 — agent API 는 service_id (UUID) 기반.
      try {
        setShowScenarioGenerating(true);
        const resp = await startScenarioGeneration(created.serviceId, { trigger: 'init' }, token);
        setScenarioGenTraceId(resp.trace_id);
      } catch (err) {
        console.error('시나리오 생성 트리거 실패', err);
        setShowScenarioGenerating(false);
      }
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
                          {uiRtmVersions.map(ver => (
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
                showCodeGeneratingOverlay={showCodeGenerating}
                setShowCodeGeneratingOverlay={setShowCodeGenerating}
                onStartRun={handleStartRun}
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
                  onStartRun={handleStartRun}
                  serviceUuid={scenarioGenPollingServiceId}
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
                  onResumeRun={(runId, runName) => handleStartRun(undefined, runName, null, runId)}
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

      <CodeGenConfirmModal
        open={codeGenConfirmOpen}
        onConfirm={handleStartCodeGen}
        onDismiss={() => setCodeGenConfirmOpen(false)}
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
