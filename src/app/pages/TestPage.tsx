import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { SubHeader } from '../components/common/SubHeader';
import { SearchBar } from '../components/common/SearchBar';
import { PassRateChart } from '../components/common/PassRateChart';
import { ExecutionHistoryRow } from '../components/common/ExecutionHistoryRow';
import { useTestStore } from '../../store/testStore';

type RunningTest = { id: string; name: string; groupId: string | null; startTime: string; status: 'running' | 'aborted' | 'completed' };

interface ExecutionHistoryPageProps {
  historyFilter: string;
  setHistoryFilter: Dispatch<SetStateAction<string>>;
  historySearchQuery?: string;
  setHistorySearchQuery?: Dispatch<SetStateAction<string>>;
  setSelectedExecutionId: Dispatch<SetStateAction<string | null>>;
  runningTests: RunningTest[];
  setSelectedRunningTestId: Dispatch<SetStateAction<string | null>>;
  setSelectedTestGroup: Dispatch<SetStateAction<string | null>>;
  /** "이어서 실행" — aborted 항목 클릭 시 동일 scenario 로 새 trace 시작 (이전 완료 TC 자동 skip). */
  onResumeRun?: (runId: string, runName: string) => void;
}

export const TestPage = ({
  historyFilter,
  historySearchQuery = '',
  setHistorySearchQuery,
  setSelectedExecutionId,
  runningTests,
  setSelectedRunningTestId,
  setSelectedTestGroup,
  onResumeRun,
}: ExecutionHistoryPageProps) => {

  // ── depth-0 data ──────────────────────────────────────────────────────────
  // "실행 중" 패널은 끝나지 않은 모든 trace 를 표시 — running + aborted.
  // aborted 는 badge 와 "이어서 실행" 버튼으로 구분.
  const activeRunningTests = runningTests.filter(t => t.status === 'running' || t.status === 'aborted');

  // testStore.results 변경 시에만 재계산 (getter 가 매 호출마다 새 배열을 만들기 때문에 selector 직접 호출 금지).
  const testResults = useTestStore((s) => s.results);
  const executionHistory = useMemo(() => useTestStore.getState().getExecutionHistory(), [testResults]);
  const passHistory = useMemo(() => useTestStore.getState().getPassHistory(14), [testResults]);

  const filtered = executionHistory.filter(exec => {
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

  // ── depth 0: graph + 2-col split ─────────────────────────────────────────
  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-white">

        <SubHeader
          title="테스트 이력"
          rightContent={
            <SearchBar
              value={historySearchQuery}
              onChange={setHistorySearchQuery}
              placeholder="테스트 이력 검색..."
              className="w-52"
            />
          }
        />

        {/* Graph */}
        <div className="border-b border-[#f0f0f0] px-8 pt-3 pb-2 flex-shrink-0 bg-white">
          <PassRateChart data={passHistory} stickyAxes height={165} />
        </div>

        {/* 2-col body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left: Running tests */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="h-12 px-8 py-2 border-b border-[#f0f0f0] flex-shrink-0 flex items-center gap-2">
              <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">실행 중</span>
              {activeRunningTests.length > 0 && (
                <span className="px-1.5 py-0.5 bg-primary-blue/10 text-primary-blue text-[10px] font-bold rounded-full animate-pulse">
                  {activeRunningTests.length}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeRunningTests.length === 0 && (
                <div className="py-16 text-center text-sm text-[#9ca3af]">실행 중인 테스트 없음</div>
              )}
              {activeRunningTests.map(run => {
                // testStore.results 에 진행중/중단된 trace 의 partial tc_results 가 들어있음.
                // 그 값으로 P/F/N derive — aborted 의 경우 정확한 진척, running 의 경우 마지막 폴링 시점 값.
                const raw = testResults.find(r => r.trace_id === run.id);
                const passN = raw?.pass_count ?? 0;
                const failN = raw?.fail_count ?? 0;
                const totalN = raw?.total_tc_count ?? 0;
                const notRunN = Math.max(0, totalN - passN - failN);
                return (
                <div key={run.id} className="h-[56px] px-8 border-b border-[#f5f5f5] flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <ExecutionHistoryRow
                      exec={{ id: run.id, groupId: run.name, startDate: run.startTime, pass: passN, fail: failN, notRun: notRunN }}
                      onClick={() => {
                        setSelectedRunningTestId(run.id);
                        setSelectedTestGroup(run.name);
                      }}
                      loading={run.status === 'running'}
                    />
                  </div>
                  {run.status === 'aborted' && (
                    <>
                      <span className="px-1.5 py-0.5 bg-[#fde68a]/40 text-[#b45309] text-[10px] font-bold rounded-full flex-shrink-0">
                        ⏸ 중단됨
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onResumeRun?.(run.id, run.name); }}
                        className="px-2 py-1 bg-primary-blue text-white text-[10px] font-medium rounded hover:opacity-90 flex-shrink-0"
                      >
                        이어서 실행
                      </button>
                    </>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          <div className="w-px bg-[#f0f0f0] flex-shrink-0" />

          {/* Right: Completed tests */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="h-12 px-8 py-2 border-b border-[#f0f0f0] flex-shrink-0 flex items-center gap-2">
              <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">실행 완료</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-[#9ca3af]">조건에 맞는 테스트 이력이 없습니다.</div>
              )}
              {filtered.map(exec => (
                <div key={exec.id} className="h-[56px] px-8 border-b border-[#f5f5f5] flex items-center">
                  <ExecutionHistoryRow
                    exec={exec}
                    onClick={() => setSelectedExecutionId(exec.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
