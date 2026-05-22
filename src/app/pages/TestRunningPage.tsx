import React from 'react';
import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Eye, GitBranch, List, Loader2, Pause, Play, RotateCcw,
} from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { TerminalFrame, RuntimeTerminal } from '../components/common/RuntimeTerminal';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockTestLogs, mockTVEndpoints, type HttpMethod } from '../data/mockData';
import { useScenarioStore, toUiScenario, toUiTestCase } from '../../store/scenarioStore';
import { useRtmStore } from '../../store/rtmStore';
import { useTestStore } from '../../store/testStore';

const METHOD_STYLE: Record<HttpMethod, string> = {
  GET:    'bg-[#EAE8F9] text-[#3615CF] border border-[#3615CF]/20',
  POST:   'bg-[#3615CF]/10 text-[#3615CF] border border-[#3615CF]/20',
  PUT:    'bg-gray-100 text-[#6b7280] border border-gray-200',
  PATCH:  'bg-gray-100 text-[#6b7280] border border-gray-200',
  DELETE: 'bg-[#f43b47]/10 text-[#f43b47] border border-[#f43b47]/20',
};

const HTTP_STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 422: 'Unprocessable Entity', 500: 'Internal Server Error',
};

const mockValidationConditions: Record<string, string[]> = {
  'TS1_TC1_TV1': ['입력: 유효한 이메일', '기대: 로그인 성공, 대시보드 이동'],
  'TS1_TC1_TV2': ['입력: 유효한 비밀번호', '기대: 인증 성공 (200 OK)'],
  'TS1_TC2_TV1': ['입력: 유효한 이메일', '기대: 입력 필드 유효성 통과'],
  'TS1_TC2_TV2': ['입력: 잘못된 비밀번호 (5자 미만)', '기대: 오류 메시지 표시', '코드: 401 Unauthorized'],
};

const LightJson = ({ obj }: { obj: Record<string, unknown> }) => {
  const lines = JSON.stringify(obj, null, 2).split('\n');
  return (
    <code className="block font-mono text-[10.5px] leading-[1.7]">
      {lines.map((line, i) => {
        const m = line.match(/^(\s*)("[\w\s가-힣\-./[\]_]+")(\s*:\s*)(".*?"|[\d.]+|true|false|null)(,?)$/);
        if (m) {
          const isStr = m[4].startsWith('"');
          return (
            <div key={i}>
              <span className="text-slate-400">{m[1]}</span>
              <span className="text-[#3615CF]">{m[2]}</span>
              <span className="text-slate-400">{m[3]}</span>
              <span className={isStr ? 'text-[#3615CF]/70' : 'text-[#f43b47]'}>{m[4]}</span>
              <span className="text-slate-400">{m[5]}</span>
            </div>
          );
        }
        return <div key={i}><span className="text-slate-500">{line}</span></div>;
      })}
    </code>
  );
};

type RunningTest = { id: string; name: string; groupId: string | null; startTime: string; status: 'running' | 'completed' };
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

interface TestRunningPageProps {
  runningTests: RunningTest[];
  selectedRunningTestId: string | null;
  setSelectedRunningTestId: React.Dispatch<React.SetStateAction<string | null>>;
  isTestRunning: boolean;
  setIsTestRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setCompletedAgentStages: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentAgentStage: React.Dispatch<React.SetStateAction<string>>;
  highlightedLogIdx: number | null;
  setHighlightedLogIdx: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedRunningForDetail: React.Dispatch<React.SetStateAction<string | null>>;
  advanceAgentStage: () => void;
  getNodeStatus: (stage: string) => 'inactive' | 'running' | 'complete';
  setShowCompletionModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRunningForDetail: string | null;
  showCompletionModal: boolean;
  setRunningTests: React.Dispatch<React.SetStateAction<RunningTest[]>>;
  scenarioSidebarTab: ScenarioSidebarTab;
  setScenarioSidebarTab: React.Dispatch<React.SetStateAction<ScenarioSidebarTab>>;
  expandedScenarios: string[];
  setExpandedScenarios: React.Dispatch<React.SetStateAction<string[]>>;
  expandedTestCases: string[];
  setExpandedTestCases: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedExecutionId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const TestRunningPage = ({
  runningTests,
  selectedRunningTestId,
  setSelectedRunningTestId,
  isTestRunning,
  setIsTestRunning,
  setCompletedAgentStages,
  setCurrentAgentStage,
  highlightedLogIdx,
  setHighlightedLogIdx,
  setSelectedRunningForDetail,
  advanceAgentStage,
  getNodeStatus,
  setShowCompletionModal,
  selectedRunningForDetail: _selectedRunningForDetail,
  showCompletionModal,
  setRunningTests,
  scenarioSidebarTab,
  setScenarioSidebarTab,
  expandedScenarios,
  setExpandedScenarios,
  expandedTestCases,
  setExpandedTestCases,
  setSelectedExecutionId,
}: TestRunningPageProps) => {
  const selectedRun = runningTests.find(t => t.id === selectedRunningTestId) ?? null;

  // duration stopwatch
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(() => {
    if (!selectedRun) return 0;
    const parsed = Date.parse(selectedRun.startTime);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.floor((Date.now() - parsed) / 1000));
    }
    return 0;
  });

  React.useEffect(() => {
    if (!selectedRun) { setElapsedSeconds(0); return; }
    const parsed = Date.parse(selectedRun.startTime);
    if (!Number.isNaN(parsed)) {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - parsed) / 1000)));
    } else {
      setElapsedSeconds(0);
    }
    let id: number | null = null;
    if (selectedRun.status === 'running') {
      id = window.setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => { if (id) window.clearInterval(id); };
  }, [selectedRun?.id, selectedRun?.startTime, selectedRun?.status]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate  = (value: string) => value.split(' ')[0] ?? value;
  const formatClock = (value: string) => value.split(' ').slice(-1)[0] ?? value;

  // resizable sidebar
  const [sidebarWidth, setSidebarWidth] = React.useState<number | null>(null);
  const dragRef    = React.useRef(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const startXRef  = React.useRef(0);
  const startWRef  = React.useRef(0);
  const runtimeLogRef = React.useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    dragRef.current   = true;
    startXRef.current = e.clientX;
    startWRef.current = sidebarRef.current?.getBoundingClientRect().width ?? 0;
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const parentWidth = sidebarRef.current?.parentElement?.clientWidth ?? window.innerWidth;
      setSidebarWidth(Math.max(488, Math.min(parentWidth - 420, startWRef.current + ev.clientX - startXRef.current)));
    };
    const onUp = () => {
      dragRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const scrollToLog = (logIdx: number) => {
    setHighlightedLogIdx(logIdx);
    setTimeout(() => {
      const container = runtimeLogRef.current;
      const target = container?.querySelector<HTMLElement>(`#ip-log-${logIdx}`);
      if (!container || !target) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect    = target.getBoundingClientRect();
      container.scrollTo({
        top: container.scrollTop + targetRect.top - containerRect.top - (container.clientHeight / 2) + (target.clientHeight / 2),
        behavior: 'smooth',
      });
    }, 50);
  };

  // 시나리오 / TC — scenarioStore 에서 derive (Phase 1 회귀 복구).
  const storeScenarios = useScenarioStore((s) => s.scenarios);
  const storeTestCasesByTs = useScenarioStore((s) => s.testCasesByTs);
  const scenarios = React.useMemo(() => storeScenarios.map(toUiScenario), [storeScenarios]);
  const testCasesMap = React.useMemo(() => {
    const map: Record<string, ReturnType<typeof toUiTestCase>[]> = {};
    for (const [tsId, list] of Object.entries(storeTestCasesByTs)) {
      map[tsId] = list.map(toUiTestCase);
    }
    return map;
  }, [storeTestCasesByTs]);

  // RTM 매핑 — getter 가 매 호출마다 새 배열을 만들기 때문에 selector 안에서 직접 호출 금지.
  const rtmVersionsForMap = useRtmStore((s) => s.versions);
  const selectedRtmVersionId = useRtmStore((s) => s.selectedVersionId);
  const rtmMappings = React.useMemo(
    () => useRtmStore.getState().getRtmMappings(),
    [rtmVersionsForMap, selectedRtmVersionId],
  );

  const allTCs    = scenarios.flatMap(s => (testCasesMap[s.id] || []).map(tc => ({ sId: s.id, tc })));
  const passedTCs = allTCs.filter(({ tc }) => tc.status === 'passed' || tc.status === 'completed');
  const failedTCs = allTCs.filter(({ tc }) => tc.status === 'failed');

  // empty state
  if (!selectedRun) {
    return (
      <div className="flex h-full flex-col">
        <SubHeader title="진행 중인 테스트" className="!py-[14px]" />
        <div className="flex-1 flex items-center justify-center bg-[#EDEEF0]">
          <div className="text-center text-[#9ca3af]">
            <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">실행 중인 테스트가 없습니다</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">

      <SubHeader
        leftContent={(
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedRunningTestId(null);
                setSelectedRunningForDetail(null);
              }}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3615CF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
            <div className="w-px h-4 bg-[#e5e7eb]" />
          </>
        )}
        title={selectedRun.name ?? '나의 진행 중인 테스트'}
        className="!py-[14px]"
        titleExtra={(
          <div className="flex items-center gap-3 ml-1">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#3615CF]/10 text-[#3615CF]">실행 중</span>
            <span className="text-sm text-[#9ca3af]">{formatDate(selectedRun.startTime)}</span>
            <span className="text-sm text-[#9ca3af]">{formatClock(selectedRun.startTime)}</span>
            <span className="text-sm text-[#9ca3af]">{formatDuration(elapsedSeconds)}</span>
          </div>
        )}
      />

      {/* Scenario sidebar + main panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Scenario sidebar — resizable */}
        <div ref={sidebarRef} className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0 min-h-0" style={{ width: sidebarWidth ?? '66.67%' }}>
          <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-[#f0f0f0] flex-shrink-0">
            <div className="flex min-w-0 flex-1 gap-1">
              {[
                { key: 'TOTAL',    label: 'TOTAL' },
                { key: 'PASS',     label: 'PASS', count: passedTCs.length, color: 'text-status-pass', badge: 'bg-status-pass/15 text-status-pass', underline: 'bg-status-pass' },
                { key: 'FILTERED', label: 'FAIL', count: failedTCs.length, color: 'text-status-fail', badge: 'bg-status-fail/15 text-status-fail', underline: 'bg-status-fail' },
              ].map(tab => {
                const active = scenarioSidebarTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setScenarioSidebarTab(tab.key as ScenarioSidebarTab)}
                    className={`px-2.5 py-2 text-xs relative whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                      active ? (tab.color ?? 'text-[#1a1a2e]') : 'text-[#6b7280] hover:text-[#1a1a2e]'
                    } font-semibold`}>
                    {tab.label}
                    {'count' in tab && (
                      <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                        active ? tab.badge : 'bg-gray-100 text-[#9ca3af]'
                      }`}>{tab.count}</span>
                    )}
                    {active && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.underline ?? 'bg-primary-blue'}`} />}
                  </button>
                );
              })}
            </div>
            <div className="mb-2 flex flex-shrink-0 overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
              <button className="p-1.5 text-primary-blue bg-primary-blue/10" aria-label="목록 보기"><List className="h-3.5 w-3.5" /></button>
              <button className="p-1.5 text-[#9ca3af] hover:text-primary-blue" aria-label="흐름 보기"><GitBranch className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-1">
            <div>
              {scenarios.map(scenario => {
                const isExpanded = expandedScenarios.includes(scenario.id);
                const allTcs = testCasesMap[scenario.id] || [];
                const tcs = scenarioSidebarTab === 'PASS'
                  ? allTcs.filter(tc => tc.status === 'passed' || tc.status === 'completed')
                  : scenarioSidebarTab === 'FILTERED'
                  ? allTcs.filter(tc => tc.status === 'failed')
                  : allTcs;
                if (scenarioSidebarTab !== 'TOTAL' && tcs.length === 0) return null;
                return (
                  <div key={scenario.id}>
                    {/* TS 행 */}
                    <div className="group flex items-center gap-1.5 px-2 py-2 border-b border-[#f0f0f0]/60 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setExpandedScenarios(prev =>
                          prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                        );
                        scrollToLog(0);
                      }}>
                      <button className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#9ca3af]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="px-1 py-0.5 text-[9px] rounded font-bold bg-[#3615CF]/10 text-[#3615CF]">TS</span>
                          <span className="text-xs font-semibold text-[#1a1a2e]">{scenario.id}</span>
                          <span className="text-[10px] truncate text-[#6b7280]">{scenario.name}</span>
                        </div>
                      </div>
                      <StatusIcon status={scenario.status} size="w-3.5 h-3.5" />
                    </div>

                    {/* TC 행 */}
                    {isExpanded && tcs.map(tc => {
                      const tcKey = `${scenario.id}_${tc.id}`;
                      const isTCExpanded = expandedTestCases.includes(tcKey);
                      const frEntries = rtmMappings.filter(r => r.ts === scenario.id && r.tc === tc.id);
                      return (
                        <div key={tc.id}>
                          <div className="group flex items-center gap-1.5 pl-7 pr-2 py-1.5 border-b border-[#f0f0f0]/40 bg-[#F9FAFB] hover:bg-opacity-80 cursor-pointer"
                            onClick={() => {
                              setExpandedTestCases(prev =>
                                prev.includes(tcKey) ? prev.filter(id => id !== tcKey) : [...prev, tcKey]
                              );
                              const logIdx = tc.status === 'failed' ? mockTestLogs.findIndex(l => l.isError) : 0;
                              scrollToLog(Math.max(0, logIdx));
                            }}>
                            <button className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {tc.testVariables.length > 0
                                ? (isTCExpanded ? <ChevronDown className="w-3 h-3 text-[#9ca3af]" /> : <ChevronRight className="w-3 h-3 text-[#9ca3af]" />)
                                : <span className="w-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="px-1 py-0.5 text-[9px] rounded font-bold bg-[#3615CF]/8 text-[#3615CF]">TC</span>
                                <span className="text-[11px] font-medium text-[#1a1a2e]">{tc.id}</span>
                                <span className="text-[10px] truncate text-[#6b7280]">{tc.name}</span>
                                {frEntries.map(fr => (
                                  <div key={fr.frId} className="relative group/fr flex-shrink-0">
                                    <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded bg-[#EAE8F9] text-[#3615CF] border border-[#3615CF]/15 cursor-help">{fr.frId}</span>
                                    <div className="absolute bottom-full left-0 mb-1 w-52 bg-[#1a1a2e] text-white text-[10px] rounded-lg px-2.5 py-2 shadow-xl leading-relaxed z-50 hidden group-hover/fr:block pointer-events-none whitespace-normal">
                                      <div className="font-semibold mb-0.5 text-[9px] text-[#3615CF]">{fr.frId}</div>
                                      {fr.requirement}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <StatusIcon status={tc.status} size="w-3 h-3" />
                          </div>

                          {/* TV 행 */}
                          {isTCExpanded && tc.testVariables.map(tv => {
                            const tvKey = `${scenario.id}_${tc.id}_${tv.id}`;
                            const ep = mockTVEndpoints[tvKey];
                            const validations = mockValidationConditions[tvKey] || [];
                            const isOk = ep ? ep.statusCode < 400 : true;
                            return (
                              <div key={tv.id} className="border-b border-[#f0f0f0]/30" style={{ paddingLeft: '3.25rem' }}>
                                <div className="group flex items-center gap-1.5 pr-2 py-1.5 cursor-pointer transition-colors bg-white hover:bg-slate-50"
                                  onClick={() => scrollToLog(tv.status === 'failed' ? 4 : 0)}>
                                  <span className="px-1.5 py-0.5 text-[8px] rounded font-bold font-mono flex-shrink-0 bg-slate-100 text-slate-500">{tv.id}</span>
                                  {ep ? (
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${METHOD_STYLE[ep.method]}`}>{ep.method}</span>
                                      <span className="font-mono text-[9.5px] text-slate-500 truncate">{ep.path}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 truncate flex-1">{tv.name}</span>
                                  )}
                                  <StatusIcon status={tv.status} size="w-3 h-3" />
                                </div>
                                {ep && (
                                  <div className="mx-2 mb-1 mt-0.5 rounded border border-slate-100 bg-slate-50 overflow-hidden">
                                    <div className="px-2 py-1.5 overflow-x-auto">
                                      <LightJson obj={ep.requestBody ?? {}} />
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2 py-1 border-t border-slate-100 ${isOk ? 'bg-[#EAE8F9]' : 'bg-red-50'}`}>
                                      <span className={`font-mono text-[9px] font-bold ${isOk ? 'text-[#3615CF]/70' : 'text-red-500'}`}>
                                        ← {ep.statusCode}
                                      </span>
                                      <span className={`text-[9px] ${isOk ? 'text-[#3615CF]' : 'text-red-400'}`}>
                                        {HTTP_STATUS_TEXT[ep.statusCode] ?? ''}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {validations.length > 0 && (
                                  <div className="mx-2 mb-1.5 space-y-0.5">
                                    {validations.map((v, i) => (
                                      <div key={i} className="flex gap-1.5 px-2 py-1 bg-gray-50 rounded border border-[#e5e7eb] text-[10px]">
                                        <span className="text-[#3615CF] flex-shrink-0 font-bold">✓</span>
                                        <span className="text-[#6b7280] leading-relaxed">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Execution controls */}
          <div className="p-4 border-t border-[#f0f0f0] space-y-2 bg-white flex-shrink-0">
            <div className="flex gap-2 justify-center items-center">
              <button
                onClick={() => {
                  if (isTestRunning) { setShowCompletionModal(true); setIsTestRunning(false); }
                  else               { setIsTestRunning(true); }
                }}
                className="flex-1 min-w-0 px-3 py-2 bg-primary-blue text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                {isTestRunning ? <><Pause className="w-4 h-4" /> 정지</> : <><Play className="w-4 h-4" /> 실행</>}
              </button>
              <button
                onClick={() => { setCompletedAgentStages([]); setCurrentAgentStage(''); setIsTestRunning(false); }}
                className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center justify-center gap-1.5">
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
          onMouseDown={handleDragStart}
        />

        {/* Main panel */}
        <div className="flex-1 min-w-0 overflow-hidden bg-[#eef1f4] p-4">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <AgentProgressStrip getNodeStatus={getNodeStatus} />
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4">
              <TerminalFrame title="qapilot-preview - zsh" bodyClassName="aspect-video flex items-center justify-center p-4">
                <div className="text-center text-[#9aa0a6]">
                  {isTestRunning ? (
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                  ) : (
                    <Eye className="w-8 h-8 mx-auto mb-3 opacity-70" />
                  )}
                  <div className="font-mono text-xs">
                    {isTestRunning ? '실시간 브라우저 화면' : '테스트 실행 중 실시간 화면이 표시됩니다'}
                  </div>
                </div>
              </TerminalFrame>
              <RuntimeTerminal logs={mockTestLogs} highlightedLogIdx={highlightedLogIdx} idPrefix="ip-log" scrollContainerRef={runtimeLogRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <CheckCircle2 className="w-12 h-12 text-primary-blue mx-auto mb-4" />
            <div className="font-semibold text-lg mb-2">테스트 실행이 완료되었습니다.</div>
            <div className="text-sm text-[#6b7280] mb-6">결과 페이지로 이동하시겠습니까?</div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setRunningTests(prev => prev.map(t => t.id === selectedRunningTestId ? { ...t, status: 'completed' } : t));
                  setSelectedRunningTestId(null);
                  setSelectedRunningForDetail(null);
                  setSelectedExecutionId(useTestStore.getState().getExecutionHistory()[0]?.id ?? null);
                }}
                className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg font-medium">
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
};
