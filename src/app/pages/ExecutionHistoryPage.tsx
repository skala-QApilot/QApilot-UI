import React, { type Dispatch, type SetStateAction } from 'react';
import {
  AlertCircle, CheckCircle, CheckCircle2, ChevronDown, ChevronRight,
  Eye, Loader2, Pause, Play, RotateCcw, XCircle,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import RobotNarrator from '../components/RobotNarrator';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockExecutionHistory, mockScenarios, mockTestCases, mockTestLogs } from '../data/mockData';
import { ExecutionHistoryPageDetail } from './ExecutionHistoryPageDetail';

type HistoryDetailTab = 'FAIL' | 'PASS';
type RunningTest = { id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed' };
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

interface ExecutionHistoryPageProps {
  historyFilter: string;
  setHistoryFilter: Dispatch<SetStateAction<string>>;
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
  const [selectedRunningForDetail, setSelectedRunningForDetail] = React.useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = React.useState(288);
  const dragRef   = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWRef = React.useRef(0);

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent) => {
    dragRef.current   = true;
    startXRef.current = e.clientX;
    startWRef.current = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setSidebarWidth(Math.max(180, Math.min(500, startWRef.current + ev.clientX - startXRef.current)));
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
      document.getElementById(`hist-run-log-${logIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const allTCs     = mockScenarios.flatMap(s => (mockTestCases[s.id] || []).map(tc => ({ sId: s.id, tc })));
  const passedTCs  = allTCs.filter(({ tc }) => tc.status === 'passed');
  const failedTCs  = allTCs.filter(({ tc }) => tc.status === 'failed');

  const NARRATION: Record<string, { message: string; detail: string }> = {
    '':            { message: '테스트 시작을 기다리고 있어요',      detail: '실행 버튼을 누르면 에이전트가 깨어납니다' },
    'UI':          { message: 'UI 액션을 실행하는 중...',          detail: 'Playwright로 버튼 클릭 · 폼 입력 · 화면 검증' },
    'API':         { message: 'API 응답을 추적하는 중...',         detail: '요청/응답 페어를 검증하고 로그를 기록하고 있어요' },
    'DB':          { message: 'DB 상태를 검증하는 중...',          detail: '예상 레코드와 실제 DB 데이터를 비교해요' },
    'Cross-check': { message: 'UI · API · DB를 교차 검증하는 중...', detail: '세 레이어 간 일관성 이상이 없는지 확인해요' },
    '원인 분석':    { message: '실패 원인을 분석하는 중...',         detail: '스택 트레이스 · 로그 · 코드 diff를 종합해요' },
    'Report 생성': { message: '테스트 리포트를 작성하는 중...',     detail: 'PASS/FAIL 요약과 재현 단계를 정리하고 있어요' },
  };
  const narration = NARRATION[currentAgentStage] ?? NARRATION[''];

  // ── depth-0 data ──────────────────────────────────────────────────────────
  const activeRunningTests = runningTests.filter(t => t.status === 'running');

  const filtered = mockExecutionHistory.filter(exec => {
    if (historyFilter === 'ALL')   return true;
    if (historyFilter === 'FAIL')  return exec.fail > 0;
    if (historyFilter === 'HITL')  return exec.hitlPending > 0;
    if (historyFilter === 'PASS')  return exec.pass > 0;
    if (historyFilter === '미실행') return exec.notRun > 0;
    return true;
  });

  const overallStatus = (exec: typeof mockExecutionHistory[0]) => {
    if (exec.fail > 0)        return 'fail';
    if (exec.hitlPending > 0) return 'hitl';
    return 'pass';
  };

  const groupColors: Record<string, string> = {
    '시나리오 그룹 #1': '#f78ca0',
    '시나리오 그룹 #2': '#6b8cdb',
    '시나리오 그룹 #3': '#9AB17A',
  };

  const allGroups = [...new Set(mockExecutionHistory.map(e => e.groupId))];
  const allDates  = [...new Set(mockExecutionHistory.map(e => e.startDate.slice(5, 10)))].sort();
  const chartData = allDates.map(date => {
    const point: Record<string, number | string | null> = { date };
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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number | null; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#f0f0f0] rounded-lg shadow-lg px-3 py-2 text-xs">
        <div className="font-semibold text-[#1a1a2e] mb-1">{label}</div>
        {payload.filter(p => p.value != null).map(p => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-[#6b7280]">{p.dataKey.replace('시나리오 그룹 ', 'SG')}</span>
            <span className="font-semibold ml-auto pl-3 text-[#1a1a2e]">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  // ── depth 1: running test detail ─────────────────────────────────────────
  if (selectedRunningForDetail) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">

        {/* Scenario sidebar + main panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Scenario sidebar — resizable */}
          <div className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0" style={{ width: sidebarWidth }}>
            <div className="flex gap-1 px-3 pt-2.5 border-b border-[#f0f0f0] flex-shrink-0">
              {[
                { key: 'TOTAL',    label: 'TOTAL' },
                { key: 'PASS',     label: `✓ PASS${passedTCs.length ? ` (${passedTCs.length})` : ''}` },
                { key: 'FILTERED', label: `⊗ FAIL${failedTCs.length ? ` (${failedTCs.length})` : ''}` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setScenarioSidebarTab(tab.key as ScenarioSidebarTab)}
                  className={`px-2.5 py-2 text-xs relative whitespace-nowrap ${scenarioSidebarTab === tab.key ? 'text-[#1a1a2e] font-semibold' : 'text-[#6b7280]'}`}>
                  {tab.label}
                  {scenarioSidebarTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {scenarioSidebarTab === 'TOTAL' && (
                <div className="space-y-1">
                  {mockScenarios.map(scenario => {
                    const isExpanded = expandedScenarios.includes(scenario.id);
                    const tcs = mockTestCases[scenario.id] || [];
                    return (
                      <div key={scenario.id} className="border border-[#f0f0f0] rounded">
                        <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setExpandedScenarios(prev =>
                              prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                            );
                            scrollToLog(0);
                          }}>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{scenario.id} {scenario.name}</div>
                          </div>
                          <StatusIcon status={scenario.status} />
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
                                  const logIdx = tc.status === 'failed' ? mockTestLogs.findIndex(l => l.isError) : 0;
                                  scrollToLog(Math.max(0, logIdx));
                                }}>
                                {isTCExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                                </div>
                                <StatusIcon status={tc.status} size="w-3 h-3" />
                              </div>
                              {isTCExpanded && tc.testVariables.map(tv => (
                                <div key={tv.id} className="ml-5 flex items-center gap-2 p-1.5 text-xs text-[#6b7280] cursor-pointer hover:bg-gray-50"
                                  onClick={() => scrollToLog(tv.status === 'failed' ? 4 : 0)}>
                                  <div className="flex-1 truncate">{tv.id}: {tv.name}</div>
                                  <StatusIcon status={tv.status} size="w-3 h-3" />
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {scenarioSidebarTab === 'PASS' && (
                <div className="space-y-1 pt-1">
                  {passedTCs.length === 0 && (
                    <div className="text-center py-10 text-xs text-[#9ca3af]">완료된 테스트케이스 없음</div>
                  )}
                  {passedTCs.map(({ sId, tc }, idx) => (
                    <div key={`${sId}_${tc.id}_${idx}`}
                      className="flex items-center gap-2 p-2 bg-[#9AB17A]/5 rounded-lg border border-[#9AB17A]/20 cursor-pointer hover:bg-[#9AB17A]/10 transition-colors"
                      onClick={() => scrollToLog(0)}>
                      <CheckCircle className="w-3.5 h-3.5 text-[#9AB17A] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-[#9ca3af]">{sId}</div>
                        <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                      </div>
                      <span className="text-[9px] font-bold bg-[#9AB17A]/10 text-[#9AB17A] px-1.5 py-0.5 rounded">PASS</span>
                    </div>
                  ))}
                </div>
              )}

              {scenarioSidebarTab === 'FILTERED' && (
                <div className="space-y-1 pt-1">
                  {failedTCs.length === 0 && (
                    <div className="text-center py-10 text-xs text-[#9ca3af]">실패한 테스트케이스 없음</div>
                  )}
                  {failedTCs.map(({ sId, tc }, idx) => (
                    <div key={`${sId}_${tc.id}_${idx}`}
                      className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-50/70 transition-colors"
                      onClick={() => {
                        const logIdx = mockTestLogs.findIndex(l => l.isError);
                        scrollToLog(Math.max(0, logIdx));
                      }}>
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-[#9ca3af]">{sId}</div>
                        <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                      </div>
                      <span className="text-[9px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-100">FAIL</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Execution controls */}
            <div className="p-4 border-t border-[#f0f0f0] space-y-2">
              <div className="flex gap-2 justify-center items-center">
                <button
                  onClick={() => {
                    if (isTestRunning) { setShowCompletionModal(true); setIsTestRunning(false); }
                    else               { setIsTestRunning(true); }
                  }}
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
            onMouseDown={handleDragStart}
          />

          {/* Main panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Test UI Preview (62%) */}
            <div className="w-[62%] p-4 bg-white border-r border-[#f0f0f0]">
              <div className="font-semibold mb-3 text-sm">TEST UI Preview</div>
              <div className="w-full h-[calc(100vh-16rem)] bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center">
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
              <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4 mb-4">
                <div className="text-[11px] font-semibold text-[#6b7280] mb-3 uppercase tracking-wide">에이전트 실행 흐름</div>
                <div className="flex items-center w-full gap-2 mb-4">
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
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="h-2.5" />
                    <div className="flex items-center w-full">
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
                              <div className="flex-1 mx-2" style={{
                                height: '2px',
                                background: prevDone
                                  ? '#f78ca0'
                                  : 'repeating-linear-gradient(to right,#9ca3af 0,#9ca3af 4px,transparent 4px,transparent 10px)',
                              }} />
                            )}
                            <div className="w-16 flex justify-center flex-shrink-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                st === 'complete' ? 'bg-[#9AB17A] text-white' :
                                st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                                'bg-gray-200 text-gray-400'
                              }`}>
                                {st === 'complete' ? <CheckCircle className="w-3.5 h-3.5" /> : node.short}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className="flex items-start mt-0.5 w-full">
                      {[
                        { stage: 'Cross-check', label: 'Cross-check' },
                        { stage: '원인 분석',    label: '원인 분석'    },
                        { stage: 'Report 생성', label: 'Report 생성'  },
                      ].map((node, i) => (
                        <React.Fragment key={node.stage}>
                          {i > 0 && <div className="flex-1 mx-2" />}
                          <div className="w-16 flex justify-center flex-shrink-0">
                            <span className="text-[8px] text-[#9ca3af] text-center leading-tight">{node.label}</span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-t border-[#f0f0f0] -mx-4 mb-3" />
                <RobotNarrator
                  message={narration.message}
                  detail={narration.detail}
                  talking={!!currentAgentStage && isTestRunning}
                  size="sm"
                />
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4">
                <div className="font-semibold mb-3 text-sm">Test Runtime Log</div>
                <div className="space-y-2">
                  {mockTestLogs.map((log, idx) => (
                    <div key={idx} id={`hist-run-log-${idx}`} className={`p-2.5 rounded text-xs ${
                      idx === highlightedLogIdx ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                      log.isError               ? 'bg-red-50 border-l-4 border-red-400' :
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
                  setRunningTests(prev => prev.map(t => t.id === selectedRunningForDetail ? { ...t, status: 'completed' } : t));
                  setSelectedRunningForDetail(null);
                  const latestExecution = mockExecutionHistory[0];
                  if (latestExecution) {
                    setSelectedExecutionId(latestExecution.id);
                    setHistoryDetailTab('FAIL');
                    setSelectedFailTC(null);
                  }
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">

      {/* Graph */}
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
        <ResponsiveContainer width="100%" height={120}>
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
                  <Loader2 className="w-3 h-3 text-[#f78ca0] animate-spin flex-shrink-0" />
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
          <div className="grid items-center px-6 py-2 border-b border-[#f0f0f0] bg-gray-50 flex-shrink-0"
            style={{ gridTemplateColumns: '24px 1fr 130px 90px 120px 80px' }}>
            <div />
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
              실행 정보 <span className="text-[#c4c9d4]">⇅</span>
            </div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
              실행 일시 <span className="text-[#c4c9d4]">⇅</span>
            </div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">상태</div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
              count <span className="text-[#c4c9d4]">⇅</span>
            </div>
            <div />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-[#9ca3af]">조건에 맞는 실행 이력이 없습니다.</div>
            )}
            {filtered.map(exec => {
              const st    = overallStatus(exec);
              const total = exec.pass + exec.fail + exec.hitlPending + exec.notRun;
              return (
                <div key={exec.id}
                  className="grid items-center px-6 py-3.5 border-b border-[#f5f5f5] hover:bg-gray-50/60 transition-colors cursor-pointer group"
                  style={{ gridTemplateColumns: '24px 1fr 130px 90px 120px 80px' }}
                  onClick={() => { setSelectedExecutionId(exec.id); setSelectedFailTC(null); }}>
                  <div className="flex items-center">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      st === 'fail' ? 'bg-[#FF9A86]' :
                      st === 'hitl' ? 'bg-[#B8860B]' :
                      'bg-[#9AB17A]'
                    }`} />
                  </div>
                  <div>
                    <div className="font-mono text-sm text-[#1a1a2e]">
                      {exec.groupId.replace('시나리오 그룹', 'SG')}
                      <span className="text-[#9ca3af] font-sans"> · </span>
                      <span className="text-[#6b7280] text-xs font-sans">{exec.executionNumber}번째 실행</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#6b7280] font-mono">{exec.startDate}</div>
                  <div>
                    {st === 'fail' && <span className="text-xs font-medium text-[#FF9A86]">FAIL {Math.round((exec.fail / total) * 100)}%</span>}
                    {st === 'hitl' && <span className="text-xs font-medium text-[#B8860B]">HITL 대기</span>}
                    {st === 'pass' && <span className="text-xs font-medium text-[#9AB17A]">PASS</span>}
                  </div>
                  <div className="text-xs text-[#9ca3af] font-mono space-x-2">
                    <span className="text-[#9AB17A]">P{exec.pass}</span>
                    <span className="text-[#FF9A86]">F{exec.fail}</span>
                    <span className="text-[#B8860B]">H{exec.hitlPending}</span>
                    <span>N{exec.notRun}</span>
                  </div>
                  <div className="flex justify-end">
                    <ChevronRight className="w-4 h-4 text-[#c4c9d4] group-hover:text-[#9ca3af] transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
