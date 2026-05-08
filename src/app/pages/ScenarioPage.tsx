import React from 'react';
import { Calendar, CheckCircle, ChevronDown, ChevronRight, Clock, Download, Edit2, FileText, Play, Plus, RotateCcw, Search, SlidersHorizontal, Sparkles, Star, Trash2, X } from 'lucide-react';
import ScenarioFlowGraph from '../components/ScenarioFlowGraph';
import ScenarioGeneratingOverlay from '../components/ScenarioGeneratingOverlay';
import { mockRTMData, mockScenarioVersions, mockTestGroups, mockTSFlows, mockTVEndpoints, type HttpMethod } from '../data/mockData';

interface ScenarioPageProps {
  [key: string]: any;
}

export const ScenarioPage = ({
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
codeChangeDetected,
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
ScenarioManagerPanel,
setCurrentPage,
setTestDepth,
selectedScenarioGroupId,
setSelectedScenarioGroupId,
setRunningTests,
setTestSubTab,
setSelectedRunningTestId,
setSelectedTestGroup,
viewMode: viewModeProp = 'table',
setViewMode: setViewModeProp,
}: ScenarioPageProps) => {

  const viewMode = viewModeProp as 'table' | 'graph';
  const setViewMode = setViewModeProp as (m: 'table' | 'graph') => void;

  // 시나리오 생성 오버레이
  const [showGeneratingOverlay, setShowGeneratingOverlay] = React.useState(false);

  // TV JSON editor state
  const [tvEditingKey, setTvEditingKey] = React.useState<string | null>(null);
  const [tvEditContent, setTvEditContent] = React.useState('');
  const [tvCopied, setTvCopied] = React.useState<string | null>(null);

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
  const _dynamicTestCases: Record<string, Array<{ id: string; name: string; testVariables: Array<{ id: string; name: string }> }>> = dynamicTestCases as any;
  const _aiItemActions: Record<string, string> = aiItemActions as Record<string, string>;
  const _dynamicAIItems: Record<string, { reason: string; trigger: string; timestamp: string }> = dynamicAIItems as any;

  const selectedTCs = _selectedTCIds
    .filter((id: string) => id.split('_').length === 2)
    .map((id: string) => {
      const [tsId, tcId] = id.split('_');
      const ts = _dynamicScenarios.find((s) => s.id === tsId);
      const tc = (_dynamicTestCases[tsId] || []).find(t => t.id === tcId);
      return { tsId, tcId, tsName: ts?.name, tcName: tc?.name };
    });

  const toggleTSSelection = (tsId: string) => {
    const tsTCs = (_dynamicTestCases[tsId] || []).map(tc => `${tsId}_${tc.id}`);
    const allSelected = tsTCs.every((id: string) => _selectedTCIds.includes(id));
    if (allSelected) {
      setSelectedTCIds((prev: string[]) => prev.filter((id: string) => !tsTCs.includes(id)));
    } else {
      setSelectedTCIds((prev: string[]) => [...new Set([...prev, ...tsTCs])]);
    }
  };

  const toggleTCSelection = (key: string) => {
    setSelectedTCIds((prev: string[]) =>
      prev.includes(key) ? prev.filter((id: string) => id !== key) : [...prev, key]
    );
  };

  const toggleTVSelection = (key: string) => {
    setSelectedTCIds((prev: string[]) =>
      prev.includes(key) ? prev.filter((id: string) => id !== key) : [...prev, key]
    );
  };

  const mockValidationConditions: Record<string, string[]> = {
    'TS1_TC1_TV1': ['입력: 유효한 이메일 (test@example.com)', '기대: 로그인 성공, 대시보드 이동', '제한: 3초 이내'],
    'TS1_TC1_TV2': ['입력: 유효한 비밀번호 (8자 이상)', '기대: 인증 성공 (200 OK)', '검증: JWT 토큰 발급'],
    'TS1_TC2_TV1': ['입력: 유효한 이메일', '기대: 입력 필드 유효성 통과'],
    'TS1_TC2_TV2': ['입력: 잘못된 비밀번호 (5자 미만)', '기대: 오류 메시지 표시', '코드: 401 Unauthorized'],
  };

  // ── TV 엔드포인트 헬퍼 ────────────────────────────────────────
  const METHOD_STYLE: Record<HttpMethod, string> = {
    GET:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    POST:   'bg-blue-50   text-blue-700   border border-blue-200',
    PUT:    'bg-amber-50  text-amber-700  border border-amber-200',
    PATCH:  'bg-violet-50 text-violet-700 border border-violet-200',
    DELETE: 'bg-red-50    text-red-600    border border-red-200',
  };

  const HTTP_STATUS_TEXT: Record<number, string> = {
    200: 'OK', 201: 'Created', 204: 'No Content',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 422: 'Unprocessable Entity', 500: 'Internal Server Error',
  };

  // 라이트 테마 JSON 구문 강조
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
                <span className="text-blue-600">{m[2]}</span>
                <span className="text-slate-400">{m[3]}</span>
                <span className={isStr ? 'text-emerald-600' : 'text-orange-500'}>{m[4]}</span>
                <span className="text-slate-400">{m[5]}</span>
              </div>
            );
          }
          return <div key={i}><span className="text-slate-500">{line}</span></div>;
        })}
      </code>
    );
  };

  const handleTVCopy = (tvKey: string) => {
    const ep = mockTVEndpoints[tvKey];
    const text = ep
      ? JSON.stringify({ method: ep.method, path: ep.path, requestBody: ep.requestBody ?? {}, statusCode: ep.statusCode, responseBody: ep.responseBody ?? {} }, null, 2)
      : '{}';
    navigator.clipboard.writeText(text).then(() => {
      setTvCopied(tvKey);
      setTimeout(() => setTvCopied(null), 1800);
    });
  };

  const handleTVEditSave = (tvId: string, tsId_: string, tcId_: string) => {
    // tvEditContent는 requestBody JSON이 들어있음
    try { JSON.parse(tvEditContent); } catch { setTvEditingKey(null); return; }
    // 이름 변경은 별도이므로 여기서는 편집 종료만 (실제 저장은 확장 가능)
    setTvEditingKey(null);
  };

  // ── 사이드바 필터링 ────────────────────────────────────────────
  const filteredScenarios = _dynamicScenarios.filter(s => {
    const q = (scenarioSearchQuery as string).toLowerCase();
    const matchSearch = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    const isDeferred = _aiItemActions[s.id] === 'deferred';
    const matchChange = !scenarioChangeFilter || (!!_dynamicAIItems[s.id] && _aiItemActions[s.id] !== 'approved' && _aiItemActions[s.id] !== 'rejected' && !isDeferred);
    const activeGroup = selectedScenarioGroupId ? mockTestGroups.find(g => g.id === selectedScenarioGroupId) : null;
    const matchGroup = !activeGroup || (activeGroup.scenarios as string[]).includes(s.id);
    return matchSearch && matchChange && !isDeferred && matchGroup;
  });
  const deferredAIIds = Object.entries(_aiItemActions)
    .filter(([, value]) => value === 'deferred')
    .map(([id]) => id);

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

    if (editingDetailItem.type === 'ts') {
      setDynamicScenarios(prev => prev.map(s => s.id === editingDetailItem.key ? { ...s, name: value } : s));
    } else if (editingDetailItem.type === 'tc') {
      const [tsId, tcId] = editingDetailItem.key.split('_');
      setDynamicTestCases(prev => ({
        ...prev,
        [tsId]: (prev[tsId] || []).map(tc => tc.id === tcId ? { ...tc, name: value } : tc),
      }));
    } else {
      const [tsId, tcId, tvId] = editingDetailItem.key.split('_');
      setDynamicTestCases(prev => ({
        ...prev,
        [tsId]: (prev[tsId] || []).map(tc =>
          tc.id === tcId
            ? { ...tc, testVariables: tc.testVariables.map(tv => tv.id === tvId ? { ...tv, name: value } : tv) }
            : tc
        ),
      }));
    }

    setEditingDetailItem(null);
  };

  const sidebarEditInput = (className = 'text-[10px]') => (
    <div className="flex items-center gap-1 min-w-0 flex-1" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        value={editingDetailItem?.value ?? ''}
        onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
        onKeyDown={e => {
          if (e.key === 'Enter') saveSidebarEdit();
          if (e.key === 'Escape') setEditingDetailItem(null);
        }}
        className={`min-w-0 flex-1 px-1.5 py-0.5 border border-[#3615CF]/50 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#3615CF]/30 ${className}`}
      />
      <button onClick={saveSidebarEdit} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0">
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
    setDynamicScenarios(prev => [...prev, { id: newId, name: '새 시나리오', tags: [] }]);
    setDynamicTestCases(prev => ({ ...prev, [newId]: [] }));
    setExpandedTSForTC(prev => [...prev, newId]);
  };

  // ── TC 추가 ──────────────────────────────────────────────────
  const addNewTC = (tsId: string) => {
    const existing = _dynamicTestCases[tsId] || [];
    const newId = `TC${existing.length + 1}`;
    setDynamicTestCases(prev => ({
      ...prev,
      [tsId]: [...existing, { id: newId, name: '새 테스트케이스', testVariables: [] }],
    }));
    setExpandedTSForTC(prev => prev.includes(tsId) ? prev : [...prev, tsId]);
  };

  // ── TV 추가 ──────────────────────────────────────────────────
  const addNewTV = (tsId: string, tcId: string) => {
    const tcKey = `${tsId}_${tcId}`;
    setDynamicTestCases(prev => ({
      ...prev,
      [tsId]: (prev[tsId] || []).map(tc => {
        if (tc.id !== tcId) return tc;
        const newId = `TV${tc.testVariables.length + 1}`;
        return { ...tc, testVariables: [...tc.testVariables, { id: newId, name: '새 테스트변수' }] };
      }),
    }));
    setExpandedTCMain(prev => prev.includes(tcKey) ? prev : [...prev, tcKey]);
  };

  // ── TS 삭제 ──────────────────────────────────────────────────
  const deleteTS = (tsId: string) => {
    setDynamicScenarios(prev => prev.filter(s => s.id !== tsId));
    if (detailPanelRow?.tsId === tsId) setDetailPanelRow(null);
  };

  // ── TC 삭제 ──────────────────────────────────────────────────
  const deleteTC = (tsId: string, tcId: string) => {
    setDynamicTestCases(prev => ({
      ...prev,
      [tsId]: (prev[tsId] || []).filter(t => t.id !== tcId),
    }));
    if (detailPanelRow?.tcId === tcId && detailPanelRow?.tsId === tsId) setDetailPanelRow(null);
  };

  // ── TV 삭제 ──────────────────────────────────────────────────
  const deleteTV = (tsId: string, tcId: string, tvId: string) => {
    setDynamicTestCases(prev => ({
      ...prev,
      [tsId]: (prev[tsId] || []).map(t =>
        t.id === tcId ? { ...t, testVariables: t.testVariables.filter(v => v.id !== tvId) } : t
      ),
    }));
  };

  // 전체 TC ID 목록
  const allTCIds = _dynamicScenarios.flatMap((s) =>
    (_dynamicTestCases[s.id] || []).map(tc => `${s.id}_${tc.id}`)
  );

  return (
    <div className="flex flex-col h-full">

      <div className="flex flex-1 overflow-hidden">

        {/* ── [1] Version Timeline — 맨 좌측 ── */}
        <div className="w-14 bg-white border-r border-[#e5e7eb] flex flex-col items-center py-4 flex-shrink-0" style={{ overflow: 'visible', zIndex: 20 }}>
          <div className="text-[9px] text-[#9ca3af] font-semibold uppercase tracking-wide mb-4">VER</div>
          <div className="relative flex flex-col items-center w-full" style={{ overflow: 'visible' }}>
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-[#e5e7eb]" style={{ zIndex: 0 }} />
            {mockScenarioVersions.some(v => v.hasChange) && (() => {
              const latestChange = [...mockScenarioVersions].reverse().find(v => v.hasChange)!;
              const isSelected = selectedScenarioVersion === latestChange.id;
              return (
                <div className="relative flex flex-col items-center mb-5" style={{ zIndex: 10, overflow: 'visible' }}
                  onMouseEnter={() => handleVersionEnter(latestChange.id)}
                  onMouseLeave={handleVersionLeave}>
                  <button onClick={() => setSelectedScenarioVersion(latestChange.id)} className="relative flex items-center justify-center">
                    <svg width={20} height={20} style={{ overflow: 'visible' }}>
                      <circle cx={10} cy={10} r={8}
                        fill={isSelected ? '#EBEBFA' : 'white'}
                        stroke="#3615CF" strokeWidth={1.5} strokeDasharray="4 2.5" />
                    </svg>
                  </button>
                  <span className="text-[8px] text-[#c4c9d4]">{latestChange.date}</span>
                  {hoveredVersionId === latestChange.id && (
                    <div className="absolute left-full ml-1 top-0 bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-3 w-52"
                      style={{ zIndex: 9999 }}
                      onMouseEnter={() => handleVersionEnter(latestChange.id)}
                      onMouseLeave={handleVersionLeave}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#3615CF]" />
                        <span className="text-xs font-semibold text-[#1a1a2e]">변경 감지</span>
                      </div>
                      <div className="text-[10px] text-[#6b7280] mb-3 leading-relaxed">{latestChange.changeDesc}</div>
                      <div className="text-[10px] font-semibold text-[#1a1a2e] mb-2">버전을 분리할까요?</div>
                      <div className="flex gap-2">
                        <button onClick={() => setHoveredVersionId(null)}
                          className="flex-1 px-2 py-1.5 bg-white border border-[#e5e7eb] rounded-lg text-[10px] hover:bg-gray-50 font-medium">No</button>
                        <button onClick={() => setHoveredVersionId(null)}
                          className="flex-1 px-2 py-1.5 bg-[#3615CF] text-white rounded-lg text-[10px] font-medium">Yes</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {mockScenarioVersions.filter(v => !v.hasChange).map(ver => {
              const isSelected = selectedScenarioVersion === ver.id;
              const isFav = favoriteVersionIds.has(ver.id);
              return (
                <div key={ver.id} className="relative flex flex-col items-center mb-5" style={{ zIndex: 10, overflow: 'visible' }}
                  onMouseEnter={() => handleVersionEnter(ver.id)}
                  onMouseLeave={handleVersionLeave}>
                  <button onClick={() => setSelectedScenarioVersion(ver.id)} className="relative flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                      isSelected ? 'bg-[#EBEBFA] border-[#3615CF] shadow-md shadow-[#3615CF]/20' : 'bg-white border-[#d1d5db] hover:border-[#3615CF]'
                    }`} />
                    {isFav && <Star className="absolute -right-3 -top-1 w-3 h-3 text-yellow-400 fill-yellow-400" />}
                  </button>
                  {ver.label && (
                    <span className={`text-[9px] mt-0.5 font-medium leading-none ${isSelected ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}>{ver.label}</span>
                  )}
                  <span className="text-[8px] text-[#c4c9d4]">{ver.date}</span>
                  {hoveredVersionId === ver.id && (
                    <div
                      className="absolute left-full ml-1 top-0 bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-3 w-52"
                      style={{ zIndex: 9999 }}
                      onMouseEnter={() => handleVersionEnter(ver.id)}
                      onMouseLeave={handleVersionLeave}>
                      <div>
                        <div className="text-[10px] font-semibold text-[#1a1a2e] mb-0.5">{ver.label || '버전'}</div>
                        <div className="text-[9px] text-[#9ca3af] mb-3">{ver.date}</div>
                        <div className="space-y-0.5">
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-[11px] text-[#6b7280] hover:text-[#1a1a2e]">
                            <RotateCcw className="w-3 h-3 flex-shrink-0" /> 되돌리기
                          </button>
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-[11px] text-[#6b7280] hover:text-[#1a1a2e]">
                            <Trash2 className="w-3 h-3 flex-shrink-0" /> 삭제
                          </button>
                          <button
                            onClick={() => setFavoriteVersionIds(prev => { const n = new Set(prev); n.has(ver.id) ? n.delete(ver.id) : n.add(ver.id); return n; })}
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

        {/* ── [2] TS/TC/TV Tree — table mode: flex-1 / graph mode: fixed width ── */}
        <div
          className={`bg-white flex flex-col flex-shrink-0 relative ${viewMode === 'table' ? 'flex-1' : ''}`}
          style={viewMode === 'graph' ? { width: leftSidebarWidth } : undefined}>

          {/* AI 시나리오 생성 오버레이 — 이 패널 위에만 표시 */}
          {showGeneratingOverlay && (
            <ScenarioGeneratingOverlay onComplete={() => setShowGeneratingOverlay(false)} />
          )}

          {/* Tree header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f0] bg-white flex-shrink-0">
            <input type="checkbox" checked={allTCsSelected}
              onChange={e => setSelectedTCIds(e.target.checked ? allTCIds : [])}
              className="w-3.5 h-3.5 accent-[#3615CF] flex-shrink-0" />
            {someSelected && (
              <span className="px-1.5 py-0.5 text-[9px] bg-[#3615CF]/10 text-[#3615CF] rounded-full font-medium flex-shrink-0">
                {_selectedTCIds.length}개
              </span>
            )}
            <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#6b7280] hover:text-[#1a1a2e] border border-[#e5e7eb] rounded hover:bg-white transition-colors flex-shrink-0">
              <Download className="w-3 h-3" /> CSV
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
              <input type="text" value={scenarioSearchQuery} onChange={e => setScenarioSearchQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-6 pr-2 py-1 text-[11px] border border-[#f0f0f0] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#3615CF]/30" />
            </div>
            <button onClick={() => setScenarioChangeFilter(!scenarioChangeFilter)} title="변경사항 필터"
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                scenarioChangeFilter ? 'bg-[#3615CF] text-white' : 'text-[#9ca3af] hover:text-[#3615CF] hover:bg-[#3615CF]/10'
              }`}>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { if (deferredAIIds.length > 0) setShowDeferredAIItems(prev => !prev); }}
              title="보류 항목"
              disabled={deferredAIIds.length === 0}
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all relative ${
                showDeferredAIItems && deferredAIIds.length > 0
                  ? 'bg-purple-100 text-purple-600 ring-1 ring-purple-200'
                  : deferredAIIds.length > 0
                    ? 'text-purple-500 hover:bg-purple-50'
                    : 'text-[#c4c9d4] cursor-default'
              }`}>
              <Clock className="w-3.5 h-3.5" />
              {deferredAIIds.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-purple-500 text-white text-[8px] rounded-full flex items-center justify-center leading-none">
                  {deferredAIIds.length}
                </span>
              )}
            </button>
            {/* TS 추가 버튼 */}
            <button
              onClick={addNewTS}
              title="시나리오 추가"
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[#9ca3af] hover:text-[#9AB17A] hover:bg-green-50 transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tree body */}
          <div className="flex-1 overflow-y-auto py-1">
            {/* 보류 항목 */}
            {showDeferredAIItems && deferredAIIds.length > 0 && (
              <div className="mx-2 mb-2 rounded-lg border border-purple-200 bg-purple-50/40">
                <div className="px-2.5 py-1.5 border-b border-purple-100 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-purple-700">보류 항목</span>
                </div>
                {deferredAIIds.map((tsId) => {
                  const ai = _dynamicAIItems[tsId];
                  const sc = _dynamicScenarios.find((s) => s.id === tsId);
                  if (!ai || !sc) return null;
                  const triggerLabel = ai.trigger === 'chatbot' ? '챗봇 질의' : ai.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';
                  return (
                    <div key={`deferred-${tsId}`} className="px-2.5 py-1.5 border-b border-purple-100/60 last:border-0 text-[10px]">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="font-semibold text-purple-700">{tsId} · {sc.name}</span>
                        <span className="ml-auto text-[#9ca3af]">{ai.timestamp.split(' ')[0]}</span>
                      </div>
                      <div className="text-purple-800 mb-1 leading-relaxed">{triggerLabel} · {ai.reason}</div>
                      <div className="flex gap-1">
                        <button onClick={() => setAiItemActions(prev => ({ ...prev, [tsId]: 'approved' }))}
                          className="px-2 py-0.5 bg-purple-500 text-white rounded text-[9px] font-medium">승인</button>
                        <button onClick={() => setAiItemActions(prev => ({ ...prev, [tsId]: 'rejected' }))}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-600 rounded text-[9px] hover:bg-red-50 hover:text-red-500 hover:border-red-200">거절</button>
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

              const isCodeChangeItem = codeChangeDetected && scenario.id === 'TS1' && !_aiItemActions['TS1'] && !_dynamicAIItems['TS1'];
              const aiInfo = isCodeChangeItem
                ? { reason: 'login.tsx 비밀번호 검증 로직 변경 감지', trigger: 'code' as const, timestamp: '2026-04-27 10:23' }
                : _dynamicAIItems[scenario.id];
              const isAIItem = !!aiInfo && _aiItemActions[scenario.id] !== 'approved' && _aiItemActions[scenario.id] !== 'rejected';
              const isDeferredItem = _aiItemActions[scenario.id] === 'deferred';

              if (_aiItemActions[scenario.id] === 'rejected') return null;
              if (isDeferredItem) return null;

              const triggerLabel = aiInfo?.trigger === 'chatbot' ? '챗봇 질의' : aiInfo?.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';

              const tsBadge = isAIItem ? 'bg-purple-100 text-purple-700' : 'bg-[#3615CF]/10 text-[#3615CF]';
              const tcBadge = isAIItem ? 'bg-purple-50 text-purple-500' : 'bg-[#3615CF]/8 text-[#3615CF]';

              const tsRowContent = (
                <>
                  {/* TS 행 */}
                  <div className={`group flex items-center gap-1.5 px-2 py-2 ${isAIItem ? 'bg-purple-50/60' : 'hover:bg-gray-50'} border-b ${isAIItem ? 'border-purple-100' : 'border-[#f0f0f0]/60'} ${
                    !isAIItem && selectedScenario === scenario.id ? 'bg-[#3615CF]/5 border-l-2 border-l-[#3615CF]' : ''
                  }`}>
                    {isAIItem && <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                    <input type="checkbox" checked={tsAllSel}
                      ref={el => { if (el) el.indeterminate = tsSomeSel && !tsAllSel; }}
                      onChange={() => toggleTSSelection(scenario.id)}
                      className="w-3.5 h-3.5 accent-[#3615CF] flex-shrink-0"
                      onClick={e => e.stopPropagation()} />
                    <button onClick={e => { e.stopPropagation(); setExpandedTSForTC(prev => prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]); }} className="flex-shrink-0">
                      {isExpanded ? <ChevronDown className={`w-3.5 h-3.5 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3.5 h-3.5 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} />}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!isTSEditing) { setSelectedScenario(scenario.id); setDetailPanelRow({ level: 'TS', tsId: scenario.id }); } }}>
                      <div className="flex items-center gap-1">
                        <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tsBadge}`}>TS</span>
                        <span className={`text-xs font-semibold ${isAIItem ? 'text-purple-800' : 'text-[#1a1a2e]'}`}>{scenario.id}</span>
                        {isTSEditing
                          ? sidebarEditInput('text-[10px]')
                          : <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-600' : 'text-[#6b7280]'}`}>{scenario.name}</span>}
                      </div>
                    </div>
                    {/* TS 액션 아이콘 */}
                    {!isAIItem && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'ts', key: tsEditKey, value: scenario.name }); }}
                          title="수정"
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 text-[#9ca3af] hover:text-blue-500 transition-colors">
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

                  {/* AI 항목 승인/보류/거절 */}
                  {isAIItem && (
                    <div className="px-2.5 py-1.5 bg-purple-50/40 border-b border-purple-100 flex items-center gap-1.5">
                      <span className="text-[9px] text-purple-500 flex-shrink-0">{triggerLabel}</span>
                      <span className="text-[9px] text-purple-400 truncate flex-1">{aiInfo!.reason}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setAiItemActions(prev => ({ ...prev, [scenario.id]: 'approved' }))}
                          className="px-2 py-0.5 bg-purple-500 text-white rounded text-[9px] font-medium hover:bg-purple-600">승인</button>
                        <button onClick={() => { setAiItemActions(prev => ({ ...prev, [scenario.id]: 'deferred' })); setShowDeferredAIItems(true); }}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-600 rounded text-[9px] hover:bg-purple-50">보류</button>
                        <button onClick={() => setAiItemActions(prev => ({ ...prev, [scenario.id]: 'rejected' }))}
                          className="px-2 py-0.5 bg-white border border-red-200 text-red-500 rounded text-[9px] hover:bg-red-50">거절</button>
                      </div>
                    </div>
                  )}

                  {/* TC 행 */}
                  {isExpanded && tcs.map(tc => {
                    const tcKey = `${scenario.id}_${tc.id}`;
                    const isTCExpanded = expandedTCMain.includes(tcKey);
                    const isTCEditing = editingDetailItem?.type === 'tc' && editingDetailItem.key === tcKey;
                    const frEntries = mockRTMData.filter(r => r.ts === scenario.id && r.tc === tc.id);
                    return (
                      <div key={tc.id}>
                        <div className={`group flex items-center gap-1.5 pl-7 pr-2 py-1.5 border-b ${isAIItem ? 'bg-purple-50/30 border-purple-100/50' : `${highlightedBotRow === `tc-${tcKey}` ? 'bg-[#3615CF]/10' : 'bg-[#F9FAFB]'} border-[#f0f0f0]/40`} hover:bg-opacity-80`}>
                          <input type="checkbox" checked={_selectedTCIds.includes(tcKey)}
                            onChange={() => toggleTCSelection(tcKey)}
                            className="w-3 h-3 accent-[#3615CF] flex-shrink-0"
                            onClick={e => e.stopPropagation()} />
                          <button onClick={e => { e.stopPropagation(); setExpandedTCMain(prev => prev.includes(tcKey) ? prev.filter(id => id !== tcKey) : [...prev, tcKey]); }} className="flex-shrink-0">
                            {tc.testVariables.length > 0
                              ? (isTCExpanded ? <ChevronDown className={`w-3 h-3 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3 h-3 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} />)
                              : <span className="w-3" />}
                          </button>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!isTCEditing) setDetailPanelRow({ level: 'TC', tsId: scenario.id, tcId: tc.id }); }}>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tcBadge}`}>TC</span>
                              <span className={`text-[11px] font-medium flex-shrink-0 ${isAIItem ? 'text-purple-800' : 'text-[#1a1a2e]'}`}>{tc.id}</span>
                              {isTCEditing
                                ? sidebarEditInput('text-[10px]')
                                : <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-500' : 'text-[#6b7280]'}`}>{tc.name}</span>}
                              {!isTCEditing && frEntries.map(fr => (
                                <div key={fr.frId} className="relative group/fr flex-shrink-0">
                                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded bg-blue-50 text-blue-500 border border-blue-100 cursor-help">{fr.frId}</span>
                                  <div className="absolute bottom-full left-0 mb-1 w-52 bg-[#1a1a2e] text-white text-[10px] rounded-lg px-2.5 py-2 shadow-xl leading-relaxed z-50 hidden group-hover/fr:block pointer-events-none whitespace-normal">
                                    <div className="font-semibold mb-0.5 text-[9px] text-[#3615CF]">{fr.frId}</div>
                                    {fr.requirement}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* TC 액션 아이콘 */}
                          {!isAIItem && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                              <button
                                onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'tc', key: tcKey, value: tc.name }); }}
                                title="수정"
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 text-[#9ca3af] hover:text-blue-500 transition-colors">
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

                        {/* TV 행 — 엔드포인트 카드 */}
                        {isTCExpanded && tc.testVariables.map(tv => {
                          const tvKey = `${scenario.id}_${tc.id}_${tv.id}`;
                          const ep = mockTVEndpoints[tvKey];
                          const isTVEditing = editingDetailItem?.type === 'tv' && editingDetailItem.key === tvKey;
                          const isSelected = detailPanelRow?.tvId === tv.id && detailPanelRow?.tcId === tc.id;
                          const isCopied = tvCopied === tvKey;
                          const isOk = ep ? ep.statusCode < 400 : true;

                          return (
                            <div key={tv.id}
                              className={`border-b ${isAIItem ? 'border-purple-100/30' : 'border-[#f0f0f0]/30'}`}
                              style={{ paddingLeft: '3.25rem' }}>

                              {/* ── TV 헤더 ── */}
                              <div
                                className={`group flex items-center gap-1.5 pr-2 py-1.5 cursor-pointer transition-colors ${
                                  isAIItem ? 'bg-purple-50/20 hover:bg-purple-50/40'
                                  : isSelected ? 'bg-slate-50'
                                  : 'bg-white hover:bg-slate-50'
                                }`}
                                onClick={() => { if (!isTVEditing) { setDetailPanelRow({ level: 'TV', tsId: scenario.id, tcId: tc.id, tvId: tv.id }); setSelectedTvId(tv.id); } }}>

                                <input type="checkbox" checked={_selectedTCIds.includes(tvKey)}
                                  onChange={() => toggleTVSelection(tvKey)}
                                  className="w-3 h-3 accent-[#3615CF] flex-shrink-0"
                                  onClick={e => e.stopPropagation()} />

                                {/* TV ID 배지 */}
                                <span className={`px-1.5 py-0.5 text-[8px] rounded font-bold font-mono flex-shrink-0 ${
                                  isAIItem ? 'bg-purple-100/60 text-purple-500' : 'bg-slate-100 text-slate-500'
                                }`}>{tv.id}</span>

                                {/* Method + Path 또는 이름 */}
                                {ep ? (
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${METHOD_STYLE[ep.method]}`}>{ep.method}</span>
                                    <span className="font-mono text-[9.5px] text-slate-500 truncate">{ep.path}</span>
                                  </div>
                                ) : (
                                  isTVEditing ? (
                                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                      <input autoFocus value={editingDetailItem?.value ?? ''}
                                        onChange={e => setEditingDetailItem((prev: any) => prev ? { ...prev, value: e.target.value } : null)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveSidebarEdit(); if (e.key === 'Escape') setEditingDetailItem(null); }}
                                        className="flex-1 min-w-0 text-[10px] bg-white border border-[#3615CF]/50 rounded px-1.5 py-0.5 focus:outline-none" />
                                      <button onClick={saveSidebarEdit} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                                      <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 truncate flex-1">{tv.name}</span>
                                  )
                                )}

                                {/* 액션 (호버 시 표시) */}
                                {!isAIItem && !isTVEditing && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                                    <button onClick={e => { e.stopPropagation(); handleTVCopy(tvKey); }}
                                      title={isCopied ? '복사됨' : '복사'}
                                      className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isCopied ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                                      {isCopied ? <CheckCircle className="w-2.5 h-2.5" /> : <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h8"/></svg>}
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'tv', key: tvKey, value: tv.name }); }}
                                      title="수정" className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-[#3615CF] hover:bg-[#3615CF]/10 transition-colors">
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); deleteTV(scenario.id, tc.id, tv.id); }}
                                      title="삭제" className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* ── 엔드포인트 인라인 프리뷰 ── */}
                              {ep && !isTVEditing && (
                                <div className="mx-2 mb-1 mt-0.5 rounded border border-slate-100 bg-slate-50 overflow-hidden">
                                  {/* Request body */}
                                  <div className="px-2 py-1.5 overflow-x-auto">
                                    <LightJson obj={ep.requestBody ?? {}} />
                                  </div>
                                  {/* Status footer */}
                                  <div className={`flex items-center gap-1.5 px-2 py-1 border-t border-slate-100 ${isOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                    <span className={`font-mono text-[9px] font-bold ${isOk ? 'text-emerald-600' : 'text-red-500'}`}>
                                      ← {ep.statusCode}
                                    </span>
                                    <span className={`text-[9px] ${isOk ? 'text-emerald-500' : 'text-red-400'}`}>
                                      {HTTP_STATUS_TEXT[ep.statusCode] ?? ''}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {/* ── TV 검증 조건 인라인 ── */}
                              {(() => {
                                const validations = mockValidationConditions[tvKey] || [];
                                if (validations.length === 0) return null;
                                return (
                                  <div className="mx-2 mb-1.5 space-y-0.5">
                                    {validations.map((v, i) => (
                                      <div key={i} className="flex gap-1.5 px-2 py-1 bg-amber-50/70 rounded border border-amber-100 text-[10px]">
                                        <span className="text-amber-400 flex-shrink-0 font-bold">✓</span>
                                        <span className="text-amber-700 leading-relaxed">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
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
                {/* E2E TEST 실행 */}
                <button
                  onClick={() => setCurrentPage('테스트')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#3615CF] text-white text-xs font-semibold hover:shadow-md hover:bg-[#3615CF]/90 transition-all">
                  <Play className="w-3.5 h-3.5" />
                  E2E TEST 실행
                </button>
                {/* 그룹 생성 버튼 */}
                <button
                  onClick={() => someSelected && setShowTestGroupModal(true)}
                  className={`w-full py-2 rounded-lg border border-dashed flex items-center justify-center gap-1.5 text-xs transition-all ${
                    someSelected
                      ? 'border-[#3615CF]/30 text-[#3615CF] hover:bg-[#EBEBFA]'
                      : 'border-[#e5e7eb] text-[#c4c9d4] cursor-default'
                  }`}>
                  <Plus className="w-3 h-3" />
                  {someSelected ? `${_selectedTCIds.length}개 TC로 그룹 생성` : 'TC를 선택하면 그룹을 생성할 수 있어요'}
                </button>
              </div>

              <div className="mx-3 h-[2px] bg-[#e5e7eb] flex-shrink-0" />

              {/* Group cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* 검색바 */}
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
                    <input
                      type="text"
                      placeholder="그룹 검색..."
                      className="w-full pl-6 pr-2 py-1.5 text-[11px] border border-[#f0f0f0] rounded-lg bg-[#f9f9fb] focus:outline-none focus:ring-1 focus:ring-[#3615CF]/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#3615CF] hover:bg-[#3615CF]/8 transition-colors flex-shrink-0">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
                {mockTestGroups.map(group => {
                  const isSelected = selectedScenarioGroupId === group.id;
                  return (
                    <button key={group.id}
                      onClick={() => (setSelectedScenarioGroupId as any)(isSelected ? null : group.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#3615CF] bg-[#EBEBFA] shadow-sm'
                          : 'border-[#e5e7eb] hover:border-[#3615CF]/40 hover:bg-gray-50'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-[#d9506b]' : 'text-[#1a1a2e]'}`}>{group.name}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-medium flex-shrink-0 ${
                          group.status === 'active' ? 'bg-[#9AB17A]/15 text-[#9AB17A]' : 'bg-gray-100 text-[#9ca3af]'
                        }`}>{group.status === 'active' ? '활성' : '보관'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(group.scenarios as string[]).map(sid => (
                          <span key={sid} className={`px-1.5 py-0.5 text-[9px] rounded font-mono font-bold ${
                            isSelected ? 'bg-[#EBEBFA] text-[#3615CF]' : 'bg-gray-100 text-[#6b7280]'
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
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e5e7eb] text-[#6b7280] rounded text-[10px] font-medium hover:border-[#3615CF]/40 hover:text-[#3615CF] transition-colors">
                          <Calendar className="w-2.5 h-2.5" /> 예약하기
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const newRun = {
                              id: `run-${Date.now()}`,
                              name: group.name,
                              groupId: group.id,
                              startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                              status: 'running' as const,
                            };
                            (setRunningTests as any)(prev => [...prev, newRun]);
                            (setSelectedRunningTestId as any)(newRun.id);
                            (setSelectedTestGroup as any)(group.name);
                            setCurrentPage('테스트');
                            (setTestSubTab as any)('HISTORY');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#EBEBFA] text-[#3615CF] rounded text-[10px] font-medium hover:bg-[#DDDDF5] transition-colors">
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

      {/* Test Group Modal */}
      {showTestGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <div className="font-semibold mb-4 text-base">시나리오 그룹 생성</div>
            <div className="text-sm text-[#6b7280] mb-2">선택된 TC ({selectedTCs.length}개):</div>
            <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
              {selectedTCs.map(({ tsId, tcId, tsName, tcName }) => (
                <div key={`${tsId}_${tcId}`} className="text-sm p-2 bg-gray-50 rounded">
                  {tsId} ({tsName}) → {tcId} {tcName}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowTestGroupModal(false); setSelectedTCIds([]); }}
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
