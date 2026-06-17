import { create } from 'zustand';
import * as resultsApi from '../api/results';
import * as runsApi from '../api/runs';

/** UI 가 ExecutionHistoryRow 등에서 사용하는 실행 이력 표현형. */
export interface UiExecutionRow {
  id: string;             // trace_id
  groupId: string;        // (백엔드 미보유 — 표시용 placeholder)
  executionNumber: number; // 동일 grouping 내 순번 (백엔드 미보유 — 1 fallback)
  startDate: string;       // started_at (YYYY-MM-DD HH:mm)
  duration: string;        // completed_at - started_at (백엔드 raw 없으면 derive)
  pass: number;
  fail: number;
  hitlPending: number;
  skipped: number;        // 검증 미완 (S) — 실행됐지만 자동 검증 불가
  unverified: number;     // 판정 보류 (U) — cross_check 의 검증축 부재
  notRun: number;
  status: string;
}

export interface UiPassHistoryPoint {
  date: string;
  pass: number;
  fail: number;
  unverified: number;
  skipped: number;
  total: number;
}

export type TestLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface TestState {
  results: resultsApi.TestResult[];
  statistics: resultsApi.ResultStatistics | null;
  activeRuns: runsApi.Run[];
  loadState: TestLoadState;
  error: string | null;

  loadResults: (serviceId: string) => Promise<void>;
  loadStatistics: (serviceId: string) => Promise<void>;
  loadActiveRuns: (serviceId: string) => Promise<void>;
  loadAll: (serviceId: string) => Promise<void>;
  reset: () => void;

  getExecutionHistory: () => UiExecutionRow[];
  getPassHistory: (days?: number) => UiPassHistoryPoint[];
}

const initialState = {
  results: [] as resultsApi.TestResult[],
  statistics: null as resultsApi.ResultStatistics | null,
  activeRuns: [] as runsApi.Run[],
  loadState: 'idle' as TestLoadState,
  error: null as string | null,
};

function formatShortDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
  return iso.slice(0, 16);
}

function computeDuration(startedAt: string, completedAt: string): string {
  if (!startedAt || !completedAt) return '-';
  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '-';
  const sec = Math.floor((end - start) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function dayKey(iso: string): string {
  // 'YYYY-MM-DD' → 'M/D' (mockPassHistory 시각화 호환)
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso.slice(0, 10);
  return `${Number(m[2])}/${Number(m[3])}`;
}

export const useTestStore = create<TestState>()((set, get) => ({
  ...initialState,

  loadResults: async (serviceId) => {
    // 통계를 클라이언트에서 조립하지 않는다 — 이전 구현은 failed:0 하드코딩 +
    // stale passed 재사용으로 실패가 항상 0 으로 표시됐다. 서버 통계를 함께 갱신.
    const [{ results }, statistics] = await Promise.all([
      resultsApi.listResults(serviceId, { limit: 50 }),
      resultsApi.getStatistics(serviceId),
    ]);
    set({ results, statistics });
  },

  loadStatistics: async (serviceId) => {
    set({ statistics: await resultsApi.getStatistics(serviceId) });
  },

  loadActiveRuns: async (serviceId) => {
    set({ activeRuns: await runsApi.listActiveRuns(serviceId) });
  },

  loadAll: async (serviceId) => {
    set({ loadState: 'loading', error: null });
    try {
      const [resultsResp, statistics, activeRuns] = await Promise.all([
        resultsApi.listResults(serviceId, { limit: 50 }),
        resultsApi.getStatistics(serviceId),
        runsApi.listActiveRuns(serviceId),
      ]);
      set({
        results: resultsResp.results,
        statistics,
        activeRuns,
        loadState: 'loaded',
      });
    } catch (e) {
      set({
        loadState: 'error',
        error: e instanceof Error ? e.message : '테스트 도메인 로드 실패',
      });
    }
  },

  reset: () => set({ ...initialState }),

  // "실행 완료" 패널 — 정상 종료된 trace 만. running/aborted 는 별도 패널(runningTests)에서 표시.
  getExecutionHistory: () => {
    const rows: UiExecutionRow[] = [];
    let counter = 0;
    for (const r of get().results) {
      if (r.command !== 'test') continue;
      if (r.status !== 'completed') continue;
      counter += 1;
      rows.push({
        id: r.trace_id,
        groupId: `테스트 실행 ${r.trace_id.slice(0, 8)}`,
        executionNumber: counter,
        startDate: formatShortDate(r.started_at),
        duration: computeDuration(r.started_at, r.completed_at),
        pass: r.pass_count,
        fail: r.fail_count,
        hitlPending: 0, // 백엔드 별도 추적 X — 0 fallback
        skipped: r.skip_count ?? 0,
        unverified: r.unverified_count ?? 0,
        notRun: Math.max(0, r.total_tc_count - r.pass_count - r.fail_count - (r.skip_count ?? 0) - (r.unverified_count ?? 0)),
        status: r.status,
      });
    }
    return rows;
  },

  // PassRate 차트 — completed 만 집계. aborted 의 0/0 가 평균을 왜곡하지 않도록 제외.
  // unverified/skipped 도 집계 — '판정 보류' 가 PASS/FAIL 어디에도 안 보이면
  // 전체 수가 안 맞아 보인다 (UI 전수 점검 후속: '4 UNVERIFIED 표시 필요').
  getPassHistory: (days = 14) => {
    const agg: Record<string, { pass: number; fail: number; unverified: number; skipped: number }> = {};
    for (const r of get().results) {
      if (r.command !== 'test') continue;
      if (r.status !== 'completed') continue;
      const k = dayKey(r.completed_at || r.started_at);
      if (!k) continue;
      if (!agg[k]) agg[k] = { pass: 0, fail: 0, unverified: 0, skipped: 0 };
      agg[k].pass += r.pass_count;
      agg[k].fail += r.fail_count;
      agg[k].unverified += r.unverified_count ?? 0;
      agg[k].skipped += r.skip_count ?? 0;
    }
    const sorted = Object.entries(agg)
      .sort(([a], [b]) => {
        const [am, ad] = a.split('/').map(Number);
        const [bm, bd] = b.split('/').map(Number);
        return am !== bm ? am - bm : ad - bd;
      })
      .slice(-days);
    return sorted.map(([date, { pass, fail, unverified, skipped }]) => ({
      date, pass, fail, unverified, skipped,
      total: pass + fail + unverified + skipped,
    }));
  },
}));
