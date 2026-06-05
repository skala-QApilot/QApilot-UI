import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle, ChevronLeft, Download, Eye, RotateCcw, XCircle } from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { useTestStore } from '../../store/testStore';
import { listDefects, type Defect } from '../../api/defects';
import { getTcResult, tcScreenshotUrl, type UiResult } from '../../api/artifacts';

type HistoryDetailTab = 'FAIL' | 'PASS';

interface TestResultPageProps {
  selectedExecutionId: string | null;
  setSelectedExecutionId: Dispatch<SetStateAction<string | null>>;
  selectedFailTC: string | null;
  setSelectedFailTC: Dispatch<SetStateAction<string | null>>;
  historyDetailTab: HistoryDetailTab;
  setHistoryDetailTab: Dispatch<SetStateAction<HistoryDetailTab>>;
  retestCheckedIds: Set<string>;
  setRetestCheckedIds: Dispatch<SetStateAction<Set<string>>>;
  setShowRetestNavModal: Dispatch<SetStateAction<boolean>>;
  /** Spring 호출에 필요한 service UUID. selectedExecutionId 는 trace_id. */
  serviceUuid: string | null;
}

interface DetailError {
  id: string;
  scenario: string;
  testCase: string;
  tcName: string;
  errorCode: string;
  summary: string;
  solutions: Array<{ cause: string; solution: string }>;
  errorLog: string;
}

/**
 * defects 한 row → TestResultPage 가 기대하는 DetailError 모양으로 변환.
 * scenario 는 ts_id ("TS-002"), testCase 는 tc_id 의 TC- 이후 ("TC-05").
 * Backend 가 단일 root cause + 단일 fix suggestion 만 채우므로 solutions 도 1개.
 * tcName / errorLog 는 defect 스키마에 없음 — 향후 scenario payload + ui_result 조인 필요.
 */
function defectToDetailError(d: Defect): DetailError {
  const tcParts = d.tc_id.split('-TC-');
  const testCase = tcParts.length >= 2 ? `TC-${tcParts[1]}` : d.tc_id;
  return {
    id: d.id,
    scenario: d.ts_id,
    testCase,
    tcName: '',  // TODO: scenarios 의 test_cases 에서 join
    errorCode: d.category,
    summary: d.root_cause_top1 ?? '',
    solutions: d.root_cause_top1 || d.solution_guide
      ? [{ cause: d.root_cause_top1 ?? '', solution: d.solution_guide ?? '' }]
      : [],
    errorLog: d.file_location ?? '',
  };
}

export const TestResultPage = ({
  selectedExecutionId,
  setSelectedExecutionId,
  selectedFailTC,
  setSelectedFailTC,
  historyDetailTab,
  setHistoryDetailTab,
  retestCheckedIds,
  setRetestCheckedIds,
  setShowRetestNavModal,
  serviceUuid,
}: TestResultPageProps) => {
  // 실제 defects API → mockDetailErrors 형태로 변환.
  // PASS 탭의 mockPassCases 는 향후 tc_results API 로 교체 예정 (현재는 빈 배열).
  const [detailErrors, setDetailErrors] = useState<DetailError[]>([]);

  useEffect(() => {
    if (!serviceUuid || !selectedExecutionId) {
      setDetailErrors([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const defects = await listDefects(serviceUuid, { runId: selectedExecutionId });
        if (cancelled) return;
        setDetailErrors(defects.map(defectToDetailError));
      } catch (err) {
        if (cancelled) return;
        console.error('defects 로드 실패', err);
        setDetailErrors([]);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceUuid, selectedExecutionId]);

  // 선택된 FAIL TC 의 ui_result.json (= tc_results.payload) — fail step 의 실제 error 메시지 + step_no
  // 표시용. 빈 값이면 placeholder.
  const [activeUiResult, setActiveUiResult] = useState<UiResult | null>(null);

  // PASS 탭 — 별도 PR 에서 tc_results API 로 채울 예정. 현재는 빈 배열.
  const passCases: Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }> = [];

  const failsByTS = detailErrors.reduce((acc, err) => {
    if (!acc[err.scenario]) acc[err.scenario] = [];
    acc[err.scenario].push(err);
    return acc;
  }, {} as Record<string, DetailError[]>);

  const passByTS = passCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof passCases>);

  if (!selectedExecutionId) return null;

  // selectedExecutionId 는 testStore.getExecutionHistory() 가 만든 trace_id.
  // store getter 가 매번 새 배열을 만드므로 1회성 lookup 패턴 (조회 즉시 종료) 으로 안전.
  const exec = useTestStore.getState().getExecutionHistory().find(e => e.id === selectedExecutionId);
  // exec 없음 = stale id 또는 aborted/running 상태 — raw results 에서 raw status 확인.
  if (!exec) {
    const raw = useTestStore.getState().results.find(r => r.trace_id === selectedExecutionId);
    const rawStatus = String(raw?.status || '').toLowerCase();
    const heading = rawStatus === 'aborted' ? '이 실행은 중단되었습니다'
      : rawStatus === 'running' ? '진행 중인 테스트입니다'
      : '결과를 찾을 수 없습니다';
    const description = rawStatus === 'aborted'
      ? '"진행 중" 패널의 "이어서 실행" 으로 중단 지점부터 재개할 수 있습니다.'
      : rawStatus === 'running'
        ? '"진행 중" 패널에서 해당 실행을 선택하면 실시간 화면을 볼 수 있습니다.'
        : '선택한 실행 이력이 더 이상 존재하지 않거나 표시할 수 있는 결과가 없습니다.';
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <SubHeader
          leftContent={(
            <button
              type="button"
              onClick={() => { setSelectedExecutionId(null); setSelectedFailTC(null); }}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3615CF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
          )}
        />
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="max-w-md text-center">
            <div className="text-sm font-semibold text-[#1a1a2e] mb-2">{heading}</div>
            <div className="text-xs text-[#6b7280]">{description}</div>
          </div>
        </div>
      </div>
    );
  }

  const activeError = historyDetailTab === 'FAIL'
    ? (detailErrors.find(e => e.id === selectedFailTC) ?? detailErrors[0] ?? null)
    : null;

  // activeError 변하면 그 TC 의 ui_result.json 을 가져옴. fail step 의 error 메시지 + 스크린샷 step_no
  // 모두 그 안에 있음.
  useEffect(() => {
    if (!serviceUuid || !selectedExecutionId || !activeError) {
      setActiveUiResult(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const ui = await getTcResult(serviceUuid, selectedExecutionId, activeError.scenario,
        `${activeError.scenario}-${activeError.testCase}`);
      if (!cancelled) setActiveUiResult(ui);
    })();
    return () => { cancelled = true; };
  }, [serviceUuid, selectedExecutionId, activeError]);

  // 첫 fail step 의 step_no + error — Runtime 에러 로그 영역과 UI 캡처 step 선택에 사용.
  const failStep = activeUiResult?.steps?.find(s => s.status === 'fail') ?? null;
  const liveErrorLog = failStep?.error ?? activeError?.errorLog ?? '';
  const screenshotSrc = (activeError && serviceUuid && selectedExecutionId && failStep)
    ? tcScreenshotUrl(serviceUuid, selectedExecutionId, activeError.scenario,
                       `${activeError.scenario}-${activeError.testCase}`, failStep.step_no)
    : null;

  const activePass = historyDetailTab === 'PASS'
    ? (passCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  const formatDuration = (duration: string) => duration;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <SubHeader
        leftContent={(
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedExecutionId(null);
                setSelectedFailTC(null);
              }}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3615CF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
            <div className="w-px h-4 bg-[#e5e7eb]" />
          </>
        )}
        title={exec.groupId}
        titleExtra={(
          <div className="flex items-center gap-3 ml-1">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#3615CF]/10 text-[#3615CF]">#{exec.executionNumber}번째 실행</span>
            <span className="text-sm text-[#9ca3af]">{exec.startDate}</span>
            <span className="text-sm text-[#9ca3af]">{formatDuration(exec.duration)}</span>
          </div>
        )}
        rightContent={(
          <>
            <button className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </>
        )}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">
          <div className="px-4 border-b border-[#f0f0f0] flex items-center gap-0 flex-shrink-0">
            {([
              { id: 'FAIL' as const, label: 'FAIL', count: exec.fail, color: 'text-status-fail' },
              { id: 'PASS' as const, label: 'PASS', count: exec.pass, color: 'text-status-pass' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setHistoryDetailTab(tab.id); setSelectedFailTC(null); }}
                className={`px-4 py-3 text-xs font-semibold relative flex items-center gap-1.5 transition-colors ${
                  historyDetailTab === tab.id ? tab.color : 'text-[#9ca3af] hover:text-[#6b7280]'
                }`}
              >
                {tab.label}
                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                  historyDetailTab === tab.id
                    ? (tab.id === 'FAIL' ? 'bg-status-fail/15 text-status-fail' : 'bg-status-pass/15 text-status-pass')
                    : 'bg-gray-100 text-[#9ca3af]'
                }`}>{tab.count}</span>
                {historyDetailTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.id === 'FAIL' ? 'bg-status-fail' : 'bg-status-pass'}`} />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {historyDetailTab === 'FAIL' && Object.entries(failsByTS).map(([tsId, errors]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <input type="checkbox"
                    checked={errors.every(e => retestCheckedIds.has(e.id))}
                    onChange={checked => {
                      const next = new Set(retestCheckedIds);
                      errors.forEach(e => checked.target.checked ? next.add(e.id) : next.delete(e.id));
                      setRetestCheckedIds(next);
                    }}
                    className="w-3.5 h-3.5 accent-[var(--status-fail)] flex-shrink-0"
                  />
                  <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  <span className="ml-auto text-xs text-status-fail">FAIL {errors.length}</span>
                </div>
                {errors.map(err => {
                  const isActive = (selectedFailTC ?? detailErrors[0]?.id) === err.id;
                  const isChecked = retestCheckedIds.has(err.id);
                  return (
                    <div
                      key={err.id}
                      onClick={() => setSelectedFailTC(err.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 border-l-2 border-l-[#f78ca0]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input type="checkbox"
                        checked={isChecked}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const next = new Set(retestCheckedIds);
                          e.target.checked ? next.add(err.id) : next.delete(err.id);
                          setRetestCheckedIds(next);
                        }}
                        className="w-3.5 h-3.5 accent-[var(--status-fail)] flex-shrink-0"
                      />
                      <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{err.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{err.tcName}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setShowRetestNavModal(true); setRetestCheckedIds(new Set([err.id])); }}
                        title="재테스트 실행"
                        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[#9ca3af] hover:text-status-fail hover:bg-status-fail/10 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}

            {historyDetailTab === 'PASS' && Object.entries(passByTS).map(([tsId, passes]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  <span className="ml-auto text-xs text-status-pass">PASS {passes.length}</span>
                </div>
                {passes.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-status-pass/10 to-status-pass/5 border-l-2 border-l-status-pass' : 'hover:bg-gray-50'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{p.tcName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {historyDetailTab === 'FAIL' && retestCheckedIds.size > 0 && (
            <div className="px-4 pt-4 pb-6 border-t border-[#f0f0f0] flex-shrink-0">
              <button
                onClick={() => setShowRetestNavModal(true)}
                className="w-full px-3 py-2 bg-[#3615CF] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md hover:bg-[#3615CF]/90 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                재시나리오 그룹 생성 ({retestCheckedIds.size}건)
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
          {historyDetailTab === 'FAIL' && activeError && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-status-fail" />
                <span className="font-semibold text-[#1a1a2e]">{activeError.scenario} › {activeError.testCase}</span>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">① 에러 코드</div>
                <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-sm rounded border border-red-200 font-medium">
                  {activeError.errorCode}
                </span>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">② 현재 상태 요약</div>
                <div className="text-sm text-[#6b7280]">{activeError.summary}</div>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">③ 원인 분석 및 해결 방안</div>
                <div className="space-y-2">
                  {activeError.solutions.map((sol, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded border border-[#f0f0f0]">
                      <span className="w-5 h-5 rounded-full bg-status-fail text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1a1a2e]">{sol.cause}</div>
                        <div className="mt-2 rounded border border-[#e5e7eb] bg-white px-3 py-2">
                          <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1">해결 방안</div>
                          <div className="text-sm text-[#6b7280]">{sol.solution}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {historyDetailTab === 'PASS' && (
            activePass ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-status-pass" />
                  <span className="font-semibold text-[#1a1a2e]">{activePass.scenario} › {activePass.testCase}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-green-100 text-status-pass">PASS</span>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">테스트 결과</div>
                  <div className="text-sm font-medium text-status-pass">모든 검증 항목 통과</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
                <CheckCircle className="w-8 h-8 mb-2 opacity-25" />
                <div className="text-sm">좌측에서 PASS 항목을 선택하세요</div>
              </div>
            )
          )}
        </div>

        <div className="w-64 bg-white border-l border-[#f0f0f0] flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-[#f0f0f0]">
            <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">UI 캡처</div>
            <div className="w-full h-36 bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center overflow-hidden">
              {screenshotSrc ? (
                <img src={screenshotSrc} alt="에러 시점 캡처" className="w-full h-full object-contain"
                     onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="text-center text-[#9ca3af]">
                  <Eye className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <div className="text-xs">스크린샷 없음</div>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 flex-1">
            <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">
              {historyDetailTab === 'PASS' ? 'Runtime 로그' : 'Runtime 에러 로그'}
            </div>
            <div className="bg-[#1e1e2e] rounded p-3 overflow-x-auto">
              {historyDetailTab === 'FAIL' && activeError && liveErrorLog.split('\n').map((line, i) => (
                <div key={i} className={`font-mono text-[10px] leading-5 ${
                  i === 0 ? 'text-status-fail font-semibold' : 'text-[#9ca3af]'
                }`}>{line}</div>
              ))}
              {historyDetailTab === 'PASS' && activePass && activePass.runtimeLog.split('\n').map((line, i) => (
                <div key={i} className="font-mono text-[10px] leading-5 text-status-pass">{line}</div>
              ))}
              {historyDetailTab === 'PASS' && !activePass && (
                <div className="text-[10px] text-[#6b7280]">항목을 선택하면 로그가 표시됩니다</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
