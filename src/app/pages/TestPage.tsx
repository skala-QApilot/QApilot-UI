import React, { type Dispatch, type SetStateAction } from 'react';
import { CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Eye, GitBranch, List, Loader2, Pause, Play, RotateCcw, XCircle } from 'lucide-react';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { RuntimeTerminal, TerminalFrame } from '../components/common/RuntimeTerminal';
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
  historySearchQuery: string;
  setHistorySearchQuery: Dispatch<SetStateAction<string>>;
  selectedExecutionId: string | null;
  setSelectedExecutionId: Dispatch<SetStateAction<string | null>>;
  selectedFailTC: string | null;
  setSelectedFailTC: Dispatch<SetStateAction<string | null>>;
  historyDetailTab: HistoryDetailTab;
  setHistoryDetailTab: Dispatch<SetStateAction<HistoryDetailTab>>;
  retestCheckedIds: Set<string>;
  setRetestCheckedIds: Dispatch<SetStateAction<Set<string>>>;
  setShowRetestNavModal: Dispatch<SetStateAction<boolean>>;
  selectedRunningForDetail: string | null;
  setSelectedRunningForDetail: Dispatch<SetStateAction<string | null>>;
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
historySearchQuery,
setHistorySearchQuery: _setHistorySearchQuery,
selectedExecutionId,
setSelectedExecutionId,
selectedFailTC,
setSelectedFailTC,
historyDetailTab,
setHistoryDetailTab,
retestCheckedIds,
setRetestCheckedIds,
setShowRetestNavModal,
selectedRunningForDetail,
setSelectedRunningForDetail,
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
    const [innerSidebarWidth, setInnerSidebarWidth] = React.useState<number | null>(null);
    const innerDragRef = React.useRef(false);
    const innerSidebarRef = React.useRef<HTMLDivElement>(null);
    const innerStartX = React.useRef(0);
    const innerStartW = React.useRef(0);
    const runtimeLogRef = React.useRef<HTMLDivElement>(null);
    const handleInnerDragStart = (e: React.MouseEvent) => {
      innerDragRef.current = true;
      innerStartX.current = e.clientX;
      innerStartW.current = innerSidebarRef.current?.getBoundingClientRect().width ?? 0;
      const onMove = (ev: MouseEvent) => {
        if (!innerDragRef.current) return;
        const parentWidth = innerSidebarRef.current?.parentElement?.clientWidth ?? window.innerWidth;
        setInnerSidebarWidth(Math.max(240, Math.min(parentWidth - 420, innerStartW.current + ev.clientX - innerStartX.current)));
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
            <div className="px-3 py-2 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
              <span className="px-2 py-0.5 bg-[#3d35d0]/10 text-[#3d35d0] text-xs rounded-full font-medium">{activeRuns.length}건</span>
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
                      <Loader2 className="w-3 h-3 text-primary-blue animate-spin flex-shrink-0" />
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
            <div ref={innerSidebarRef} className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0 min-h-0" style={{ width: innerSidebarWidth ?? '50%' }}>
              {/* Tabs: TOTAL / PASS / ⊗ */}
              {(() => {
                const allTCs = mockScenarios.flatMap(s =>
                  (mockTestCases[s.id] || []).map(tc => ({ sId: s.id, tc }))
                );
                const passedTCs = allTCs.filter(({ tc }) => tc.status === 'passed' || tc.status === 'completed');
                const failedTCs = allTCs.filter(({ tc }) => tc.status === 'failed');
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

                const scrollToLog = (logIdx: number) => {
                  setHighlightedLogIdx(logIdx);
                  setTimeout(() => {
                    const container = runtimeLogRef.current;
                    const target = container?.querySelector<HTMLElement>(`#ip-log-${logIdx}`);
                    if (!container || !target) return;

                    const containerRect = container.getBoundingClientRect();
                    const targetRect = target.getBoundingClientRect();
                    container.scrollTo({
                      top: container.scrollTop + targetRect.top - containerRect.top - (container.clientHeight / 2) + (target.clientHeight / 2),
                      behavior: 'smooth',
                    });
                  }, 50);
                };

                return (
                  <>
                    <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-[#f0f0f0] flex-shrink-0">
                      <div className="flex min-w-0 flex-1 gap-1">
                        {[
                          { key: 'TOTAL',    label: 'TOTAL' },
                          { key: 'PASS',     label: 'PASS', count: passedTCs.length, color: 'text-status-pass', badge: 'bg-status-pass/15 text-status-pass', underline: 'bg-status-pass' },
                          { key: 'FILTERED', label: 'FAIL', count: failedTCs.length, color: 'text-status-fail', badge: 'bg-status-fail/15 text-status-fail', underline: 'bg-status-fail' },
                        ].map(tab => {
                          const active = scenarioSidebarTab === tab.key;
                          return (
                          <button key={tab.key} onClick={() => setScenarioSidebarTab(tab.key as 'TOTAL' | 'PASS' | 'FILTERED')}
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

                    <div className={`flex-1 min-h-0 overflow-y-auto ${scenarioSidebarTab === 'TOTAL' ? 'p-2' : ''}`}>
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
                        <div>
                          {passedTCs.length === 0 && (
                            <div className="text-center py-10 text-xs text-[#9ca3af]">완료된 테스트케이스 없음</div>
                          )}
                          {Object.entries(passedByTS).map(([sId, items]) => (
                            <div key={sId}>
                              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                                <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                                <span className="text-xs font-semibold text-[#1a1a2e]">{sId}</span>
                                <span className="ml-auto text-xs text-status-pass">PASS {items.length}</span>
                              </div>
                              {items.map(({ tc }, idx) => (
                                <div key={`${sId}_${tc.id}_${idx}`}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer hover:bg-gray-50"
                                  onClick={() => scrollToLog(0)}>
                                  <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-[#1a1a2e] truncate">{tc.id}</div>
                                    <div className="text-[10px] text-[#9ca3af] truncate">{tc.name}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {scenarioSidebarTab === 'FILTERED' && (
                        <div>
                          {failedTCs.length === 0 && (
                            <div className="text-center py-10 text-xs text-[#9ca3af]">실패한 테스트케이스 없음</div>
                          )}
                          {Object.entries(failedByTS).map(([sId, items]) => (
                            <div key={sId}>
                              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                                <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                                <span className="text-xs font-semibold text-[#1a1a2e]">{sId}</span>
                                <span className="ml-auto text-xs text-status-fail">FAIL {items.length}</span>
                              </div>
                              {items.map(({ tc }, idx) => (
                                <div key={`${sId}_${tc.id}_${idx}`}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer hover:bg-gray-50"
                                  onClick={() => {
                                    const logIdx = mockTestLogs.findIndex(l => l.isError);
                                    scrollToLog(Math.max(0, logIdx));
                                  }}>
                                  <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-[#1a1a2e] truncate">{tc.id}</div>
                                    <div className="text-[10px] text-[#9ca3af] truncate">{tc.name}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              <div className="p-4 border-t border-[#f0f0f0] space-y-2 bg-white flex-shrink-0">
                <div className="flex gap-2 justify-center items-center">
                  <button onClick={() => {
                    if (isTestRunning) {
                      setShowCompletionModal(true);
                      setIsTestRunning(false);
                    } else {
                      setIsTestRunning(true);
                    }
                  }}
                    className="flex-1 min-w-0 px-3 py-2 bg-primary-blue text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                    {isTestRunning ? <><Pause className="w-4 h-4" /> 정지</> : <><Play className="w-4 h-4" /> 실행</>}
                  </button>
                  <button onClick={() => { setCompletedAgentStages([]); setCurrentAgentStage(''); setIsTestRunning(false); }}
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
              onMouseDown={handleInnerDragStart}
            />

            {/* 메인 패널 (원본과 동일) */}
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
                <RuntimeTerminal logs={mockTestLogs} highlightedLogIdx={highlightedLogIdx} idPrefix="ip-log" scrollContainerRef={runtimeLogRef} />
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
    <div className="h-full min-h-0 overflow-hidden">
      {testSubTab === 'INPROGRESS' && <InProgressView />}
      {testSubTab === 'HISTORY' && (
        <ExecutionHistoryPageView
          historyFilter={historyFilter}
          setHistoryFilter={setHistoryFilter}
          historySearchQuery={historySearchQuery}
          selectedExecutionId={selectedExecutionId}
          setSelectedExecutionId={setSelectedExecutionId}
          selectedFailTC={selectedFailTC}
          setSelectedFailTC={setSelectedFailTC}
          historyDetailTab={historyDetailTab}
          setHistoryDetailTab={setHistoryDetailTab}
          retestCheckedIds={retestCheckedIds}
          setRetestCheckedIds={setRetestCheckedIds}
          setShowRetestNavModal={setShowRetestNavModal}
          runningTests={runningTests}
          setRunningTests={setRunningTests}
          setSelectedRunningTestId={setSelectedRunningTestId}
          setSelectedTestGroup={setSelectedTestGroup}
          selectedRunningForDetail={selectedRunningForDetail}
          setSelectedRunningForDetail={setSelectedRunningForDetail}
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
          advanceAgentStage={advanceAgentStage}
          getNodeStatus={getNodeStatus}
          showCompletionModal={showCompletionModal}
          setShowCompletionModal={setShowCompletionModal}
        />
      )}
      
      {/* 완료 팝업 */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <CheckCircle2 className="w-12 h-12 text-primary-blue mx-auto mb-4" />
            <div className="font-semibold text-lg mb-2">테스트 실행이 완료되었습니다.</div>
            <div className="text-sm text-[#6b7280] mb-6">결과 페이지로 이동하시겠습니까?</div>
            <div className="flex gap-3">
              <button onClick={() => {
                setShowCompletionModal(false);
                setRunningTests(prev => prev.map(t => t.id === selectedRunningTestId ? { ...t, status: 'completed' } : t));
                setSelectedRunningForDetail(null);
                setSelectedRunningTestId(null);
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
