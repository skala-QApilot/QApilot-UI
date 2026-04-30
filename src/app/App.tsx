import React, { useEffect, useRef, useState } from 'react';
import ScenarioNetworkGraph from './components/ScenarioNetworkGraph';
import { PageTitle } from './components/common/PageTitle';
import { StatusIcon } from './components/common/StatusIcon';
import { HomePage } from './pages/HomePage';
import { ExecutionHistoryPage as ExecutionHistoryPageView } from './pages/ExecutionHistoryPage';
import { RTMPage } from './pages/RTMPage';
import { SettingsPage } from './pages/SettingsPage';
import { TestGroupPage } from './pages/TestGroupPage';
import { TestPage } from './pages/TestPage';
import { ScenarioPage } from './pages/ScenarioPage';
import {
  Bell, Play, ChevronDown, ChevronRight, Upload, FileText,
  CheckCircle2, XCircle, Clock, Loader2, Download, Plus, Trash2,
  Eye, AlertCircle, CheckCircle, X, Home, Layers, Settings,
  RotateCcw, Pause, ChevronLeft, User, Users, Send, GitBranch,
  History, CheckSquare, Search, Edit2, MessageCircle,
  Sparkles, Star, FolderOpen,
} from 'lucide-react';
import {
  mockAIItems,
  mockFiles,
  mockNotifications,
  mockPipelineStages,
  mockRTMData,
  mockRunningTestGroups,
  mockScenarioHistory,
  mockScenarios,
  mockScenarioVersions,
  mockTestCases,
  mockTestGroups,
  mockTestLogs,
  type TestCaseMap,
} from './data/mockData';

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
  const [showDeferredAIItems, setShowDeferredAIItems] = useState(false);
  const [codeChangeDetected, setCodeChangeDetected] = useState(false);
  const [dynamicScenarios, setDynamicScenarios] = useState([...mockScenarios]);
  const [dynamicAIItems, setDynamicAIItems] = useState<Record<string, { reason: string; trigger: 'file' | 'chatbot' | 'code'; timestamp: string }>>({ ...mockAIItems });
  const [dynamicTestCases, setDynamicTestCases] = useState<TestCaseMap>({ ...mockTestCases });
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
  const codeChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 시나리오 그룹 선택 & 예약 설정
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledAlarms, setScheduledAlarms] = useState<Array<{ time: string; id: string }>>([]);

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
    };
  }, []);

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
        {/* 예약 알람 시간 표시 */}
        {scheduledAlarms.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 rounded-lg border border-[#f78ca0]/20">
            <Clock className="w-4 h-4 text-[#f78ca0]" />
            <span className="text-sm font-medium text-[#f78ca0]">
              {scheduledAlarms.map(a => a.time).join(', ')}
            </span>
          </div>
        )}
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <LeftNavigation />

      <div className="flex-1 flex flex-col overflow-hidden">
        <NavBar />
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            {currentPage === 'HOME' && <HomePage setCurrentPage={setCurrentPage} navigateToHistory={navigateToHistory} />}
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
              />
            )}
            {currentPage === '테스트그룹' && (
              <TestGroupPage
                testDepth={testDepth}
                setTestDepth={setTestDepth}
                selectedTestGroup={selectedTestGroup}
                groupSearchQuery={groupSearchQuery}
                setGroupSearchQuery={setGroupSearchQuery}
                editingGroupId={editingGroupId}
                setEditingGroupId={setEditingGroupId}
                editingGroupName={editingGroupName}
                setEditingGroupName={setEditingGroupName}
                groupNames={groupNames}
                setGroupNames={setGroupNames}
                isTestRunning={isTestRunning}
                setIsTestRunning={setIsTestRunning}
                completedAgentStages={completedAgentStages}
                setCompletedAgentStages={setCompletedAgentStages}
                currentAgentStage={currentAgentStage}
                setCurrentAgentStage={setCurrentAgentStage}
                showCompletionModal={showCompletionModal}
                setShowCompletionModal={setShowCompletionModal}
                scenarioSidebarTab={scenarioSidebarTab}
                setScenarioSidebarTab={setScenarioSidebarTab}
                scenarioFilter={scenarioFilter}
                expandedScenarios={expandedScenarios}
                setExpandedScenarios={setExpandedScenarios}
                expandedTestCases={expandedTestCases}
                setExpandedTestCases={setExpandedTestCases}
                highlightedLogIdx={highlightedLogIdx}
                setHighlightedLogIdx={setHighlightedLogIdx}
                setRunningTests={setRunningTests}
                selectedRunningTestId={selectedRunningTestId}
                setSelectedRunningTestId={setSelectedRunningTestId}
                setSelectedTestGroup={setSelectedTestGroup}
                setCurrentPage={setCurrentPage}
                setTestSubTab={setTestSubTab}
                setTestSubmenuExpanded={setTestSubmenuExpanded}
                setScenarioSubmenuExpanded={setScenarioSubmenuExpanded}
                setHistoryFilter={setHistoryFilter}
                advanceAgentStage={advanceAgentStage}
                getNodeStatus={getNodeStatus}
                selectedGroupIds={selectedGroupIds}
                setSelectedGroupIds={setSelectedGroupIds}
                showScheduleModal={showScheduleModal}
                setShowScheduleModal={setShowScheduleModal}
                scheduledAlarms={scheduledAlarms}
                setScheduledAlarms={setScheduledAlarms}
              />
            )}
            {currentPage === '테스트' && (
              <TestPage
                runningTests={runningTests}
                setRunningTests={setRunningTests}
                selectedRunningTestId={selectedRunningTestId}
                setSelectedRunningTestId={setSelectedRunningTestId}
                setSelectedTestGroup={setSelectedTestGroup}
                isTestRunning={isTestRunning}
                setIsTestRunning={setIsTestRunning}
                completedAgentStages={completedAgentStages}
                setCompletedAgentStages={setCompletedAgentStages}
                currentAgentStage={currentAgentStage}
                setCurrentAgentStage={setCurrentAgentStage}
                scenarioSidebarTab={scenarioSidebarTab}
                setScenarioSidebarTab={setScenarioSidebarTab}
                expandedScenarios={expandedScenarios}
                setExpandedScenarios={setExpandedScenarios}
                expandedTestCases={expandedTestCases}
                setExpandedTestCases={setExpandedTestCases}
                highlightedLogIdx={highlightedLogIdx}
                setHighlightedLogIdx={setHighlightedLogIdx}
                testSubTab={testSubTab}
                setTestSubTab={setTestSubTab}
                historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter}
                selectedExecutionId={selectedExecutionId}
                setSelectedExecutionId={setSelectedExecutionId}
                selectedFailTC={selectedFailTC}
                setSelectedFailTC={setSelectedFailTC}
                historyDetailTab={historyDetailTab}
                setHistoryDetailTab={setHistoryDetailTab}
                retestCheckedIds={retestCheckedIds}
                setRetestCheckedIds={setRetestCheckedIds}
                setShowRetestNavModal={setShowRetestNavModal}
                advanceAgentStage={advanceAgentStage}
                getNodeStatus={getNodeStatus}
                showCompletionModal={showCompletionModal}
                setShowCompletionModal={setShowCompletionModal}
              />
            )}
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
              left: '3.5rem', right: 0, height: '5rem',
              opacity: chatbarActive ? 1 : 0,
              background: 'linear-gradient(to top, rgba(249,250,251,0.88) 0%, rgba(249,250,251,0.46) 42%, rgba(249,250,251,0.14) 72%, rgba(249,250,251,0) 100%)',
              backdropFilter: chatbarActive ? 'blur(6px)' : 'none',
              WebkitBackdropFilter: chatbarActive ? 'blur(6px)' : 'none',
              maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.24) 78%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0.24) 78%, transparent 100%)',
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
