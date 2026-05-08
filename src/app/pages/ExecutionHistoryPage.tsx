import React, { type Dispatch, type SetStateAction } from 'react';
import {
  CheckCircle, CheckCircle2, ChevronDown, ChevronRight,
  Eye, GitBranch, List, Loader2, Pause, Play, RotateCcw, XCircle,
} from 'lucide-react';
import { PassRateChart } from '../components/common/PassRateChart';
import { RuntimeTerminal, TerminalFrame } from '../components/common/RuntimeTerminal';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockExecutionHistory, mockPassHistory, mockRTMData, mockScenarios, mockTestCases, mockTestLogs, mockTVEndpoints, type HttpMethod } from '../data/mockData';

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
import { ExecutionHistoryPageDetail } from './ExecutionHistoryPageDetail';

type HistoryDetailTab = 'FAIL' | 'PASS';
type RunningTest = { id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed' };
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

interface ExecutionHistoryPageProps {
  historyFilter: string;
  setHistoryFilter: Dispatch<SetStateAction<string>>;
  historySearchQuery?: string;
  selectedExecutionId: string | null;
  setSelectedExecutionId: Dispatch<SetStateAction<string | null>>;
  selectedFailTC: string | null;
  setSelectedFailTC: Dispatch<SetStateAction<string | null>>;
  historyDetailTab: HistoryDetailTab;
  setHistoryDetailTab: Dispatch<SetStateAction<HistoryDetailTab>>;
  retestCheckedIds: Set<string>;
  setRetestCheckedIds: Dispatch<SetStateAction<Set<string>>>;
  setShowRetestNavModal: Dispatch<SetStateAction<boolean>>;
  runningTests: RunningTest[];
  setRunningTests: Dispatch<SetStateAction<RunningTest[]>>;
  setSelectedRunningTestId: Dispatch<SetStateAction<string | null>>;
  setSelectedTestGroup: Dispatch<SetStateAction<string | null>>;
  selectedRunningForDetail: string | null;
  setSelectedRunningForDetail: Dispatch<SetStateAction<string | null>>;
  isTestRunning: boolean;
  setIsTestRunning: Dispatch<SetStateAction<boolean>>;
  completedAgentStages: string[];
  setCompletedAgentStages: Dispatch<SetStateAction<string[]>>;
  currentAgentStage: string;
  setCurrentAgentStage: Dispatch<SetStateAction<string>>;
  scenarioSidebarTab: ScenarioSidebarTab;
  setScenarioSidebarTab: Dispatch<SetStateAction<ScenarioSidebarTab>>;
  expandedScenarios: string[];
  setExpandedScenarios: Dispatch<SetStateAction<string[]>>;
  expandedTestCases: string[];
  setExpandedTestCases: Dispatch<SetStateAction<string[]>>;
  highlightedLogIdx: number | null;
  setHighlightedLogIdx: Dispatch<SetStateAction<number | null>>;
  advanceAgentStage: () => void;
  getNodeStatus: (stage: string) => 'inactive' | 'running' | 'complete';
  showCompletionModal: boolean;
  setShowCompletionModal: Dispatch<SetStateAction<boolean>>;
}

export const ExecutionHistoryPage = ({
  historyFilter,
  setHistoryFilter: _setHistoryFilter,
  historySearchQuery = '',
  selectedExecutionId,
  setSelectedExecutionId,
  selectedFailTC,
  setSelectedFailTC,
  historyDetailTab,
  setHistoryDetailTab,
  retestCheckedIds,
  setRetestCheckedIds,
  setShowRetestNavModal,
  runningTests,
  setRunningTests,
  setSelectedRunningTestId,
  setSelectedTestGroup,
  selectedRunningForDetail,
  setSelectedRunningForDetail,
  isTestRunning,
  setIsTestRunning,
  completedAgentStages,
  setCompletedAgentStages,
  currentAgentStage,
  setCurrentAgentStage,
  scenarioSidebarTab,
  setScenarioSidebarTab,
  expandedScenarios,
  setExpandedScenarios,
  expandedTestCases,
  setExpandedTestCases,
  highlightedLogIdx,
  setHighlightedLogIdx,
  advanceAgentStage,
  getNodeStatus,
  showCompletionModal,
  setShowCompletionModal,
}: ExecutionHistoryPageProps) => {
  // ── state ─────────────────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = React.useState<number | null>(null);
  const dragRef   = React.useRef(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef(0);
  const startWRef = React.useRef(0);
  const runtimeLogRef = React.useRef<HTMLDivElement>(null);

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent) => {
    dragRef.current   = true;
    startXRef.current = e.clientX;
    startWRef.current = sidebarRef.current?.getBoundingClientRect().width ?? 0;
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const parentWidth = sidebarRef.current?.parentElement?.clientWidth ?? window.innerWidth;
      setSidebarWidth(Math.max(240, Math.min(parentWidth - 420, startWRef.current + ev.clientX - startXRef.current)));
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
      const target = container?.querySelector<HTMLElement>(`#hist-run-log-${logIdx}`);
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      container.scrollTo({
        top: container.scrollTop + targetRect.top - containerRect.top - (container.clientHeight / 2) + (target.clientHeight / 2),
        behavior: 'smooth',
      });
    }, 50);
  };

  const allTCs     = mockScenarios.flatMap(s => (mockTestCases[s.id] || []).map(tc => ({ sId: s.id, tc })));
  const passedTCs  = allTCs.filter(({ tc }) => tc.status === 'passed' || tc.status === 'completed');
  const failedTCs  = allTCs.filter(({ tc }) => tc.status === 'failed');
  const passedByTS = passedTCs.reduce((acc, item) => {
    if (!acc[item.sId]) acc[item.sId] = [];
    acc[item.sId].push(item);
    return acc;
  }, {} as Record<string, typeof passedTCs>);
  const failedByTS = failedTCs.reduce((acc, item) => {
    if (!acc[item.sId]) acc[item.sId] = [];
    acc[item.sId].push(item);
    return acc;
  }, {} as Record<string, typeof failedTCs>);

  // ── depth-0 data ──────────────────────────────────────────────────────────
  const activeRunningTests = runningTests.filter(t => t.status === 'running');

  const filtered = mockExecutionHistory.filter(exec => {
    if (historyFilter === 'FAIL'  && exec.fail === 0)        return false;
    if (historyFilter === 'HITL'  && exec.hitlPending === 0) return false;
    if (historyFilter === 'PASS'  && exec.pass === 0)        return false;
    if (historyFilter === '미실행' && exec.notRun === 0)      return false;
    if (historySearchQuery) {
      const q = historySearchQuery.toLowerCase();
      return exec.groupId.toLowerCase().includes(q) || String(exec.executionNumber).includes(q);
    }
    return true;
  });

  const overallStatus = (exec: typeof mockExecutionHistory[0]) => {
    if (exec.fail > 0)        return 'fail';
    if (exec.hitlPending > 0) return 'hitl';
    return 'pass';
  };

  // ── depth 1: running test detail ─────────────────────────────────────────
  if (selectedRunningForDetail) {
    return (
      <div className="flex h-full min-h-0 flex-col">

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
                {mockScenarios.map(scenario => {
                  const isExpanded = expandedScenarios.includes(scenario.id);
                  const allTcs = mockTestCases[scenario.id] || [];
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
                          const frEntries = mockRTMData.filter(r => r.ts === scenario.id && r.tc === tc.id);
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
          <div className="flex-1 min-w-0 overflow-hidden bg-gray-50 p-4">
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
              <RuntimeTerminal logs={mockTestLogs} highlightedLogIdx={highlightedLogIdx} idPrefix="hist-run-log" scrollContainerRef={runtimeLogRef} />
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
                <button onClick={() => {
                  setShowCompletionModal(false);
                  setRunningTests(prev => prev.map(t => t.id === selectedRunningForDetail ? { ...t, status: 'completed' } : t));
                  setSelectedRunningForDetail(null);
                  setSelectedRunningTestId(null);
                  const latestExecution = mockExecutionHistory[0];
                  if (latestExecution) {
                    setSelectedExecutionId(latestExecution.id);
                    setHistoryDetailTab('FAIL');
                    setSelectedFailTC(null);
                  }
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
  }

  // ── depth 1: completed test detail ────────────────────────────────────────
  if (selectedExecutionId) {
    return (
      <ExecutionHistoryPageDetail
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
    );
  }

  // ── depth 0: graph + 2-col split ─────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">

      {/* Graph */}
      <div className="border-b border-[#f0f0f0] px-8 pt-3 pb-2 flex-shrink-0 bg-white">
        <PassRateChart data={mockPassHistory} />
      </div>

      {/* 2-col body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Running tests */}
        <div className="w-60 border-r border-[#f0f0f0] flex flex-col flex-shrink-0 bg-[#F9F9FB]">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeRunningTests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <div className="text-sm text-[#9ca3af]">진행 중인 테스트 없음</div>
              </div>
            )}
            {activeRunningTests.map(run => (
              <button key={run.id}
                onClick={() => {
                  setSelectedRunningTestId(run.id);
                  setSelectedTestGroup(run.name);
                  setSelectedRunningForDetail(run.id);
                }}
                className="w-full text-left p-3 rounded-lg border border-[#e5e7eb] hover:border-[#f78ca0]/50 hover:bg-[#f78ca0]/5 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="w-3 h-3 text-primary-blue animate-spin flex-shrink-0" />
                  <span className="text-xs font-semibold truncate flex-1 text-[#1a1a2e]">{run.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#6b7280]">시작 {run.startTime}</span>
                  <ChevronRight className="w-3 h-3 text-[#c4c9d4]" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Completed tests */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-2 border-b border-[#f0f0f0] bg-white flex-shrink-0">
            <div className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">이력</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-[#9ca3af]">조건에 맞는 실행 이력이 없습니다.</div>
            )}
            {filtered.map(exec => {
              const total = exec.pass + exec.fail + exec.hitlPending + exec.notRun;
              const passPct  = total > 0 ? (exec.pass   / total) * 100 : 0;
              const failPct  = total > 0 ? (exec.fail   / total) * 100 : 0;
              return (
                <button key={exec.id}
                  onClick={() => { setSelectedExecutionId(exec.id); setSelectedFailTC(null); }}
                  className="w-full flex items-center gap-5 py-3 px-8 hover:bg-gray-50 transition-colors text-left border-b border-[#f5f5f5]">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#374151]">{exec.groupId}</span>
                    <span className="text-xs text-[#c4c9d4] ml-2">#{exec.executionNumber}</span>
                  </div>
                  <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.startDate}</span>
                  {exec.duration && (
                    <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.duration}</span>
                  )}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-xs font-medium text-status-pass">{exec.pass}P</span>
                    <span className="text-xs font-medium text-status-fail">{exec.fail}F</span>
                    <span className="text-xs font-medium text-[#9ca3af]">{exec.notRun}N</span>
                    <div className="w-[70px] h-1.5 rounded-full overflow-hidden flex bg-[#f0f0f0]">
                      <div style={{ width: `${passPct}%`, background: 'var(--status-pass)' }} />
                      <div style={{ width: `${failPct}%`, background: 'var(--status-fail)' }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
