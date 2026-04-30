import React, { type Dispatch, type SetStateAction } from 'react';
import { AlertCircle, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Eye, Loader2, Pause, Play, RotateCcw, XCircle } from 'lucide-react';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockScenarios, mockTestCases, mockTestLogs, mockExecutionHistory } from '../data/mockData';
import { ExecutionHistoryPage as ExecutionHistoryPageView } from './ExecutionHistoryPage';

type RunningTest = { id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed' };
type TestSubTab = 'INPROGRESS' | 'HISTORY';
type HistoryDetailTab = 'FAIL' | 'PASS';
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

interface TestPageProps {
  runningTests: RunningTest[];
  setRunningTests: Dispatch<SetStateAction<RunningTest[]>>;
  selectedRunningTestId: string | null;
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
  testSubTab: TestSubTab;
  setTestSubTab: Dispatch<SetStateAction<TestSubTab>>;
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
  advanceAgentStage: () => void;
  getNodeStatus: (stage: string) => 'inactive' | 'running' | 'complete';
  showCompletionModal: boolean;
  setShowCompletionModal: Dispatch<SetStateAction<boolean>>;
}

export const TestPage = ({
runningTests,
setRunningTests,
selectedRunningTestId,
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
testSubTab,
setTestSubTab,
historyFilter,
setHistoryFilter,
selectedExecutionId,
setSelectedExecutionId,
selectedFailTC,
setSelectedFailTC,
historyDetailTab,
setHistoryDetailTab,
retestCheckedIds,
setRetestCheckedIds,
setShowRetestNavModal,
advanceAgentStage,
getNodeStatus,
showCompletionModal,
setShowCompletionModal,
}: TestPageProps) => {
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
              {/* Tabs: TOTAL / PASS / ⊗ */}
              {(() => {
                const allTCs = mockScenarios.flatMap(s =>
                  (mockTestCases[s.id] || []).map(tc => ({ sId: s.id, tc }))
                );
                const passedTCs = allTCs.filter(({ tc }) => tc.status === 'passed');
                const failedTCs = allTCs.filter(({ tc }) => tc.status === 'failed');

                const scrollToLog = (logIdx: number) => {
                  setHighlightedLogIdx(logIdx);
                  setTimeout(() => {
                    document.getElementById(`ip-log-${logIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                };

                return (
                  <>
                    <div className="flex gap-1 px-3 pt-2.5 border-b border-[#f0f0f0] flex-shrink-0">
                      {[
                        { key: 'TOTAL',    label: 'TOTAL' },
                        { key: 'PASS',     label: `✓ PASS${passedTCs.length ? ` (${passedTCs.length})` : ''}` },
                        { key: 'FILTERED', label: `⊗ FAIL${failedTCs.length ? ` (${failedTCs.length})` : ''}` },
                      ].map(tab => (
                        <button key={tab.key} onClick={() => setScenarioSidebarTab(tab.key as 'TOTAL' | 'PASS' | 'FILTERED')}
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
                                          const logIdx = tc.status === 'failed'
                                            ? mockTestLogs.findIndex(l => l.isError)
                                            : 0;
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
                  </>
                );
              })()}
              <div className="p-4 border-t border-[#f0f0f0] space-y-2">
                <div className="flex gap-2 justify-center items-center">
                  <button onClick={() => {
                    if (isTestRunning) {
                      setShowCompletionModal(true);
                      setIsTestRunning(false);
                    } else {
                      setIsTestRunning(true);
                    }
                  }}
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
                                <div
                                  className="flex-1 mx-2"
                                  style={{
                                    height: '2px',
                                    background: prevDone
                                      ? '#f78ca0'
                                      : 'repeating-linear-gradient(to right, #9ca3af 0, #9ca3af 4px, transparent 4px, transparent 10px)',
                                  }}
                                />
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
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4">
                  <div className="font-semibold mb-3 text-sm">Test Runtime Log</div>
                  <div className="space-y-2">
                    {mockTestLogs.map((log, idx) => (
                      <div key={idx} id={`ip-log-${idx}`} className={`p-2.5 rounded text-xs ${
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
      {testSubTab === 'HISTORY' && (
        <ExecutionHistoryPageView
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
        />
      )}
      
      {/* 완료 팝업 */}
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
                // 실행이력 탭으로 이동 + 새로운 execution 항목으로 이동
                setTestSubTab('HISTORY');
                // 새로운 execution을 생성 (mock data에서 가장 최신 항목 사용)
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
};

