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
import { fetchLatestScreenshotUrl, getRunProgress, stopRun, type RunProgress, type RunProgressItem } from '../../api/runs';
import { getActionMapping, type ActionStep } from '../../api/artifacts';
import { useRunStream } from '../../hooks/useRunStream';

// 실행 스텝 action → 한글 라벨 (좌측 패널 표시용)
const ACTION_LABEL: Record<string, string> = {
  navigate: '이동', fill: '입력', click: '클릭', check: '체크', uncheck: '체크해제',
  select: '선택', upload: '업로드', press: '키입력', hover: '호버',
  assert: '검증', assert_visible: '표시 검증', assert_text: '텍스트 검증',
  assert_url: 'URL 검증', wait: '대기', reload: '새로고침',
};
import { useCdpStream } from '../../hooks/useCdpStream';

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

/**
 * 스텝 아래 표시할 "DB 검증" 한 줄 — 무엇을 검증하는지 간략 서술.
 * 우선순위: ① api db_observation(kind/table) → ② db_result snapshots 변화 → ③ 일반 폴백.
 * DB 가 생략(skipped)됐으면 null (표시 안 함).
 */
function deriveDbVerifyText(item: RunProgressItem | undefined): string | null {
  if (!item) return '데이터 반영 검증';  // 결과 도착 전(live) — 무엇을 볼지 미리 표기
  const api = item.api as Record<string, any> | null | undefined;
  const db = item.db as Record<string, any> | null | undefined;

  // ① API-mode 의 DB 관찰 계약 (kind + table)
  const obs = api?.db_observation as { kind?: string; table?: string } | undefined;
  if (obs?.table) {
    if (obs.kind === 'exists') return `${obs.table} 테이블 신규 행 생성 확인`;
    if (obs.kind === 'hash') return `${obs.table} 테이블 암호화 저장 확인`;
    return `${obs.table} 테이블 상태 확인`;
  }

  // ② 일반 경로 — 스냅샷 전후 diff
  if (db?.skipped) return null;
  const snaps = (db?.snapshots as any[] | undefined) ?? [];
  if (snaps.length) {
    const changed = snaps
      .map((s) => {
        const parts: string[] = [];
        if (s.added) parts.push(`+${s.added}행`);
        if (s.deleted) parts.push(`-${s.deleted}행`);
        if (s.modified) parts.push(`~${s.modified}행`);
        return parts.length ? `${s.table} ${parts.join(' ')}` : null;
      })
      .filter(Boolean) as string[];
    if (changed.length) {
      return changed.slice(0, 2).join(', ') + (changed.length > 2 ? ' 외' : '');
    }
    return '데이터 변경 없음 확인';
  }

  // ③ db 결과 아직 없음(진행 전)
  return '데이터 반영 검증';
}

/** precondition SQL 에서 대상 테이블명 추출 (INSERT INTO / FROM). 없으면 null. */
function precondTableOf(sql?: string | null): string | null {
  if (!sql) return null;
  const m = sql.match(/INSERT\s+INTO\s+"?(\w+)"?/i) || sql.match(/FROM\s+"?(\w+)"?/i);
  return m ? m[1] : null;
}

/** DB precondition(실행 후) 결과 한 줄 텍스트 — 대상 테이블 포함해 구체적으로. */
function dbPrecondText(
  p: { matched?: boolean; seeded?: boolean; error?: string | null } | undefined,
  table?: string | null,
): string | null {
  if (!p) return null;
  const t = table ? `${table} ` : '';
  if (p.error) return `DB 준비 실패 · ${p.error}`;
  if (p.seeded) return `DB 준비 · ${t}없음 → 시드 적용 완료`;
  if (p.matched) return `DB 준비 · ${t}이미 존재 (시드 불필요)`;
  return `DB 준비 · ${t}상태 확인`;
}

/** 임의 값을 React 자식으로 안전한 문자열로 변환 — 객체(예: {plan_id, order_id})면 JSON 문자열화.
 * step 의 value/selector 등이 문자열이 아닌 객체로 올 수 있어 직접 렌더 시 React 크래시 방지. */
function asText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

/** DB 변경 행 한 줄 표기 — key=value 나열 (긴 값은 CSS break-all 로 처리). */
function formatRow(row: Record<string, unknown>): string {
  return Object.entries(row)
    .map(([k, v]) => `${k}=${v === null || v === undefined ? 'null' : String(v)}`)
    .join('   ');
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

  // ── 현재 진행 스텝 + TC별 스텝 목록 (좌측 패널 TV 대체 + 프리뷰 싱크) ──
  // currentStep: artifact SSE 이벤트(step_index + s3_key)로 갱신 → 프리뷰가
  // 보여주는 스크린샷과 동일 스텝. stepMappings: TC 펼침 시 action mapping fetch.
  const [currentStep, setCurrentStep] = React.useState<{ tcId: string; stepIndex: number } | null>(null);
  const [stepMappings, setStepMappings] = React.useState<Record<string, ActionStep[]>>({});
  // action mapping 에 실린 precondition — 실행 전(preview)에도 "준비" step 을 보여주기 위함.
  const [precondMappings, setPrecondMappings] = React.useState<Record<string, { check?: string | null; seed?: string | null }>>({});
  // DB 검증 라인 클릭 → 변경 행 상세 펼침 (tc.id 집합).
  const [openDbDetail, setOpenDbDetail] = React.useState<Set<string>>(new Set());
  const toggleDbDetail = React.useCallback((tcId: string) => {
    setOpenDbDetail((prev) => {
      const next = new Set(prev);
      if (next.has(tcId)) next.delete(tcId); else next.add(tcId);
      return next;
    });
  }, []);
  // "준비"(precondition) step 클릭 → 파악/조치 상세 펼침.
  const [openPrecondDetail, setOpenPrecondDetail] = React.useState<Set<string>>(new Set());
  const togglePrecondDetail = React.useCallback((tcId: string) => {
    setOpenPrecondDetail((prev) => {
      const next = new Set(prev);
      if (next.has(tcId)) next.delete(tcId); else next.add(tcId);
      return next;
    });
  }, []);
  const fetchedMappingsRef = React.useRef<Set<string>>(new Set());

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
      onEvent: (ev) => {
        void tickRef.current?.();
        // artifact 이벤트 = 스텝별 스크린샷이 방금 저장됨 → 그 스텝이 현재 진행 스텝.
        // s3_key: runs/{run}/tc/{ts}/{tc}/screenshots/step_N.png 에서 tc_id 추출.
        if (ev?.type === 'artifact' && ev.data) {
          const key = String((ev.data as Record<string, unknown>).s3_key ?? '');
          const tcId = key.match(/\/([^/]+)\/screenshots\//)?.[1];
          const stepIndex = Number((ev.data as Record<string, unknown>).step_index);
          if (tcId && Number.isFinite(stepIndex)) setCurrentStep({ tcId, stepIndex });
        }
      },
    },
  );

  // ── 실시간 스트리밍 — CDP Screencast WebSocket (selectedRun.id == trace_id) ──
  // 스텝별 스크린샷 폴링은 그대로 두고, running 중에는 라이브 프레임을 받아
  // canvas 에 그린다. 스트림 프레임이 도착하면 LIVE, 없으면 스크린샷으로 폴백.
  const cdpFrameDataUrl = useCdpStream(
    selectedRun?.id ?? null,
    selectedRun?.status === 'running',
  );
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const isStreaming = cdpFrameDataUrl !== null;

  // 디코드된 프레임을 canvas 에 그린다 (<img src> 교체 시의 깜빡임 방지 — 새 프레임
  // 디코드가 끝난 뒤에만 drawImage 로 한 번에 교체).
  React.useEffect(() => {
    if (!cdpFrameDataUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 800;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
    };
    img.src = cdpFrameDataUrl;
  }, [cdpFrameDataUrl]);

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

  // tc_id → RunProgressItem — 스텝 아래 API/DB 검증 라인이 해당 TC 의 결과(api/db)를 참조.
  const itemByTc = React.useMemo<Record<string, RunProgressItem>>(() => {
    const map: Record<string, RunProgressItem> = {};
    for (const it of runProgress?.items ?? []) map[it.tc_id] = it;
    return map;
  }, [runProgress]);

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
  // doneTcIds 가 비어있어도(= TC #1 진행 중) firstPending = allTCs[0] 으로 잡혀야
  // step panel auto-expand + 현재 스텝 강조가 첫 TC 부터 동작한다. 전 TC 완료 시엔
  // find 가 undefined 를 반환해 L3 분석 단계 stuck-highlight 가드가 그대로 유지됨.
  const firstPending = isRunningLive
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

  // 현재 실행 중인 TC 가 보이도록 사이드바 자동 스크롤 + 자동 펼침 (스텝 표시)
  React.useEffect(() => {
    if (!currentTcId) return;
    const el = scenarioListRef.current?.querySelector<HTMLElement>(`[data-tc-id="${currentTcId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (currentTsId) {
      const key = `${currentTsId}_${currentTcId}`;
      setExpandedTestCases(prev => prev.includes(key) ? prev : [...prev, key]);
    }
  }, [currentTcId, currentTsId]);

  // run 바뀌면 현재 스텝/스텝 매핑 캐시 리셋
  React.useEffect(() => {
    setCurrentStep(null);
    setStepMappings({});
    fetchedMappingsRef.current = new Set();
  }, [selectedRun?.id]);

  // 펼쳐진 TC 의 action mapping(스텝 목록) fetch — TV 대신 표시할 스텝.
  React.useEffect(() => {
    if (!serviceUuid || !selectedRun?.id) return;
    const runId = selectedRun.id;
    expandedTestCases.forEach((key) => {
      const tcId = key.split('_')[1];  // key = `${scenarioId}_${tcId}` (각 1개 '_')
      if (!tcId || fetchedMappingsRef.current.has(tcId)) return;
      fetchedMappingsRef.current.add(tcId);
      getActionMapping(serviceUuid, runId, tcId)
        .then((am) => {
          if (am?.steps?.length) setStepMappings((prev) => ({ ...prev, [tcId]: am.steps }));
          if (am?.db_check_sql || am?.db_seed_sql) {
            setPrecondMappings((prev) => ({ ...prev, [tcId]: { check: am.db_check_sql, seed: am.db_seed_sql } }));
          }
        })
        .catch(() => fetchedMappingsRef.current.delete(tcId));
    });
  }, [expandedTestCases, serviceUuid, selectedRun?.id]);

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
                              : <StatusIcon status={liveTcStatus(tc.id)} size="w-3 h-3" />}
                          </div>

                          {/* 스텝 행 (TV 대체) — action mapping 의 스텝. 현재 진행
                              스텝(artifact 이벤트)을 강조 → qapilot-preview 와 싱크. */}
                          {isTCExpanded && (() => {
                            const steps = stepMappings[tc.id];
                            if (!steps) {
                              return (
                                <div className="py-1.5 text-[10px] text-slate-400" style={{ paddingLeft: '3.25rem' }}>
                                  스텝 불러오는 중…
                                </div>
                              );
                            }
                            if (steps.length === 0) {
                              return (
                                <div className="py-1.5 text-[10px] text-slate-400" style={{ paddingLeft: '3.25rem' }}>
                                  실행 스텝 없음
                                </div>
                              );
                            }
                            const tcItem = itemByTc[tc.id];
                            const apiStepNos = steps.filter((s) => s.api_endpoint).map((s) => s.step_no);
                            // DB 검증 라인은 API 트리거 스텝(마지막) 밑에 — API 스텝이 없으면 마지막 스텝 밑에.
                            const dbAnchorStepNo = apiStepNos.length
                              ? apiStepNos[apiStepNos.length - 1]
                              : steps[steps.length - 1]?.step_no;
                            const dbVerifyText = deriveDbVerifyText(tcItem);
                            // DB 변경 행 상세 — 클릭 시 펼침. 미변경/생략이면 클릭 비활성.
                            const dbSnapshots = ((tcItem?.db as any)?.snapshots as any[] | undefined) ?? [];
                            const dbChangedTables = dbSnapshots.filter(
                              (s) => (s?.rows_added?.length || s?.rows_removed?.length));
                            const hasDbDetail = dbChangedTables.length > 0;
                            const dbDetailOpen = openDbDetail.has(tc.id);
                            // 롤백 step — DB 테스트가 실제로 수행됐으면(skip 아님) 마지막에 표기.
                            const dbRan = !!tcItem?.db && !(tcItem.db as any).skipped;
                            // precondition step — 3상태: 예정(preview) / 로딩(실행중) / 완료(결과+토글).
                            const dbPrecond = (tcItem?.db as any)?.precondition;
                            const _planned = precondMappings[tc.id];
                            const _precTable = precondTableOf(_planned?.check || _planned?.seed);
                            const precResolved = !!dbPrecond;                              // 결과 도착
                            const precPlanned = !!(_planned?.check || _planned?.seed);     // precondition 정의 있음
                            const precLoading = !precResolved && precPlanned && isCurrentTc; // 실행 중
                            const precDetailOpen = openPrecondDetail.has(tc.id);
                            let dbPrecondLabel: string | null = null;
                            if (precResolved) dbPrecondLabel = dbPrecondText(dbPrecond, _precTable);
                            else if (precLoading) dbPrecondLabel = `DB 준비 · ${_precTable ?? '데이터'} 상태 확인 중…`;
                            else if (precPlanned) dbPrecondLabel = `DB 준비 · ${_precTable ?? '데이터'} 존재 확인 (없으면 시드) · 예정`;
                            const stepRows = steps.map((st) => {
                              // 프리뷰가 보여주는 스텝(artifact 이벤트) 과 동일 → 싱크
                              const isCurrent = currentStep?.tcId === tc.id
                                && currentStep?.stepIndex === st.step_no;
                              const showDbVerify = st.step_no === dbAnchorStepNo && !!dbVerifyText;
                              return (
                                <React.Fragment key={st.step_no}>
                                  <div
                                    style={{ paddingLeft: '3.25rem' }}
                                    className={`flex items-center gap-1.5 pr-2 py-1.5 border-b border-[#f0f0f0]/30 transition-colors ${
                                      isCurrent
                                        ? 'bg-[#EAE8F9]/70 border-l-[3px] border-l-[#3615CF]'
                                        : 'bg-white hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="px-1.5 py-0.5 text-[8px] rounded font-bold font-mono flex-shrink-0 bg-slate-100 text-slate-500">
                                      {st.step_no}
                                    </span>
                                    <span className="text-[10px] font-medium text-[#1a1a2e] flex-shrink-0">
                                      {ACTION_LABEL[st.action] ?? st.action}
                                    </span>
                                    {/* 실제 대상 요소(selector/target) 를 주 표시 — API 가 아님 */}
                                    <span className="text-[9.5px] text-slate-500 truncate flex-1 font-mono">
                                      {(() => {
                                        const sel = asText((st as { selector?: unknown }).selector);
                                        const val = asText(st.value);
                                        if (st.action === 'navigate' || st.action === 'assert_url') return val;
                                        if (st.action === 'fill') {
                                          const f = sel || asText(st.target_name);
                                          return val ? `${f} = ${val}` : f;
                                        }
                                        return sel || asText(st.target_name);
                                      })()}
                                    </span>
                                    {isCurrent
                                      ? <Loader2 className="w-3 h-3 text-[#3615CF] animate-spin flex-shrink-0" />
                                      : null}
                                  </div>

                                  {/* 검증 라인 — 스텝 아래 들여쓰기 + 노란색. 우측 태그 대신 무엇을
                                      검증하는지 한 줄로 표기 (서버 검증 = 트리거 API, DB 검증 = 데이터 반영). */}
                                  {st.api_endpoint && (
                                    <div
                                      style={{ paddingLeft: '4.75rem' }}
                                      className="flex items-center gap-1.5 pr-2 py-1 border-b border-[#f0f0f0]/30 bg-[#FEFCE8]"
                                    >
                                      <span className="px-1.5 py-0.5 text-[8px] rounded font-bold bg-[#FEF08A] text-[#854D0E] flex-shrink-0">검증</span>
                                      <span className="text-[10px] font-medium text-[#854D0E] truncate">
                                        서버 검증 · <span className="font-mono">{asText(st.api_endpoint)}</span>
                                      </span>
                                    </div>
                                  )}
                                  {showDbVerify && (
                                    <div
                                      style={{ paddingLeft: '4.75rem' }}
                                      onClick={hasDbDetail ? () => toggleDbDetail(tc.id) : undefined}
                                      className={`flex items-center gap-1.5 pr-2 py-1 border-b border-[#f0f0f0]/30 bg-[#FEFCE8] ${
                                        hasDbDetail ? 'cursor-pointer hover:bg-[#FEF9C3]' : ''
                                      }`}
                                    >
                                      <span className="px-1.5 py-0.5 text-[8px] rounded font-bold bg-[#FEF08A] text-[#854D0E] flex-shrink-0">검증</span>
                                      <span className="text-[10px] font-medium text-[#854D0E] truncate">
                                        DB 검증 · {dbVerifyText}
                                      </span>
                                      {hasDbDetail && (
                                        dbDetailOpen
                                          ? <ChevronDown className="w-3 h-3 text-[#854D0E] flex-shrink-0 ml-auto" />
                                          : <ChevronRight className="w-3 h-3 text-[#854D0E] flex-shrink-0 ml-auto" />
                                      )}
                                    </div>
                                  )}

                                  {/* DB 변경 행 상세 — 클릭으로 펼침. 삭제/수정 전 행(−), 추가/수정 후 행(+). */}
                                  {showDbVerify && hasDbDetail && dbDetailOpen && (
                                    <div
                                      style={{ paddingLeft: '4.75rem' }}
                                      className="pr-3 py-1.5 border-b border-[#f0f0f0]/30 bg-[#FEFCE8]/50 space-y-2"
                                    >
                                      {dbChangedTables.map((s) => (
                                        <div key={s.table} className="space-y-0.5">
                                          <div className="text-[9px] font-bold text-[#854D0E]">
                                            {s.table}
                                            <span className="ml-1 font-normal text-[#a16207]">({s.row_count_before}→{s.row_count_after}행)</span>
                                          </div>
                                          {(s.rows_removed ?? []).map((r: Record<string, unknown>, i: number) => (
                                            <div key={`rm-${i}`} className="flex items-start gap-1 text-[9px] font-mono leading-snug">
                                              <span className="text-[#dc2626] flex-shrink-0">−</span>
                                              <span className="text-slate-600 break-all">{formatRow(r)}</span>
                                            </div>
                                          ))}
                                          {(s.rows_added ?? []).map((r: Record<string, unknown>, i: number) => (
                                            <div key={`ad-${i}`} className="flex items-start gap-1 text-[9px] font-mono leading-snug">
                                              <span className="text-[#16a34a] flex-shrink-0">+</span>
                                              <span className="text-slate-700 break-all">{formatRow(r)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            });
                            return (
                              <>
                                {/* precondition step — 최상단. 예정/로딩/완료(토글) 3상태. */}
                                {dbPrecondLabel && (
                                  <>
                                    <div
                                      style={{ paddingLeft: '3.25rem' }}
                                      onClick={precResolved ? () => togglePrecondDetail(tc.id) : undefined}
                                      className={`flex items-center gap-1.5 pr-2 py-1.5 border-b border-[#f0f0f0]/30 transition-colors ${
                                        dbPrecond?.error ? 'bg-[#fef2f2]' : 'bg-white'
                                      } ${precResolved ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                                    >
                                      <span className="px-1.5 py-0.5 text-[8px] rounded font-bold bg-slate-100 text-slate-500 flex-shrink-0">준비</span>
                                      <span className={`text-[10px] font-medium truncate ${dbPrecond?.error ? 'text-[#dc2626]' : precLoading ? 'text-[#3615CF]' : 'text-slate-600'}`}>
                                        {dbPrecondLabel}
                                      </span>
                                      {precLoading && <Loader2 className="w-3 h-3 text-[#3615CF] animate-spin flex-shrink-0 ml-auto" />}
                                      {precResolved && (
                                        precDetailOpen
                                          ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0 ml-auto" />
                                          : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0 ml-auto" />
                                      )}
                                    </div>

                                    {/* 파악 → 조치 상세 (완료 시 토글) */}
                                    {precResolved && precDetailOpen && (
                                      <div
                                        style={{ paddingLeft: '4.75rem' }}
                                        className="pr-3 py-1.5 border-b border-[#f0f0f0]/30 bg-slate-50/60 space-y-1.5 text-[9.5px] leading-snug"
                                      >
                                        <div>
                                          <span className="font-bold text-slate-500">파악</span>
                                          <span className="ml-1 text-slate-600">
                                            {_precTable ? `${_precTable} 존재 여부 확인 → ` : '상태 확인 → '}
                                            {dbPrecond?.error ? '확인 실패' : (dbPrecond?.matched ? '이미 존재' : '없음')}
                                          </span>
                                          {_planned?.check && (
                                            <div className="font-mono text-slate-400 break-all">{_planned.check}</div>
                                          )}
                                        </div>
                                        <div>
                                          <span className="font-bold text-slate-500">조치</span>
                                          <span className="ml-1 text-slate-600">
                                            {dbPrecond?.error
                                              ? `실패: ${dbPrecond.error}`
                                              : dbPrecond?.seeded
                                                ? '시드 주입 (테스트 데이터 생성)'
                                                : '시드 불필요 (이미 충족)'}
                                          </span>
                                          {dbPrecond?.seeded && _planned?.seed && (
                                            <div className="font-mono text-slate-400 break-all">{_planned.seed}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                                {stepRows}
                                {/* 롤백 step — 테스트 후 DB 를 초기 상태로 되돌리는 정리 단계. */}
                                {dbRan && (
                                  <div
                                    style={{ paddingLeft: '3.25rem' }}
                                    className="flex items-center gap-1.5 pr-2 py-1.5 border-b border-[#f0f0f0]/30 bg-white"
                                  >
                                    <span className="px-1.5 py-0.5 text-[8px] rounded font-bold bg-slate-100 text-slate-500 flex-shrink-0">롤백</span>
                                    <span className="text-[10px] font-medium text-slate-600">
                                      DB 롤백 · 테스트 전 상태로 복원
                                    </span>
                                  </div>
                                )}
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
            {inAnalysisPhase && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3615CF]/5 border border-[#3615CF]/15 text-xs text-[#3615CF] flex-shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                전체 TC 실행 완료 — 정합성 검증(Cross-check)·원인 분석 단계 진행 중입니다. 결과가 곧 확정됩니다.
              </div>
            )}
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4">
              <TerminalFrame title="qapilot-preview - zsh" bodyClassName="aspect-video relative flex items-center justify-center p-0 overflow-hidden bg-black">
                {/* 실시간 스트리밍(canvas) — 프레임 도착 시에만 표시. */}
                <canvas
                  ref={canvasRef}
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full ${isStreaming ? 'block' : 'hidden'}`}
                />
                {/* 폴백: 스트림 프레임이 없으면 기존 스텝별 스크린샷 → 안내 문구. */}
                {!isStreaming && (
                  screenshotUrl ? (
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
                          ? '스트리밍 연결 중...'
                          : selectedRun?.status === 'pending'
                            ? '"실행" 버튼을 누르면 테스트가 시작됩니다'
                            : '테스트 실행 중 실시간 화면이 표시됩니다'}
                      </div>
                    </div>
                  )
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
