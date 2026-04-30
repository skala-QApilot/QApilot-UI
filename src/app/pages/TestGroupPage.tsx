import React, { type Dispatch, type SetStateAction } from 'react';
import { AlertCircle, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Edit2, Eye, History, Loader2, Pause, Play, Plus, RotateCcw, Search, X } from 'lucide-react';
import { PageTitle } from '../components/common/PageTitle';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockScenarios, mockTestCases, mockTestGroups, mockTestLogs } from '../data/mockData';

type RunningTest = { id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed' };
type TestSubTab = 'INPROGRESS' | 'HISTORY';
type ScenarioSidebarTab = 'TOTAL' | 'FILTERED';

interface TestGroupPageProps {
  testDepth: 0 | 1;
  setTestDepth: Dispatch<SetStateAction<0 | 1>>;
  selectedTestGroup: string | null;
  groupSearchQuery: string;
  setGroupSearchQuery: Dispatch<SetStateAction<string>>;
  editingGroupId: string | null;
  setEditingGroupId: Dispatch<SetStateAction<string | null>>;
  editingGroupName: string;
  setEditingGroupName: Dispatch<SetStateAction<string>>;
  groupNames: Record<string, string>;
  setGroupNames: Dispatch<SetStateAction<Record<string, string>>>;
  isTestRunning: boolean;
  setIsTestRunning: Dispatch<SetStateAction<boolean>>;
  completedAgentStages: string[];
  setCompletedAgentStages: Dispatch<SetStateAction<string[]>>;
  currentAgentStage: string;
  setCurrentAgentStage: Dispatch<SetStateAction<string>>;
  showCompletionModal: boolean;
  setShowCompletionModal: Dispatch<SetStateAction<boolean>>;
  scenarioSidebarTab: ScenarioSidebarTab;
  setScenarioSidebarTab: Dispatch<SetStateAction<ScenarioSidebarTab>>;
  scenarioFilter: string;
  expandedScenarios: string[];
  setExpandedScenarios: Dispatch<SetStateAction<string[]>>;
  expandedTestCases: string[];
  setExpandedTestCases: Dispatch<SetStateAction<string[]>>;
  highlightedLogIdx: number | null;
  setHighlightedLogIdx: Dispatch<SetStateAction<number | null>>;
  setRunningTests: Dispatch<SetStateAction<RunningTest[]>>;
  selectedRunningTestId: string | null;
  setSelectedRunningTestId: Dispatch<SetStateAction<string | null>>;
  setSelectedTestGroup: Dispatch<SetStateAction<string | null>>;
  setCurrentPage: Dispatch<SetStateAction<string>>;
  setTestSubTab: Dispatch<SetStateAction<TestSubTab>>;
  setTestSubmenuExpanded: Dispatch<SetStateAction<boolean>>;
  setScenarioSubmenuExpanded: Dispatch<SetStateAction<boolean>>;
  setHistoryFilter: Dispatch<SetStateAction<string>>;
  advanceAgentStage: () => void;
  getNodeStatus: (stage: string) => 'pending' | 'running' | 'complete';
}

export const TestGroupPage = ({
testDepth,
setTestDepth,
selectedTestGroup,
groupSearchQuery,
setGroupSearchQuery,
editingGroupId,
setEditingGroupId,
editingGroupName,
setEditingGroupName,
groupNames,
setGroupNames,
isTestRunning,
setIsTestRunning,
completedAgentStages,
setCompletedAgentStages,
currentAgentStage,
setCurrentAgentStage,
showCompletionModal,
setShowCompletionModal,
scenarioSidebarTab,
setScenarioSidebarTab,
scenarioFilter,
expandedScenarios,
setExpandedScenarios,
expandedTestCases,
setExpandedTestCases,
highlightedLogIdx,
setHighlightedLogIdx,
setRunningTests,
selectedRunningTestId,
setSelectedRunningTestId,
setSelectedTestGroup,
setCurrentPage,
setTestSubTab,
setTestSubmenuExpanded,
setScenarioSubmenuExpanded,
setHistoryFilter,
advanceAgentStage,
getNodeStatus,
}: TestGroupPageProps) => {
  // Depth 0 — Group List
  if (testDepth === 0) {
    const filteredGroups = mockTestGroups.filter(g =>
      g.id.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
    );

    const totalTCs = filteredGroups.reduce((sum, g) => sum + g.tcCount, 0);

    const statusConfig = {
      active:   { label: '활성',  bg: 'bg-green-50',  text: 'text-[#9AB17A]',  border: 'border-green-200' },
      inactive: { label: '비활성', bg: 'bg-gray-100',  text: 'text-[#9ca3af]',  border: 'border-gray-200' },
      archived: { label: '보관',  bg: 'bg-amber-50',  text: 'text-amber-600',   border: 'border-amber-200' },
    };

    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
        <PageTitle title="시나리오 그룹 관리" />

        {/* Controls bar */}
        <div className="bg-white border-b border-[#f0f0f0] px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input
              type="text" value={groupSearchQuery} onChange={e => setGroupSearchQuery(e.target.value)}
              placeholder="그룹명 검색..."
              className="pl-8 pr-3 py-1.5 border border-[#f0f0f0] rounded text-sm w-52 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 transition-colors"
            />
          </div>
          <span className="text-xs text-[#9ca3af]">
            {filteredGroups.length}개 그룹 · 총 {totalTCs}개 TC
          </span>
          <div className="ml-auto">
            <button className="px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
              <Plus className="w-4 h-4" /> 새 시나리오 그룹 생성
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-white rounded-xl border border-[#f0f0f0] shadow-sm overflow-hidden divide-y divide-[#f5f5f5]">
            {filteredGroups.length === 0 && (
              <div className="py-16 text-center text-sm text-[#9ca3af]">검색 결과가 없습니다.</div>
            )}
            {filteredGroups.map(group => {
              const isEditing = editingGroupId === group.id;
              const displayName = groupNames[group.id] || group.name;
              const sc = statusConfig[group.status] ?? statusConfig.inactive;

              return (
                <div key={group.id} className="px-5 py-4 hover:bg-gray-50/70 transition-colors">

                  {/* ── Row 1: ID · Name · Status · Run button ── */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[10px] font-mono text-[#c4c9d4] flex-shrink-0 w-10">
                      {group.id}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text" value={editingGroupName}
                          onChange={e => setEditingGroupName(e.target.value)}
                          className="px-2 py-0.5 border border-[#f78ca0] rounded text-sm font-semibold focus:outline-none flex-1 max-w-xs"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { setGroupNames(prev => ({ ...prev, [group.id]: editingGroupName })); setEditingGroupId(null); }
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                        />
                        <button onClick={() => { setGroupNames(prev => ({ ...prev, [group.id]: editingGroupName })); setEditingGroupId(null); }}
                          className="p-0.5 bg-[#9AB17A] text-white rounded flex-shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingGroupId(null)} className="p-0.5 bg-gray-200 rounded flex-shrink-0">
                          <X className="w-3.5 h-3.5 text-[#6b7280]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingGroupId(group.id); setEditingGroupName(displayName); }}
                        className="flex items-center gap-1 text-left flex-1 group/name min-w-0"
                      >
                        <span className="text-sm font-semibold text-[#1a1a2e] truncate">{displayName}</span>
                        <Edit2 className="w-3 h-3 text-[#c4c9d4] flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>

                    {/* Run button */}
                    <button
                      onClick={() => {
                        const newRun = {
                          id: `run-${Date.now()}`,
                          name: displayName,
                          groupId: group.id,
                          startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                          status: 'running' as const,
                        };
                        setRunningTests(prev => [...prev, newRun]);
                        setSelectedRunningTestId(newRun.id);
                        setSelectedTestGroup(displayName);
                        setCompletedAgentStages([]);
                        setCurrentAgentStage('');
                        setIsTestRunning(false);
                        setCurrentPage('테스트');
                        setTestSubTab('INPROGRESS');
                        setTestSubmenuExpanded(true);
                        setScenarioSubmenuExpanded(false);
                      }}
                      className="ml-2 px-3 py-1.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Play className="w-3 h-3" /> 즉시 실행
                    </button>
                  </div>

                  {/* ── Row 2: Scenarios · TC count · Tags · Meta ── */}
                  <div className="flex items-center gap-2 pl-[52px] flex-wrap">
                    {/* Scenario chips */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {group.scenarios.map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-[#6b7280] text-[10px] rounded font-mono">
                          {s}
                        </span>
                      ))}
                    </div>

                    <span className="text-[#d1d5db] text-xs">·</span>
                    <span className="text-[10px] text-[#6b7280] flex-shrink-0">{group.tcCount}개 TC</span>

                    {/* Tags */}
                    {group.tags.length > 0 && (
                      <>
                        <span className="text-[#d1d5db] text-xs">·</span>
                        <div className="flex gap-1">
                          {group.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 text-[#f78ca0] text-[10px] rounded border border-[#f78ca0]/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Meta: created + execution count */}
                    <div className="ml-auto flex items-center gap-3 text-[10px] text-[#9ca3af] flex-shrink-0">
                      <span>생성 {group.createdDate}</span>
                      <span className="flex items-center gap-0.5">
                        <History className="w-3 h-3" />
                        {group.executionCount}회 실행
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Depth 1 — Execution Screen
  if (testDepth === 1) {
    const selectedScenariosForTest = mockScenarios.filter(s =>
      scenarioSidebarTab === 'TOTAL' || s.id === scenarioFilter
    );

    // Resizable sidebar state
    const [depth1SidebarWidth, setDepth1SidebarWidth] = React.useState(288);
    const depth1DragRef = React.useRef(false);
    const depth1StartX = React.useRef(0);
    const depth1StartW = React.useRef(0);
    const handleDepth1DragStart = (e: React.MouseEvent) => {
      depth1DragRef.current = true;
      depth1StartX.current = e.clientX;
      depth1StartW.current = depth1SidebarWidth;
      const onMove = (ev: MouseEvent) => {
        if (!depth1DragRef.current) return;
        setDepth1SidebarWidth(Math.max(180, Math.min(500, depth1StartW.current + ev.clientX - depth1StartX.current)));
      };
      const onUp = () => { depth1DragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="bg-white border-b border-[#f0f0f0] p-4 flex-shrink-0">
          <button onClick={() => setTestDepth(0)}
            className="flex items-center gap-2 text-[#6b7280] hover:text-[#1a1a2e]">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{selectedTestGroup || 'TEST GROUP'}</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar — resizable */}
          <div className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0" style={{ width: depth1SidebarWidth }}>
            <div className="flex gap-2 px-4 pt-3 border-b border-[#f0f0f0]">
              {(['TOTAL', 'FILTERED'] as const).map(tab => (
                <button key={tab} onClick={() => setScenarioSidebarTab(tab)}
                  className={`px-3 py-2 text-sm relative ${scenarioSidebarTab === tab ? 'text-[#1a1a2e] font-medium' : 'text-[#6b7280]'}`}>
                  {tab === 'FILTERED' ? '⊗' : tab}
                  {scenarioSidebarTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {selectedScenariosForTest.map(scenario => {
                const isExpanded = expandedScenarios.includes(scenario.id);
                const tcs = mockTestCases[scenario.id] || [];
                return (
                  <div key={scenario.id} className="border border-[#f0f0f0] rounded">
                    <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedScenarios(prev =>
                        prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                      )}>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{scenario.id} {scenario.name}</div>
                      </div>
                      <StatusIcon status={scenario.status} />
                    </div>
                    {isExpanded && tcs.map(tc => {
                      const isTCExpanded = expandedTestCases.includes(`${scenario.id}_${tc.id}`);
                      return (
                        <div key={tc.id} className="ml-6 border-l-2 border-gray-200">
                          <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              const key = `${scenario.id}_${tc.id}`;
                              setExpandedTestCases(prev =>
                                prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]
                              );
                              const logIdx = mockTestLogs.findIndex(l => l.isError);
                              if (tc.status === 'failed' && logIdx >= 0) setHighlightedLogIdx(logIdx);
                            }}>
                            {isTCExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                            </div>
                            <StatusIcon status={tc.status} size="w-3 h-3" />
                          </div>
                          {isTCExpanded && tc.testVariables.map(tv => (
                            <div key={tv.id} className="ml-5 flex items-center gap-2 p-1.5 text-xs text-[#6b7280] cursor-pointer hover:bg-gray-50"
                              onClick={() => { if (tv.status === 'failed') setHighlightedLogIdx(4); }}>
                              <div className="flex-1 truncate">{tv.id}: {tv.name}</div>
                              <StatusIcon status={tv.status} size="w-3 h-3" />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Execution Controls */}
            <div className="p-4 border-t border-[#f0f0f0] space-y-2">
              <div className="flex gap-2 justify-center items-center">
                <button
                  onClick={() => setIsTestRunning(!isTestRunning)}
                  className="px-4 py-2 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                  {isTestRunning ? <><Pause className="w-4 h-4" /> 정지</> : <><Play className="w-4 h-4" /> 실행</>}
                </button>
                <button
                  onClick={() => { setCompletedAgentStages([]); setCurrentAgentStage(''); setIsTestRunning(false); }}
                  className="px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> 전체 재실행
                </button>
              </div>
              {isTestRunning && (
                <button onClick={advanceAgentStage}
                  className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-[#6b7280] transition-colors">
                  단계 진행 (시뮬레이션)
                </button>
              )}
            </div>
          </div>

          {/* Drag handle */}
          <div
            className="w-1 bg-[#e5e7eb] hover:bg-[#f78ca0]/60 cursor-col-resize flex-shrink-0 transition-colors"
            onMouseDown={handleDepth1DragStart}
          />

          {/* Main Panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Test UI Preview (62%) */}
            <div className="w-[62%] p-4 bg-white border-r border-[#f0f0f0]">
              <div className="font-semibold mb-3 text-sm">TEST UI Preview</div>
              <div className="w-full h-[calc(100vh-14rem)] bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center">
                {isTestRunning ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-[#6b7280] animate-spin mx-auto mb-2" />
                    <div className="text-sm text-[#6b7280]">실시간 브라우저 화면</div>
                  </div>
                ) : (
                  <div className="text-center text-[#6b7280]">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="text-sm">테스트 실행 중 실시간 화면이 표시됩니다</div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Runtime Log (38%) */}
            <div className="w-[38%] p-4 bg-gray-50 overflow-y-auto">
              {/* Agent Progress Bar */}
              <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4 mb-4">
                <div className="text-[11px] font-semibold text-[#6b7280] mb-3 uppercase tracking-wide">에이전트 실행 흐름</div>
                <div className="flex items-center w-full gap-2">
                  {/* Parallel nodes — vertical */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {[
                      { stage: 'UI',  label: 'UI 테스트 Tool', short: 'UI' },
                      { stage: 'API', label: 'API 추적 Tool',  short: 'AP' },
                      { stage: 'DB',  label: 'DB 테스트 Tool', short: 'DB' },
                    ].map(n => {
                      const st = getNodeStatus(n.stage);
                      return (
                        <div key={n.stage} className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${
                            st === 'complete' ? 'bg-[#9AB17A] text-white' :
                            st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                            'bg-gray-200 text-gray-400'
                          }`}>
                            {st === 'complete' ? <CheckCircle className="w-3 h-3" /> : n.short}
                          </div>
                          <span className="text-[10px] text-[#6b7280] whitespace-nowrap">{n.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* merge connector */}
                  <div className="text-[#9ca3af] text-sm select-none flex-shrink-0">+</div>
                  {/* Sequential pipeline — flex-1 so it fills remaining space */}
                  <div className="flex items-center flex-1 min-w-0">
                    {[
                      { stage: 'Cross-check', label: 'Cross-check', short: 'Cr'  },
                      { stage: '원인 분석',    label: '원인 분석',    short: '원인' },
                      { stage: 'Report 생성', label: 'Report 생성', short: 'Re'  },
                    ].map((node, i) => {
                      const st = getNodeStatus(node.stage);
                      const prevDone = i > 0 && completedAgentStages.includes(
                        ['Cross-check', '원인 분석', 'Report 생성'][i - 1]
                      );
                      return (
                        <React.Fragment key={node.stage}>
                          {i > 0 && (
                            <div className={`flex-1 h-0 mx-2 ${
                              prevDone ? 'border-t-2 border-[#f78ca0]' : 'border-t-2 border-dashed border-gray-400'
                            }`} />
                          )}
                          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                              st === 'complete' ? 'bg-[#9AB17A] text-white' :
                              st === 'running'  ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white animate-pulse shadow-md shadow-pink-200' :
                              'bg-gray-200 text-gray-400'
                            }`}>
                              {st === 'complete' ? <CheckCircle className="w-3.5 h-3.5" /> : node.short}
                            </div>
                            <span className="text-[8px] text-[#9ca3af] whitespace-nowrap leading-tight">{node.label}</span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Playwright Logs */}
              <div className="bg-white rounded-lg shadow-sm border border-[#f0f0f0] p-4">
                <div className="font-semibold mb-3 text-sm">Test Runtime Log</div>
                <div className="space-y-2">
                  {mockTestLogs.map((log, idx) => (
                    <div key={idx} className={`p-2.5 rounded text-xs ${
                      idx === highlightedLogIdx ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                      log.isError ? 'bg-red-50 border-l-4 border-red-400' :
                      'bg-gray-50'
                    }`}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[#9ca3af]">{log.time}</span>
                        {log.apiMethod && (
                          <span>
                            <span className="font-semibold">{log.apiMethod}</span> {log.endpoint} ·{' '}
                            <span className={log.status === 200 ? 'text-[#9AB17A]' : 'text-[#FF9A86]'}>{log.status}</span> · {log.responseTime}
                          </span>
                        )}
                      </div>
                      <code className="block text-[#1a1a2e]">{log.action}</code>
                      {log.hitl && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                          <AlertCircle className="w-3 h-3" /> HITL 플래그
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
              <CheckCircle2 className="w-12 h-12 text-[#9AB17A] mx-auto mb-4" />
              <div className="font-semibold text-lg mb-2">테스트 실행이 완료되었습니다.</div>
              <div className="text-sm text-[#6b7280] mb-6">결과 페이지로 이동하시겠습니까?</div>
              <div className="flex gap-3">
                <button onClick={() => {
                  setShowCompletionModal(false);
                  setRunningTests(prev => prev.map(t => t.id === selectedRunningTestId ? { ...t, status: 'completed' } : t));
                  setCurrentPage('테스트');
                  setTestSubTab('HISTORY');
                  setTestSubmenuExpanded(true);
                  setHistoryFilter('ALL');
                }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#f78ca0] via-[#fd868c] to-[#fe9a8b] text-white rounded-lg font-medium">
                  이동
                </button>
                <button onClick={() => setShowCompletionModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-[#f0f0f0] rounded-lg hover:bg-gray-50">
                  나중에
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

