import React from 'react';
import { CheckCircle, ChevronDown, ChevronRight, Clock, Download, Edit2, FileText, FolderOpen, GitBranch, History, Loader2, MessageCircle, Plus, Search, Sparkles, Star, Trash2, X } from 'lucide-react';
import ScenarioNetworkGraph from '../components/ScenarioNetworkGraph';
import { PageTitle } from '../components/common/PageTitle';
import { mockRTMData, mockScenarioHistory, mockScenarios, mockScenarioVersions, mockTestCases } from '../data/mockData';

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
}: ScenarioPageProps) => {
  // Resizable left sidebar
  const [leftSidebarWidth, setLeftSidebarWidth] = React.useState(256);
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

  const tagColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    gradient: 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white',
    orange: 'bg-orange-100 text-orange-700',
  };

  const selectedTCs = selectedTCIds
    .filter(id => id.split('_').length === 2)
    .map(id => {
      const [tsId, tcId] = id.split('_');
      const ts = dynamicScenarios.find(s => s.id === tsId);
      const tc = (dynamicTestCases[tsId] || []).find(t => t.id === tcId);
      return { tsId, tcId, tsName: ts?.name, tcName: tc?.name };
    });

  const toggleTSSelection = (tsId: string) => {
    const tsTCs = (dynamicTestCases[tsId] || []).map(tc => `${tsId}_${tc.id}`);
    const allSelected = tsTCs.every(id => selectedTCIds.includes(id));
    if (allSelected) {
      setSelectedTCIds(prev => prev.filter(id => !tsTCs.includes(id)));
    } else {
      setSelectedTCIds(prev => [...new Set([...prev, ...tsTCs])]);
    }
  };

  const toggleTCSelection = (key: string) => {
    setSelectedTCIds(prev =>
      prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
    );
  };

  const toggleTVSelection = (key: string) => {
    setSelectedTCIds(prev =>
      prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
    );
  };

  const mockValidationConditions: Record<string, string[]> = {
    'TS1_TC1_TV1': ['입력: 유효한 이메일 (test@example.com)', '기대: 로그인 성공, 대시보드 이동', '제한: 3초 이내'],
    'TS1_TC1_TV2': ['입력: 유효한 비밀번호 (8자 이상)', '기대: 인증 성공 (200 OK)', '검증: JWT 토큰 발급'],
    'TS1_TC2_TV1': ['입력: 유효한 이메일', '기대: 입력 필드 유효성 통과'],
    'TS1_TC2_TV2': ['입력: 잘못된 비밀번호 (5자 미만)', '기대: 오류 메시지 표시', '코드: 401 Unauthorized'],
  };

  // ── 사이드바 필터링 ────────────────────────────────────────────
  const filteredScenarios = dynamicScenarios.filter(s => {
    const q = scenarioSearchQuery.toLowerCase();
    const matchSearch = !q || s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    // AI 필터: dynamicAIItems에 있고 아직 승인/거절 안 된 항목만
    const isDeferred = aiItemActions[s.id] === 'deferred';
    const matchChange = !scenarioChangeFilter || (!!dynamicAIItems[s.id] && aiItemActions[s.id] !== 'approved' && aiItemActions[s.id] !== 'rejected' && !isDeferred);
    return matchSearch && matchChange && !isDeferred;
  });
  const deferredAIIds = Object.entries(aiItemActions)
    .filter(([, value]) => value === 'deferred')
    .map(([id]) => id);

  // ── ScenarioNetworkGraph 노드 데이터 ─────────────────────────
  const tsNodesForGraph = mockScenarios.map(s => ({
    id: s.id,
    label: s.id,
    name: s.name,
    frs: mockRTMData.filter(r => r.ts === s.id).map(r => r.frId),
  }));
  const tcNodesForGraph = Object.entries(mockTestCases).flatMap(([tsId, tcs]) =>
    tcs.map(tc => ({
      id: `${tsId}_${tc.id}`,
      label: tc.id,
      name: tc.name,
      frs: mockRTMData.filter(r => r.ts === tsId && r.tc === tc.id).map(r => r.frId),
      parent: tsId,
    }))
  );
  const tvNodesForGraph = Object.entries(mockTestCases).flatMap(([tsId, tcs]) =>
    tcs.flatMap(tc =>
      tc.testVariables.map(tv => ({
        id: `${tsId}_${tc.id}_${tv.id}`,
        label: tv.id,
        name: tv.name,
        frs: mockRTMData.filter(r => r.ts === tsId && r.tc === tc.id).map(r => r.frId),
        parent: `${tsId}_${tc.id}`,
      }))
    )
  );

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
  // detailPanelRow → graphSelectedId (그래프에 전달)
  const graphSelectedId = detailPanelRow ? (
    detailPanelRow.level === 'TS' ? detailPanelRow.tsId :
    detailPanelRow.level === 'TC' ? `${detailPanelRow.tsId}_${detailPanelRow.tcId}` :
    `${detailPanelRow.tsId}_${detailPanelRow.tcId}_${detailPanelRow.tvId}`
  ) : null;

  // 그래프 노드 클릭 → detailPanelRow 갱신
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

  // ── 사이드바 아이템 메뉴 ──────────────────────────────────────
  const [openItemMenuId, setOpenItemMenuId] = React.useState<string | null>(null);

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
        className={`min-w-0 flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 ${className}`}
      />
      <button onClick={saveSidebarEdit} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0">
        <CheckCircle className="w-3 h-3 text-white" />
      </button>
      <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0">
        <X className="w-3 h-3 text-gray-500" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" onClick={() => setOpenItemMenuId(null)}>

      {/* ── Top Toolbar ── */}
      <div className="bg-white border-b border-[#f0f0f0] px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
        <span className="font-semibold text-sm text-[#1a1a2e]">시나리오</span>
        {someSelected && (
          <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] rounded-full border border-[#f78ca0]/20">
            {selectedTCIds.length}개 선택됨
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => { if (someSelected) setShowTestGroupModal(true); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              someSelected
                ? 'bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white shadow-sm hover:shadow-md'
                : 'bg-white border border-[#f0f0f0] text-[#9ca3af] cursor-default'
            }`}>
            <Users className="w-3.5 h-3.5" /> 시나리오 그룹 생성
          </button>
          <button onClick={() => setCurrentPage('테스트그룹')}
            className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> E2E TEST
          </button>
          <div className="w-px h-5 bg-[#f0f0f0]" />
          <button onClick={() => setShowLinkedFiles(true)}
            className="px-4 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Files
          </button>
          <button
            onClick={triggerCodeChangeDetection}
            disabled={codeChangeDetected}
            className={`px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
              codeChangeDetected
                ? 'bg-blue-50 border border-blue-200 text-blue-600 cursor-wait'
                : 'bg-white border border-[#f0f0f0] hover:bg-gray-50 text-[#6b7280]'
            }`}>
            <GitBranch className="w-3.5 h-3.5" /> 코드 변경 탐지
            {codeChangeDetected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── [1] Version Timeline — 맨 좌측 ── */}
        <div className="w-14 bg-[#F3F4F6] border-r border-[#e5e7eb] flex flex-col items-center py-4 flex-shrink-0" style={{ overflow: 'visible', zIndex: 20 }}>
          <div className="text-[9px] text-[#9ca3af] font-semibold uppercase tracking-wide mb-4">VER</div>
          {/* 수직 연결선 */}
          <div className="relative flex flex-col items-center w-full" style={{ overflow: 'visible' }}>
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-[#e5e7eb]" style={{ zIndex: 0 }} />
            {/* 변경 감지 시 맨 위에만 점선 동그라미 1개 */}
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
                        fill={isSelected ? '#f78ca0' : 'white'}
                        stroke="#f78ca0" strokeWidth={1.5} strokeDasharray="4 2.5" />
                    </svg>
                  </button>
                  <span className="text-[8px] text-[#c4c9d4]">{latestChange.date}</span>
                  {hoveredVersionId === latestChange.id && (
                    <div className="absolute left-full ml-1 top-0 bg-white rounded-xl shadow-2xl border border-[#e5e7eb] p-3 w-52"
                      style={{ zIndex: 9999 }}
                      onMouseEnter={() => handleVersionEnter(latestChange.id)}
                      onMouseLeave={handleVersionLeave}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#f78ca0]" />
                        <span className="text-xs font-semibold text-[#1a1a2e]">변경 감지</span>
                      </div>
                      <div className="text-[10px] text-[#6b7280] mb-3 leading-relaxed">{latestChange.changeDesc}</div>
                      <div className="text-[10px] font-semibold text-[#1a1a2e] mb-2">버전을 분리할까요?</div>
                      <div className="flex gap-2">
                        <button onClick={() => setHoveredVersionId(null)}
                          className="flex-1 px-2 py-1.5 bg-white border border-[#e5e7eb] rounded-lg text-[10px] hover:bg-gray-50 font-medium">No</button>
                        <button onClick={() => setHoveredVersionId(null)}
                          className="flex-1 px-2 py-1.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-[10px] font-medium">Yes</button>
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
                  {/* Dot */}
                  <button onClick={() => setSelectedScenarioVersion(ver.id)} className="relative flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                      isSelected ? 'bg-[#f78ca0] border-[#f78ca0] shadow-md shadow-pink-200' : 'bg-white border-[#d1d5db] hover:border-[#f78ca0]'
                    }`} />
                    {isFav && <Star className="absolute -right-3 -top-1 w-3 h-3 text-yellow-400 fill-yellow-400" />}
                  </button>
                  {ver.label && (
                    <span className={`text-[9px] mt-0.5 font-medium leading-none ${isSelected ? 'text-[#f78ca0]' : 'text-[#9ca3af]'}`}>{ver.label}</span>
                  )}
                  <span className="text-[8px] text-[#c4c9d4]">{ver.date}</span>

                  {/* Popup — 오른쪽으로 열림 */}
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

        {/* ── [2] Left Sidebar — TS/TC/TV Tree ── */}
        <div className="bg-white flex flex-col flex-shrink-0" style={{ width: leftSidebarWidth }}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f0] bg-gray-50 flex-shrink-0">
            <input type="checkbox" checked={allTCsSelected}
              onChange={e => setSelectedTCIds(e.target.checked ? allTCIds : [])}
              className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0" />
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
              <input type="text" value={scenarioSearchQuery} onChange={e => setScenarioSearchQuery(e.target.value)}
                placeholder="검색..."
                className="w-full pl-6 pr-2 py-1 text-[11px] border border-[#f0f0f0] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30" />
            </div>
            <button onClick={() => setScenarioChangeFilter(!scenarioChangeFilter)} title="변경사항 필터"
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                scenarioChangeFilter ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white' : 'text-[#9ca3af] hover:text-[#f78ca0] hover:bg-[#f78ca0]/10'
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
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* 보류 항목 — 시계 아이콘을 눌렀을 때만 표시 */}
            {showDeferredAIItems && deferredAIIds.length > 0 && (
              <div className="mx-2 mb-2 rounded-lg border border-purple-200 bg-purple-50/40">
                <div className="px-2.5 py-1.5 border-b border-purple-100 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-purple-700">보류 항목</span>
                </div>
                {deferredAIIds.map((tsId) => {
                  const ai = dynamicAIItems[tsId];
                  const sc = dynamicScenarios.find(s => s.id === tsId);
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
              const tcs = dynamicTestCases[scenario.id] || [];
              const allTCKeys = tcs.map(tc => `${scenario.id}_${tc.id}`);
              const tsAllSel = allTCKeys.length > 0 && allTCKeys.every(k => selectedTCIds.includes(k));
              const tsSomeSel = allTCKeys.some(k => selectedTCIds.includes(k));
              const isExpanded = expandedTSForTC.includes(scenario.id);
              const tsMenuId = `ts-${scenario.id}`;
              const tsEditKey = scenario.id;
              const isTSEditing = editingDetailItem?.type === 'ts' && editingDetailItem.key === tsEditKey;

              // AI 생성 항목 여부 (코드 변경 감지 버튼으로 생성된 임시 항목 포함)
              const isCodeChangeItem = codeChangeDetected && scenario.id === 'TS1' && !aiItemActions['TS1'] && !dynamicAIItems['TS1'];
              const aiInfo = isCodeChangeItem
                ? { reason: 'login.tsx 비밀번호 검증 로직 변경 감지', trigger: 'code' as const, timestamp: '2026-04-27 10:23' }
                : dynamicAIItems[scenario.id];
              const isAIItem = !!aiInfo && aiItemActions[scenario.id] !== 'approved' && aiItemActions[scenario.id] !== 'rejected';
              const isDeferredItem = aiItemActions[scenario.id] === 'deferred';

              // 거절된 항목 스킵
              if (aiItemActions[scenario.id] === 'rejected') return null;
              // 보류된 항목은 위 섹션에 표시됨 — 여기선 렌더링 안 함
              if (isDeferredItem) return null;

              const triggerLabel = aiInfo?.trigger === 'chatbot' ? '챗봇 질의' : aiInfo?.trigger === 'file' ? '파일 업데이트' : '코드 변경 감지';

              const tsBadge = isAIItem ? 'bg-purple-100 text-purple-700' : 'bg-[#f78ca0]/10 text-[#f78ca0]';
              const tcBadge = isAIItem ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500';
              const tvBadge = isAIItem ? 'bg-purple-50/60 text-purple-400' : 'bg-gray-100 text-[#9ca3af]';

              const tsRowContent = (
                <>
                  {/* TS 행 */}
                  <div className={`group flex items-center gap-1.5 px-2 py-2 ${isAIItem ? 'bg-purple-50/60' : 'hover:bg-gray-50'} border-b ${isAIItem ? 'border-purple-100' : 'border-[#f0f0f0]/60'} ${
                    !isAIItem && selectedScenario === scenario.id ? 'bg-[#f78ca0]/5 border-l-2 border-l-[#f78ca0]' : ''
                  }`}>
                    {isAIItem && <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                    <input type="checkbox" checked={tsAllSel}
                      ref={el => { if (el) el.indeterminate = tsSomeSel && !tsAllSel; }}
                      onChange={() => toggleTSSelection(scenario.id)}
                      className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0"
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
                    {!isAIItem && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === tsMenuId ? null : tsMenuId); }}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-[#9ca3af] text-xs font-bold transition-opacity">
                          ···
                        </button>
                        {openItemMenuId === tsMenuId && (
                          <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-[#e5e7eb] py-1 w-32 z-[200]"
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingDetailItem({ type: 'ts', key: tsEditKey, value: scenario.name }); setOpenItemMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-xs text-[#6b7280]">
                              <Edit2 className="w-3 h-3" /> 수정
                            </button>
                            <button onClick={() => { setChatContextTag(`${scenario.id} — ${scenario.name}`); setChatbarActive(true); setChatPanelExpanded(true); setOpenItemMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f78ca0]/5 text-xs text-[#f78ca0]">
                              <MessageCircle className="w-3 h-3" /> 컨텍스트 입력
                            </button>
                            <button onClick={() => { setOpenItemMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-xs text-red-500">
                              <Trash2 className="w-3 h-3" /> 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI 항목 승인/보류/거절 버튼 */}
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
                    const tcMenuId = `tc-${tcKey}`;
                    const isTCExpanded = expandedTCMain.includes(tcKey);
                    const isTCEditing = editingDetailItem?.type === 'tc' && editingDetailItem.key === tcKey;
                    return (
                      <div key={tc.id}>
                        <div className={`group flex items-center gap-1.5 pl-7 pr-2 py-1.5 border-b ${isAIItem ? 'bg-purple-50/30 border-purple-100/50' : `${highlightedBotRow === `tc-${tcKey}` ? 'bg-[#f78ca0]/10' : 'bg-[#F9FAFB]'} border-[#f0f0f0]/40`} hover:bg-opacity-80`}>
                          <input type="checkbox" checked={selectedTCIds.includes(tcKey)}
                            onChange={() => toggleTCSelection(tcKey)}
                            className="w-3 h-3 accent-[#f78ca0] flex-shrink-0"
                            onClick={e => e.stopPropagation()} />
                          <button onClick={e => { e.stopPropagation(); setExpandedTCMain(prev => prev.includes(tcKey) ? prev.filter(id => id !== tcKey) : [...prev, tcKey]); }} className="flex-shrink-0">
                            {tc.testVariables.length > 0
                              ? (isTCExpanded ? <ChevronDown className={`w-3 h-3 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} /> : <ChevronRight className={`w-3 h-3 ${isAIItem ? 'text-purple-400' : 'text-[#9ca3af]'}`} />)
                              : <span className="w-3" />}
                          </button>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!isTCEditing) setDetailPanelRow({ level: 'TC', tsId: scenario.id, tcId: tc.id }); }}>
                            <div className="flex items-center gap-1">
                              <span className={`px-1 py-0.5 text-[9px] rounded font-bold ${tcBadge}`}>TC</span>
                              <span className={`text-[11px] font-medium ${isAIItem ? 'text-purple-800' : 'text-[#1a1a2e]'}`}>{tc.id}</span>
                              {isTCEditing
                                ? sidebarEditInput('text-[10px]')
                                : <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-500' : 'text-[#6b7280]'}`}>{tc.name}</span>}
                            </div>
                          </div>
                          {!isAIItem && (
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === tcMenuId ? null : tcMenuId); }}
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-[#9ca3af] text-xs font-bold transition-opacity">
                                ···
                              </button>
                              {openItemMenuId === tcMenuId && (
                                <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-[#e5e7eb] py-1 w-32 z-[200]"
                                  onClick={e => e.stopPropagation()}>
                                  <button onClick={() => { setEditingDetailItem({ type: 'tc', key: tcKey, value: tc.name }); setOpenItemMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-xs text-[#6b7280]">
                                    <Edit2 className="w-3 h-3" /> 수정
                                  </button>
                                  <button onClick={() => { setChatContextTag(`${scenario.id} › ${tc.id} — ${tc.name}`); setChatbarActive(true); setChatPanelExpanded(true); setOpenItemMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f78ca0]/5 text-xs text-[#f78ca0]">
                                    <MessageCircle className="w-3 h-3" /> 컨텍스트 입력
                                  </button>
                                  <button onClick={() => setOpenItemMenuId(null)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-xs text-red-500">
                                    <Trash2 className="w-3 h-3" /> 삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* TV 행 */}
                        {isTCExpanded && tc.testVariables.map(tv => {
                          const tvKey = `${scenario.id}_${tc.id}_${tv.id}`;
                          const tvMenuId = `tv-${tvKey}`;
                          const isTVEditing = editingDetailItem?.type === 'tv' && editingDetailItem.key === tvKey;
                          return (
                            <div key={tv.id}
                              className={`group flex items-center gap-1.5 pr-2 py-1.5 border-b ${isAIItem ? 'bg-purple-50/20 border-purple-100/30' : `${highlightedBotRow === `tv-${tvKey}` ? 'bg-[#f78ca0]/8' : 'bg-[#FAFAFA]'} border-[#f0f0f0]/30 hover:bg-gray-50`} cursor-pointer`}
                              style={{ paddingLeft: '3.25rem' }}
                              onClick={() => { if (!isTVEditing) { setDetailPanelRow({ level: 'TV', tsId: scenario.id, tcId: tc.id, tvId: tv.id }); setSelectedTvId(tv.id); } }}>
                              <input type="checkbox" checked={selectedTCIds.includes(tvKey)}
                                onChange={() => toggleTVSelection(tvKey)}
                                className="w-3 h-3 accent-[#f78ca0] flex-shrink-0"
                                onClick={e => e.stopPropagation()} />
                              <div className="flex-1 min-w-0 flex items-center gap-1">
                                <span className={`px-1 py-0.5 text-[9px] rounded font-medium ${tvBadge}`}>TV</span>
                                {isTVEditing
                                  ? sidebarEditInput('text-[10px]')
                                  : <span className={`text-[10px] truncate ${isAIItem ? 'text-purple-500' : 'text-[#6b7280]'}`}>{tv.id}: {tv.name}</span>}
                              </div>
                              {!isAIItem && (
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={e => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === tvMenuId ? null : tvMenuId); }}
                                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-[#9ca3af] text-xs font-bold transition-opacity">
                                    ···
                                  </button>
                                  {openItemMenuId === tvMenuId && (
                                    <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-[#e5e7eb] py-1 w-32 z-[200]"
                                      onClick={e => e.stopPropagation()}>
                                      <button onClick={() => { setEditingDetailItem({ type: 'tv', key: tvKey, value: tv.name }); setOpenItemMenuId(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-xs text-[#6b7280]">
                                        <Edit2 className="w-3 h-3" /> 수정
                                      </button>
                                      <button onClick={() => { setChatContextTag(`${scenario.id} › ${tc.id} › ${tv.id}`); setChatbarActive(true); setChatPanelExpanded(true); setOpenItemMenuId(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f78ca0]/5 text-xs text-[#f78ca0]">
                                        <MessageCircle className="w-3 h-3" /> 컨텍스트 입력
                                      </button>
                                      <button onClick={() => setOpenItemMenuId(null)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-xs text-red-500">
                                        <Trash2 className="w-3 h-3" /> 삭제
                                      </button>
                                    </div>
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

        {/* Left drag handle */}
        <div className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleLeftDragStart} />

        {/* ── [3] Center: Network Graph ── */}
        <div
          ref={graphContainerRef}
          className="flex-1 bg-[#F2F3F5] overflow-hidden relative"
          onClick={() => setOpenItemMenuId(null)}>
          <ScenarioNetworkGraph
            tsNodes={tsNodesForGraph}
            tcNodes={tcNodesForGraph}
            tvNodes={tvNodesForGraph}
            width={graphSize.width}
            height={graphSize.height}
            selectedId={graphSelectedId}
            onNodeSelect={handleGraphNodeSelect}
          />
        </div>

        {/* Right drag handle — only when detail panel is open */}
        {detailPanelRow && (
          <div className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors" onMouseDown={handleRightDragStart} />
        )}

        {/* ── [4] Right Detail Panel ── */}
        {detailPanelRow && (() => {
          const { level, tsId, tcId } = detailPanelRow;
          const ts = dynamicScenarios.find(s => s.id === tsId);
          const tc = tcId ? (dynamicTestCases[tsId] || []).find(t => t.id === tcId) : undefined;
          const frMapped = mockRTMData.filter(r => r.ts === tsId);

          const editKey = level === 'TS' ? tsId : `${tsId}_${tcId}`;
          const isEditingName = editingDetailItem?.key === editKey;
          const isLoading = loadingItemKey === editKey;

          const saveName = (newName: string) => {
            setEditingDetailItem(null);
            setLoadingItemKey(editKey);
            setTimeout(() => {
              if (level === 'TS') {
                setDynamicScenarios(prev => prev.map(s => s.id === tsId ? { ...s, name: newName } : s));
                // 하위 TC 이름도 갱신 시뮬레이션
                setDynamicTestCases(prev => ({ ...prev }));
              } else if (level === 'TC' && tcId) {
                setDynamicTestCases(prev => ({
                  ...prev,
                  [tsId]: (prev[tsId] || []).map(t => t.id === tcId ? { ...t, name: newName } : t),
                }));
              }
              setLoadingItemKey(null);
            }, 1200);
          };

          const saveTVName = (tvId: string, newName: string) => {
            setEditingDetailItem(null);
            const tvKey = `${tsId}_${tcId}_${tvId}`;
            setLoadingItemKey(tvKey);
            setTimeout(() => {
              setDynamicTestCases(prev => ({
                ...prev,
                [tsId]: (prev[tsId] || []).map(t =>
                  t.id === tcId
                    ? { ...t, testVariables: t.testVariables.map(v => v.id === tvId ? { ...v, name: newName } : v) }
                    : t
                ),
              }));
              setLoadingItemKey(null);
            }, 1000);
          };

          return (
            <div className="bg-white border-l border-[#f0f0f0] flex flex-col flex-shrink-0" style={{ width: rightPanelWidth }}>
              {/* Header */}
              <div className="p-4 border-b border-[#f0f0f0] flex justify-between items-center bg-gradient-to-r from-[#f78ca0]/5 to-[#fe9a8b]/5 flex-shrink-0">
                <div className="font-semibold text-sm text-[#1a1a2e] truncate pr-2">
                  {level === 'TC' ? `${tsId} › ${tcId}` : tsId}
                </div>
                <button onClick={() => { setDetailPanelRow(null); setSelectedNetworkNodeId(null); setSelectedTvId(null); }} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
                  <X className="w-4 h-4 text-[#6b7280]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* 기본 정보 + 인라인 수정 */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest">기본 정보</div>
                    {!isLoading && !isEditingName && (
                      <button onClick={() => setEditingDetailItem({ type: level === 'TS' ? 'ts' : 'tc', key: editKey, value: (level === 'TS' ? ts?.name : tc?.name) ?? '' })}
                        className="p-1 rounded hover:bg-gray-100">
                        <Edit2 className="w-3 h-3 text-[#9ca3af]" />
                      </button>
                    )}
                    {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#f78ca0] animate-spin" />}
                  </div>
                  <div className="space-y-0 text-xs divide-y divide-[#f0f0f0]">
                    {level === 'TS' && ts && (<>
                      <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">ID</span><span className="font-mono font-semibold">{ts.id}</span></div>
                      <div className="flex justify-between items-start py-2 gap-2">
                        <span className="text-[#9ca3af] flex-shrink-0">이름</span>
                        {isEditingName ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input autoFocus value={editingDetailItem!.value} onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={e => { if (e.key === 'Enter') saveName(editingDetailItem!.value); if (e.key === 'Escape') setEditingDetailItem(null); }}
                              className="flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 min-w-0" />
                            <button onClick={() => saveName(editingDetailItem!.value)} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                            <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                          </div>
                        ) : (
                          <span className={`font-medium text-right ${isLoading ? 'text-[#9ca3af] animate-pulse' : ''}`}>{ts.name}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">TC 수</span><span className="font-medium">{(dynamicTestCases[ts.id] || []).length}개</span></div>
                    </>)}
                    {level === 'TC' && tc && (<>
                      <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">ID</span><span className="font-mono font-semibold">{tc.id}</span></div>
                      <div className="flex justify-between items-start py-2 gap-2">
                        <span className="text-[#9ca3af] flex-shrink-0">이름</span>
                        {isEditingName ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input autoFocus value={editingDetailItem!.value} onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onKeyDown={e => { if (e.key === 'Enter') saveName(editingDetailItem!.value); if (e.key === 'Escape') setEditingDetailItem(null); }}
                              className="flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 min-w-0" />
                            <button onClick={() => saveName(editingDetailItem!.value)} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                            <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                          </div>
                        ) : (
                          <span className={`font-medium text-right ${isLoading ? 'text-[#9ca3af] animate-pulse' : ''}`}>{tc.name}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center py-2"><span className="text-[#9ca3af]">상위 TS</span><span className="font-mono font-medium">{tsId}</span></div>
                    </>)}
                  </div>
                </div>

                {/* TV 목록 (TC 상세에서만) */}
                {level === 'TC' && tc && tc.testVariables.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest mb-2.5">테스트 변수 (TV)</div>
                    <div className="space-y-1.5">
                      {tc.testVariables.map(tv => {
                        const tvEditKey = `${tsId}_${tcId}_${tv.id}`;
                        const isTVSelected = selectedTvId === tv.id;
                        const isTVEditing = editingDetailItem?.key === tvEditKey;
                        const isTVLoading = loadingItemKey === tvEditKey;
                        const validKey = `${tsId}_${tcId}_${tv.id}`;
                        const validations = mockValidationConditions[validKey] || [];
                        return (
                          <div key={tv.id}
                            className={`rounded-lg border transition-all ${isTVSelected ? 'border-[#f78ca0]/40 bg-[#f78ca0]/5' : 'border-[#f0f0f0] bg-gray-50/50 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                              onClick={() => setSelectedTvId(isTVSelected ? null : tv.id)}>
                              <span className="px-1 py-0.5 bg-gray-100 text-[#9ca3af] text-[9px] rounded font-medium flex-shrink-0">TV</span>
                              <span className="text-xs font-medium text-[#1a1a2e] flex-1 truncate">{tv.id}: {isTVLoading ? <span className="text-[#9ca3af] animate-pulse">{tv.name}</span> : tv.name}</span>
                              {isTVLoading && <Loader2 className="w-3 h-3 text-[#f78ca0] animate-spin flex-shrink-0" />}
                              {!isTVLoading && !isTVEditing && (
                                <button onClick={e => { e.stopPropagation(); setEditingDetailItem({ type: 'tv', key: tvEditKey, value: tv.name }); setSelectedTvId(tv.id); }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 flex-shrink-0">
                                  <Edit2 className="w-2.5 h-2.5 text-[#9ca3af]" />
                                </button>
                              )}
                              {isTVSelected ? <ChevronDown className="w-3 h-3 text-[#9ca3af] flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#9ca3af] flex-shrink-0" />}
                            </div>
                            {isTVSelected && (
                              <div className="px-3 pb-2.5 space-y-2 border-t border-[#f0f0f0]/60">
                                {/* TV 이름 인라인 수정 */}
                                <div className="pt-2">
                                  {isTVEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input autoFocus value={editingDetailItem!.value}
                                        onChange={e => setEditingDetailItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveTVName(tv.id, editingDetailItem!.value); if (e.key === 'Escape') setEditingDetailItem(null); }}
                                        className="flex-1 px-1.5 py-0.5 border border-[#f78ca0]/50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30" />
                                      <button onClick={() => saveTVName(tv.id, editingDetailItem!.value)} className="w-5 h-5 flex items-center justify-center rounded bg-[#9AB17A] flex-shrink-0"><CheckCircle className="w-3 h-3 text-white" /></button>
                                      <button onClick={() => setEditingDetailItem(null)} className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 flex-shrink-0"><X className="w-3 h-3 text-gray-500" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-[#6b7280]">{tv.name}</span>
                                      <button onClick={() => setEditingDetailItem({ type: 'tv', key: tvEditKey, value: tv.name })}
                                        className="p-0.5 rounded hover:bg-gray-200">
                                        <Edit2 className="w-2.5 h-2.5 text-[#9ca3af]" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {/* 검증 조건 */}
                                {validations.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wide">검증 조건</div>
                                    {validations.map((v, i) => (
                                      <div key={i} className="flex gap-1.5 p-2 bg-white rounded border border-[#f0f0f0] text-[10px]">
                                        <span className="text-[#f78ca0] flex-shrink-0 font-bold">•</span>
                                        <span className="text-[#6b7280] leading-relaxed">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {validations.length === 0 && (
                                  <div className="text-[10px] text-[#9ca3af]">검증 조건 없음</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* FR 매핑 */}
                <div>
                  <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest mb-2.5">FR 매핑</div>
                  {frMapped.length === 0
                    ? <div className="text-xs text-[#9ca3af]">매핑된 요구사항 없음</div>
                    : (
                      <div className="space-y-1.5">
                        {frMapped.map(fr => (
                          <div key={fr.frId} className="p-2.5 bg-gray-50 rounded-lg border border-[#f0f0f0]">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-mono text-[10px] font-bold">{fr.frId}</span>
                              {fr.result === 'PASS' && <span className="text-[10px] text-[#9AB17A] font-semibold">PASS</span>}
                              {fr.result === 'FAIL' && <span className="text-[10px] text-[#FF9A86] font-semibold">FAIL</span>}
                              {fr.result === 'UNCOVERED' && <span className="text-[10px] text-[#9ca3af] font-semibold">미커버</span>}
                            </div>
                            <div className="text-[10px] text-[#6b7280] leading-relaxed">{fr.requirement}</div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
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
              <button onClick={() => { setShowTestGroupModal(false); setSelectedTCIds([]); setCurrentPage('테스트그룹'); setTestDepth(0); }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg font-medium">
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

