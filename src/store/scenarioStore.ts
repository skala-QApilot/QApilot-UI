import { create } from 'zustand';
import * as scenariosApi from '../api/scenarios';
import * as versionsApi from '../api/scenarioVersions';
import * as changeRequestsApi from '../api/scenarioChangeRequests';
import * as groupsApi from '../api/scenarioGroups';

// ── UI 표현형 (mockData 와 호환) ─────────────────────────────────────────────
// 화면 코드(ScenarioPage 등) 가 그대로 사용 가능하도록 mock 시절 shape 을 유지하되
// TV 명칭만 `values` 로 통일 (testVariables 폐기).

export type UiScenarioStatus = 'passed' | 'failed' | 'pending' | string;

/**
 * UI 가 렌더링/선택 상태 관리에 사용하는 TV (테스트 값) 형태.
 * 원본은 FastAPI 의 {field, value, type, purpose}. UI 식별/표시 위한
 * id(synth) / name(purpose ?? field) 을 함께 제공한다.
 */
export interface UiTestValue {
  id: string;
  name: string;
  field?: string;
  value?: string;
  type?: string;
  purpose?: string;
  /** 이 값의 근거 — 문서/코드 출처 또는 "근거 없음". */
  evidence?: string;
  status: UiScenarioStatus;
}

export interface UiTestCase {
  id: string;
  name: string;
  status: UiScenarioStatus;
  values: UiTestValue[];
  /** BDD 단계 (있을 때만). */
  given?: string;
  when?: string;
  then?: string;
  tags?: string[];
  /** given/when/then 별 근거. */
  evidence?: scenariosApi.TestCaseEvidence;
  /** 이 TC 가 참조한 코드 위치. */
  codebaseRef?: scenariosApi.CodebaseRef;
  /** 이 TC 생성 prompt 에 실제로 들어간 schemas/selectors/patterns/db_snapshot. */
  tvContext?: scenariosApi.TvContext;
  /** 코드 변경 감지로 삭제 대기 중인 TC — 빨간 스타일로 표시 후 사용자 검토. */
  pendingDelete?: boolean;
}

export interface UiScenario {
  id: string;
  name: string;
  status: UiScenarioStatus;
  /** TC 개수 — Spring 응답의 test_cases 길이 derive. */
  testCases: number;
  /** 미해결 변경 요청 존재 여부 (Spring has_pending_changes). */
  hasChanges: boolean;
  /** 최근 실행 시각 (ISO). */
  lastRunAt: string | null;
  /** 이 TS 를 생성할 때 검색한 문서. */
  docSearch?: scenariosApi.DocSearch;
}

export interface UiScenarioVersion {
  id: string;
  label: string;
  date: string;
  hasChange: boolean;
  isFavorite: boolean;
  changeDesc?: string;
}

/**
 * "수정중" 초안 노드를 가리키는 selectedScenarioVersion sentinel 값.
 * 실제 버전 row 가 없는 진행 중인 변경(직접 수정 / AI 변경 검토 대기)을 선택했을 때 사용 —
 * 검토 시 화면에 보이는 콘텐츠(=현재 라이브 데이터)와 선택된 버전 표시를 일치시켜,
 * "이전 확정 버전"을 비교 기준선으로 자연스럽게 인지하도록 한다.
 */
export const DRAFT_VERSION_ID = '__draft__';

export interface UiAIItem {
  reason: string;
  trigger: 'file' | 'chatbot' | 'code' | string;
  timestamp: string;
  requestId: string;
  status: changeRequestsApi.ChangeRequestStatus;
  /** 변경이 집중된 TC id — 있으면 TS 전체가 아닌 해당 TC(및 그 TV)만 강조해야 함 */
  targetTcId?: string | null;
  /** 실질적으로 변경/추가된 TC id 목록 — TS 단위가 아닌 TC 단위로 "AI 생성" 강조 범위를 좁히는 데 사용 */
  changedTcIds?: string[];
  /** 삭제 대기 중인 TC id 목록 — code_change로 제거된 엔드포인트의 TC, 빨간 스타일로 표시 */
  deletedTcIds?: string[];
  /** 챗봇이 요청한 TS 전체 삭제 — true면 승인 시 TS soft-delete 처리 */
  deleteTs?: boolean;
}

/**
 * change_requests.content(jsonb 직렬화 문자열)에서 changed_tc_ids 목록을 안전하게 추출.
 * 파싱 실패/형식 불일치 시 undefined — 호출측에서 기존 TS 단위 강조로 폴백한다.
 */
function parseChangedTcIds(content: string | null | undefined): string[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    const ids = parsed?.changed_tc_ids;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : undefined;
  } catch {
    return undefined;
  }
}

function parseDeletedTcIds(content: string | null | undefined): string[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    const ids = parsed?.deleted_tc_ids;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : undefined;
  } catch {
    return undefined;
  }
}

function parseDeleteTs(content: string | null | undefined): boolean {
  if (!content) return false;
  try {
    return Boolean(JSON.parse(content)?.delete_ts);
  } catch {
    return false;
  }
}

export interface UiScenarioGroup {
  id: string;
  name: string;
  scenarios: string[];
  tcCount: number;
  status: 'active' | 'archived';
  createdDate: string;
  executionCount: number;
  tags: string[];
}

// ── 어댑터 ─────────────────────────────────────────────────────────────────

export function toUiScenario(s: scenariosApi.Scenario): UiScenario {
  return {
    id: s.ts_id,
    name: s.name,
    status: (s.last_run_status as UiScenarioStatus) ?? 'pending',
    testCases: Array.isArray(s.test_cases) ? s.test_cases.length : 0,
    hasChanges: Boolean(s.has_pending_changes),
    lastRunAt: s.last_run_at ?? null,
    docSearch: s.doc_search,
  };
}

export function toUiTestValue(raw: scenariosApi.TestValue, idx: number): UiTestValue {
  const fallbackName = raw.purpose || raw.field || `변수 ${idx + 1}`;
  return {
    id: `${raw.field || 'tv'}-${idx + 1}`,
    name: fallbackName,
    field: raw.field,
    value: raw.value,
    type: raw.type,
    purpose: raw.purpose,
    evidence: raw.evidence,
    status: 'pending',
  };
}

export function toUiTestCase(tc: scenariosApi.TestCase): UiTestCase {
  return {
    id: tc.tc_id,
    name: tc.name,
    status: (tc.last_run_status as UiScenarioStatus) ?? 'pending',
    values: Array.isArray(tc.values) ? tc.values.map(toUiTestValue) : [],
    given: tc.given,
    when: tc.when,
    then: tc.then,
    tags: tc.tags,
    evidence: tc.evidence,
    codebaseRef: tc.codebase_ref,
    tvContext: tc.tv_context,
    pendingDelete: tc._pending_delete ?? false,
  };
}

export function toUiVersion(v: versionsApi.ScenarioVersion): UiScenarioVersion {
  return {
    id: v.versionId,
    label: v.label,
    date: (v.createdAt || '').slice(0, 10),
    // DB에서 가져온 버전은 항상 사용자가 확정한 마일스톤 → hasChange=false
    hasChange: false,
    isFavorite: Boolean(v.isFavorite),
    changeDesc: v.description,
  };
}

export function toUiGroup(g: groupsApi.ScenarioGroup): UiScenarioGroup {
  return {
    id: g.groupId,
    name: g.name,
    scenarios: g.scenarioIds ?? [],
    tcCount: (g.tcIds ?? []).length,
    status: 'active', // Spring 미제공 — 기본 active. archived 정책은 별도 도입.
    createdDate: (g.createdAt || '').slice(0, 10),
    executionCount: 0, // Spring 미제공 — Phase D 에서 run 도메인 join 으로 채움.
    tags: [],
  };
}

/**
 * 미해결 변경 요청을 시나리오별로 묶어 mockAIItems 형태로 변환.
 * 한 시나리오에 여러 요청이 있으면 가장 최근 생성(createdAt desc) 항목 사용.
 */
export function toUiAIItemsByScenario(
  requests: changeRequestsApi.ChangeRequest[],
): Record<string, UiAIItem> {
  const result: Record<string, UiAIItem> = {};
  const sorted = [...requests].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || ''),
  );
  for (const req of sorted) {
    if (!req.scenarioId) continue;
    if (req.status === 'approved' || req.status === 'rejected') continue;
    if (result[req.scenarioId]) continue; // 이미 최신 항목 기록됨
    result[req.scenarioId] = {
      reason: req.reason,
      trigger: req.trigger,
      timestamp: req.createdAt,
      requestId: req.requestId,
      status: req.status,
      targetTcId: req.targetId,
      changedTcIds: parseChangedTcIds(req.content),
      deletedTcIds: parseDeletedTcIds(req.content),
      deleteTs: parseDeleteTs(req.content),
    };
  }
  return result;
}

// ── Store ───────────────────────────────────────────────────────────────────

interface ScenarioState {
  scenarios: scenariosApi.Scenario[];
  testCasesByTs: Record<string, scenariosApi.TestCase[]>;
  versions: versionsApi.ScenarioVersion[];
  changeRequests: changeRequestsApi.ChangeRequest[];
  groups: groupsApi.ScenarioGroup[];
  loadState: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;

  loadAll: (serviceId: string) => Promise<void>;
  loadScenarios: (serviceId: string) => Promise<void>;
  loadTestCases: (serviceId: string, scenarioId: string) => Promise<scenariosApi.TestCase[]>;
  loadVersions: (serviceId: string) => Promise<void>;
  loadChangeRequests: (serviceId: string) => Promise<void>;
  loadGroups: (serviceId: string) => Promise<void>;

  toggleFavoriteVersion: (
    serviceId: string,
    versionId: string,
    isFavorite: boolean,
  ) => Promise<void>;
  resolveChangeRequest: (
    serviceId: string,
    requestId: string,
    status: 'approved' | 'deferred' | 'rejected',
  ) => Promise<void>;
  createGroup: (
    serviceId: string,
    payload: groupsApi.CreateScenarioGroupPayload,
  ) => Promise<groupsApi.ScenarioGroup>;

  // UI 어댑터 selectors
  getUiScenarios: () => UiScenario[];
  getUiTestCases: (scenarioId: string) => UiTestCase[];
  getUiTestCasesMap: () => Record<string, UiTestCase[]>;
  getUiVersions: () => UiScenarioVersion[];
  getUiAIItems: () => Record<string, UiAIItem>;
  getUiGroups: () => UiScenarioGroup[];

  reset: () => void;
}

const initialState = {
  scenarios: [] as scenariosApi.Scenario[],
  testCasesByTs: {} as Record<string, scenariosApi.TestCase[]>,
  versions: [] as versionsApi.ScenarioVersion[],
  changeRequests: [] as changeRequestsApi.ChangeRequest[],
  groups: [] as groupsApi.ScenarioGroup[],
  loadState: 'idle' as const,
  error: null as string | null,
};

export const useScenarioStore = create<ScenarioState>()((set, get) => ({
  ...initialState,

  loadAll: async (serviceId) => {
    set({ loadState: 'loading', error: null });
    try {
      // 각 API를 독립 실행 — 하나 실패해도 나머지는 정상 로드
      const [scenarios, versions, changeRequests, groups] = await Promise.all([
        scenariosApi.listScenarios(serviceId).catch(() => [] as scenariosApi.Scenario[]),
        versionsApi.listScenarioVersions(serviceId).catch(() => [] as versionsApi.ScenarioVersion[]),
        changeRequestsApi.listChangeRequests(serviceId).catch(() => [] as changeRequestsApi.ChangeRequest[]),
        groupsApi.listScenarioGroups(serviceId).catch(() => [] as groupsApi.ScenarioGroup[]),
      ]);
      // 시나리오 nested test_cases 를 testCasesByTs 캐시에 풀어둠 (펼침 시 즉시 표시).
      const testCasesByTs: Record<string, scenariosApi.TestCase[]> = {};
      for (const s of scenarios) {
        if (Array.isArray(s.test_cases)) {
          testCasesByTs[s.ts_id] = s.test_cases;
        }
      }
      set({
        scenarios,
        testCasesByTs,
        versions,
        changeRequests,
        groups,
        loadState: 'loaded',
      });
    } catch (e) {
      set({
        loadState: 'error',
        error: e instanceof Error ? e.message : '시나리오 도메인 로드 실패',
      });
    }
  },

  loadScenarios: async (serviceId) => {
    const scenarios = await scenariosApi.listScenarios(serviceId);
    const testCasesByTs: Record<string, scenariosApi.TestCase[]> = {};
    for (const s of scenarios) {
      if (Array.isArray(s.test_cases)) {
        testCasesByTs[s.ts_id] = s.test_cases;
      }
    }
    set({ scenarios, testCasesByTs });
  },

  loadTestCases: async (serviceId, scenarioId) => {
    const testCases = await scenariosApi.listTestCases(serviceId, scenarioId);
    set((state) => ({
      testCasesByTs: { ...state.testCasesByTs, [scenarioId]: testCases },
    }));
    return testCases;
  },

  loadVersions: async (serviceId) => {
    set({ versions: await versionsApi.listScenarioVersions(serviceId) });
  },

  loadChangeRequests: async (serviceId) => {
    set({ changeRequests: await changeRequestsApi.listChangeRequests(serviceId) });
  },

  loadGroups: async (serviceId) => {
    set({ groups: await groupsApi.listScenarioGroups(serviceId) });
  },

  toggleFavoriteVersion: async (serviceId, versionId, isFavorite) => {
    const updated = await versionsApi.updateScenarioVersion(serviceId, versionId, { isFavorite });
    set((state) => ({
      versions: state.versions.map((v) => (v.versionId === versionId ? updated : v)),
    }));
  },

  resolveChangeRequest: async (serviceId, requestId, status) => {
    const updated = await changeRequestsApi.updateChangeRequest(serviceId, requestId, { status });
    set((state) => ({
      changeRequests: state.changeRequests.map((r) =>
        r.requestId === requestId ? updated : r,
      ),
    }));
  },

  createGroup: async (serviceId, payload) => {
    const group = await groupsApi.createScenarioGroup(serviceId, payload);
    set((state) => ({ groups: [...state.groups, group] }));
    return group;
  },

  getUiScenarios: () => get().scenarios.map(toUiScenario),
  getUiTestCases: (scenarioId) => (get().testCasesByTs[scenarioId] || []).map(toUiTestCase),
  getUiTestCasesMap: () => {
    const map: Record<string, UiTestCase[]> = {};
    for (const [tsId, list] of Object.entries(get().testCasesByTs)) {
      map[tsId] = list.map(toUiTestCase);
    }
    return map;
  },
  getUiVersions: () => get().versions.map(toUiVersion),
  getUiAIItems: () => toUiAIItemsByScenario(get().changeRequests),
  getUiGroups: () => get().groups.map(toUiGroup),

  reset: () => set({ ...initialState }),
}));
