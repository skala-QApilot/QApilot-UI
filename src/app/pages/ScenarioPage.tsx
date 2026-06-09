import React from 'react';
import { AlertTriangle, Calendar, CheckCircle, ChevronDown, ChevronRight, Clock, Download, Edit2, FileText, Play, Plus, RotateCcw, Sparkles, Star, Trash2, X } from 'lucide-react';
import ScenarioFlowGraph from '../components/ScenarioFlowGraph';
import ScenarioGeneratingOverlay from '../components/ScenarioGeneratingOverlay';
import { SearchBar } from '../components/common/SearchBar';
import { mockTSFlows } from '../data/mockData';
import { useRtmStore } from '../../store/rtmStore';
import { useScenarioStore, toUiGroup, DRAFT_VERSION_ID } from '../../store/scenarioStore';
import type { UiScenario, UiTestCase } from '../../store/scenarioStore';

type TestCaseMap = Record<string, UiTestCase[]>;
import type { ChangeRequestStatus } from '../../api/scenarioChangeRequests';
import { updateScenario, deleteScenario } from '../../api/scenarios';

interface ScenarioPageProps {
  [key: string]: any;
}

export const ScenarioPage = ({
serviceId,
onRejectedSync,
selectedScenario,
setSelectedScenario,
scenarioPageTab,
setScenarioPageTab,
scenarioSearchQuery,
setScenarioSearchQuery,
scenarioChangeFilter,
setScenarioChangeFilter,
selectedScenarioVersion,
setSelectedScenarioVersion,
favoriteVersionIds,
setFavoriteVersionIds,
hoveredVersionId,
setHoveredVersionId,
selectedNetworkNodeId,
setSelectedNetworkNodeId,
expandedTSForTC,
setExpandedTSForTC,
selectedTCIds,
setSelectedTCIds,
expandedTC,
setExpandedTC,
showTestGroupModal,
setShowTestGroupModal,
setShowLinkedFiles,
aiItemActions,
setAiItemActions,
showDeferredAIItems,
setShowDeferredAIItems,
dynamicScenarios,
setDynamicScenarios,
dynamicAIItems,
dynamicTestCases,
setDynamicTestCases,
loadingItemKey,
setLoadingItemKey,
editingDetailItem,
setEditingDetailItem,
selectedTvId,
setSelectedTvId,
selectedScenarioNode,
setSelectedScenarioNode,
highlightedScenarioRow,
highlightedBotRow,
setHighlightedBotRow,
detailPanelRow,
setDetailPanelRow,
expandedTSMain,
setExpandedTSMain,
expandedTCMain,
setExpandedTCMain,
allTCsSelected,
someSelected,
openAiWithContext,
triggerCodeChangeDetection,
scenarioVersions,
onReviewConfirm,
codeGenReviewStartTick,
setCurrentPage,
setTestDepth,
selectedScenarioGroupId,
setSelectedScenarioGroupId,
setRunningTests,
setSelectedRunningTestId,
setSelectedTestGroup,
setSelectedRunningForDetail,
viewMode: viewModeProp = 'table',
setViewMode: setViewModeProp,
showGeneratingOverlay = false,
setShowGeneratingOverlay,
scenarioGenProgress = null,
showCodeGeneratingOverlay = false,
setShowCodeGeneratingOverlay,
codeGenProgress = null,
onPrepareRun,
onCreateAndRunGroup,
onVersionDelete,
onVersionRollback,
}: ScenarioPageProps) => {

  const viewMode = viewModeProp as 'table' | 'graph';
  const setViewMode = setViewModeProp as (m: 'table' | 'graph') => void;
  const [showReviewActions, setShowReviewActions] = React.useState(false);
  const [hasDraftEdit, setHasDraftEdit] = React.useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = React.useState(false);
  const generateCodeTimerRef = React.useRef<number | null>(null);

  // TC/TV 상세 패널 펼침 state (여러 개를 동시에 펼칠 수 있도록 키 목록으로 관리 — detailPanelRow는 단일 선택이라 그래프 동기화 전용으로 분리)
  const [expandedTcDetailKeys, setExpandedTcDetailKeys] = React.useState<string[]>([]);
  const [expandedTvDetailKeys, setExpandedTvDetailKeys] = React.useState<string[]>([]);
  const toggleTcDetail = (key: string) => setExpandedTcDetailKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleTvDetail = (key: string) => setExpandedTvDetailKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // TC 상세(given/when/then/tags) 편집 state
  const [tcDetailEditKey, setTcDetailEditKey] = React.useState<string | null>(null);
  const [tcDetailEditDraft, setTcDetailEditDraft] = React.useState({ given: '', when: '', then: '', tags: '' });

  // TV 상세(field/type/value/purpose) 편집 state
  const [tvDetailEditKey, setTvDetailEditKey] = React.useState<string | null>(null);
  const [tvDetailEditDraft, setTvDetailEditDraft] = React.useState({ field: '', type: '', value: '', purpose: '' });
  const [tvCopied, setTvCopied] = React.useState<string | null>(null);

  // 예약하기 모달 state
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [selectedGroupForSchedule, setSelectedGroupForSchedule] = React.useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('09:00');
  const [scheduleRepeat, setScheduleRepeat] = React.useState('once');
  const [groupNameInput, setGroupNameInput] = React.useState('');

  // Resizable left sidebar (graph mode only)
  const [leftSidebarWidth, setLeftSidebarWidth] = React.useState(300);
  const leftDragRef = React.useRef(false);
  const leftStartX = React.useRef(0);
  const leftStartW = React.useRef(0);
  const handleLeftDragStart = (e: React.MouseEvent) => {
    leftDragRef.current = true;
    leftStartX.current = e.clientX;
    leftStartW.current = leftSidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!leftDragRef.current) return;
      setLeftSidebarWidth(Math.max(160, Math.min(480, leftStartW.current + ev.clientX - leftStartX.current)));
    };
    const onUp = () => { leftDragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Resizable right detail panel
  const [rightPanelWidth, setRightPanelWidth] = React.useState(288);
  const rightDragRef = React.useRef(false);
  const rightStartX = React.useRef(0);
  const rightStartW = React.useRef(0);
  const handleRightDragStart = (e: React.MouseEvent) => {
    rightDragRef.current = true;
    rightStartX.current = e.clientX;
    rightStartW.current = rightPanelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!rightDragRef.current) return;
      setRightPanelWidth(Math.max(200, Math.min(520, rightStartW.current - (ev.clientX - rightStartX.current))));
    };
    const onUp = () => { rightDragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // typed aliases to suppress implicit-any from loose prop types
  const _selectedTCIds: string[] = selectedTCIds as string[];
  const _dynamicScenarios: Array<{ id: string; name: string; tags: string[] }> = dynamicScenarios as any[];
  const _dynamicTestCases: Record<string, Array<{
    id: string; name: string;
    given?: string; when?: string; then?: string; tags?: string[];
    values: Array<{ id: string; name: string; field?: string; value?: string; type?: string; purpose?: string }>;
  }>> = dynamicTestCases as any;
  const _aiItemActions: Record<string, string> = aiItemActions as Record<string, string>;
  const _dynamicAIItems: Record<string, { reason: string; trigger: string; timestamp: string; targetTcId?: string | null; changedTcIds?: string[]; deletedTcIds?: string[]; deleteTs?: boolean }> = dynamicAIItems as any;

  // RTM 매핑 — getter 가 매 호출마다 새 배열을 만들기 때문에 selector 안에서 직접 호출 금지.
  const rtmVersionsForMap = useRtmStore((s) => s.versions);
  const selectedRtmVersionId = useRtmStore((s) => s.selectedVersionId);
  const rtmMappings = React.useMemo(
    () => useRtmStore.getState().getRtmMappings(),
    [rtmVersionsForMap, selectedRtmVersionId],
  );

  // 시나리오 그룹 — scenarioStore.groups 변경 시에만 재계산.
  const storeGroups = useScenarioStore((s) => s.groups);
  const uiGroups = React.useMemo(() => storeGroups.map(toUiGroup), [storeGroups]);

  const selectedTCs = _selectedTCIds
    .filter((id: string) => id.split('_').length === 2)
    .map((id: string) => {
      const [tsId, tcId] = id.split('_');
      const ts = _dynamicScenarios.find((s) => s.id === tsId);
      const tc = (_dynamicTestCases[tsId] || []).find(t => t.id === tcId);
      return { tsId, tcId, tsName: ts?.name, tcName: tc?.name };
    });

  const selectedTSCount = _dynamicScenarios.filter(s =>
    (_dynamicTestCases[s.id] || []).some((tc: any) => _selectedTCIds.includes(`${s.id}_${tc.id}`))
  ).length;

  const toggleTSSelection = (tsId: string) => {
    const tcs = _dynamicTestCases[tsId] || [];
    const tcKeys = tcs.map((tc: any) => `${tsId}_${tc.id}`);
    const tvKeys = tcs.flatMap((tc: any) => (tc.values || []).map((tv: any) => `${tsId}_${tc.id}_${tv.id}`));
    const allKeys = [...tcKeys, ...tvKeys];
    const allSelected = allKeys.every((id: string) => _selectedTCIds.includes(id));
    if (allSelected) {
      setSelectedTCIds((prev: string[]) => prev.filter((id: string) => !allKeys.includes(id)));
    } else {
      setSelectedTCIds((prev: string[]) => [...new Set([...prev, ...allKeys])]);
    }
  };

  const toggleTCSelection = (tsId: string, tcId: string) => {
    const tc = (_dynamicTestCases[tsId] || []).find((t: any) => t.id === tcId);
    const tcKey = `${tsId}_${tcId}`;
    const tvKeys = (tc?.values || []).map((tv: any) => `${tsId}_${tcId}_${tv.id}`);
    const allKeys = [tcKey, ...tvKeys];
    const allSelected = allKeys.every((id: string) => _selectedTCIds.includes(id));
    if (allSelected) {
      setSelectedTCIds((prev: string[]) => prev.filter((id: string) => !allKeys.includes(id)));
    } else {
      setSelectedTCIds((prev: string[]) => [...new Set([...prev, ...allKeys])]);
    }
  };

  const toggleTVSelection = (key: string) => {
    setSelectedTCIds((prev: string[]) =>
      prev.includes(key) ? prev.filter((id: string) => id !== key) : [...prev, key]
    );
  };

  const handleTVCopy = (tvKey: string, tv: { field?: string; type?: string; value?: string; purpose?: string }) => {
    const text = JSON.stringify({ field: tv.field ?? '', type: tv.type ?? '', value: tv.value ?? '', purpose: tv.purpose ?? '' }, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setTvCopied(tvKey);
      setTimeout(() => setTvCopied(null), 1800);
    });
  };

  // ── 사이드바 필터링 ────────────────────────────────────────────
  const filteredScenarios = _dynamicScenarios.filter(s => {
    const q = (scenarioSearchQuery as string).toLowerCase();
    const matchSearch = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    const isDeferred = _aiItemActions[s.id] === 'deferred';
    const matchChange = !scenarioChangeFilter || (!!_dynamicAIItems[s.id] && _aiItemActions[s.id] !== 'approved' && _aiItemActions[s.id] !== 'rejected' && !isDeferred);
    const activeGroup = selectedScenarioGroupId ? uiGroups.find(g => g.id === selectedScenarioGroupId) : null;
    const matchGroup = !activeGroup || (activeGroup.scenarios as string[]).includes(s.id);
    return matchSearch && matchChange && !isDeferred && matchGroup;
  });
  const deferredAIIds = Object.entries(_aiItemActions)
    .filter(([, value]) => value === 'deferred')
    .map(([id]) => id);
  const pendingAIReviewCount = _dynamicScenarios.filter((scenario) => {
    const isDeferred = _aiItemActions[scenario.id] === 'deferred';
    const isRejected = _aiItemActions[scenario.id] === 'rejected';
    const isApproved = _aiItemActions[scenario.id] === 'approved';
    const hasAIItem = !!_dynamicAIItems[scenario.id];
    return hasAIItem && !isDeferred && !isRejected && !isApproved;
  }).length;
  const hasPendingAIReview = pendingAIReviewCount > 0;

  const resolveAIItem = (itemId: string, status: 'approved' | 'rejected' | 'deferred') => {
    const requestId = (dynamicAIItems as Record<string, { requestId?: string }>)[itemId]?.requestId;
    const deletedTcIds = (dynamicAIItems as any)[itemId]?.deletedTcIds;
    const isDeleteTcApproval = status === 'approved' && (deletedTcIds?.length ?? 0) > 0;
    setAiItemActions((prev: Record<string, string>) => ({ ...prev, [itemId]: status }));
    if (serviceId && requestId) {
      useScenarioStore.getState().resolveChangeRequest(serviceId, requestId, status)
        .then(() => {
          // 거절 시 Spring이 이전 버전으로 롤백, TC 삭제 확정 시 Spring이 TC 제거
          // → 둘 다 App.tsx syncScenarioFromStore로 완전 갱신
          if (status === 'rejected' || isDeleteTcApproval) {
            onRejectedSync?.();
          }
        })
        .catch(console.error);
    }
  };

  const handleApproveAIItem = (itemId: string) => {
    resolveAIItem(itemId, 'approved');
    // AI 승인도 새로운 변경 — 버전 확정 전까지 draft 상태 유지
    markDirectEdit();
    setIsGeneratingCode(true);
    if (generateCodeTimerRef.current) window.clearTimeout(generateCodeTimerRef.current);
    generateCodeTimerRef.current = window.setTimeout(() => {
      setIsGeneratingCode(false);
      generateCodeTimerRef.current = null;
    }, 2000);
  };

  // 사용자가 "검토 확인"을 클릭해 저장한 버전이 있는지 확인
  // init 자동 생성(v1.0, desc="초기 자동 생성")과 구분
  const hasUserConfirmedVersion = React.useMemo(
    () => (scenarioVersions as any[])?.some(
      v => v.changeDesc === '검토 확인 시 자동 저장'
    ) ?? false,
    [scenarioVersions]
  );

  // draft 상태 localStorage 키 (서비스별)
  const draftKey = serviceId ? `draft_edit_${serviceId}` : null;

  React.useEffect(() => {
    const storedDraftEdit = draftKey ? localStorage.getItem(draftKey) === 'true' : false;
    setHasDraftEdit(storedDraftEdit);
    if (hasPendingAIReview) {
      setShowReviewActions(false);
    } else if (hasUserConfirmedVersion) {
      // localStorage에 직접 수정 draft 마크가 있으면 검토 확인 모드 유지
      setShowReviewActions(!storedDraftEdit);
    }
  }, [hasPendingAIReview, hasUserConfirmedVersion, draftKey]);

  const selectedVersion = React.useMemo(
    () => (scenarioVersions as any[])?.find(v => v.id === selectedScenarioVersion) ?? null,
    [scenarioVersions, selectedScenarioVersion]
  );

  // 직접 수정(hasDraftEdit) 뿐 아니라 챗봇/파일 업데이트/코드 변경 감지로 생긴
  // AI 수정 시나리오가 검토 대기 중(hasPendingAIReview)인 경우도 "수정중" 상태로 본다.
  const isDraftState = hasDraftEdit || hasPendingAIReview;
  const isSelectedConfirmedVersion = Boolean(selectedVersion && !selectedVersion.hasChange);
  const isSelectedDraftHead = isDraftState && selectedScenarioVersion === DRAFT_VERSION_ID;
  // v1.0(초기 자동 생성)만 있고 사용자가 "검토 확인"을 한 번도 누른 적 없으면, 다른 버전과
  // 달리 v1.0은 최초 1회 검토 확인 → 테스트 코드 생성 절차를 거쳐야 한다 — 인위적인 "수정중"
  // 노드를 만들지 않고, v1.0 노드를 선택한 상태 그대로 "검토 확인" 버튼을 노출한다.
  const canUseConfirmedVersionActions = showReviewActions
    || (isSelectedConfirmedVersion && !isSelectedDraftHead && hasUserConfirmedVersion);
  // v1.0(초기 자동 생성)만 있는 상태에서도 AI 수정 검토 대기/직접 수정이 있으면
  // "수정중" 노드를 띄워야 하므로 hasUserConfirmedVersion 여부와 무관하게 판단한다.
  const shouldShowDraftNode = !showReviewActions && isDraftState;
  const reviewBlocked = isSelectedDraftHead && (hasPendingAIReview || isGeneratingCode);
  const reviewButtonLabel = isSelectedDraftHead && isGeneratingCode
    ? '시나리오 저장 중...'
    : isSelectedDraftHead && hasPendingAIReview
      ? `검토 확인 (${pendingAIReviewCount})`
      : '검토 확인';

  React.useEffect(() => {
    return () => {
      if (generateCodeTimerRef.current) window.clearTimeout(generateCodeTimerRef.current);
    };
  }, []);

  // ── TS 흐름 그래프 노드 데이터 ──────────────────────────────
  const tsFlowNodes = _dynamicScenarios.map(s => ({
    id: s.id,
    label: s.id,
    name: s.name,
  }));

  // ResizeObserver로 center 컨테이너 크기를 캔버스에 전달
  const graphContainerRef = React.useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = React.useState({ width: 680, height: 420 });
  React.useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setGraphSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── 그래프 ↔ 우측 패널 연동 ──────────────────────────────────
  const graphSelectedId = detailPanelRow ? (
    detailPanelRow.level === 'TS' ? detailPanelRow.tsId :
    detailPanelRow.level === 'TC' ? `${detailPanelRow.tsId}_${detailPanelRow.tcId}` :
    `${detailPanelRow.tsId}_${detailPanelRow.tcId}_${detailPanelRow.tvId}`
  ) : null;

  const handleGraphNodeSelect = (id: string | null) => {
    if (!id) { setDetailPanelRow(null); return; }
    const parts = id.split('_');
    if (parts.length === 1) {
      setDetailPanelRow({ level: 'TS', tsId: parts[0] });
    } else if (parts.length === 2) {
      setDetailPanelRow({ level: 'TC', tsId: parts[0], tcId: parts[1] });
    } else {
      setDetailPanelRow({ level: 'TV', tsId: parts[0], tcId: parts[1], tvId: parts[2] });
    }
  };

  // ── 버전 팝업 hover 유지 (timer) ──────────────────────────────
  const versionHoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleVersionEnter = (id: string) => {
    if (versionHoverTimer.current) clearTimeout(versionHoverTimer.current);
    setHoveredVersionId(id);
  };
  const handleVersionLeave = () => {
    versionHoverTimer.current = setTimeout(() => setHoveredVersionId(null), 180);
  };

  const saveSidebarEdit = () => {
    if (!editingDetailItem) return;
    const value = editingDetailItem.value.trim();
    if (!value) {
      setEditingDetailItem(null);
      return;
    }
    markDirectEdit();

    if (editingDetailItem.type === 'ts') {
      const tsId = editingDetailItem.key;
      setDynamicScenarios((prev: UiScenario[]) => prev.map(s => s.id === tsId ? { ...s, name: value } : s));
      if (serviceId) {
        updateScenario(serviceId, tsId, { name: value } as any).catch(err => {
          console.error('TS 이름 수정 실패:', err);
          onRejectedSync?.();
        });
      }
    } else {
      // TC 이름 수정
      const [tsId, tcId] = editingDetailItem.key.split('_');
      const newTcs = (dynamicTestCases[tsId] || []).map((tc: any) =>
        tc.id === tcId ? { ...tc, name: value } : tc
      );
      setDynamicTestCases((prev: TestCaseMap) => ({ ...prev, [tsId]: newTcs }));
      if (serviceId) {
        updateScenario(serviceId, tsId, { test_cases: toApiTestCases(newTcs) as any }).catch(err => {
          console.error('TC 이름 수정 실패:', err);
          onRejectedSync?.();
        });
      }
    }

    setEditingDetailItem(null);
  };

  const sidebarEditInput = (className = 'text-[10px]') => (
    <div className="flex items-center gap-1 min-w-0 flex-1" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        value={editingDetailItem?.value ?? ''}
        onChange={e => setEditingDetailItem((prev: { type: 'ts' | 'tc'; key: string; value: string } | null) => prev ? { ...prev, value: e.target.value } : null)}
        onKeyDown={e => {
          if (e.key === 'Enter') saveSidebarEdit();
          if (e.key === 'Escape') setEditingDetailItem(null);
        }}
        className={`min-w-0 flex-1 px-1.5 py-0.5 border border-[#3615CF]/50 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#3615CF]/30 ${className}`}
      />
      <button onClick={saveSidebarEdit} className="w-5 h-5 flex items-center justify-center rounded bg-[#3615CF] flex-shrink-0">
        <CheckCircle className="w-3 h-3 text-white" />
      </button>
      <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0">
        <X className="w-3 h-3 text-gray-500" />
      </button>
    </div>
  );

  // ── TS 추가 ──────────────────────────────────────────────────
  const addNewTS = () => {
    const newId = `TS${_dynamicScenarios.length + 1}`;
    setDynamicScenarios((prev: UiScenario[]) => [...prev, { id: newId, name: '새 시나리오', tags: [] }]);
    setDynamicTestCases((prev: TestCaseMap) => ({ ...prev, [newId]: [] }));
    setExpandedTSForTC((prev: string[]) => [...prev, newId]);
  };

  // ── TC 추가 ──────────────────────────────────────────────────
  const addNewTC = (tsId: string) => {
    const existing = _dynamicTestCases[tsId] || [];
    const newId = `TC${existing.length + 1}`;
    setDynamicTestCases((prev: TestCaseMap) => ({
      ...prev,
      [tsId]: [...existing, { id: newId, name: '새 테스트케이스', values: [] }],
    }));
    setExpandedTSForTC((prev: string[]) => prev.includes(tsId) ? prev : [...prev, tsId]);
  };

  // ── TV 추가 ──────────────────────────────────────────────────
  const addNewTV = (tsId: string, tcId: string) => {
    const tcKey = `${tsId}_${tcId}`;
    setDynamicTestCases((prev: TestCaseMap) => ({
      ...prev,
      [tsId]: (prev[tsId] || []).map((tc: UiTestCase) => {
        if (tc.id !== tcId) return tc;
        const newId = `TV${tc.values.length + 1}`;
        return { ...tc, values: [...tc.values, { id: newId, name: '새 테스트변수' }] };
      }),
    }));
    setExpandedTCMain((prev: string[]) => prev.includes(tcKey) ? prev : [...prev, tcKey]);
  };

  // UI TestCase → API TestCase 변환 (tc_id, values.field 복원)
  const toApiTestCases = (uiTcs: any[]) =>
    uiTcs.map(tc => ({
      tc_id: tc.id,
      name: tc.name,
      given: tc.given,
      when: tc.when,
      then: tc.then,
      values: (tc.values || []).map((v: any) => ({
        field: v.field || v.id,
        value: v.value,
        type: v.type,
        purpose: v.purpose,
      })),
      tags: tc.tags || [],
      req_id: tc.req_id,
    }));

  // 직접 수정/삭제·AI 항목 승인-거절-보류 발생 시 draft 상태로 전환 (검토 확인 필요 표시)
  // v1.0(초기 자동 생성)만 있어 hasUserConfirmedVersion이 false인 상태에서도
  // 동일하게 draft로 전환해야 승인/거절/보류 후 "검토 확인" 버튼이 유지된다.
  const markDirectEdit = () => {
    setShowReviewActions(false);
    setHasDraftEdit(true);
    if (draftKey) localStorage.setItem(draftKey, 'true');
  };

  // 검토 확인 완료 시 draft 상태 해제
  const clearDraftMark = () => {
    setHasDraftEdit(false);
    if (draftKey) localStorage.removeItem(draftKey);
  };

  // "검토 확인" 클릭은 버전 저장 + 코드 생성 확인 모달 노출까지만 진행하고,
  // "수정중" → "확정" 전환(검토 확인 버튼 → E2E TEST 실행 버튼)은 사용자가 모달에서
  // 실제로 "생성 시작"을 눌렀을 때만 확정한다. "취소"를 누르면 이 tick 이 바뀌지 않으므로
  // 화면은 "검토 확인" 버튼이 보이는 상태 그대로 유지된다.
  const prevCodeGenReviewStartTick = React.useRef(codeGenReviewStartTick);
  React.useEffect(() => {
    if (codeGenReviewStartTick !== undefined && codeGenReviewStartTick !== prevCodeGenReviewStartTick.current) {
      prevCodeGenReviewStartTick.current = codeGenReviewStartTick;
      setShowReviewActions(true);
      clearDraftMark();
    }
  }, [codeGenReviewStartTick]);

  // ── TC 상세(given/when/then/tags) 저장 ─────────────────────────
  const startTcDetailEdit = (tsId: string, tcId: string, tc: any) => {
    setTcDetailEditDraft({
      given: tc.given || '',
      when: tc.when || '',
      then: tc.then || '',
      tags: (tc.tags || []).join(', '),
    });
    setTcDetailEditKey(`${tsId}_${tcId}`);
  };

  const saveTcDetailEdit = (tsId: string, tcId: string) => {
    markDirectEdit();
    const tags = tcDetailEditDraft.tags.split(',').map(t => t.trim()).filter(Boolean);
    const newTcs = (dynamicTestCases[tsId] || []).map((tc: any) =>
      tc.id === tcId
        ? { ...tc, given: tcDetailEditDraft.given, when: tcDetailEditDraft.when, then: tcDetailEditDraft.then, tags }
        : tc
    );
    setDynamicTestCases((prev: TestCaseMap) => ({ ...prev, [tsId]: newTcs }));
    if (serviceId) {
      updateScenario(serviceId, tsId, { test_cases: toApiTestCases(newTcs) as any }).catch(err => {
        console.error('TC 상세 수정 실패:', err);
        onRejectedSync?.();
      });
    }
    setTcDetailEditKey(null);
  };

  // ── TV 상세(field/type/value/purpose) 저장 ─────────────────────
  const startTvDetailEdit = (tsId: string, tcId: string, tvId: string, tv: any) => {
    setTvDetailEditDraft({
      field: tv.field || '',
      type: tv.type || '',
      value: tv.value ?? '',
      purpose: tv.purpose || '',
    });
    setTvDetailEditKey(`${tsId}_${tcId}_${tvId}`);
  };

  const saveTvDetailEdit = (tsId: string, tcId: string, tvId: string) => {
    markDirectEdit();
    const draft = tvDetailEditDraft;
    const newTcs = (dynamicTestCases[tsId] || []).map((tc: any) =>
      tc.id === tcId
        ? {
            ...tc,
            values: (tc.values || []).map((tv: any) => tv.id === tvId
              ? { ...tv, field: draft.field, type: draft.type, value: draft.value, purpose: draft.purpose, name: draft.purpose || draft.field || tv.name }
              : tv),
          }
        : tc
    );
    setDynamicTestCases((prev: TestCaseMap) => ({ ...prev, [tsId]: newTcs }));
    if (serviceId) {
      updateScenario(serviceId, tsId, { test_cases: toApiTestCases(newTcs) as any }).catch(err => {
        console.error('TV 상세 수정 실패:', err);
        onRejectedSync?.();
      });
    }
    setTvDetailEditKey(null);
  };

  // ── TS 삭제 ──────────────────────────────────────────────────
  const deleteTS = (tsId: string) => {
    markDirectEdit();
    // 낙관적 UI 업데이트
    setDynamicScenarios((prev: UiScenario[]) => prev.filter((s: UiScenario) => s.id !== tsId));
    if (detailPanelRow?.tsId === tsId) setDetailPanelRow(null);
    // Spring 영속화
    if (serviceId) {
      deleteScenario(serviceId, tsId).catch(err => {
        console.error('deleteTS 실패, 롤백:', err);
        onRejectedSync?.(); // 실패 시 서버 상태로 복원
      });
    }
  };

  // ── TC 삭제 ──────────────────────────────────────────────────
  const deleteTC = (tsId: string, tcId: string) => {
    markDirectEdit();
    const newTcs = (dynamicTestCases[tsId] || []).filter((t: any) => t.id !== tcId);
    // 낙관적 UI 업데이트
    setDynamicTestCases((prev: TestCaseMap) => ({ ...prev, [tsId]: newTcs }));
    if (detailPanelRow?.tcId === tcId && detailPanelRow?.tsId === tsId) setDetailPanelRow(null);
    // Spring 영속화 — 수정된 TC 목록으로 버전 저장
    if (serviceId) {
      updateScenario(serviceId, tsId, { test_cases: toApiTestCases(newTcs) as any }).catch(err => {
        console.error('deleteTC 실패, 롤백:', err);
        onRejectedSync?.();
      });
    }
  };

  // ── TV 삭제 ──────────────────────────────────────────────────
  const deleteTV = (tsId: string, tcId: string, tvId: string) => {
    markDirectEdit();
    const newTcs = (dynamicTestCases[tsId] || []).map((t: any) =>
      t.id === tcId ? { ...t, values: (t.values || []).filter((v: any) => v.id !== tvId) } : t
    );
    // 낙관적 UI 업데이트
    setDynamicTestCases((prev: TestCaseMap) => ({ ...prev, [tsId]: newTcs }));
    // Spring 영속화
    if (serviceId) {
      updateScenario(serviceId, tsId, { test_cases: toApiTestCases(newTcs) as any }).catch(err => {
        console.error('deleteTV 실패, 롤백:', err);
        onRejectedSync?.();
      });
    }
  };

  // 전체 TC ID 목록
  const allTCIds = _dynamicScenarios.flatMap((s) =>
    (_dynamicTestCases[s.id] || []).map(tc => `${s.id}_${tc.id}`)
  );

  return (
    <div className="relative flex flex-col h-full">

      {/* 시나리오 생성 오버레이 — 전체 페이지 커버 */}
      {showGeneratingOverlay && (
        <ScenarioGeneratingOverlay
          onComplete={() => setShowGeneratingOverlay?.(false)}
          progress={scenarioGenProgress}
        />
      )}

      {/* 코드 생성 오버레이 — Layer 1B (action-mapping + Playwright 코드 작성). */}
      {showCodeGeneratingOverlay && (
        <ScenarioGeneratingOverlay
          onComplete={() => setShowCodeGeneratingOverlay?.(false)}
          progress={codeGenProgress}
          // 백엔드 코드 생성 파이프라인의 실제 4단계(load_scenarios_for_codegen →
          // action_mapping → code_generate → save_codes)와 1:1로 맞춘 안내문 —
          // 실시간 진행률(progress 이벤트)이 끊겼을 때만 노출되는 fallback.
          steps={[
            { message: '시나리오를 불러오는 중...', duration: 1300 },
            { message: '화면 요소와 테스트 동작을 연결하는 중...', duration: 2600 },
            { message: '테스트 코드를 작성하는 중...', duration: 4800 },
            { message: '코드를 저장하는 중...', duration: 900 },
            { message: '코드 생성이 완료됐어요!', duration: 1200 },
          ]}
        />
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── [1] Version Timeline — 맨 좌측 ── */}
        <div className="w-14 bg-white border-r border-[#e5e7eb] flex flex-col items-center py-4 flex-shrink-0" style={{ overflow: 'visible', zIndex: 50, position: 'relative' }}>
          <div className="text-[9px] text-[#9ca3af] font-semibold uppercase tracking-wide mb-4">VER</div>
          <div className="flex-1 w-full " style={{ overflowX: 'visible' }}>
            <div className="flex min-h-full flex-col items-center justify-end pb-4">
              <div className="relative flex flex-col items-center gap-5">
                <div className="absolute top-[10px] bottom-[10px] left-1/2 -translate-x-1/2 w-px bg-[#e5e7eb]" style={{ zIndex: 0 }} />

                {/* 점선 draft 노드 — 확정 버전 이후 미확인 변경사항이 있을 때 최상단 표시.
                    클릭하면 라이브(=현재 변경 반영) 콘텐츠를 선택해, 검토 시 "이전 확정
                    버전"을 비교 기준선으로 자연스럽게 인지하며 볼 수 있다. */}
                {shouldShowDraftNode && (
                  <div className="relative flex flex-col items-center" style={{ zIndex: 10, overflow: 'visible' }}>
                    <button onClick={() => setSelectedScenarioVersion(DRAFT_VERSION_ID)} className="relative flex items-center justify-center">
                      <svg width={20} height={20} style={{ overflow: 'visible' }}>
                        <circle cx={10} cy={10} r={8}
                          fill={isSelectedDraftHead ? '#EAE8F9' : 'white'}
                          stroke="#3615CF" strokeWidth={1.5} strokeDasharray="4 2.5" />
                      </svg>
                    </button>
                    <span className={`text-[8px] mt-0.5 ${isSelectedDraftHead ? 'text-[#3615CF] font-medium' : 'text-[#9ca3af]'}`}>수정중</span>
                  </div>
                )}

              {(scenarioVersions as any[]).map(ver => {
                const isSelected = selectedScenarioVersion === ver.id;
                const isFav = favoriteVersionIds.has(ver.id);
                if (ver.hasChange) return (
                  <div key={ver.id} className="relative flex flex-col items-center" style={{ zIndex: 10, overflow: 'visible' }}
                    onMouseEnter={() => handleVersionEnter(ver.id)}
                    onMouseLeave={handleVersionLeave}>
                    <button onClick={() => setSelectedScenarioVersion(ver.id)} className="relative flex items-center justify-center">
                      <svg width={20} height={20} style={{ overflow: 'visible' }}>
                        <circle cx={10} cy={10} r={8}
                          fill={isSelected ? '#EAE8F9' : 'white'}
                          stroke="#3615CF" strokeWidth={1.5} strokeDasharray={canUseConfirmedVersionActions ? undefined : '4 2.5'} />
                      </svg>
                    </button>
                    <span className="text-[8px] text-[#c4c9d4]">{ver.date}</span>
                  </div>
                );
                return (
                  <div key={ver.id} className="relative flex flex-col items-center" style={{ zIndex: 10, overflow: 'visible' }}
                    onMouseEnter={() => handleVersionEnter(ver.id)}
                    onMouseLeave={handleVersionLeave}>
                    <button onClick={() => setSelectedScenarioVersion(ver.id)} className="relative flex items-center justify-center">
                      <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                        isSelected ? 'bg-[#EAE8F9] border-[#3615CF] shadow-md shadow-[#3615CF]/20' : 'bg-white border-[#d1d5db] hover:border-[#3615CF]'
                      }`} />
                      {isFav && <Star className="absolute -right-3 -top-1 w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    </button>
                    {ver.label && (
                      <span className={`text-[9px] mt-0.5 font-medium leading-none ${isSelected ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}>{ver.label}</span>
                    )}
                    <span className="text-[8px] text-[#c4c9d4]">{ver.date}</span>
                    {hoveredVersionId === ver.id && (
                      <div
                        className="absolute -translate-y-30 bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-3 w-52 pointer-events-auto"
                        style={{ left: 'calc(100% + 8px)', zIndex: 100 }}
                        onMouseEnter={() => handleVersionEnter(ver.id)}
                        onMouseLeave={handleVersionLeave}>
                        <div>
                          <div className="text-[10px] font-semibold text-[#1a1a2e] mb-0.5">{ver.label || '버전'}</div>
                          <div className="text-[9px] text-[#9ca3af] mb-3">{ver.date}</div>
                          <div className="space-y-0.5">
                            <button
                              onClick={() => onVersionRollback?.(ver.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-[11px] text-[#6b7280] hover:text-[#1a1a2e]">
                              <RotateCcw className="w-3 h-3 flex-shrink-0" /> 되돌리기
                            </button>
                            <button
                              onClick={() => onVersionDelete?.(ver.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-[11px] text-[#6b7280] hover:text-[#1a1a2e]">
                              <Trash2 className="w-3 h-3 flex-shrink-0" /> 삭제
                            </button>
                            <button
                              onClick={() => setFavoriteVersionIds((prev: Set<string>) => { const n = new Set(prev); n.has(ver.id) ? n.delete(ver.id) : n.add(ver.id); return n; })}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-yellow-50 text-[11px] text-[#6b7280] hover:text-yellow-600">
                              <Star className={`w-3 h-3 flex-shrink-0 ${isFav ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              즐겨찾기 {isFav ? '해제' : '추가'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>

        {/* ── [2] TS/TC/TV Tree — table mode: flex-1 / graph mode: fixed width ── */}
        <div
          className={`bg-white flex flex-col flex-shrink-0 relative ${viewMode === 'table' ? 'flex-1' : ''}`}
          style={viewMode === 'graph' ? { width: leftSidebarWidth } : undefined}>

          {/* Tree header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f0] bg-white flex-shrink-0">
            <input type="checkbox" checked={allTCsSelected}
              onChange={e => setSelectedTCIds(e.target.checked ? allTCIds : [])}
              className="scenario-checkbox w-3.5 h-3.5 flex-shrink-0" />
            {someSelected && (
              <span className="px-1.5 py-0.5 text-[9px] bg-[#3615CF]/10 text-[#3615CF] rounded-full font-medium flex-shrink-0">
                {selectedTSCount}개
              </span>
            )}
            <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#6b7280] hover:text-[#1a1a2e] border border-[#e5e7eb] rounded hover:bg-white transition-colors flex-shrink-0">
              <Download className="w-3 h-3" /> CSV
            </button>
            <SearchBar
              value={scenarioSearchQuery}
              onChange={setScenarioSearchQuery}
              placeholder="검색..."
              className="flex-1"
            />
            <button onClick={() => setScenarioChangeFilter(!scenarioChangeFilter)} title="변경사항 필터"
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                scenarioChangeFilter ? 'bg-[#3615CF] text-white' : 'text-[#9ca3af] hover:text-[#3615CF] hover:bg-[#3615CF]/10'
              }`}>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { if (deferredAIIds.length > 0) setShowDeferredAIItems((prev: boolean) => !prev); }}
              title="보류 항목"
              disabled={deferredAIIds.length === 0}
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all relative ${
                showDeferredAIItems && deferredAIIds.length > 0
                  ? 'bg-[#fef3c7] text-[#d97706] ring-1 ring-[#fcd34d]'
                  : deferredAIIds.length > 0
                    ? 'text-[#d97706] hover:bg-[#fffbeb]'
                    : 'text-[#c4c9d4] cursor-default'
              }`}>
              <Clock className="w-3.5 h-3.5" />
              {deferredAIIds.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-[#d97706] text-white text-[8px] rounded-full flex items-center justify-center leading-none">
                  {deferredAIIds.length}
                </span>
              )}
            </button>
            {/* TS 추가 버튼 */}
            <button
              onClick={addNewTS}
              title="시나리오 추가"
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[#9ca3af] hover:text-status-pass hover:bg-green-50 transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tree body */}
          <div className="flex-1 overflow-y-auto pt-1 pb-24">
            {/* 보류 항목 */}
            {showDeferredAIItems && deferredAIIds.length > 0 && (
              <div className="mx-2 mb-2 rounded-lg border border-[#fcd34d] bg-[#fffbeb]/60">
                <div className="px-2.5 py-1.5 border-b border-[#fde68a] flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#d97706] flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-[#b45309]">보류 항목</span>
                </div>
                {deferredAIIds.map((tsId) => {
                  const ai = _dynamicAIItems[tsId];
                  const sc = _dynamicScenarios.find((s) => s.id === tsId);
                  if (!ai || !sc) return null;
                  const triggerLabel = ai.trigger === 'chatbot' ? '챗봇 질의' : ai.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';
                  return (
                    <div key={`deferred-${tsId}`} className="px-2.5 py-1.5 border-b border-[#fde68a]/60 last:border-0 text-[10px]">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Sparkles className="w-3 h-3 text-[#f59e0b] flex-shrink-0" />
                        <span className="font-semibold text-[#b45309]">{tsId} · {sc.name}</span>
                        <span className="ml-auto text-[#9ca3af]">{ai.timestamp.split(' ')[0]}</span>
                      </div>
                      <div className="text-[#92400e] mb-1 leading-relaxed">{triggerLabel} · {ai.reason}</div>
                      <div className="flex gap-1">
                        <button onClick={() => handleApproveAIItem(tsId)}
                          className="px-2 py-0.5 bg-[#d97706] text-white rounded text-[9px] font-medium">승인</button>
                        <button onClick={() => resolveAIItem(tsId, 'rejected')}
                          className="px-2 py-0.5 bg-white border border-[#fcd34d] text-[#d97706] rounded text-[9px] hover:bg-red-50 hover:text-red-500 hover:border-red-200">거절</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredScenarios.map(scenario => {
              const tcs = _dynamicTestCases[scenario.id] || [];
              const allTCKeys = tcs.map(tc => `${scenario.id}_${tc.id}`);
              const tsAllSel = allTCKeys.length > 0 && allTCKeys.every((k: string) => _selectedTCIds.includes(k));
              const tsSomeSel = allTCKeys.some((k: string) => _selectedTCIds.includes(k));
              const isExpanded = expandedTSForTC.includes(scenario.id);
              const tsEditKey = scenario.id;
              const isTSEditing = editingDetailItem?.type === 'ts' && editingDetailItem.key === tsEditKey;

              const aiInfo = _dynamicAIItems[scenario.id];
              // AI 변경 검토 표시는 "수정중(draft)"를 보고 있을 때만 의미가 있다 — change_request는
              // ts_id 기준 전역 상태라, 가드 없이는 v1.0 등 과거 확정 버전 스냅샷에도 같은 ts_id의
              // 미해결 AI 변경이 그대로 노출되어 "확정된 과거 버전인데 AI 수정 중"으로 보이는 문제가 있다.
              const isOrphanedItem = isSelectedDraftHead && aiInfo?.trigger === 'orphaned' && _aiItemActions[scenario.id] !== 'approved' && _aiItemActions[scenario.id] !== 'rejected';
              const isAIItem = isSelectedDraftHead && !!aiInfo && aiInfo.trigger !== 'orphaned' && _aiItemActions[scenario.id] !== 'approved' && _aiItemActions[scenario.id] !== 'rejected';
              const isDeleteTsItem = isAIItem && !!aiInfo?.deleteTs;
              const isDeleteTcItem = isAIItem && !isDeleteTsItem && (aiInfo?.deletedTcIds?.length ?? 0) > 0;
              const isReviewItem = isAIItem || isOrphanedItem;
              const isDeferredItem = _aiItemActions[scenario.id] === 'deferred';

              // 거절: AI 태그만 제거, 시나리오 자체는 목록에 유지
              if (isDeferredItem) return null;

              const triggerLabel = aiInfo?.trigger === 'chatbot' ? '챗봇 질의' : aiInfo?.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';

              const isRedItem = isOrphanedItem || isDeleteTsItem || isDeleteTcItem;
              const tsBadge = isRedItem ? 'bg-[#fee2e2] text-[#b91c1c]' : isAIItem ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#3615CF]/10 text-[#3615CF]';
              const reviewRowBg = isRedItem ? 'bg-[#fef2f2]' : isAIItem ? 'bg-[#fffbeb]' : '';
              const reviewBorder = isRedItem ? 'border-[#fecaca]' : isAIItem ? 'border-[#fde68a]' : 'border-[#f0f0f0]/60';
              const reviewIconColor = isRedItem ? 'text-[#dc2626]' : 'text-[#f59e0b]';
              const reviewTitleColor = isRedItem ? 'text-[#991b1b]' : 'text-[#92400e]';
              const reviewTextColor = isRedItem ? 'text-[#dc2626]' : 'text-[#d97706]';

              const tsRowContent = (
                <>
                  {/* TS 행 */}
                  <div className={`group flex items-center gap-1.5 px-2 py-2 ${isReviewItem ? reviewRowBg : 'hover:bg-gray-50'} border-b ${reviewBorder} ${
                    !isReviewItem && selectedScenario === scenario.id ? 'bg-[#3615CF]/5 border-l-2 border-l-[#3615CF]' : ''
                  }`}>
                    {(isOrphanedItem || isDeleteTsItem) && <AlertTriangle className="w-3 h-3 text-[#dc2626] flex-shrink-0" />}
                    {isAIItem && !isDeleteTsItem && <Sparkles className="w-3 h-3 text-[#d97706] flex-shrink-0" />}
                    <input type="checkbox" checked={tsAllSel}
                      ref={el => { if (el) el.indeterminate = tsSomeSel && !tsAllSel; }}
                      onChange={() => toggleTSSelection(scenario.id)}
                      className="scenario-checkbox w-3.5 h-3.5 flex-shrink-0"
                      onClick={e => e.stopPropagation()} />
                    <button onClick={e => { e.stopPropagation(); setExpandedTSForTC((prev: string[]) => prev.includes(scenario.id) ? prev.filter((id: string) => id !== scenario.id) : [...prev, scenario.id]); }} className="flex-shrink-0">
                      {isExpanded ? <ChevronDown className={`w-3.5 h-3.5 ${isReviewItem ? reviewIconColor : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3.5 h-3.5 ${isReviewItem ? reviewIconColor : 'text-[#9ca3af]'}`} />}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!isTSEditing) { setSelectedScenario(scenario.id); setDetailPanelRow({ level: 'TS', tsId: scenario.id }); } }}>
                      <div className="flex items-center gap-1">
                        <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tsBadge}`}>TS</span>
                        <span className={`text-sm font-semibold ${isReviewItem ? reviewTitleColor : 'text-[#1a1a2e]'}`}>{scenario.id}</span>
                        {isTSEditing
                          ? sidebarEditInput('text-xs')
                          : <span className={`text-xs truncate ${isReviewItem ? reviewTextColor : 'text-[#6b7280]'}`}>{scenario.name}</span>}
                      </div>
                    </div>
                    {/* TS 액션 아이콘 */}
                    {!isReviewItem && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'ts', key: tsEditKey, value: scenario.name }); }}
                          title="수정"
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#EAE8F9] text-[#9ca3af] hover:text-[#3615CF] transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); addNewTC(scenario.id); }}
                          title="TC 추가"
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-green-50 text-[#9ca3af] hover:text-green-500 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteTS(scenario.id); }}
                          title="삭제"
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[#9ca3af] hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI 항목 승인/보류/거절 — TC 삭제 요청은 별도 배너로 분리 */}
                  {isAIItem && !isDeleteTsItem && !isDeleteTcItem && (
                    <div className="px-2.5 py-1.5 bg-[#fffbeb]/60 border-b border-[#fde68a] flex items-center gap-1.5">
                      <span className="text-[9px] text-[#d97706] flex-shrink-0">{triggerLabel}</span>
                      <span className="text-[9px] text-[#f59e0b] truncate flex-1">{aiInfo!.reason}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleApproveAIItem(scenario.id)}
                          className="px-2 py-0.5 bg-[#d97706] text-white rounded text-[9px] font-medium hover:bg-[#b45309]">승인</button>
                        <button onClick={() => { resolveAIItem(scenario.id, 'deferred'); markDirectEdit(); setShowDeferredAIItems(true); }}
                          className="px-2 py-0.5 bg-white border border-[#fcd34d] text-[#d97706] rounded text-[9px] hover:bg-[#fffbeb]">보류</button>
                        <button onClick={() => resolveAIItem(scenario.id, 'rejected')}
                          className="px-2 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] hover:bg-red-50">거절</button>
                      </div>
                    </div>
                  )}

                  {/* TC 삭제 요청 — chatbot trigger + deleted_tc_ids */}
                  {isDeleteTcItem && (
                    <div className="px-2.5 py-1.5 bg-[#fef2f2]/60 border-b border-[#fecaca] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[#fee2e2] text-[#b91c1c] text-[9px] font-semibold rounded flex-shrink-0 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> 삭제 요청
                      </span>
                      <span className="text-[9px] text-[#dc2626] flex-shrink-0">
                        TC {aiInfo!.deletedTcIds!.length}개 삭제 대기
                      </span>
                      <span className="text-[9px] text-[#dc2626] truncate flex-1">{aiInfo!.reason}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => resolveAIItem(scenario.id, 'approved')}
                          className="px-2 py-0.5 bg-[#dc2626] text-white rounded text-[9px] font-medium hover:bg-[#b91c1c]">삭제 확정</button>
                        <button onClick={() => resolveAIItem(scenario.id, 'rejected')}
                          className="px-2 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] hover:bg-red-50">취소</button>
                      </div>
                    </div>
                  )}

                  {/* TS 삭제 요청 — chatbot trigger + delete_ts:true */}
                  {isDeleteTsItem && (
                    <div className="px-2.5 py-1.5 bg-[#fef2f2]/60 border-b border-[#fecaca] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[#fee2e2] text-[#b91c1c] text-[9px] font-semibold rounded flex-shrink-0 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> 삭제 요청
                      </span>
                      <span className="text-[9px] text-[#dc2626] truncate flex-1">{aiInfo!.reason}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => resolveAIItem(scenario.id, 'approved')}
                          className="px-2 py-0.5 bg-[#dc2626] text-white rounded text-[9px] font-medium hover:bg-[#b91c1c]">삭제 확정</button>
                        <button onClick={() => resolveAIItem(scenario.id, 'rejected')}
                          className="px-2 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] hover:bg-red-50">취소</button>
                      </div>
                    </div>
                  )}

                  {/* 검토 대상 배지 — PRD에서 관련 요구사항이 사라진 시나리오 (orphaned).
                      승인/보류/거절 등 change_request 액션과 의미가 맞지 않아(예: "거절"은
                      Spring 측에서 이전 버전 롤백을 트리거함) 별도 액션 없이 표시만 한다. */}
                  {isOrphanedItem && (
                    <div className="px-2.5 py-1.5 bg-[#fef2f2]/60 border-b border-[#fecaca] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[#fee2e2] text-[#b91c1c] text-[9px] font-semibold rounded flex-shrink-0 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> 검토 대상
                      </span>
                      <span className="text-[9px] text-[#dc2626] truncate flex-1">{aiInfo!.reason}</span>
                    </div>
                  )}

                  {/* TC 행 */}
                  {isExpanded && tcs.map(tc => {
                    const tcKey = `${scenario.id}_${tc.id}`;
                    const isTCExpanded = expandedTCMain.includes(tcKey);
                    const isTCEditing = editingDetailItem?.type === 'tc' && editingDetailItem.key === tcKey;
                    const frEntries = rtmMappings.filter(r => r.ts === scenario.id && r.tc === tc.id);
                    // TC 단위 강조 범위 — change_request.content.changed_tc_ids 가 있으면
                    // 실제로 변경/추가된 TC(및 그 TV)에만 "AI 생성" 표시를 좁힌다.
                    // 정보가 없으면(신규 TS 생성 등 TS 전체가 새로 만들어진 경우) 기존처럼
                    // TS 전체 강조로 폴백한다.
                    const changedTcIds = aiInfo?.changedTcIds;
                    const deletedTcIds = aiInfo?.deletedTcIds;
                    // 삭제 대기 TC: _pending_delete 플래그 또는 deletedTcIds 목록으로 판별
                    const tcIsPendingDelete = isAIItem && (tc.pendingDelete || (deletedTcIds?.includes(tc.id) ?? false));
                    const tcIsAIItem = isAIItem && !isDeleteTsItem && !isDeleteTcItem && !tcIsPendingDelete && (!changedTcIds || changedTcIds.includes(tc.id));
                    const tcIsReviewItem = tcIsAIItem || isOrphanedItem || tcIsPendingDelete;
                    const tcBadgeColor = (isOrphanedItem || tcIsPendingDelete) ? 'bg-[#fef2f2] text-[#dc2626]' : tcIsAIItem ? 'bg-[#fffbeb] text-[#d97706]' : 'bg-[#3615CF]/8 text-[#3615CF]';
                    const tcRowBg = (isOrphanedItem || tcIsPendingDelete) ? 'bg-[#fef2f2]/50 border-[#fecaca]/50' : tcIsAIItem ? 'bg-[#fffbeb]/50 border-[#fde68a]/50' : `${highlightedBotRow === `tc-${tcKey}` ? 'bg-[#3615CF]/10' : 'bg-[#F9FAFB]'} border-[#f0f0f0]/40`;
                    const tcIconColor = (isOrphanedItem || tcIsPendingDelete) ? 'text-[#dc2626]' : tcIsAIItem ? 'text-[#f59e0b]' : 'text-[#9ca3af]';
                    const tcTitleColor = (isOrphanedItem || tcIsPendingDelete) ? 'text-[#991b1b]' : tcIsAIItem ? 'text-[#92400e]' : 'text-[#1a1a2e]';
                    const tcTextColor = (isOrphanedItem || tcIsPendingDelete) ? 'text-[#dc2626]' : tcIsAIItem ? 'text-[#d97706]' : 'text-[#6b7280]';
                    return (
                      <div key={tc.id}>
                        <div className={`group flex items-center gap-1.5 pl-7 pr-2 py-1.5 border-b ${tcRowBg} hover:bg-opacity-80`}>
                          <input type="checkbox" checked={_selectedTCIds.includes(tcKey)}
                            onChange={() => toggleTCSelection(scenario.id, tc.id)}
                            className="scenario-checkbox w-3 h-3 flex-shrink-0"
                            onClick={e => e.stopPropagation()} />
                          <button onClick={e => { e.stopPropagation(); setExpandedTCMain((prev: string[]) => prev.includes(tcKey) ? prev.filter((id: string) => id !== tcKey) : [...prev, tcKey]); }} className="flex-shrink-0">
                            {tc.values.length > 0
                              ? (isTCExpanded ? <ChevronDown className={`w-3 h-3 ${tcIsReviewItem ? tcIconColor : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3 h-3 ${tcIsReviewItem ? tcIconColor : 'text-[#9ca3af]'}`} />)
                              : <span className="w-3" />}
                          </button>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                            if (isTCEditing) return;
                            setDetailPanelRow({ level: 'TC', tsId: scenario.id, tcId: tc.id });
                            toggleTcDetail(tcKey);
                          }}>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tcBadgeColor}`}>TC</span>
                              <span className={`text-xs font-medium flex-shrink-0 ${tcIsReviewItem ? tcTitleColor : 'text-[#1a1a2e]'}`}>{tc.id}</span>
                              {isTCEditing
                                ? sidebarEditInput('text-xs')
                                : <span className={`text-xs truncate ${tcIsReviewItem ? tcTextColor : 'text-[#6b7280]'}`}>{tc.name}</span>}
                              {!isTCEditing && tc.tags && tc.tags.length > 0 && tc.tags.map((tag: string) => (
                                <span key={tag} className="px-1.5 py-0.5 bg-[#EAE8F9]/65 text-[#3615CF]/85 text-[9px] rounded-full font-medium flex-shrink-0">{tag}</span>
                              ))}
                              {!isTCEditing && frEntries.map(fr => (
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
                          {/* TC 액션 아이콘 */}
                          {!tcIsReviewItem && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                              <button
                                onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'tc', key: tcKey, value: tc.name }); }}
                                title="수정"
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#EAE8F9] text-[#9ca3af] hover:text-[#3615CF] transition-colors">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); addNewTV(scenario.id, tc.id); }}
                                title="TV 추가"
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-green-50 text-[#9ca3af] hover:text-green-500 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); deleteTC(scenario.id, tc.id); }}
                                title="삭제"
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[#9ca3af] hover:text-red-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* TC 상세 정보 — given/when/then/tags (스웨거 스타일 상세 패널) */}
                        {expandedTcDetailKeys.includes(tcKey) && (() => {
                          const isEditingTcDetail = tcDetailEditKey === tcKey;
                          const hasBdd = !!(tc.given || tc.when || tc.then);
                          return (
                            <div className="mb-1 py-1.5 bg-[#F9FAFB] border-b border-[#f0f0f0]/40">
                            <div className="border-l border-slate-200 pl-3 space-y-1.5" style={{ marginLeft: '3.2rem' }}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-widest">TC 상세 정보</span>
                                {!isEditingTcDetail && (
                                  <button onClick={() => startTcDetailEdit(scenario.id, tc.id, tc)}
                                    title="편집"
                                    className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-[#3615CF] hover:bg-[#EAE8F9] transition-colors">
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                              {isEditingTcDetail ? (
                                <div className="space-y-1.5">
                                  {(['given', 'when', 'then'] as const).map(stepKey => (
                                    <div key={stepKey} className="flex items-center gap-2">
                                      <span className="w-16 flex-shrink-0 text-[10px] font-semibold text-slate-400 uppercase">{stepKey}</span>
                                      <input value={tcDetailEditDraft[stepKey]}
                                        onChange={e => setTcDetailEditDraft(prev => ({ ...prev, [stepKey]: e.target.value }))}
                                        className="w-72 max-w-full text-[11px] bg-white border border-[#3615CF]/30 rounded px-2 py-0.5 focus:outline-none focus:border-[#3615CF]/60" />
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-2">
                                    <span className="w-16 flex-shrink-0 text-[10px] font-semibold text-slate-400 uppercase">tags</span>
                                    <input value={tcDetailEditDraft.tags}
                                      onChange={e => setTcDetailEditDraft(prev => ({ ...prev, tags: e.target.value }))}
                                      placeholder="쉼표로 구분 (예: boundary, smoke)"
                                      className="w-72 max-w-full text-[11px] bg-white border border-[#3615CF]/30 rounded px-2 py-0.5 focus:outline-none focus:border-[#3615CF]/60" />
                                  </div>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <span className="w-16 flex-shrink-0" />
                                    <div className="w-72 max-w-full flex items-center justify-end gap-1.5">
                                      <button onClick={() => saveTcDetailEdit(scenario.id, tc.id)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3615CF] text-white text-[10px] font-medium hover:opacity-90 transition-opacity">
                                        <CheckCircle className="w-2.5 h-2.5" /> 저장
                                      </button>
                                      <button onClick={() => setTcDetailEditKey(null)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 text-gray-500 text-[10px] font-medium hover:bg-gray-300 transition-colors">
                                        <X className="w-2.5 h-2.5" /> 취소
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : hasBdd ? (
                                <div className="space-y-1">
                                  {tc.given && <div className="flex gap-2 text-[11px]"><span className="w-12 flex-shrink-0 font-semibold text-[#9ca3af] uppercase">Given</span><span className="text-[#1a1a2e] leading-relaxed">{tc.given}</span></div>}
                                  {tc.when && <div className="flex gap-2 text-[11px]"><span className="w-12 flex-shrink-0 font-semibold text-[#9ca3af] uppercase">When</span><span className="text-[#1a1a2e] leading-relaxed">{tc.when}</span></div>}
                                  {tc.then && <div className="flex gap-2 text-[11px] pb-2"><span className="w-12 flex-shrink-0 font-semibold text-[#9ca3af] uppercase">Then</span><span className="text-[#1a1a2e] leading-relaxed">{tc.then}</span></div>}
                                </div>
                              ) : (
                                <div className="text-[10px] text-[#c4c9d4]">given/when/then 정보가 없습니다.</div>
                              )}
                            </div>
                            </div>
                          );
                        })()}

                        {/* TV 행 — 테스트 값 카드 (스웨거 스타일 상세) */}
                        {isTCExpanded && tc.values.map(tv => {
                          const tvKey = `${scenario.id}_${tc.id}_${tv.id}`;
                          const isOpen = expandedTvDetailKeys.includes(tvKey);
                          const isCopied = tvCopied === tvKey;
                          const isEditingTvDetail = tvDetailEditKey === tvKey;
                          const hasDetail = !!(tv.field || tv.type || tv.value !== undefined || tv.purpose);

                          return (
                            <div key={tv.id}
                              className={`border-b ${isOrphanedItem ? 'border-[#fecaca]/30' : tcIsAIItem ? 'border-[#fde68a]/30' : 'border-[#f0f0f0]/30'}`}>

                              {/* ── TV 헤더 ── */}
                              <div
                                className={`group flex items-center gap-1.5 pr-2 py-1.5 cursor-pointer transition-colors ${
                                  isOrphanedItem ? 'bg-[#fef2f2]/40 hover:bg-[#fef2f2]/40'
                                  : tcIsAIItem ? 'bg-[#fffbeb]/40 hover:bg-[#fffbeb]/40'
                                  : 'bg-white hover:bg-slate-50'
                                }`}
                                style={{ paddingLeft: '3.25rem' }}
                                onClick={() => {
                                  setDetailPanelRow({ level: 'TV', tsId: scenario.id, tcId: tc.id, tvId: tv.id });
                                  setSelectedTvId(tv.id);
                                  toggleTvDetail(tvKey);
                                }}>

                                <input type="checkbox" checked={_selectedTCIds.includes(tvKey)}
                                  onChange={() => toggleTVSelection(tvKey)}
                                  className="scenario-checkbox w-3 h-3 flex-shrink-0"
                                  onClick={e => e.stopPropagation()} />

                                {/* TV ID 배지 */}
                                <span className={`px-1.5 py-0.5 text-[8px] rounded font-bold font-mono flex-shrink-0 ${
                                  isOrphanedItem ? 'bg-[#fee2e2] text-[#dc2626]' : tcIsAIItem ? 'bg-[#fef3c7] text-[#d97706]' : 'bg-slate-100 text-slate-500'
                                }`}>{tv.id}</span>

                                {/* field: value 미리보기 (없으면 name) */}
                                {tv.field || tv.value !== undefined ? (
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className="font-mono text-[10px] font-semibold text-slate-600 flex-shrink-0">{tv.field ?? tv.name}</span>
                                    <span className="text-slate-300 flex-shrink-0">=</span>
                                    <span className="font-mono text-[10px] text-[#3615CF]/80 truncate">{tv.value === '' ? <em className="not-italic text-slate-400">(빈 값)</em> : String(tv.value ?? '')}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 truncate flex-1">{tv.name}</span>
                                )}

                                {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}

                                {/* 액션 (호버 시 표시) */}
                                {!tcIsReviewItem && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleTVCopy(tvKey, tv)}
                                      title={isCopied ? '복사됨' : '복사'}
                                      className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isCopied ? 'text-[#3615CF]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                                      {isCopied ? <CheckCircle className="w-2.5 h-2.5" /> : <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h8"/></svg>}
                                    </button>
                                    <button onClick={() => deleteTV(scenario.id, tc.id, tv.id)}
                                      title="삭제" className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* ── TV 상세 정보 (펼쳤을 때) — field/type/value/purpose ── */}
                              {isOpen && (
                                <div className="mb-1 border-l border-slate-200 pl-3 py-1 space-y-1" style={{ marginLeft: '4.4rem' }}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">TV 상세 정보</span>
                                    {!isEditingTvDetail && (
                                      <button onClick={() => startTvDetailEdit(scenario.id, tc.id, tv.id, tv)}
                                        title="편집"
                                        className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-[#3615CF] hover:bg-[#EAE8F9] transition-colors">
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                  {isEditingTvDetail ? (
                                    <div className="space-y-1.5">
                                      {([
                                        ['field', 'FIELD'], ['type', 'TYPE'], ['value', 'VALUE'], ['purpose', 'PURPOSE'],
                                      ] as const).map(([draftKey, label]) => (
                                        <div key={draftKey} className="flex items-center gap-2">
                                          <span className="w-16 flex-shrink-0 text-[10px] font-semibold text-slate-400">{label}</span>
                                          <input value={tvDetailEditDraft[draftKey]}
                                            onChange={e => setTvDetailEditDraft(prev => ({ ...prev, [draftKey]: e.target.value }))}
                                            className="w-72 max-w-full text-[11px] font-mono bg-white border border-[#3615CF]/30 rounded px-2 py-0.5 focus:outline-none focus:border-[#3615CF]/60" />
                                        </div>
                                      ))}
                                      <div className="flex items-center gap-2 pt-0.5">
                                        <span className="w-16 flex-shrink-0" />
                                        <div className="w-72 max-w-full flex items-center justify-end gap-1.5">
                                          <button onClick={() => saveTvDetailEdit(scenario.id, tc.id, tv.id)}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3615CF] text-white text-[10px] font-medium hover:opacity-90 transition-opacity">
                                            <CheckCircle className="w-2.5 h-2.5" /> 저장
                                          </button>
                                          <button onClick={() => setTvDetailEditKey(null)}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 text-gray-500 text-[10px] font-medium hover:bg-gray-300 transition-colors">
                                            <X className="w-2.5 h-2.5" /> 취소
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : hasDetail ? (
                                    <div className="space-y-0.5">
                                      <div className="flex gap-2 text-[11px]"><span className="w-16 flex-shrink-0 font-semibold text-slate-400">FIELD</span><span className="font-mono text-slate-700">{tv.field || '-'}</span></div>
                                      <div className="flex gap-2 text-[11px]"><span className="w-16 flex-shrink-0 font-semibold text-slate-400">TYPE</span><span className="font-mono text-slate-700">{tv.type || '-'}</span></div>
                                      <div className="flex gap-2 text-[11px]"><span className="w-16 flex-shrink-0 font-semibold text-slate-400">VALUE</span><span className="font-mono text-slate-700">{tv.value === '' ? <em className="not-italic text-slate-400">(빈 값)</em> : String(tv.value ?? '-')}</span></div>
                                      <div className="flex gap-2 text-[11px]"><span className="w-16 flex-shrink-0 font-semibold text-slate-400">PURPOSE</span><span className="text-slate-600 leading-relaxed">{tv.purpose || '-'}</span></div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-300">상세 정보가 없습니다.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              );
              return <div key={scenario.id}>{tsRowContent}</div>;
            })}
          </div>
        </div>

        {/* ── 그래프 모드: Left drag handle + Center graph ── */}
        {viewMode === 'graph' && (
          <>
            <div className="w-1 bg-[#e5e7eb] hover:bg-[#3615CF]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleLeftDragStart} />
            <div
              ref={graphContainerRef}
              className="flex-1 bg-[#F2F3F5] overflow-hidden relative">
              <ScenarioFlowGraph
                tsNodes={tsFlowNodes}
                flowEdges={mockTSFlows}
                width={graphSize.width}
                height={graphSize.height}
                selectedId={graphSelectedId}
                onNodeSelect={handleGraphNodeSelect}
              />
            </div>
          </>
        )}

        {/* Right drag handle — always */}
        <div className="w-1 bg-[#e5e7eb] hover:bg-[#3615CF]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleRightDragStart} />

        {/* ── [4] Right Panel — 시나리오 그룹 ── */}
        {(() => {
          void detailPanelRow; // keep alive for graph-mode sync
          return (
            <div className="bg-white border-l border-[#f0f0f0] flex flex-col flex-shrink-0 overflow-hidden" style={{ width: rightPanelWidth }}>
              {/* Header */}
              <div className="px-3 pt-3 pb-2.5 flex flex-col gap-2 flex-shrink-0">
                {/* 시나리오 그룹 라벨 + 필터 해제 */}
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest">시나리오 그룹</div>
                  {selectedScenarioGroupId && (
                    <button onClick={() => (setSelectedScenarioGroupId as any)(null)}
                      className="flex items-center gap-1 text-[10px] text-[#9ca3af] hover:text-[#3615CF] transition-colors">
                      <X className="w-3 h-3" /> 필터 해제
                    </button>
                  )}
                </div>
                {!canUseConfirmedVersionActions ? (
                  <button
                    onClick={() => {
                      if (reviewBlocked) return;
                      // 버전 저장 + 코드 생성 확인 모달 노출까지만 트리거 — "수정중" → "확정"
                      // 전환은 사용자가 모달에서 "생성 시작"을 눌렀을 때(codeGenReviewStartTick)
                      // 비로소 일어난다. 여기서 즉시 전환하면 "취소"를 눌러도 버튼이
                      // "E2E TEST 실행"으로 바뀐 채 되돌아오지 않는 문제가 생긴다.
                      onReviewConfirm?.();
                    }}
                    disabled={reviewBlocked}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      reviewBlocked
                        ? 'bg-[#cfd5dd] text-white cursor-not-allowed'
                        : 'bg-[#3615CF] text-white hover:shadow-md hover:bg-[#3615CF]/90'
                    }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {reviewButtonLabel}
                  </button>
                ) : (
                  <>
                    {/* E2E TEST 실행 */}
                    <button
                      onClick={() => {
                        const scenarioIds = _dynamicScenarios.map(s => s.id);
                        onPrepareRun?.(scenarioIds.length ? scenarioIds : undefined, 'E2E TEST', null);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#3615CF] text-white text-xs font-semibold hover:shadow-md hover:bg-[#3615CF]/90 transition-all">
                      <Play className="w-3.5 h-3.5" />
                      E2E TEST 실행
                    </button>
                    {/* 그룹 생성 버튼 */}
                    <button
                      onClick={() => { if (someSelected) { setGroupNameInput(`시나리오 그룹 #${Date.now() % 1000}`); setShowTestGroupModal(true); } }}
                      className={`w-full py-2 rounded-lg border flex items-center justify-center gap-1.5 text-xs transition-all ${
                        someSelected
                          ? 'border-[#3615CF]/30 text-[#3615CF] hover:bg-[#EAE8F9]'
                          : 'border-[#e5e7eb] text-[#c4c9d4] cursor-default'
                      } ${canUseConfirmedVersionActions ? 'border-solid' : 'border-dashed'}`}>
                      <Plus className="w-3 h-3" />
                      {someSelected ? `${selectedTSCount}개 TS로 그룹 생성` : 'TC를 선택하면 그룹을 생성할 수 있어요'}
                    </button>
                  </>
                )}
              </div>

              <div className="m-2 mx-2 h-[2px] bg-[#f0f0f0] flex-shrink-0" />

              {/* Group cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* 검색바 */}
                <SearchBar
                  placeholder="그룹 검색..."
                  showFilterButton
                  className="mb-3"
                />
                {uiGroups.map(group => {
                  const isSelected = selectedScenarioGroupId === group.id;
                  return (
                    <button key={group.id}
                      onClick={() => (setSelectedScenarioGroupId as any)(isSelected ? null : group.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#3615CF] bg-[#EAE8F9] shadow-sm'
                          : 'border-[#e5e7eb] hover:border-[#3615CF]/40 hover:bg-gray-50'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-[#3615CF]' : 'text-[#1a1a2e]'}`}>{group.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(group.scenarios as string[]).map(sid => (
                          <span key={sid} className={`px-1.5 py-0.5 text-[9px] rounded font-mono font-bold ${
                            isSelected ? 'bg-[#EAE8F9] text-[#3615CF]' : 'bg-gray-100 text-[#6b7280]'
                          }`}>{sid}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-[#9ca3af]">TC {group.tcCount}개</span>
                        <span className="text-[10px] text-[#c4c9d4]">·</span>
                        {(group.tags as string[]).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-[9px] text-[#6b7280] rounded-full">{tag}</span>
                        ))}
                      </div>
                      {/* Run button */}
                      <div className="mt-2.5 flex justify-end gap-1.5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedGroupForSchedule(group.id);
                            setShowScheduleModal(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e5e7eb] text-[#6b7280] rounded text-[10px] font-medium hover:border-[#3615CF]/40 hover:text-[#3615CF] transition-colors">
                          <Calendar className="w-2.5 h-2.5" /> 예약하기
                        </button>
                        <button
                          disabled={hasPendingAIReview || isGeneratingCode}
                          onClick={e => {
                            e.stopPropagation();
                            if (hasPendingAIReview || isGeneratingCode) return;
                            onPrepareRun?.(group.scenarios as string[], group.name, group.id);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                            hasPendingAIReview || isGeneratingCode
                              ? 'bg-[#cfd5dd] text-white cursor-not-allowed'
                              : 'bg-[#EAE8F9] text-[#3615CF] hover:bg-[#DDDDF5]'
                          }`}>
                          <Play className="w-2.5 h-2.5" /> 실행
                        </button>
                      </div>
                    </button>
                  );
                })}

              </div>
            </div>
          );

        })()}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && selectedGroupForSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <div className="font-semibold mb-4 text-base">테스트 예약</div>
            <div className="space-y-4">
              {/* 예약 날짜 */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">예약 날짜</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3615CF] text-sm"
                />
              </div>
              {/* 예약 시간 */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">예약 시간</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3615CF] text-sm"
                />
              </div>
              {/* 반복 설정 */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">반복</label>
                <select
                  value={scheduleRepeat}
                  onChange={e => setScheduleRepeat(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3615CF] text-sm">
                  <option value="once">일회</option>
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedGroupForSchedule(null);
                  setScheduleDate('');
                  setScheduleTime('09:00');
                  setScheduleRepeat('once');
                }}
                className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg font-medium">
                예약
              </button>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedGroupForSchedule(null);
                }}
                className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Group Modal */}
      {showTestGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <div className="font-semibold mb-4 text-base">시나리오 그룹 생성</div>
            <label className="block text-xs font-semibold text-[#6b7280] mb-1">그룹 이름</label>
            <input
              value={groupNameInput}
              onChange={e => setGroupNameInput(e.target.value)}
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm mb-4 focus:outline-none focus:border-[#3615CF]"
              placeholder="그룹 이름 입력"
            />
            <div className="text-sm text-[#6b7280] mb-2">선택된 TC ({selectedTCs.length}개):</div>
            <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
              {selectedTCs.map(({ tsId, tcId, tsName, tcName }) => (
                <div key={`${tsId}_${tcId}`} className="text-sm p-2 bg-gray-50 rounded">
                  {tsId} ({tsName}) → {tcId} {tcName}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setShowTestGroupModal(false);
                setSelectedTCIds([]);
                const tsIds = Array.from(new Set(selectedTCs.map(t => t.tsId).filter((id): id is string => Boolean(id))));
                const groupName = groupNameInput || `시나리오 그룹`;
                // 그룹 → DB 저장 + 그 그룹으로 실행. 실패 시 App.handleCreateAndRunGroup 가 fallback 처리.
                onCreateAndRunGroup?.(tsIds.length ? tsIds : undefined, groupName);
              }}
                className="flex-1 px-4 py-2 bg-[#3615CF] text-white rounded-lg font-medium">
                생성 확인
              </button>
              <button onClick={() => setShowTestGroupModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── TestPage (진행중 / 이력) ──────────────────────────────────────────────────
