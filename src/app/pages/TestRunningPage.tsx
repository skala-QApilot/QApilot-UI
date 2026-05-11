import React from 'react';
import { CheckCircle, CheckCircle2, ChevronDown, ChevronRight, Eye, GitBranch, List, Loader2, Pause, Play, RotateCcw, ChevronLeft } from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { mockExecutionHistory } from '../data/mockData';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { TerminalFrame } from '../components/common/RuntimeTerminal';
import { RuntimeTerminal } from '../components/common/RuntimeTerminal';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockScenarios, mockTestCases, mockRTMData, mockTVEndpoints, mockTestLogs } from '../data/mockData';

type RunningTest = { id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed' };
type TestSubTab = 'INPROGRESS' | 'HISTORY';
type HistoryDetailTab = 'FAIL' | 'PASS';
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

interface TestRunningPageProps {
  runningTests: RunningTest[];
  setRunningTests: React.Dispatch<React.SetStateAction<RunningTest[]>>;
  selectedRunningTestId: string | null;
  setSelectedRunningTestId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTestGroup: React.Dispatch<React.SetStateAction<string | null>>;
  isTestRunning: boolean;
  setIsTestRunning: React.Dispatch<React.SetStateAction<boolean>>;
  completedAgentStages: string[];
  setCompletedAgentStages: React.Dispatch<React.SetStateAction<string[]>>;
  currentAgentStage: string;
  setCurrentAgentStage: React.Dispatch<React.SetStateAction<string>>;
  scenarioSidebarTab: ScenarioSidebarTab;
  setScenarioSidebarTab: React.Dispatch<React.SetStateAction<ScenarioSidebarTab>>;
  expandedScenarios: string[];
  setExpandedScenarios: React.Dispatch<React.SetStateAction<string[]>>;
  expandedTestCases: string[];
  setExpandedTestCases: React.Dispatch<React.SetStateAction<string[]>>;
  highlightedLogIdx: number | null;
  setHighlightedLogIdx: React.Dispatch<React.SetStateAction<number | null>>;
  testSubTab: TestSubTab;
  setTestSubTab: React.Dispatch<React.SetStateAction<TestSubTab>>;
  historyFilter: string;
  setHistoryFilter: React.Dispatch<React.SetStateAction<string>>;
  historySearchQuery: string;
  setHistorySearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedExecutionId: string | null;
  setSelectedExecutionId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFailTC: string | null;
  setSelectedFailTC: React.Dispatch<React.SetStateAction<string | null>>;
  historyDetailTab: HistoryDetailTab;
  setHistoryDetailTab: React.Dispatch<React.SetStateAction<HistoryDetailTab>>;
  retestCheckedIds: Set<string>;
  setRetestCheckedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowRetestNavModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRunningForDetail: string | null;
  setSelectedRunningForDetail: React.Dispatch<React.SetStateAction<string | null>>;
  advanceAgentStage: () => void;
  getNodeStatus: (stage: string) => 'inactive' | 'running' | 'complete';
  showCompletionModal: boolean;
  setShowCompletionModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TestRunningPage = ({
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
  setHistorySearchQuery,
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
}: TestRunningPageProps) => {
  const selectedRun = runningTests.find(t => t.id === selectedRunningTestId);

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

  const formatClock = (value: string) => value.split(' ').slice(-1)[0] ?? value;

  const matchedExec = selectedRun ? mockExecutionHistory.find(e => e.startDate === selectedRun.startTime || e.groupId === selectedRun.name) : undefined;

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
    <div className="flex h-full flex-col">
      {/* SubHeader with back, page name, execution number, start time and live duration */}
      <SubHeader
        leftContent={(
          <button
            onClick={() => { setSelectedRunningTestId(null); setSelectedRunningForDetail(null); }}
            className="inline-flex items-center gap-1 text-[#9ca3af] hover:text-[#6b7280]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold leading-none">이력</span>
          </button>
        )}
        title="나의 진행 중인 테스트"
        titleExtra={(
          <div className="flex items-center gap-3 ml-2">
            {matchedExec && <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#EAE8F9] text-[#3615CF] font-medium">{matchedExec.executionNumber}번째 test</span>}
            {selectedRun && <span className="text-[13px] text-[#6b7280]">{formatClock(selectedRun.startTime)}</span>}
            <span className="text-[13px] text-[#3615CF] font-medium">{formatDuration(elapsedSeconds)}</span>
          </div>
        )}
      />

      <div className="flex-1">
      {selectedRun ? (
        <div className="flex-1 flex overflow-hidden">
          <div ref={innerSidebarRef} className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0 min-h-0" style={{ width: innerSidebarWidth ?? '66.67%' }}>
            <div className="p-4 border-t border-[#f0f0f0] space-y-2 bg-white flex-shrink-0">
              <div className="flex gap-2 justify-center items-center">
                <button onClick={() => {
                  if (isTestRunning) { setShowCompletionModal(true); setIsTestRunning(false); }
                  else { setIsTestRunning(true); }
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

          <div className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleInnerDragStart} />

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
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#EDEEF0]">
          <div className="text-center text-[#9ca3af]">
            <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">실행 중인 테스트가 없습니다</div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
