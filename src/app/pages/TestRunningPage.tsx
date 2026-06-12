import React from 'react';
import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Eye, GitBranch, List, Loader2, Pause, Play, RotateCcw,
} from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { TerminalFrame, RuntimeTerminal } from '../components/common/RuntimeTerminal';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockTVEndpoints, type HttpMethod } from '../data/mockData';
import { useScenarioStore, toUiScenario, toUiTestCase } from '../../store/scenarioStore';
import { useRtmStore } from '../../store/rtmStore';
import { useTestStore } from '../../store/testStore';
import { fetchLatestScreenshotUrl, getRunProgress, stopRun, type RunProgress } from '../../api/runs';
import { useRunStream } from '../../hooks/useRunStream';

interface RuntimeLog {
  time: string;
  action: string;
  apiMethod?: string;
  endpoint?: string;
  status: number | null;
  responseTime?: string;
  isError?: boolean;
}

/** RunProgress → RuntimeTerminal 의 RuntimeLog[] 변환. api.calls + ui.steps 를 시간순 평탄화. */
function toRuntimeLogs(progress: RunProgress | null): RuntimeLog[] {
  if (!progress) return [];
  const out: RuntimeLog[] = [];
  for (const item of progress.items) {
    const apiCalls = ((item.api as any)?.calls as any[] | undefined) || [];
    for (const c of apiCalls) {
      const ts: string = String(c.timestamp || '');
      out.push({
        time: ts.includes('T') ? ts.slice(11, 19) : ts.slice(0, 8),
        action: `${item.ts_id}/${item.tc_id}`,
        apiMethod: c.method,
        endpoint: c.url,
        status: typeof c.status_code === 'number' ? c.status_code : null,
        responseTime: c.latency_ms != null ? `${c.latency_ms}ms` : undefined,
        isError: typeof c.status_code === 'number' && c.status_code >= 400,
      });
    }
    const steps = ((item.ui as any)?.steps as any[] | undefined) || [];
    for (const s of steps) {
      out.push({
        time: '',
        action: `${item.ts_id}/${item.tc_id} step ${s.step_no} (${s.action})`,
        status: null,
        responseTime: s.duration_ms != null ? `${s.duration_ms}ms` : undefined,
        isError: s.status === 'fail',
      });
    }
  }
  return out;
}

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

// ── 페이지 이탈/재진입 시 라이브 상태 보존 캐시 (runId 키) ──────────────
// 컴포넌트 언마운트로 로컬 state 가 소멸하면 재진입 시 다음 폴링까지
// 스크린샷·로그·체크 표시가 전부 빈 화면이 된다 — 마지막 상태를 모듈
// 레벨에 보존해 마운트 즉시 복원. blob URL 은 새 캡처로 교체될 때만
// revoke (캐시 보존을 위해 unmount 에서 revoke 하지 않음).
const _progressCache = new Map<string, RunProgress>();
const _shotCache = new Map<string, string>();

type RunningTest = { id: string; name: string; groupId: string | null; startTime: string; status: 'pending' | 'running' | 'aborted' | 'completed' };
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED' | 'SKIPPED' | 'UNVERIFIED';

interface TestRunningPageProps {
  runningTests: RunningTest[];
  selectedRunningTestId: string | null;
  setSelectedRunningTestId: React.Dispatch<React.SetStateAction<string | null>>;
  isTestRunning: boolean;
  setIsTestRunning: React.Dispatch<React.SetStateAction<boolean>>;
  highlightedLogIdx: number | null;
  setHighlightedLogIdx: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedRunningForDetail: React.Dispatch<React.SetStateAction<string | null>>;
  selectedRunningForDetail: string | null;
  setRunningTests: React.Dispatch<React.SetStateAction<RunningTest[]>>;
  scenarioSidebarTab: ScenarioSidebarTab;
  setScenarioSidebarTab: React.Dispatch<React.SetStateAction<ScenarioSidebarTab>>;
  expandedScenarios: string[];
  setExpandedScenarios: React.Dispatch<React.SetStateAction<string[]>>;
  expandedTestCases: string[];
  setExpandedTestCases: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedExecutionId: React.Dispatch<React.SetStateAction<string | null>>;
  /** App.tsx 의 handleStartRun — selectedRun 을 같은 scenario_ids 로 fresh start.
   *  pendingId 가 주어지면 그 대기 엔트리를 실제 run 으로 교체. */
  onStartRun?: (scenarioIds: string[] | undefined, runName: string, groupId: string | null, pendingId?: string | null) => void;
  /** App.tsx 의 handleResumeRun — 같은 trace_id 로 재개. aborted 상태에서만 동작. */
  onResumeRun?: (traceId: string) => void;
  /** Spring 호출에 필요한 service UUID. selectedRun.id 는 trace_id 라 함께 필요. */
  serviceUuid?: string | null;
}

export const TestRunningPage = ({
  runningTests,
  selectedRunningTestId,
  setSelectedRunningTestId,
  isTestRunning,
  setIsTestRunning,
  highlightedLogIdx,
  setHighlightedLogIdx,
  setSelectedRunningForDetail,
  selectedRunningForDetail: _selectedRunningForDetail,
  setRunningTests,
  scenarioSidebarTab,
  setScenarioSidebarTab,
  expandedScenarios,
  setExpandedScenarios,
  expandedTestCases,
  setExpandedTestCases,
  setSelectedExecutionId,
  onStartRun,
  onResumeRun,
  serviceUuid,
}: TestRunningPageProps) => {
  const selectedRun = runningTests.find(t => t.id === selectedRunningTestId) ?? null;

  // ── Layer 2 라이브 폴링 — 1초 간격으로 스크린샷 + run progress fetch ─────────
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(null);
  const [runProgress, setRunProgress] = React.useState<RunProgress | null>(null);
  const screenshotUrlRef = React.useRef<string | null>(null);

  // tick 함수를 ref 로 — SSE 이벤트 핸들러가 stale closure 없이 최신 버전 호출 가능.
  const tickRef = React.useRef<() => Promise<void>>();

  React.useEffect(() => {
    // 폴링 조건: serviceUuid + selectedRun 모두 있을 때.
    // - running: 1초 간격 폴링 + SSE 이벤트 도착 시 즉시 추가 tick
    // - aborted/completed: 마지막 디스크 상태 1회만 fetch
    // pending = 아직 실행 전 (실제 trace 없음) → 폴링/스크린샷 fetch 안 함.
    if (!serviceUuid || !selectedRun || selectedRun.status === 'pending') {
      // blob URL 은 캐시 (_shotCache) 가 소유 — 여기서 revoke 하면 재진입
      // 복원용 캐시가 죽은 URL 을 가리킨다. 로컬 참조만 비운다.
      screenshotUrlRef.current = null;
      setScreenshotUrl(null);
      setRunProgress(null);
      tickRef.current = undefined;
      return;
    }

    let cancelled = false;
    const runId = selectedRun.id;
    const isLive = selectedRun.status === 'running';

    // 재진입 즉시 복원 — 마지막 폴링 결과/캡처를 캐시에서 (다음 tick 까지의
    // 빈 화면 방지). 캐시 blob URL 은 revoke 되지 않았으므로 그대로 유효.
    const cachedProgress = _progressCache.get(runId);
    if (cachedProgress) setRunProgress(cachedProgress);
    const cachedShot = _shotCache.get(runId);
    if (cachedShot) {
      screenshotUrlRef.current = cachedShot;
      setScreenshotUrl(cachedShot);
    }

    const tick = async () => {
      // 스크린샷과 progress 를 독립적으로 — Promise.all 결합은 한쪽 실패
      // (스크린샷 일시 오류 등) 가 progress 표시까지 통째로 죽여 화면 전체가
      // 비어 보였다. 각자 실패해도 다른 쪽은 갱신.
      const [shotR, progR] = await Promise.allSettled([
        fetchLatestScreenshotUrl(serviceUuid, runId),
        getRunProgress(serviceUuid, runId),
      ]);
      if (cancelled) {
        if (shotR.status === 'fulfilled' && shotR.value) URL.revokeObjectURL(shotR.value);
        return;
      }
      if (shotR.status === 'fulfilled' && shotR.value) {
        // 이전 blob 은 새 캡처로 교체될 때 revoke (캐시와 동기화)
        const prev = _shotCache.get(runId);
        if (prev && prev !== shotR.value) URL.revokeObjectURL(prev);
        _shotCache.set(runId, shotR.value);
        screenshotUrlRef.current = shotR.value;
        setScreenshotUrl(shotR.value);
      } else if (shotR.status === 'rejected') {
        console.warn('[running] screenshot fetch 실패', shotR.reason);
      }
      if (progR.status === 'fulfilled' && progR.value) {
        _progressCache.set(runId, progR.value);
        setRunProgress(progR.value);
      } else if (progR.status === 'rejected') {
        console.warn('[running] run-progress fetch 실패', progR.reason);
      }
    };
    tickRef.current = tick;

    tick();
    // 1초 폴링은 SSE 가 끊겼을 때 fallback. SSE 가 떠 있어도 무해 (idempotent 상태 갱신).
    const timer = isLive ? setInterval(tick, 1000) : null;
    return () => {
      cancelled = true;
      tickRef.current = undefined;
      if (timer) clearInterval(timer);
      // blob URL 은 캐시 보존을 위해 여기서 revoke 하지 않는다 — 재진입 복원용.
      // (새 캡처 도착 시 교체-revoke, 캐시 자체는 run 당 1장이라 누수 미미)
      screenshotUrlRef.current = null;
    };
  }, [serviceUuid, selectedRun?.id, selectedRun?.status]);

  // SSE — 이벤트 도착하면 즉시 tick 트리거. 1초 폴링 대비 latency ~0.
  useRunStream(
    serviceUuid,
    selectedRun?.id ?? null,
    {
      enabled: selectedRun?.status === 'running',
      onEvent: () => { void tickRef.current?.(); },
    },
  );

  const liveLogs = React.useMemo(() => toRuntimeLogs(runProgress), [runProgress]);

  // 현재 run progress 에서 tc_id → 실시간 상태 맵.
  // 우선순위 3단 (run b3c98e44 전수 점검):
  //  ① cross_check kind (최종 verdict — pass/fail/unverified) — items 에 이미 내려옴
  //  ② api-mode (ui.verify_mode='api') 의 api.verdict — 브라우저 미수행 TC 의 즉시 판정
  //  ③ ui kind status / step 휴리스틱 (기존)
  // 기존엔 ③만 봐서 api-mode TC (전체의 ~89%) 가 영원히 '대기' 아이콘이었다.
  const liveStatusMap = React.useMemo<Record<string, 'passed' | 'failed' | 'skipped' | 'unverified'>>(() => {
    if (!runProgress?.items?.length) return {};
    const map: Record<string, 'passed' | 'failed' | 'skipped' | 'unverified'> = {};
    for (const item of runProgress.items) {
      // ① cross_check verdict 최우선 — skip 보호 (cc 무신호 pass 가 skip 을 덮지 않음)
      const cc = (item as any).cross_check;
      const uiStatusRaw = (item.ui as any)?.status ?? (item.ui as any)?.tc_status;
      if (cc) {
        const mismatch = cc.has_mismatch === true;
        const unverifiedFlags = cc.inputs_incomplete || cc.ui_skipped
          || cc.db_unverified || cc.api_unverified || cc.error_code === 'CC_PARSE_FAIL';
        const execVerdict = cc.api_exec_verdict;
        if (execVerdict === 'pass') { map[item.tc_id] = 'passed'; continue; }
        if (execVerdict === 'fail') { map[item.tc_id] = 'failed'; continue; }
        if (mismatch) { map[item.tc_id] = 'failed'; continue; }
        if (unverifiedFlags) { map[item.tc_id] = 'unverified'; continue; }
        if (uiStatusRaw !== 'skip') { map[item.tc_id] = 'passed'; continue; }
      }
      // ② api-mode — exec verdict 가 최종 (cc 도착 전 실시간 표시)
      if ((item.ui as any)?.verify_mode === 'api') {
        const v = (item.api as any)?.verdict;
        if (v === 'pass') { map[item.tc_id] = 'passed'; continue; }
        if (v === 'fail') { map[item.tc_id] = 'failed'; continue; }
      }
      // ③ ui kind (기존 휴리스틱)
      if (uiStatusRaw === 'pass') { map[item.tc_id] = 'passed'; continue; }
      if (uiStatusRaw === 'fail') { map[item.tc_id] = 'failed'; continue; }
      // 'skip' = 검증 미완 (자동화 불가 step 보유) — passed 로 둔갑 금지
      if (uiStatusRaw === 'skip') { map[item.tc_id] = 'skipped'; continue; }
      if (item.ui) {
        const steps: any[] = (item.ui as any)?.steps ?? [];
        const hasFail = steps.some((s: any) => s.status === 'fail');
        if (hasFail) map[item.tc_id] = 'failed';
        else if (steps.length > 0) map[item.tc_id] = 'passed';
      }
    }
    return map;
  }, [runProgress]);

  // 결과 보유 TC 집합 — "현재 실행 중 TC" 판정용 (선언 순서상 allTCs 계산
  // 이후에 사용; 아래 doneTcIds/currentTsId 참조).
  const doneTcIds = React.useMemo(
    () => new Set((runProgress?.items ?? []).map(it => it.tc_id)),
    [runProgress],
  );

  // (liveGetNodeStatus 는 전체 계획 TC 수 (allTCs) 가 필요해 allTCs 계산부
  //  이후에 plain 함수로 정의 — useCallback 이 stale allTCs 를 캡처하지 않게)

  /**
   * 현재 selectedRun 을 다시 실행.
   * @param resume true + aborted 면 같은 trace_id 로 재개 (onResumeRun).
   *               false 또는 비-aborted 면 같은 scenarios 로 fresh start (onStartRun).
   */
  const triggerRun = React.useCallback((resume: boolean) => {
    if (!selectedRun) return;
    if (resume && selectedRun.status === 'aborted' && onResumeRun) {
      onResumeRun(selectedRun.id);
      return;
    }
    if (!onStartRun) return;
    const groupId = selectedRun.groupId;
    let scenarioIds: string[] | undefined;
    if (selectedRun.status === 'pending') {
      // 대기 엔트리는 ScenarioPage 에서 저장한 자신의 scenarioIds 를 그대로 사용.
      const sids = (selectedRun as any).scenarioIds as string[] | null | undefined;
      scenarioIds = sids && sids.length ? sids : undefined;
    } else if (groupId) {
      const g = useScenarioStore.getState().groups.find(gr => gr.groupId === groupId);
      scenarioIds = g?.scenarioIds && g.scenarioIds.length ? g.scenarioIds : undefined;
    }
    const pendingId = selectedRun.status === 'pending' ? selectedRun.id : undefined;
    onStartRun(scenarioIds, selectedRun.name, groupId, pendingId);
  }, [selectedRun, onStartRun, onResumeRun]);

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

  // (현재 TS 자동 펼침 / TC 자동 스크롤 effect 는 currentTsId/currentTcId
  //  선언 이후로 이동 — 아래 allTCs 계산부 직후 참조)

  const formatDate  = (value: string) => value.split(' ')[0] ?? value;
  const formatClock = (value: string) => value.split(' ').slice(-1)[0] ?? value;

  // resizable sidebar
  const [sidebarWidth, setSidebarWidth] = React.useState<number | null>(null);
  const dragRef    = React.useRef(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const startXRef  = React.useRef(0);
  const startWRef  = React.useRef(0);
  const runtimeLogRef = React.useRef<HTMLDivElement>(null);
  const scenarioListRef = React.useRef<HTMLDivElement>(null);

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
  // selectedRun.scenarioIds 가 있으면 그 시나리오만 표시 (그룹 단위 실행).
  // 없으면 전체 (E2E 실행).
  const storeScenarios = useScenarioStore((s) => s.scenarios);
  const storeTestCasesByTs = useScenarioStore((s) => s.testCasesByTs);
  const runScenarioIds = (selectedRun as any)?.scenarioIds as string[] | null | undefined;
  const scenarios = React.useMemo(() => {
    const all = storeScenarios.map(toUiScenario);
    if (!runScenarioIds || !runScenarioIds.length) return all;
    return all.filter(s => runScenarioIds.includes(s.id));
  }, [storeScenarios, runScenarioIds]);
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
  // 이 run 의 결과만 표시 — tc.status (scenarioStore 의 last_run_status =
  // '이전 실행' 결과) 폴백은 아직 안 돈 TC/TS 에 과거의 X 를 미리 그린다
  // (스크린샷 실증: 미진행 TS-007~010 이 전부 X). 결과 미보유 = pending.
  const liveTcStatus = (tcId: string): string => liveStatusMap[tcId] ?? 'pending';
  const passedTCs = allTCs.filter(({ tc }) => liveTcStatus(tc.id) === 'passed');
  const failedTCs = allTCs.filter(({ tc }) => liveTcStatus(tc.id) === 'failed');
  const skippedTCs = allTCs.filter(({ tc }) => liveTcStatus(tc.id) === 'skipped');
  const unverifiedTCs = allTCs.filter(({ tc }) => liveTcStatus(tc.id) === 'unverified');

  // 현재 실행 중 TC = "결과 미보유 첫 TC" (실행은 TS/TC 순번대로 진행).
  // 기존 '마지막 로그 항목' 방식은 items 가 사전순 + api-mode TC 가 1초 미만에
  // 지나가서, ui-mode 타임아웃 구간과 L3 분석 단계 (수 분) 동안 마지막
  // ui-mode TC 에 고정돼 'TS-016 멈춤' 으로 보였다 (run b3c98e44 전수 점검).
  const isRunningLive = selectedRun?.status === 'running';
  const firstPending = isRunningLive && doneTcIds.size > 0
    ? allTCs.find(({ tc }) => !doneTcIds.has(tc.id))
    : undefined;
  const currentTsId = firstPending?.sId ?? null;
  const currentTcId = firstPending?.tc.id ?? null;
  // 전 TC 결과 보유 + 아직 running = 실행 단계 종료, L3 (정합/원인 분석) 진행 중
  const inAnalysisPhase = isRunningLive && doneTcIds.size > 0 && allTCs.length > 0 && !firstPending;

  /**
   * AgentProgressStrip 단계별 상태 — 기준 분모는 '전체 계획 TC 수' (allTCs).
   * 이전엔 '결과 보유 항목 수' 를 분모로 써서 결과가 1개만 쌓여도
   * done==total → UI/API/DB 가 실행 초반부터 ✓ 로 보였다 (스크린샷 실증).
   */
  const liveGetNodeStatus = (stage: string): 'inactive' | 'running' | 'complete' => {
    const items = runProgress?.items ?? [];
    if (selectedRun?.status === 'completed') return 'complete';
    if (!items.length) return 'inactive';
    const total = allTCs.length || items.length;  // 계획 수 우선, 폴백으로 보유 수
    const has = (kind: 'ui' | 'api' | 'db') =>
      items.filter(it => (it as any)[kind]).length;
    if (stage === 'UI' || stage === 'API' || stage === 'DB') {
      const done = has(stage.toLowerCase() as 'ui' | 'api' | 'db');
      if (done === 0) return 'inactive';
      return done >= total ? 'complete' : 'running';
    }
    // Cross-check: items 의 cross_check payload 보유 수로 실측
    const ccDone = items.filter(it => (it as any).cross_check).length;
    if (stage === 'Cross-check') {
      if (ccDone > 0) return ccDone >= total ? 'complete' : 'running';
      // 실행 결과는 전부 모였는데 cc 미도착 — 분석 단계 진입 중
      return has('ui') >= total && isRunningLive ? 'running' : 'inactive';
    }
    // 원인 분석 / Report: cc 가 다 모인 뒤 running 으로 표시
    return ccDone >= total && isRunningLive ? 'running' : 'inactive';
  };

  // 현재 실행 중인 TS 자동 펼침
  React.useEffect(() => {
    if (!currentTsId) return;
    setExpandedScenarios(prev => prev.includes(currentTsId) ? prev : [...prev, currentTsId]);
  }, [currentTsId]);

  // 현재 실행 중인 TC 가 보이도록 사이드바 자동 스크롤
  React.useEffect(() => {
    if (!currentTcId) return;
    const el = scenarioListRef.current?.querySelector<HTMLElement>(`[data-tc-id="${currentTcId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentTcId]);

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
            {selectedRun.status === 'pending'
              ? <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#9ca3af]/15 text-[#6b7280]">대기</span>
              : <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#3615CF]/10 text-[#3615CF]">실행 중</span>}
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
                { key: 'SKIPPED',  label: 'SKIPPED', count: skippedTCs.length, color: 'text-[#d4a017]', badge: 'bg-[#d4a017]/15 text-[#d4a017]', underline: 'bg-[#d4a017]' },
                { key: 'UNVERIFIED', label: 'UNVERIFIED', count: unverifiedTCs.length, color: 'text-[#7c8db5]', badge: 'bg-[#7c8db5]/15 text-[#7c8db5]', underline: 'bg-[#7c8db5]' },
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

          <div ref={scenarioListRef} className="flex-1 min-h-0 overflow-y-auto py-1">
            <div>
              {scenarios.map(scenario => {
                const isExpanded = expandedScenarios.includes(scenario.id);
                const isCurrentTs = selectedRun?.status === 'running' && currentTsId === scenario.id;
                const allTcs = testCasesMap[scenario.id] || [];
                const tcs = scenarioSidebarTab === 'PASS'
                  ? allTcs.filter(tc => liveTcStatus(tc.id) === 'passed')
                  : scenarioSidebarTab === 'FILTERED'
                  ? allTcs.filter(tc => liveTcStatus(tc.id) === 'failed')
                  : scenarioSidebarTab === 'SKIPPED'
                  ? allTcs.filter(tc => liveTcStatus(tc.id) === 'skipped')
                  : scenarioSidebarTab === 'UNVERIFIED'
                  ? allTcs.filter(tc => liveTcStatus(tc.id) === 'unverified')
                  : allTcs;
                // TS 단위 live 상태 — TC live 결과에서 derive.
                const liveTsStatus = (() => {
                  if (!allTcs.length) return 'pending';
                  const statuses = allTcs.map(tc => liveTcStatus(tc.id));
                  // 이 run 의 결과가 하나도 없으면 미진행 — 과거 결과로 칠하지 않는다
                  if (statuses.every(s => s === 'pending')) return 'pending';
                  if (statuses.some(s => s === 'failed')) return 'failed';
                  if (statuses.every(s => s === 'passed')) return 'passed';
                  return 'running';
                })();
                if (scenarioSidebarTab !== 'TOTAL' && tcs.length === 0) return null;
                return (
                  <div key={scenario.id}>
                    {/* TS 행 */}
                    <div
                      className={`group flex items-center gap-1.5 px-2 py-2 border-b border-[#f0f0f0]/60 cursor-pointer transition-colors ${
                        isCurrentTs
                          ? 'bg-[#EAE8F9]/50 border-l-[3px] border-l-[#3615CF] hover:bg-[#EAE8F9]/70'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setExpandedScenarios(prev =>
                          prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                        );
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
                      <StatusIcon status={liveTsStatus} size="w-3.5 h-3.5" />
                    </div>

                    {/* TC 행 */}
                    {isExpanded && tcs.map(tc => {
                      const tcKey = `${scenario.id}_${tc.id}`;
                      const isTCExpanded = expandedTestCases.includes(tcKey);
                      const isCurrentTc = isCurrentTs && currentTcId === tc.id;
                      const frEntries = rtmMappings.filter(r => r.ts === scenario.id && r.tc === tc.id);
                      return (
                        <div key={tc.id} data-tc-id={tc.id}>
                          <div
                            className={`group flex items-center gap-1.5 pl-7 pr-2 py-1.5 border-b border-[#f0f0f0]/40 cursor-pointer transition-colors ${
                              isCurrentTc
                                ? 'bg-[#EAE8F9]/70 border-l-[3px] border-l-[#3615CF]'
                                : 'bg-[#F9FAFB] hover:bg-opacity-80'
                            }`}
                            onClick={() => {
                              setExpandedTestCases(prev =>
                                prev.includes(tcKey) ? prev.filter(id => id !== tcKey) : [...prev, tcKey]
                              );
                            }}>
                            <button className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {tc.values.length > 0
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
                            {isCurrentTc
                              ? <Loader2 className="w-3 h-3 text-[#3615CF] animate-spin flex-shrink-0" />
                              : <StatusIcon status={liveTcStatus(tc.id)} size="w-3 h-3" />}
                          </div>

                          {/* TV 행 */}
                          {isTCExpanded && tc.values.map(tv => {
                            const tvKey = `${scenario.id}_${tc.id}_${tv.id}`;
                            const ep = mockTVEndpoints[tvKey];
                            const validations = mockValidationConditions[tvKey] || [];
                            const isOk = ep ? ep.statusCode < 400 : true;
                            return (
                              <div key={tv.id} className="border-b border-[#f0f0f0]/30" style={{ paddingLeft: '3.25rem' }}>
                                <div className="group flex items-center gap-1.5 pr-2 py-1.5 cursor-pointer transition-colors bg-white hover:bg-slate-50"
                                  onClick={() => scrollToLog(0)}>
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
                onClick={async () => {
                  // selectedRun.status 가 ground truth.
                  //   running  → 정지 (stop API)
                  //   aborted  → 이어서 실행 (resume_from_trace)
                  //   그 외    → 실행 (fresh start)
                  if (selectedRun?.status === 'running' && serviceUuid) {
                    try {
                      await stopRun(serviceUuid, selectedRun.id);
                    } catch (err) {
                      console.error('정지 요청 실패', err);
                    }
                    setIsTestRunning(false);
                  } else {
                    triggerRun(selectedRun?.status === 'aborted');
                    setIsTestRunning(true);
                  }
                }}
                className="flex-1 min-w-0 px-3 py-2 bg-primary-blue text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                {selectedRun?.status === 'running'
                  ? <><Pause className="w-4 h-4" /> 정지</>
                  : selectedRun?.status === 'aborted'
                    ? <><Play className="w-4 h-4" /> 이어서 실행</>
                    : <><Play className="w-4 h-4" /> 실행</>}
              </button>
              <button
                onClick={() => {
                  // "전체 재실행" = 항상 fresh start. aborted 라도 처음부터 모든 TC 실행.
                  setIsTestRunning(false);
                  triggerRun(false);
                }}
                className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center justify-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> 전체 재실행
              </button>
            </div>
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
            <AgentProgressStrip getNodeStatus={liveGetNodeStatus} />
            {inAnalysisPhase && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3615CF]/5 border border-[#3615CF]/15 text-xs text-[#3615CF] flex-shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                전체 TC 실행 완료 — 정합성 검증(Cross-check)·원인 분석 단계 진행 중입니다. 결과가 곧 확정됩니다.
              </div>
            )}
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4">
              <TerminalFrame title="qapilot-preview - zsh" bodyClassName="aspect-video flex items-center justify-center p-0 overflow-hidden">
                {screenshotUrl ? (
                  <img
                    src={screenshotUrl}
                    alt="live browser screenshot"
                    className="max-w-full max-h-full object-contain bg-white"
                  />
                ) : (
                  <div className="text-center text-[#9aa0a6] p-4">
                    {selectedRun?.status === 'running' ? (
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    ) : (
                      <Eye className="w-8 h-8 mx-auto mb-3 opacity-70" />
                    )}
                    <div className="font-mono text-xs">
                      {selectedRun?.status === 'running'
                        ? '스크린샷을 기다리는 중...'
                        : selectedRun?.status === 'pending'
                          ? '"실행" 버튼을 누르면 테스트가 시작됩니다'
                          : '테스트 실행 중 실시간 화면이 표시됩니다'}
                    </div>
                  </div>
                )}
              </TerminalFrame>
              <RuntimeTerminal
                logs={liveLogs}
                highlightedLogIdx={highlightedLogIdx}
                idPrefix="ip-log"
                scrollContainerRef={runtimeLogRef}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
