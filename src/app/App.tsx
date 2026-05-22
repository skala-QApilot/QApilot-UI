import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router';
import { SubHeader } from './components/common/SubHeader';
import { SearchBar } from './components/common/SearchBar';
import { LeftNavigation } from './components/common/LeftNavigation';
import { NavBar } from './components/common/NavBar';
import { HomePage, type ProjectMeta, type ProjectSummary } from './pages/HomePage';
import { TestRunningPage } from './pages/TestRunningPage';
import { RTMPage } from './pages/RTMPage';
import { TestPage } from './pages/TestPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { DashHomePage, type Service } from './pages/DashHomePage';
import { ServiceSetupPage } from './pages/ServiceSetupPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import {
  ChevronDown,
  BarChart2, Users, Settings,
  Network, GitBranch, Download,
  FolderOpen,
} from 'lucide-react';
import AgentTracePanel from './components/AgentTracePanel';
import { ScenarioManagerPanel } from './components/ScenarioManagerPanel';
import { ScenarioChatbar } from './components/ScenarioChatbar';
import { LinkedFilesModal } from './components/LinkedFilesModal';
import { RetestNavModal } from './components/RetestNavModal';
import { getProject, type ProjectDashboardResponse } from '../api/projects';
import { ApiError } from '../api/client';
import { mockFiles, mockNotifications, mockRTMVersions } from './data/mockData';
import { useScenarioState } from './hooks/useScenarioState';
import { useTestState } from './hooks/useTestState';
import { useChatbotState } from './hooks/useChatbotState';
import { useAgentRunState } from './hooks/useAgentRunState';
const qapilotAgent = new URL('../assets/qapilot-agent.png', import.meta.url).href;

// Routes that are NOT project slugs
const NON_PROJECT_PATHS = ['login', 'services', 'setup'];

function clearTokens() {
  localStorage.removeItem('qapilot_access_token');
  localStorage.removeItem('qapilot_refresh_token');
}

function getToken(): string | null {
  return localStorage.getItem('qapilot_access_token');
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Derive routing state from URL ─────────────────────────────────────────

  const currentSlug = useMemo(() => {
    const first = location.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!first || NON_PROJECT_PATHS.includes(first)) return null;
    return first;
  }, [location.pathname]);

  const isProjectRoute = Boolean(currentSlug);

  const currentPage = useMemo(() => {
    const path = location.pathname;
    if (!currentSlug) {
      if (path === '/services') return 'SERVICES';
      if (path === '/setup') return 'SETUP';
      return 'LANDING';
    }
    const after = path.slice(`/${currentSlug}`.length).replace(/^\//, '');
    if (!after) return 'HOME';
    if (after.startsWith('scenarios')) return '시나리오';
    if (after.startsWith('test')) return '테스트';
    if (after.startsWith('rtm')) return 'RTM';
    return 'HOME';
  }, [location.pathname, currentSlug]);

  // ── Navigation helpers (backward-compat interface for child components) ────

  const setCurrentPage = useCallback((page: string) => {
    const slug = currentSlug;
    switch (page) {
      case 'SERVICES': navigate('/services'); break;
      case 'HOME': navigate(`/${slug}`); break;
      case '시나리오': navigate(`/${slug}/scenarios`); break;
      case '테스트':
      case '실행이력': navigate(`/${slug}/test`); break;
      case 'RTM': navigate(`/${slug}/rtm`); break;
      case 'LANDING': navigate('/'); break;
      case 'LOGIN': navigate('/login'); break;
    }
  }, [navigate, currentSlug]);

  const setTestSubTab = useCallback((tab: 'INPROGRESS' | 'HISTORY') => {
    navigate(tab === 'INPROGRESS' ? `/${currentSlug}/test/running` : `/${currentSlug}/test`);
  }, [navigate, currentSlug]);

  // ── Top-level app state ──────────────────────────────────────────────────

  const [services, setServices] = useState<Service[]>([
    { id: 'svc-1', name: 'Frontend App', isNew: false, createdAt: '2026-01-15' },
    { id: 'svc-2', name: 'Backend API', isNew: false, createdAt: '2026-02-20' },
  ]);
  // 로컬에서 직접 생성된 서비스 — API 인증 체크 불필요
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

  const [rtmSearchQuery, setRtmSearchQuery] = useState('');
  const [selectedRtmVersion, setSelectedRtmVersion] = useState(mockRTMVersions[0].id);
  const [rtmVersionOpen, setRtmVersionOpen] = useState(false);
  const currentRtmVersion = mockRTMVersions.find(v => v.id === selectedRtmVersion) ?? mockRTMVersions[0];

  // ── Feature-grouped state (custom hooks) ─────────────────────────────────

  const scenario = useScenarioState();
  const test = useTestState();
  const chatbot = useChatbotState();
  const agent = useAgentRunState();

  // ── Project auth/load effect ─────────────────────────────────────────────

  useEffect(() => {
    if (!currentSlug) return;

    // 로컬에서 생성된 서비스는 API 호출 없이 바로 loaded
    if (localServiceIds.current.has(currentSlug)) {
      setProjectLoadState('loaded');
      return;
    }

    const token = getToken();
    if (!token) {
      setProjectLoadState('idle');
      setShowAuthForProject(true);
      return;
    }

    let cancelled = false;
    setProjectLoadState('loading');
    setShowAuthForProject(false);

    getProject(currentSlug, token)
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
        setProjectLoadState('loaded');
      })
      .catch(error => {
        if (cancelled) return;
        const status = error instanceof ApiError ? error.status : undefined;
        if (status === 401) {
          clearTokens();
          setShowAuthForProject(true);
          setProjectLoadState('idle');
        } else if (status === 404) {
          setProjectLoadState('missing');
        } else {
          setProjectLoadState('error');
        }
      });

    return () => { cancelled = true; };
  }, [currentSlug, authRetry]);

  // ── Side-effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!scenario.highlightedScenarioRow) return;
    const target = document.getElementById(`scenario-row-${scenario.highlightedScenarioRow}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => scenario.setHighlightedScenarioRow(null), 1500);
    return () => window.clearTimeout(timer);
  }, [scenario.highlightedScenarioRow]);

  useEffect(() => {
    if (currentPage !== '시나리오') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = !!target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );
      if (!isTypingTarget && (event.key === 'Enter' || event.key === ' ') && !chatbot.chatbarClosedRef.current) {
        chatbot.setChatbarActive(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (scenario.codeChangeTimerRef.current) window.clearTimeout(scenario.codeChangeTimerRef.current);
      if (scenario.fileChangeTimerRef.current) window.clearTimeout(scenario.fileChangeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentPage !== '테스트') {
      test.setSelectedRunningForDetail(null);
      test.setSelectedExecutionId(null);
    }
  }, [currentPage]);

  // ── Derived values ───────────────────────────────────────────────────────

  const unreadNotifications = mockNotifications.filter(n => !n.read).length;

  const allTCIds = scenario.dynamicScenarios.flatMap(ts =>
    (scenario.dynamicTestCases[ts.id] || []).map(tc => `${ts.id}_${tc.id}`)
  );
  const allTCsSelected = allTCIds.length > 0 && allTCIds.every(id => scenario.selectedTCIds.includes(id));
  const someSelected = scenario.selectedTCIds.length > 0;

  const parallelDone = ['UI', 'API', 'DB'].every(s => agent.completedAgentStages.includes(s));
  const getNodeStatus = (stage: string): 'inactive' | 'running' | 'complete' => {
    if (agent.completedAgentStages.includes(stage)) return 'complete';
    const isParallel = ['UI', 'API', 'DB'].includes(stage);
    if (isParallel && !parallelDone) return 'running';
    if (!isParallel && parallelDone && agent.currentAgentStage === stage) return 'running';
    return 'inactive';
  };

  const selectedService = services.find(s => s.id === selectedServiceId) ?? null;

  // ── Business logic ────────────────────────────────────────────────────────

  const navigateToHistory = (filter: string) => {
    test.setHistoryFilter(filter);
    test.setSelectedExecutionId(null);
    navigate(`/${currentSlug}/test`);
  };

  const sendAiMessage = (text: string) => {
    chatbot.setAiMessages(prev => [...prev, { role: 'user', text }]);
    chatbot.setAiInput('');
    setTimeout(() => {
      chatbot.setAiMessages(prev => [...prev, { role: 'assistant', text: `"${text}" 관련 시나리오를 분석하고 있습니다...` }]);
    }, 500);
    if (currentPage === '시나리오') {
      setTimeout(() => {
        chatbot.setAiMessages(prev => [...prev, { role: 'assistant', text: '시나리오 초안을 생성했습니다. 사이드바에서 확인 후 승인해 주세요.' }]);
        const newId = `TS${scenario.dynamicScenarios.length + 1}`;
        const label = text.length > 20 ? text.slice(0, 20) + '...' : text;
        scenario.setDynamicScenarios(prev => [...prev, { id: newId, name: label, status: 'pending', testCases: 2, hasChanges: false }]);
        scenario.setDynamicAIItems(prev => ({ ...prev, [newId]: { reason: text.slice(0, 50), trigger: 'chatbot', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ') } }));
        scenario.setDynamicTestCases(prev => ({
          ...prev,
          [newId]: [
            { id: 'TC1', name: 'AI 기본 케이스', status: 'pending', testVariables: [{ id: 'TV1', name: '정상 입력', status: 'pending' }, { id: 'TV2', name: '경계값 입력', status: 'pending' }] },
            { id: 'TC2', name: 'AI 엣지 케이스', status: 'pending', testVariables: [{ id: 'TV1', name: '오류 입력', status: 'pending' }] },
          ],
        }));
        scenario.setExpandedTSForTC(prev => [...prev, newId]);
      }, 1500);
    }
  };

  const openAiWithContext = (context: string) => {
    chatbot.setAiContextPrefill(context);
    chatbot.setAiPanelOpen(true);
    scenario.setScenarioQuickOpen(false);
    chatbot.setAiMessages(prev => [...prev,
      { role: 'user', text: `[수정 요청] ${context}` },
      { role: 'assistant', text: '해당 변경사항에 대한 시나리오를 수정하겠습니다. 구체적인 요구사항을 알려주세요.' },
    ]);
  };

  const onReviewConfirm = () => {
    const stableVersions = scenario.scenarioVersions.filter(v => !v.hasChange);
    const latestLabel = stableVersions[stableVersions.length - 1]?.label ?? 'v1.0';
    const match = latestLabel.match(/^v(\d+)\.(\d+)$/);
    const [major, minor] = match ? [parseInt(match[1]), parseInt(match[2])] : [1, 0];
    const newLabel = `v${major}.${minor + 1}`;
    const today = new Date();
    const date = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    scenario.setScenarioVersions([
      ...stableVersions,
      { id: newLabel, label: newLabel, date, hasChange: false, isFavorite: false },
    ]);
    scenario.setSelectedScenarioVersion(newLabel);
    scenario.setAiItemActions({});
    scenario.setDynamicAIItems({});
  };

  const triggerCodeChangeDetection = () => {
    if (scenario.codeChangeTimerRef.current) window.clearTimeout(scenario.codeChangeTimerRef.current);
    scenario.setCodeChangeDetected(true);
    scenario.codeChangeTimerRef.current = window.setTimeout(() => {
      scenario.setDynamicAIItems(prev => ({
        ...prev,
        TS1: prev.TS1 ?? { reason: 'login.tsx 비밀번호 검증 로직 변경 감지', trigger: 'code', timestamp: '2026-04-27 10:23' },
      }));
      scenario.setExpandedTSForTC(prev => prev.includes('TS1') ? prev : [...prev, 'TS1']);
      scenario.setCodeChangeDetected(false);
      scenario.codeChangeTimerRef.current = null;
    }, 1800);
  };

  const triggerFileChangeDetection = () => {
    scenario.setShowLinkedFiles(false);
    navigate(`/${currentSlug}/scenarios`);
    if (scenario.fileChangeTimerRef.current) window.clearTimeout(scenario.fileChangeTimerRef.current);
    scenario.setFileChangeDetected(true);
    scenario.fileChangeTimerRef.current = window.setTimeout(() => {
      const unreflected = mockFiles.filter(f => !f.reflected);
      unreflected.forEach(file => {
        const targetId = 'TS2';
        scenario.setDynamicAIItems(prev => ({
          ...prev,
          [targetId]: prev[targetId] ?? {
            reason: `${file.name} ${file.version} 업데이트 내용 시나리오 반영 필요`,
            trigger: 'file' as const,
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          },
        }));
        scenario.setExpandedTSForTC(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
      });
      scenario.setFileChangeDetected(false);
      scenario.fileChangeTimerRef.current = null;
    }, 1800);
  };

  const advanceAgentStage = () => {
    const order = ['UI', 'API', 'DB', 'Cross-check', '원인 분석', 'Report 생성'];
    const nextIncomplete = order.find(s => !agent.completedAgentStages.includes(s));
    if (!nextIncomplete) return;
    const newCompleted = [...agent.completedAgentStages, nextIncomplete];
    agent.setCompletedAgentStages(newCompleted);
    const newParallelDone = ['UI', 'API', 'DB'].every(s => newCompleted.includes(s));
    if (newParallelDone) {
      const seq = ['Cross-check', '원인 분석', 'Report 생성'];
      const nextSeq = seq.find(s => !newCompleted.includes(s));
      agent.setCurrentAgentStage(nextSeq || '');
      if (!nextSeq) agent.setShowCompletionModal(true);
    }
  };

  // ── Service navigation helpers ────────────────────────────────────────────

  const handleServiceSelect = (service: Service) => {
    setSelectedServiceId(service.id);
    navigate(`/${service.id}`);
  };

  const handleSetupComplete = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || `svc-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const newService: Service = { id: slug, name, isNew: false, createdAt: today };
    localServiceIds.current.add(slug);
    setServices(prev => [...prev, newService]);
    setSelectedServiceId(slug);
    navigate(`/${slug}`);
  };

  const handleRetestConfirm = () => {
    const newRun = {
      id: `run-retest-${Date.now()}`,
      name: `재테스트 시나리오 그룹 (${test.retestCheckedIds.size}건)`,
      groupId: 'RETEST',
      startTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'running' as const,
    };
    test.setRunningTests(prev => [...prev, newRun]);
    test.setSelectedRunningTestId(newRun.id);
    agent.setSelectedTestGroup(newRun.name);
    agent.setCompletedAgentStages([]);
    agent.setCurrentAgentStage('');
    agent.setIsTestRunning(false);
    test.setRetestCheckedIds(new Set());
    test.setShowRetestNavModal(false);
    test.setSelectedRunningForDetail(newRun.id);
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
        onLogin={() => { setShowAuthForProject(false); setAuthRetry(n => n + 1); }}
        onBack={() => navigate('/services')}
        projectSlug={currentSlug ?? undefined}
      />
    );
  }

  if (isProjectRoute && (projectLoadState === 'loading' || projectLoadState === 'idle')) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f0ff_0%,#ffffff_60%)] text-[#1a1a2e] flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-[2rem] border border-[#ece9fb] bg-white/90 shadow-xl px-8 py-10 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9ca3af]">QApilot</div>
          <h1 className="mt-3 text-3xl font-bold">프로젝트 대시보드를 불러오는 중입니다</h1>
          <p className="mt-3 text-sm text-[#6b7280]">/{currentSlug} 등록 정보와 코드 인덱스 요약을 확인하고 있어요.</p>
        </div>
      </div>
    );
  }

  if (isProjectRoute && projectLoadState === 'missing') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_58%)] text-[#1a1a2e] flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-[2rem] border border-[#f5d6c0] bg-white shadow-xl px-8 py-10">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#d97706]">Project Missing</div>
          <h1 className="mt-3 text-3xl font-bold">등록되지 않은 프로젝트입니다</h1>
          <p className="mt-3 text-sm text-[#6b7280]">
            <span className="font-semibold text-[#1a1a2e]">/{currentSlug}</span> 에 해당하는 프로젝트를 찾지 못했습니다.
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
            QApilot API 서버가 실행 중인지 확인하고, 다시 <code className="rounded bg-[#fff1f2] px-1.5 py-0.5">/{currentSlug}</code> 로 접속해 주세요.
          </p>
        </div>
      </div>
    );
  }

  // ── Main app layout ───────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar
        selectedService={selectedService}
        scheduledAlarms={test.scheduledAlarms}
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
          onAddNew={() => navigate('/setup')}
        />
      ) : currentPage === 'SETUP' ? (
        <ServiceSetupPage onGenerateScenarios={handleSetupComplete} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <LeftNavigation
            slug={currentSlug!}
            runningTests={test.runningTests}
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
                        onClick={() => scenario.setScenarioViewMode(scenario.scenarioViewMode === 'table' ? 'graph' : 'table')}
                        title={scenario.scenarioViewMode === 'table' ? '그래프 보기' : '목록 보기'}
                        className={`inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs leading-none transition-colors ${
                          scenario.scenarioViewMode === 'graph'
                            ? 'bg-[#3615CF] text-white'
                            : 'text-[#9ca3af] hover:text-[#3615CF] hover:bg-[#3615CF]/8'
                        }`}>
                        <Network className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-[#e5e7eb]" />
                      <button
                        onClick={() => scenario.setShowLinkedFiles(true)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs leading-none text-[#6b7280] hover:text-[#6b7280] hover:bg-[#fef3c7] transition-colors">
                        <FolderOpen className="w-3.5 h-3.5" /> Files
                      </button>
                      <button
                        onClick={triggerCodeChangeDetection}
                        disabled={scenario.codeChangeDetected}
                        className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs leading-none transition-colors ${
                          scenario.codeChangeDetected
                            ? 'text-[#6b7280] bg-[#fef3c7]'
                            : 'text-[#6b7280] hover:text-[#6b7280] hover:bg-[#fef3c7]'
                        }`}>
                        <GitBranch className="w-3.5 h-3.5" /> 코드 변경 탐지
                        {scenario.codeChangeDetected && <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />}
                      </button>
                    </div>
                  ) : undefined
                }
              />
            )}

            {/* ── Page content via React Router ── */}
            <div className="flex-1 overflow-hidden flex">
              <div className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/services" element={null} />
                  <Route path="/:slug" element={
                    <HomePage
                      setCurrentPage={setCurrentPage}
                      navigateToHistory={navigateToHistory}
                      activeTab={homeTab}
                      serviceName={selectedService?.name}
                      projectSlug={projectMeta?.project_slug || currentSlug || undefined}
                      projectMeta={projectMeta}
                      projectSummary={projectSummary}
                      projectCredentials={projectCredentials}
                    />
                  } />
                  <Route path="/:slug/scenarios" element={
                    <ScenarioPage
                      selectedScenario={scenario.selectedScenario}
                      setSelectedScenario={scenario.setSelectedScenario}
                      scenarioPageTab={scenario.scenarioPageTab}
                      setScenarioPageTab={scenario.setScenarioPageTab}
                      scenarioSearchQuery={scenario.scenarioSearchQuery}
                      setScenarioSearchQuery={scenario.setScenarioSearchQuery}
                      scenarioChangeFilter={scenario.scenarioChangeFilter}
                      setScenarioChangeFilter={scenario.setScenarioChangeFilter}
                      selectedScenarioVersion={scenario.selectedScenarioVersion}
                      setSelectedScenarioVersion={scenario.setSelectedScenarioVersion}
                      scenarioVersions={scenario.scenarioVersions}
                      onReviewConfirm={onReviewConfirm}
                      favoriteVersionIds={scenario.favoriteVersionIds}
                      setFavoriteVersionIds={scenario.setFavoriteVersionIds}
                      hoveredVersionId={scenario.hoveredVersionId}
                      setHoveredVersionId={scenario.setHoveredVersionId}
                      selectedNetworkNodeId={scenario.selectedNetworkNodeId}
                      setSelectedNetworkNodeId={scenario.setSelectedNetworkNodeId}
                      expandedTSForTC={scenario.expandedTSForTC}
                      setExpandedTSForTC={scenario.setExpandedTSForTC}
                      selectedTCIds={scenario.selectedTCIds}
                      setSelectedTCIds={scenario.setSelectedTCIds}
                      expandedTC={scenario.expandedTC}
                      setExpandedTC={scenario.setExpandedTC}
                      showTestGroupModal={scenario.showTestGroupModal}
                      setShowTestGroupModal={scenario.setShowTestGroupModal}
                      setShowLinkedFiles={scenario.setShowLinkedFiles}
                      aiItemActions={scenario.aiItemActions}
                      setAiItemActions={scenario.setAiItemActions}
                      showDeferredAIItems={scenario.showDeferredAIItems}
                      setShowDeferredAIItems={scenario.setShowDeferredAIItems}
                      codeChangeDetected={scenario.codeChangeDetected}
                      dynamicScenarios={scenario.dynamicScenarios}
                      setDynamicScenarios={scenario.setDynamicScenarios}
                      dynamicAIItems={scenario.dynamicAIItems}
                      dynamicTestCases={scenario.dynamicTestCases}
                      setDynamicTestCases={scenario.setDynamicTestCases}
                      loadingItemKey={scenario.loadingItemKey}
                      setLoadingItemKey={scenario.setLoadingItemKey}
                      editingDetailItem={scenario.editingDetailItem}
                      setEditingDetailItem={scenario.setEditingDetailItem}
                      selectedTvId={scenario.selectedTvId}
                      setSelectedTvId={scenario.setSelectedTvId}
                      selectedScenarioNode={scenario.selectedScenarioNode}
                      setSelectedScenarioNode={scenario.setSelectedScenarioNode}
                      highlightedScenarioRow={scenario.highlightedScenarioRow}
                      detailPanelRow={scenario.detailPanelRow}
                      setDetailPanelRow={scenario.setDetailPanelRow}
                      expandedTSMain={scenario.expandedTSMain}
                      setExpandedTSMain={scenario.setExpandedTSMain}
                      expandedTCMain={scenario.expandedTCMain}
                      setExpandedTCMain={scenario.setExpandedTCMain}
                      allTCsSelected={allTCsSelected}
                      someSelected={someSelected}
                      openAiWithContext={openAiWithContext}
                      triggerCodeChangeDetection={triggerCodeChangeDetection}
                      setCurrentPage={setCurrentPage}
                      setTestDepth={agent.setTestDepth}
                      highlightedBotRow={chatbot.highlightedBotRow}
                      setHighlightedBotRow={chatbot.setHighlightedBotRow}
                      selectedScenarioGroupId={test.selectedScenarioGroupId}
                      setSelectedScenarioGroupId={test.setSelectedScenarioGroupId}
                      setRunningTests={test.setRunningTests}
                      setTestSubTab={setTestSubTab}
                      setSelectedRunningTestId={test.setSelectedRunningTestId}
                      setSelectedTestGroup={agent.setSelectedTestGroup}
                      setSelectedRunningForDetail={test.setSelectedRunningForDetail}
                      viewMode={scenario.scenarioViewMode}
                      setViewMode={scenario.setScenarioViewMode}
                    />
                  } />
                  <Route path="/:slug/test/running" element={
                    <TestRunningPage
                      runningTests={test.runningTests}
                      selectedRunningTestId={test.selectedRunningTestId}
                      setSelectedRunningTestId={test.setSelectedRunningTestId}
                      isTestRunning={agent.isTestRunning}
                      setIsTestRunning={agent.setIsTestRunning}
                      setCompletedAgentStages={agent.setCompletedAgentStages}
                      setCurrentAgentStage={agent.setCurrentAgentStage}
                      highlightedLogIdx={agent.highlightedLogIdx}
                      setHighlightedLogIdx={agent.setHighlightedLogIdx}
                      setSelectedRunningForDetail={test.setSelectedRunningForDetail}
                      advanceAgentStage={advanceAgentStage}
                      getNodeStatus={getNodeStatus}
                      setShowCompletionModal={agent.setShowCompletionModal}
                    />
                  } />
                  <Route path="/:slug/test" element={
                    <TestPage
                      runningTests={test.runningTests}
                      setRunningTests={test.setRunningTests}
                      setSelectedRunningTestId={test.setSelectedRunningTestId}
                      setSelectedTestGroup={agent.setSelectedTestGroup}
                      isTestRunning={agent.isTestRunning}
                      setIsTestRunning={agent.setIsTestRunning}
                      completedAgentStages={agent.completedAgentStages}
                      setCompletedAgentStages={agent.setCompletedAgentStages}
                      currentAgentStage={agent.currentAgentStage}
                      setCurrentAgentStage={agent.setCurrentAgentStage}
                      scenarioSidebarTab={agent.scenarioSidebarTab}
                      setScenarioSidebarTab={agent.setScenarioSidebarTab}
                      expandedScenarios={agent.expandedScenarios}
                      setExpandedScenarios={agent.setExpandedScenarios}
                      expandedTestCases={agent.expandedTestCases}
                      setExpandedTestCases={agent.setExpandedTestCases}
                      highlightedLogIdx={agent.highlightedLogIdx}
                      setHighlightedLogIdx={agent.setHighlightedLogIdx}
                      historyFilter={test.historyFilter}
                      setHistoryFilter={test.setHistoryFilter}
                      historySearchQuery={test.historySearchQuery}
                      setHistorySearchQuery={test.setHistorySearchQuery}
                      selectedExecutionId={test.selectedExecutionId}
                      setSelectedExecutionId={test.setSelectedExecutionId}
                      selectedFailTC={test.selectedFailTC}
                      setSelectedFailTC={test.setSelectedFailTC}
                      historyDetailTab={test.historyDetailTab}
                      setHistoryDetailTab={test.setHistoryDetailTab}
                      retestCheckedIds={test.retestCheckedIds}
                      setRetestCheckedIds={test.setRetestCheckedIds}
                      setShowRetestNavModal={test.setShowRetestNavModal}
                      selectedRunningForDetail={test.selectedRunningForDetail}
                      setSelectedRunningForDetail={test.setSelectedRunningForDetail}
                      advanceAgentStage={advanceAgentStage}
                      getNodeStatus={getNodeStatus}
                      showCompletionModal={agent.showCompletionModal}
                      setShowCompletionModal={agent.setShowCompletionModal}
                    />
                  } />
                  <Route path="/:slug/rtm" element={<RTMPage />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Scenario Manager Panel ── */}
      {currentPage === '시나리오' && (
        <ScenarioManagerPanel
          aiPanelOpen={chatbot.aiPanelOpen}
          setAiPanelOpen={chatbot.setAiPanelOpen}
          aiMessages={chatbot.aiMessages}
          aiInput={chatbot.aiInput}
          setAiInput={chatbot.setAiInput}
          aiContextPrefill={chatbot.aiContextPrefill}
          sendAiMessage={sendAiMessage}
        />
      )}

      {/* ── Modals ── */}
      <LinkedFilesModal
        open={scenario.showLinkedFiles}
        onClose={() => scenario.setShowLinkedFiles(false)}
        onRequestChange={triggerFileChangeDetection}
      />

      <RetestNavModal
        open={test.showRetestNavModal}
        retestCheckedIds={test.retestCheckedIds}
        onConfirm={handleRetestConfirm}
        onDismiss={() => test.setShowRetestNavModal(false)}
      />

      {/* ── Scenario Chatbar ── */}
      {currentPage === '시나리오' && !scenario.showLinkedFiles && (
        <ScenarioChatbar
          chatbarClosedRef={chatbot.chatbarClosedRef}
          chatbarActive={chatbot.chatbarActive}
          setChatbarActive={chatbot.setChatbarActive}
          chatPanelExpanded={chatbot.chatPanelExpanded}
          setChatPanelExpanded={chatbot.setChatPanelExpanded}
          chatHistoryPanelOpen={chatbot.chatHistoryPanelOpen}
          setChatHistoryPanelOpen={chatbot.setChatHistoryPanelOpen}
          quickChipsOpen={chatbot.quickChipsOpen}
          setQuickChipsOpen={chatbot.setQuickChipsOpen}
          chatContextTag={chatbot.chatContextTag}
          setChatContextTag={chatbot.setChatContextTag}
          aiMessages={chatbot.aiMessages}
          aiInput={chatbot.aiInput}
          setAiInput={chatbot.setAiInput}
          setInlineDiffId={chatbot.setInlineDiffId}
          setHighlightedBotRow={chatbot.setHighlightedBotRow}
          sendAiMessage={sendAiMessage}
        />
      )}
    </div>
  );
}
