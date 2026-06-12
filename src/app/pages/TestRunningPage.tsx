import React from 'react';
import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Eye, GitBranch, List, Loader2, Pause, Play, RotateCcw,
} from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { TerminalFrame, RuntimeTerminal } from '../components/common/RuntimeTerminal';
import { StatusIcon } from '../components/common/StatusIcon';
import { useScenarioStore, toUiScenario, toUiTestCase } from '../../store/scenarioStore';
import { useRtmStore } from '../../store/rtmStore';
import { useTestStore } from '../../store/testStore';
import { fetchLatestScreenshotUrl, getRunProgress, stopRun, type RunProgress } from '../../api/runs';
import { getActionMapping } from '../../api/scenarios';
import * as scenariosApi from '../../api/scenarios';
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

const ACTION_LABELS: Record<string, string> = {
  navigate: '이동',
  click: '클릭',
  fill: '입력',
  check: '체크',
  uncheck: '체크 해제',
  select: '선택',
  hover: '호버',
  wait: '대기',
  assert_visible: '표시 확인',
  assert_text: '텍스트 확인',
  assert_value: '값 확인',
  assert_url: 'URL 확인',
};

/** ActionStep 1개를 사람이 읽을 수 있는 한 줄로 표현. */
function describeStep(step: scenariosApi.ActionStep): string {
  const label = ACTION_LABELS[step.action] ?? step.action;
  if (step.action === 'navigate') return `${label}: ${step.value ?? ''}`;
  if (step.selector) {
    const target = `[${step.selector}]`;
    if (step.value != null && step.value !== '') return `${label} ${target} = ${step.value}`;
    if (step.expected != null && step.expected !== '') return `${label} ${target} — ${step.expected}`;
    return `${label} ${target}`;
  }
  if (step.expected) return `${label}: ${step.expected}`;
  return label;
}

function renderMappingContext(mapping?: scenariosApi.ActionMapping | 'loading' | 'error' | null) {
  if (!mapping || mapping === 'loading' || mapping === 'error' || !mapping.mapping_context) return null;
  const ctx = mapping.mapping_context;
  const routeRefs = ctx.route_refs ?? [];
  const sourceRefs = ctx.source_refs ?? [];
  const requestSchemas = ctx.schema_refs?.request_schemas ?? [];
  const responseSchemas = ctx.schema_refs?.response_schemas ?? [];
  const dbModels = ctx.schema_refs?.db_models ?? [];
  const selectorRoutes = ctx.selector_route_refs ?? [];
  const sourceStatus = ctx.source_status ?? '';
  const sourceCandidates = ctx.source_candidates ?? [];
  if (!routeRefs.length && !sourceRefs.length && !requestSchemas.length && !responseSchemas.length && !dbModels.length && !selectorRoutes.length && !sourceStatus && !sourceCandidates.length) return null;

  return (
    <div className="mx-2 mb-2 rounded-lg border border-[#e5e7eb] bg-[#fcfcfd] px-3 py-2" style={{ marginLeft: '3.25rem' }}>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">Mapping Context</div>
      {routeRefs.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-medium text-[#6b7280]">Route</div>
          <div className="flex flex-wrap gap-1.5">
            {routeRefs.map((route, idx) => (
              <span key={`${route.path ?? 'route'}-${idx}`} className="rounded bg-[#eef2ff] px-2 py-1 text-[10px] text-[#4338ca]">
                {(route.path || '—')}{route.component_file ? ` · ${route.component_file.split('/').slice(-1)[0]}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
      {(requestSchemas.length > 0 || responseSchemas.length > 0 || dbModels.length > 0) && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-medium text-[#6b7280]">Schema</div>
          <div className="flex flex-wrap gap-1.5">
            {requestSchemas.map((name) => <span key={`req-${name}`} className="rounded bg-[#ecfeff] px-2 py-1 text-[10px] text-[#0f766e]">REQ {name}</span>)}
            {responseSchemas.map((name) => <span key={`res-${name}`} className="rounded bg-[#eff6ff] px-2 py-1 text-[10px] text-[#1d4ed8]">RES {name}</span>)}
            {dbModels.map((name) => <span key={`db-${name}`} className="rounded bg-[#fef3c7] px-2 py-1 text-[10px] text-[#b45309]">DB {name}</span>)}
          </div>
        </div>
      )}
      {selectorRoutes.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-medium text-[#6b7280]">Selector Catalog</div>
          <div className="space-y-1">
            {selectorRoutes.map((route, idx) => (
              <div key={`${route.route ?? 'selector'}-${idx}`} className="text-[10px] text-[#6b7280]">
                {route.route || '—'} · input {route.input_count ?? 0} / button {route.button_count ?? 0} / output {route.output_count ?? 0}
              </div>
            ))}
          </div>
        </div>
      )}
      {sourceRefs.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-medium text-[#6b7280]">Source</div>
          <div className="space-y-1">
            {sourceRefs.map((src, idx) => (
              <div key={`${src.file ?? 'source'}-${idx}`} className="font-mono text-[10px] text-[#4b5563]">
                {src.file || '—'}{src.line_start != null && src.line_end != null ? `:${src.line_start}-${src.line_end}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {(sourceStatus || sourceCandidates.length > 0) && (
        <div className={sourceRefs.length > 0 ? 'mt-2' : ''}>
          <div className="mb-1 text-[10px] font-medium text-[#6b7280]">Source Status</div>
          {sourceStatus && (
            <div className="mb-1.5">
              <span className={`rounded px-2 py-1 text-[10px] ${
                sourceStatus === 'loaded'
                  ? 'bg-[#dcfce7] text-[#15803d]'
                  : sourceStatus === 'missing'
                    ? 'bg-[#fef3c7] text-[#b45309]'
                    : sourceStatus === 'no_candidates'
                      ? 'bg-[#ffedd5] text-[#c2410c]'
                    : 'bg-[#f3f4f6] text-[#6b7280]'
              }`}>
                {sourceStatus}
              </span>
            </div>
          )}
          {sourceCandidates.length > 0 && (
            <div className="space-y-1">
              {sourceCandidates.map((candidate, idx) => (
                <div key={`${candidate.file ?? 'candidate'}-${idx}`} className="rounded border border-[#f1f5f9] bg-white px-2 py-1.5">
                  <div className="font-mono text-[10px] text-[#4b5563]">
                    {candidate.file || '—'}{candidate.line_start != null && candidate.line_end != null ? `:${candidate.line_start}-${candidate.line_end}` : ''}
                  </div>
                  {candidate.reason && (
                    <div className="mt-0.5 text-[10px] text-[#6b7280]">{candidate.reason}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type RunningTest = { id: string; name: string; groupId: string | null; startTime: string; status: 'pending' | 'running' | 'aborted' | 'completed' };
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

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
      if (screenshotUrlRef.current) {
        URL.revokeObjectURL(screenshotUrlRef.current);
        screenshotUrlRef.current = null;
      }
      setScreenshotUrl(null);
      setRunProgress(null);
      tickRef.current = undefined;
      return;
    }

    let cancelled = false;
    const runId = selectedRun.id;
    const isLive = selectedRun.status === 'running';

    const tick = async () => {
      try {
        const [nextUrl, progress] = await Promise.all([
          fetchLatestScreenshotUrl(serviceUuid, runId),
          getRunProgress(serviceUuid, runId),
        ]);
        if (cancelled) {
          if (nextUrl) URL.revokeObjectURL(nextUrl);
          return;
        }
        if (nextUrl) {
          if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
          screenshotUrlRef.current = nextUrl;
          setScreenshotUrl(nextUrl);
        }
        setRunProgress(progress);
      } catch (err) {
        if (cancelled) return;
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
      if (screenshotUrlRef.current) {
        URL.revokeObjectURL(screenshotUrlRef.current);
        screenshotUrlRef.current = null;
      }
    };
  }, [serviceUuid, selectedRun?.id, selectedRun?.status]);

  // 현재 실행 중인 step — UITestTool 이 스텝 시작 시 publish 하는 "tc_step" 이벤트.
  // {tcId, stepNo, totalSteps, action}. TC 별 action step 목록에서 강조 표시에 사용.
  const [currentStep, setCurrentStep] = React.useState<{
    tcId: string; stepNo: number; totalSteps: number; action: string;
  } | null>(null);

  // SSE — 이벤트 도착하면 즉시 tick 트리거. 1초 폴링 대비 latency ~0.
  useRunStream(
    serviceUuid,
    selectedRun?.id ?? null,
    {
      enabled: selectedRun?.status === 'running',
      onEvent: (event) => {
        void tickRef.current?.();
        if (event.type === 'tc_step') {
          const d = event.data as Record<string, unknown>;
          setCurrentStep({
            tcId: String(d.tc_id ?? ''),
            stepNo: Number(d.step_no ?? 0),
            totalSteps: Number(d.total_steps ?? 0),
            action: String(d.action ?? ''),
          });
        }
      },
    },
  );

  // ── TC 별 action mapping (실행 스텝 시퀀스) — 펼친 TC 만 lazy fetch + 캐시 ──
  const [actionMappings, setActionMappings] = React.useState<
    Record<string, scenariosApi.ActionMapping | 'loading' | 'error'>
  >({});

  React.useEffect(() => {
    if (!serviceUuid) return;
    for (const tcKey of expandedTestCases) {
      const tcId = tcKey.split('_').slice(1).join('_');
      if (!tcId || actionMappings[tcId]) continue;
      setActionMappings(prev => ({ ...prev, [tcId]: 'loading' }));
      getActionMapping(serviceUuid, tcId)
        .then(am => setActionMappings(prev => ({ ...prev, [tcId]: am })))
        .catch(() => setActionMappings(prev => ({ ...prev, [tcId]: 'error' })));
    }
  }, [expandedTestCases, serviceUuid]);

  const liveLogs = React.useMemo(() => toRuntimeLogs(runProgress), [runProgress]);

  // 현재 실행 중인 ts_id / tc_id — 마지막 로그 액션에서 추출.
  const [currentTsId, currentTcId] = React.useMemo(() => {
    if (selectedRun?.status !== 'running' || !liveLogs.length) return [null, null];
    const lastLog = liveLogs[liveLogs.length - 1];
    const parts = lastLog?.action?.split('/') ?? [];
    return [parts[0] ?? null, parts[1]?.split(' ')[0] ?? null];
  }, [selectedRun?.status, liveLogs]);

  // 현재 run progress 에서 tc_id → 실시간 pass/fail 맵.
  // scenarioStore 의 last_run_status(이전 실행 결과)를 덮어써서 X / ✓ 가 즉시 반영되도록.
  const liveStatusMap = React.useMemo<Record<string, 'passed' | 'failed'>>(() => {
    if (!runProgress?.items?.length) return {};
    const map: Record<string, 'passed' | 'failed'> = {};
    for (const item of runProgress.items) {
      const uiStatus = (item.ui as any)?.status ?? (item.ui as any)?.tc_status;
      if (uiStatus === 'pass') { map[item.tc_id] = 'passed'; continue; }
      if (uiStatus === 'fail') { map[item.tc_id] = 'failed'; continue; }
      if (item.ui) {
        const steps: any[] = (item.ui as any)?.steps ?? [];
        const hasFail = steps.some((s: any) => s.status === 'fail');
        if (hasFail) map[item.tc_id] = 'failed';
        else if (steps.length > 0) map[item.tc_id] = 'passed';
      }
    }
    return map;
  }, [runProgress]);

  /**
   * AgentProgressStrip 의 단계별 상태를 runProgress + selectedRun 에서 derive.
   * - UI/API/DB: TC 당 ui_result/api_result/db_result 가 디스크에 쓰이면 카운트.
   *   전체 카운트 > 0 면 "running", 전 항목에 결과 있으면 "complete".
   * - Cross-check / 원인 분석 / Report: 별도 endpoint 없어서 heuristic.
   *   selectedRun.status === 'completed' 면 모두 complete.
   *   그 외엔 inactive (실제 진행 표시는 향후 L3 API 도입 시 보강).
   */
  const liveGetNodeStatus = React.useCallback((stage: string): 'inactive' | 'running' | 'complete' => {
    if (!runProgress || runProgress.items.length === 0) return 'inactive';
    const total = runProgress.items.length;
    const has = (kind: 'ui' | 'api' | 'db') => runProgress.items.filter(it => (it as any)[kind]).length;
    if (stage === 'UI' || stage === 'API' || stage === 'DB') {
      const kind = stage.toLowerCase() as 'ui' | 'api' | 'db';
      const done = has(kind);
      if (done === 0) return 'inactive';
      if (done >= total && selectedRun?.status !== 'running') return 'complete';
      if (done >= total) return 'complete';
      return 'running';
    }
    // L3 stages: completed 시 일괄 complete, 그 외 inactive.
    if (selectedRun?.status === 'completed') return 'complete';
    return 'inactive';
  }, [runProgress, selectedRun?.status]);

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
  const passedTCs = allTCs.filter(({ tc }) => { const s = liveStatusMap[tc.id] ?? tc.status; return s === 'passed' || s === 'completed'; });
  const failedTCs = allTCs.filter(({ tc }) => (liveStatusMap[tc.id] ?? tc.status) === 'failed');

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
                  ? allTcs.filter(tc => { const s = liveStatusMap[tc.id] ?? tc.status; return s === 'passed' || s === 'completed'; })
                  : scenarioSidebarTab === 'FILTERED'
                  ? allTcs.filter(tc => (liveStatusMap[tc.id] ?? tc.status) === 'failed')
                  : allTcs;
                // TS 단위 live 상태 — TC live 결과에서 derive.
                const liveTsStatus = (() => {
                  if (!allTcs.length) return scenario.status;
                  const statuses = allTcs.map(tc => liveStatusMap[tc.id] ?? tc.status);
                  if (statuses.some(s => s === 'failed')) return 'failed';
                  if (statuses.every(s => s === 'passed' || s === 'completed')) return 'passed';
                  return scenario.status;
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
                              {isTCExpanded ? <ChevronDown className="w-3 h-3 text-[#9ca3af]" /> : <ChevronRight className="w-3 h-3 text-[#9ca3af]" />}
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
                              : <StatusIcon status={liveStatusMap[tc.id] ?? tc.status} size="w-3 h-3" />}
                          </div>

                          {/* Action step 행 — 이 TC 의 실행 스텝 시퀀스 + 실시간 진행 표시 */}
                          {isTCExpanded && (() => {
                            const am = actionMappings[tc.id];
                            if (am === 'loading') {
                              return <div className="px-4 py-2 text-[10px] text-slate-400" style={{ paddingLeft: '3.25rem' }}>스텝 정보를 불러오는 중...</div>;
                            }
                            if (am === 'error' || !am) {
                              return <div className="px-4 py-2 text-[10px] text-slate-400" style={{ paddingLeft: '3.25rem' }}>실행 스텝 정보가 없습니다.</div>;
                            }
                            const tcResult = runProgress?.items.find(it => it.tc_id === tc.id);
                            const resultSteps: Array<Record<string, unknown>> = ((tcResult?.ui as any)?.steps as any[]) || [];
                            return (
                              <>
                                {renderMappingContext(am)}
                                {am.steps.map(step => {
                                  const result = resultSteps.find(r => Number(r.step_no) === step.step_no);
                                  const resultStatus = result?.status as string | undefined;
                                  const isRunningStep = isCurrentTc && !resultStatus
                                    && currentStep?.tcId === tc.id && currentStep.stepNo === step.step_no;
                                  const stepStatus = resultStatus === 'pass' ? 'passed' : resultStatus === 'fail' ? 'failed' : resultStatus === 'skip' ? 'pending' : 'pending';
                                  return (
                                    <div key={step.step_no}
                                      className={`flex items-center gap-1.5 pr-2 py-1.5 border-b border-[#f0f0f0]/30 transition-colors ${
                                        isRunningStep ? 'bg-[#EAE8F9]/60 border-l-[3px] border-l-[#3615CF]' : 'bg-white'
                                      }`}
                                      style={{ paddingLeft: isRunningStep ? 'calc(3.25rem - 3px)' : '3.25rem' }}>
                                      <span className="px-1.5 py-0.5 text-[8px] rounded font-bold font-mono flex-shrink-0 bg-slate-100 text-slate-500">
                                        {step.step_no}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-600 truncate flex-1">{describeStep(step)}</span>
                                      {step.api_endpoint && (
                                        <span className="font-mono text-[9px] text-[#3615CF]/60 truncate flex-shrink-0 max-w-[40%]">{step.api_endpoint}</span>
                                      )}
                                      {isRunningStep
                                        ? <Loader2 className="w-3 h-3 text-[#3615CF] animate-spin flex-shrink-0" />
                                        : resultStatus
                                          ? <StatusIcon status={stepStatus} size="w-3 h-3" />
                                          : <span className="w-3 h-3 flex-shrink-0" />}
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
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
