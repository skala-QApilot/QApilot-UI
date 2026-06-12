import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle, ChevronLeft, Download, Eye, RotateCcw, XCircle, MinusCircle } from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { useTestStore } from '../../store/testStore';
import { listDefects, type Defect } from '../../api/defects';
import {
  getTcResult, listTcResults, getApiResult, getActionMapping, tcScreenshotUrl,
  type UiResult, type ApiResult, type ActionMapping,
} from '../../api/artifacts';

type HistoryDetailTab = 'FAIL' | 'PASS' | 'SKIP' | 'UNVERIFIED';

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
  /** Layer 3 분류 원본 — PRODUCT_DEFECT_CANDIDATE = '결함 검출'(FAIL 이 정상),
   *  그 외 TEST_*­/ENV_* = 테스트·환경 문제(FAIL 이 비정상). FAIL 세분 표시용. */
  category: string;
  summary: string;
  solutions: Array<{ cause: string; solution: string }>;
  errorLog: string;
}

/** FAIL 이 '정상'(시스템이 제품 결함을 검출한 것)인 분류인지. */
const isDefectDetection = (category: string) => category === 'PRODUCT_DEFECT_CANDIDATE';

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
    errorCode: ({
      PRODUCT_DEFECT_CANDIDATE: '제품 결함 후보',
      TEST_DEFECT_MAPPING: '테스트 결함 (매핑)',
      TEST_DEFECT_UNVERIFIABLE: '검증 표현력 한계',
      ENV_TIMEOUT: '환경/사전조건 (타임아웃)',
      ENV_UNVERIFIED: '검증 환경 부재',
      UI_ERROR: 'UI 오류', API_ERROR: 'API 오류', DATA_MISMATCH: '데이터 불일치',
      INFRA: '인프라', DOMAIN_RULE: '도메인 규칙',
    } as Record<string, string>)[d.category] ?? d.category,
    category: d.category,
    summary: d.root_cause_top1 ?? '',
    solutions: d.root_cause_top1 || d.solution_guide
      ? [{ cause: d.root_cause_top1 ?? '', solution: d.solution_guide ?? '' }]
      : [],
    errorLog: d.file_location ?? '',
  };
}

/** action 코드 → 한글 라벨 (스텝 표 표시용). */
const ACTION_LABEL: Record<string, string> = {
  navigate: '이동', fill: '입력', click: '클릭', assert: '검증', reload: '새로고침',
  wait: '대기', select: '선택', check: '체크', press: '키입력', hover: '호버',
};

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

  // 선택된 TC 의 결과들 — ui_result(스텝/스크린샷), api_result(실제 호출), action_mapping(동작→API).
  const [activeUiResult, setActiveUiResult] = useState<UiResult | null>(null);
  const [activeApiResult, setActiveApiResult] = useState<ApiResult | null>(null);
  const [activeActionMapping, setActiveActionMapping] = useState<ActionMapping | null>(null);

  // PASS 탭 — tc_results 직접조회로 채운다 (kind='ui' && status='passed').
  const [passCases, setPassCases] = useState<
    Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }>
  >([]);
  // S 탭 — 검증 미완 (ui kind 'skipped': 자동화 불가 step 보유 등, 수동 검토 대상)
  const [skipCases, setSkipCases] = useState<
    Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }>
  >([]);
  // U 탭 — 판정 보류 (cross_check 'unverified': 검증축 부재/입력결손/분석실패)
  const [unverifiedCases, setUnverifiedCases] = useState<
    Array<{ id: string; scenario: string; testCase: string; tcName: string; runtimeLog: string }>
  >([]);
  // verdict 기준 failed tc_id — FAIL 탭이 defects 전체가 아닌 진짜 F 만 나열하도록
  const [failedVerdictIds, setFailedVerdictIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!serviceUuid || !selectedExecutionId) {
      setPassCases([]);
      setSkipCases([]);
      setUnverifiedCases([]);
      setFailedVerdictIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const items = await listTcResults(serviceUuid, selectedExecutionId);
      if (cancelled) return;
      // verdict 는 cross_check kind (UI/API/DB 정합 + 의도 판정) — ui kind 단독은
      // "의도 도달 구제" 케이스를 누락한다. cc row 없는 옛 run 은 ui fallback.
      // skip 보호: ui 가 검증 안 한 TC 의 cc pass 는 통과로 치지 않는다 (서버 동일 규칙).
      const uiStatus = new Map(items.filter(it => it.kind === 'ui').map(it => [it.tc_id, it.status]));
      const hasCc = items.some(it => it.kind === 'cross_check');
      const verdictKind = hasCc ? 'cross_check' : 'ui';
      const passes = items
        .filter(it => it.kind === verdictKind && it.status === 'passed'
          && !(verdictKind === 'cross_check' && uiStatus.get(it.tc_id) === 'skipped'))
        .map(it => ({
          id: it.tc_id,                                  // 전체 tc_id (예: TS-001-TC-05) — 선택/조회 키
          scenario: it.ts_id,
          testCase: it.tc_id.includes('-TC-') ? `TC-${it.tc_id.split('-TC-')[1]}` : it.tc_id,
          tcName: '',
          runtimeLog: '',
        }));
      setPassCases(passes);
      const skips = items
        .filter(it => it.kind === 'ui' && it.status === 'skipped')
        .map(it => ({
          id: it.tc_id,
          scenario: it.ts_id,
          testCase: it.tc_id.includes('-TC-') ? `TC-${it.tc_id.split('-TC-')[1]}` : it.tc_id,
          tcName: '',
          runtimeLog: '',
        }));
      setSkipCases(skips);
      const skippedIds = new Set(skips.map(x => x.id));
      const unverifieds = items
        .filter(it => it.kind === 'cross_check' && it.status === 'unverified' && !skippedIds.has(it.tc_id))
        .map(it => ({
          id: it.tc_id,
          scenario: it.ts_id,
          testCase: it.tc_id.includes('-TC-') ? `TC-${it.tc_id.split('-TC-')[1]}` : it.tc_id,
          tcName: '',
          runtimeLog: '',
        }));
      setUnverifiedCases(unverifieds);
      setFailedVerdictIds(new Set(
        items.filter(it => it.kind === verdictKind && it.status === 'failed').map(it => it.tc_id)
      ));
    })();
    return () => { cancelled = true; };
  }, [serviceUuid, selectedExecutionId]);

  // FAIL 탭 = verdict(failed) 인 TC 의 defect 만 — ENV/TEST/UNVERIFIABLE 분류
  // defect 는 S/U 탭 영역이라 여기 나열하면 F 카운트와 불일치 (run d054cbe6 실증).
  const verdictFails = failedVerdictIds === null
    ? detailErrors
    : detailErrors.filter(err => failedVerdictIds.has(`${err.scenario}-${err.testCase}`));
  // FAIL 세분 — 결함 검출(정상 FAIL: 시스템이 제품 결함을 잡은 것) vs
  // 테스트·환경(비정상 FAIL: 테스트 자산/환경 문제). Layer 3 분류 기반.
  const defectFailCount = verdictFails.filter(e => isDefectDetection(e.category)).length;
  const abnormalFailCount = verdictFails.length - defectFailCount;
  const failsByTS = verdictFails.reduce((acc, err) => {
    if (!acc[err.scenario]) acc[err.scenario] = [];
    acc[err.scenario].push(err);
    return acc;
  }, {} as Record<string, DetailError[]>);

  const passByTS = passCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof passCases>);

  const skipByTS = skipCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof skipCases>);

  const unverifiedByTS = unverifiedCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof unverifiedCases>);

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
    ? (verdictFails.find(e => e.id === selectedFailTC) ?? verdictFails[0] ?? null)
    : null;

  const activePass = historyDetailTab === 'PASS'
    ? (passCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  const activeSkip = historyDetailTab === 'SKIP'
    ? (skipCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  const activeUnverified = historyDetailTab === 'UNVERIFIED'
    ? (unverifiedCases.find(p => p.id === selectedFailTC) ?? null)
    : null;

  // 활성 TC(fail 또는 pass)의 결과 3종 로드 — ui_result / api_result / action_mapping.
  useEffect(() => {
    const tsId = activeError?.scenario ?? activePass?.scenario ?? activeSkip?.scenario ?? activeUnverified?.scenario ?? null;
    // fail 은 defect 의 축약 testCase 를 full tc_id 로 복원, pass 는 id 가 이미 full tc_id.
    const tcId = activeError
      ? `${activeError.scenario}-${activeError.testCase}`
      : (activePass?.id ?? activeSkip?.id ?? activeUnverified?.id ?? null);
    if (!serviceUuid || !selectedExecutionId || !tsId || !tcId) {
      setActiveUiResult(null);
      setActiveApiResult(null);
      setActiveActionMapping(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [ui, apiRes, am] = await Promise.all([
        getTcResult(serviceUuid, selectedExecutionId, tsId, tcId),
        getApiResult(serviceUuid, selectedExecutionId, tsId, tcId),
        getActionMapping(serviceUuid, selectedExecutionId, tcId),
      ]);
      if (cancelled) return;
      setActiveUiResult(ui);
      setActiveApiResult(apiRes);
      setActiveActionMapping(am);
    })();
    return () => { cancelled = true; };
  }, [serviceUuid, selectedExecutionId, activeError, activePass]);

  // FAIL — 첫 fail step 의 step_no + error (Runtime 에러 로그 + UI 캡처 step).
  const failStep = activeUiResult?.steps?.find(s => s.status === 'fail') ?? null;
  const liveErrorLog = failStep?.error ?? activeError?.errorLog ?? '';

  // PASS — 스텝 요약을 runtime 로그로, 스크린샷이 있는 step 을 캡처로 사용.
  const passShotStep = activeUiResult?.steps?.find(s => s.screenshot_path) ?? null;
  const passRuntimeLog = activeUiResult?.steps?.length
    ? activeUiResult.steps.map(s => `${s.step_no}. ${s.action} → ${s.status}`).join('\n')
    : '모든 검증 항목을 통과했습니다.';

  // 우측 UI 캡처 — fail 은 fail step, pass 는 스크린샷 보유 step.
  const screenshotSrc = (serviceUuid && selectedExecutionId)
    ? (activeError && failStep
        ? tcScreenshotUrl(serviceUuid, selectedExecutionId, activeError.scenario,
                          `${activeError.scenario}-${activeError.testCase}`, failStep.step_no)
        : (activePass && passShotStep
            ? tcScreenshotUrl(serviceUuid, selectedExecutionId, activePass.scenario,
                              activePass.id, passShotStep.step_no)
            : null))
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
              { id: 'SKIP' as const, label: 'SKIPPED', count: exec.skipped ?? skipCases.length, color: 'text-[#d4a017]' },
              { id: 'UNVERIFIED' as const, label: 'UNVERIFIED', count: exec.unverified ?? unverifiedCases.length, color: 'text-[#7c8db5]' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setHistoryDetailTab(tab.id); setSelectedFailTC(null); }}
                className={`px-2 py-3 text-[11px] font-semibold relative flex items-center gap-1 transition-colors ${
                  historyDetailTab === tab.id ? tab.color : 'text-[#9ca3af] hover:text-[#6b7280]'
                }`}
              >
                {tab.label}
                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                  historyDetailTab === tab.id
                    ? (tab.id === 'FAIL' ? 'bg-status-fail/15 text-status-fail'
                       : tab.id === 'PASS' ? 'bg-status-pass/15 text-status-pass'
                       : tab.id === 'SKIP' ? 'bg-[#d4a017]/15 text-[#d4a017]'
                       : 'bg-[#7c8db5]/15 text-[#7c8db5]')
                    : 'bg-gray-100 text-[#9ca3af]'
                }`}>{tab.count}</span>
                {historyDetailTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    tab.id === 'FAIL' ? 'bg-status-fail' : tab.id === 'PASS' ? 'bg-status-pass'
                    : tab.id === 'SKIP' ? 'bg-[#d4a017]' : 'bg-[#7c8db5]'
                  }`} />
                )}
              </button>
            ))}
          </div>

          {/* 유효 판정율 — PASS + 결함검출 FAIL = 시스템이 유의미한 결론을 낸 비율.
              FAIL 중 PRODUCT_DEFECT_CANDIDATE 는 제품 결함을 잡은 '정상 FAIL'. */}
          {(() => {
            const totalCount = (exec.pass ?? 0) + (exec.fail ?? 0)
              + (exec.skipped ?? skipCases.length) + (exec.unverified ?? unverifiedCases.length);
            const validCount = (exec.pass ?? 0) + defectFailCount;
            const validRate = totalCount ? Math.round((validCount / totalCount) * 100) : 0;
            return (
              <div className="px-4 py-2 border-b border-[#f0f0f0] bg-gray-50/60 flex-shrink-0">
                <div className="flex items-center justify-between text-[10px] text-[#6b7280]">
                  <span>유효 판정율 (PASS + 결함 검출)</span>
                  <span className="font-bold text-[#1a1a2e]">{validRate}%</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px]">
                  <span className="text-status-fail">결함 검출 {defectFailCount}</span>
                  <span className="text-[#9ca3af]">·</span>
                  <span className="text-[#d4a017]">테스트·환경 {abnormalFailCount}</span>
                </div>
              </div>
            );
          })()}

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
                  const isActive = (selectedFailTC ?? verdictFails[0]?.id) === err.id;
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium text-[#1a1a2e] truncate">{err.testCase}</span>
                          <span className={`px-1 py-px rounded text-[9px] font-semibold flex-shrink-0 ${
                            isDefectDetection(err.category)
                              ? 'bg-status-fail/10 text-status-fail'
                              : 'bg-[#d4a017]/10 text-[#d4a017]'
                          }`}>{isDefectDetection(err.category) ? '결함 검출' : '테스트·환경'}</span>
                        </div>
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


            {historyDetailTab === 'UNVERIFIED' && Object.entries(unverifiedByTS).map(([tsId, us]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <MinusCircle className="w-3.5 h-3.5 text-[#7c8db5] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  <span className="ml-auto text-xs text-[#7c8db5]">U {us.length}</span>
                </div>
                {us.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-[#7c8db5]/10 to-[#7c8db5]/5 border-l-2 border-l-[#7c8db5]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-[#7c8db5] flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">판정 보류 — 검증축 부재/입력결손</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {historyDetailTab === 'SKIP' && Object.entries(skipByTS).map(([tsId, skips]) => (
              <div key={tsId}>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                  <MinusCircle className="w-3.5 h-3.5 text-[#d4a017] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  <span className="ml-auto text-xs text-[#d4a017]">S {skips.length}</span>
                </div>
                {skips.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-[#d4a017]/10 to-[#d4a017]/5 border-l-2 border-l-[#d4a017]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5 text-[#d4a017] flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">검증 미완 — 수동 검토</div>
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
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">① 결함 분류</div>
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
          {historyDetailTab === 'UNVERIFIED' && (
            activeUnverified ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MinusCircle className="w-5 h-5 text-[#7c8db5]" />
                  <span className="font-semibold text-[#1a1a2e]">{activeUnverified.scenario} › {activeUnverified.testCase}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-[#7c8db5]/15 text-[#7c8db5]">판정 보류</span>
                </div>
                <div className="bg-white rounded-lg border border-[#7c8db5]/40 p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">판정 보류 사유</div>
                  <div className="text-sm text-[#6b7280]">
                    cross-check 가 pass/fail 을 단정할 실증이 부족한 케이스입니다 — API/DB 검증축 부재,
                    입력 결손 실행, 또는 정합성 분석 실패. 아래 실행 스텝과 API 호출을 참고해 수동 판정하세요.
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">실행된 스텝</div>
                  {activeUiResult?.steps?.length ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {activeUiResult.steps.map((st: any) => (
                          <tr key={st.step_no} className="border-t border-[#f5f5f5]">
                            <td className="py-1.5 w-8 text-[#9ca3af]">{st.step_no}</td>
                            <td className="py-1.5 w-24 text-[#1a1a2e] font-medium">{st.action}</td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                st.status === 'pass' ? 'bg-status-pass/15 text-status-pass'
                                : st.status === 'fail' ? 'bg-status-fail/15 text-status-fail'
                                : 'bg-gray-100 text-[#9ca3af]'
                              }`}>{st.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">실행된 스텝이 없습니다.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#9ca3af]">
                좌측에서 판정 보류 TC 를 선택하세요.
              </div>
            )
          )}
          {historyDetailTab === 'SKIP' && (
            activeSkip ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MinusCircle className="w-5 h-5 text-[#d4a017]" />
                  <span className="font-semibold text-[#1a1a2e]">{activeSkip.scenario} › {activeSkip.testCase}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-[#d4a017]/15 text-[#d4a017]">검증 미완</span>
                </div>
                <div className="bg-white rounded-lg border border-[#d4a017]/40 p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">검증 미완 사유</div>
                  <div className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {activeUiResult?.error || '자동화 불가 step 보유 — 실행된 step 만으로는 검증이 완결되지 않아 수동 검토가 필요합니다.'}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">실행된 스텝</div>
                  {activeUiResult?.steps?.length ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {activeUiResult.steps.map((st: any) => (
                          <tr key={st.step_no} className="border-t border-[#f5f5f5]">
                            <td className="py-1.5 w-8 text-[#9ca3af]">{st.step_no}</td>
                            <td className="py-1.5 w-24 text-[#1a1a2e] font-medium">{st.action}</td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                st.status === 'pass' ? 'bg-status-pass/15 text-status-pass'
                                : st.status === 'fail' ? 'bg-status-fail/15 text-status-fail'
                                : 'bg-gray-100 text-[#9ca3af]'
                              }`}>{st.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">실행된 스텝이 없습니다.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#9ca3af]">
                좌측에서 검증 미완 TC 를 선택하세요.
              </div>
            )
          )}
          {historyDetailTab === 'PASS' && (
            activePass ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-status-pass" />
                  <span className="font-semibold text-[#1a1a2e]">{activePass.scenario} › {activePass.testCase}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-green-100 text-status-pass">PASS</span>
                </div>

                {/* ① 테스트 스텝 — 어떤 동작이 어떤 API 를 호출하는지 (action_mapping) */}
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">① 테스트 스텝 (동작 → 호출 API)</div>
                  {activeActionMapping?.steps?.length ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-[#9ca3af] uppercase">
                          <th className="text-left font-semibold pb-1.5 w-8">#</th>
                          <th className="text-left font-semibold pb-1.5 w-16">동작</th>
                          <th className="text-left font-semibold pb-1.5">대상</th>
                          <th className="text-left font-semibold pb-1.5">값</th>
                          <th className="text-left font-semibold pb-1.5">호출 API</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeActionMapping.steps.map(s => (
                          <tr key={s.step_no} className="border-t border-[#f5f5f5]">
                            <td className="py-1.5 text-[#9ca3af]">{s.step_no}</td>
                            <td className="py-1.5 text-[#1a1a2e] font-medium">{ACTION_LABEL[s.action] ?? s.action}</td>
                            <td className="py-1.5 text-[#6b7280] truncate max-w-[120px]">{s.target_name || s.target_kind || '—'}</td>
                            <td className="py-1.5 text-[#6b7280] truncate max-w-[120px]">{s.value ?? '—'}</td>
                            <td className="py-1.5">
                              {s.api_endpoint
                                ? <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#3615CF]/10 text-[#3615CF]">{s.api_endpoint}</span>
                                : <span className="text-[#d1d5db]">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">스텝 정보가 없습니다.</div>
                  )}
                </div>

                {/* ② 실제 API 호출 (api_result) */}
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">② 실제 API 호출</div>
                  {activeApiResult?.calls?.length ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-[#9ca3af] uppercase">
                          <th className="text-left font-semibold pb-1.5 w-14">METHOD</th>
                          <th className="text-left font-semibold pb-1.5">URL</th>
                          <th className="text-left font-semibold pb-1.5 w-14">상태</th>
                          <th className="text-right font-semibold pb-1.5 w-16">지연</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeApiResult.calls.map((c, i) => {
                          const ok = (c.status_code ?? 0) >= 200 && (c.status_code ?? 0) < 400;
                          return (
                            <tr key={i} className="border-t border-[#f5f5f5]">
                              <td className="py-1.5 font-mono text-[10px] text-[#1a1a2e]">{c.method}</td>
                              <td className="py-1.5 text-[#6b7280] font-mono text-[10px] truncate max-w-[200px]">{c.url}</td>
                              <td className={`py-1.5 font-semibold ${ok ? 'text-status-pass' : 'text-status-fail'}`}>{c.status_code ?? '—'}</td>
                              <td className="py-1.5 text-right text-[#9ca3af]">{c.latency_ms != null ? `${c.latency_ms}ms` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-[#9ca3af]">기록된 API 호출이 없습니다.</div>
                  )}
                </div>

                {/* ③ 검증 결과 요약 */}
                <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-status-pass flex-shrink-0" />
                  <span className="text-sm font-medium text-status-pass">
                    {(activeUiResult?.steps?.filter(s => s.status === 'pass').length ?? 0)}/{activeUiResult?.steps?.length ?? 0} 스텝 통과
                    {' · '}API 오류 {activeApiResult?.error_calls ?? 0}건 → 정상
                  </span>
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
              {historyDetailTab === 'PASS' && activePass && passRuntimeLog.split('\n').map((line, i) => (
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
