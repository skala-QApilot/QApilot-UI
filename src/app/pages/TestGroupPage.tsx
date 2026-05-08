import React, { type Dispatch, type SetStateAction } from 'react';
import { CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Edit2, Eye, GitBranch, History, List, Loader2, Pause, Play, Plus, RotateCcw, Search, X, Clock, Check, XCircle } from 'lucide-react';
import { AgentProgressStrip } from '../components/common/AgentProgressStrip';
import { RuntimeTerminal, TerminalFrame } from '../components/common/RuntimeTerminal';
import { StatusIcon } from '../components/common/StatusIcon';
import { mockScenarios, mockTestCases, mockTestGroups, mockTestLogs } from '../data/mockData';

type RunningTest = { id: string; name: string; groupId: string; startTime: string; status: 'running' | 'completed' };
type TestSubTab = 'INPROGRESS' | 'HISTORY';
type ScenarioSidebarTab = 'TOTAL' | 'PASS' | 'FILTERED';

// ── Schedule Modal ────────────────────────────────────────────────────────────
function ScheduleModal({
  onClose,
  onSave,
  selectedGroupCount,
}: {
  onClose: () => void;
  onSave: (time: string) => void;
  selectedGroupCount: number;
}) {
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  type RepeatType = '없음' | '매일' | '매주' | '매월';

  const [time, setTime]               = React.useState('07:50');
  const [repeat, setRepeat]           = React.useState<RepeatType>('매주');
  const [selectedDays, setSelectedDays] = React.useState(new Set(['월', '화', '수', '목', '금']));

  const toggleDay = (day: string) => {
    setSelectedDays(prev => { const n = new Set(prev); n.has(day) ? n.delete(day) : n.add(day); return n; });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#9ca3af]" />
            <span className="font-bold text-xl text-[#1a1a2e]">테스트 실행 예약</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-[#9ca3af] hover:text-[#6b7280]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* 선택 그룹 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f9f9fb] rounded-lg border border-[#f0f0f0] text-xs text-[#6b7280]">
            <span className="text-[#9ca3af]">선택된 그룹</span>
            <span className="font-semibold text-[#1a1a2e]">{selectedGroupCount}개</span>
          </div>

          {/* 실행 시간 */}
          <div>
            <label className="block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1.5">
              실행 시간
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#ebebeb] rounded-lg text-sm text-[#1a1a2e] bg-white focus:outline-none focus:ring-2 focus:ring-[#f78ca0]/20 focus:border-[#f78ca0]/40 transition-colors"
            />
          </div>

          {/* 반복 */}
          <div>
            <label className="block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1.5">
              반복
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['없음', '매일', '매주', '매월'] as RepeatType[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setRepeat(opt)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    repeat === opt
                      ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white border-transparent shadow-sm'
                      : 'bg-white border-[#ebebeb] text-[#6b7280] hover:border-[#f78ca0]/40 hover:text-[#f78ca0]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 요일 선택 (매주 only) */}
          {repeat === '매주' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1.5">
                요일
              </label>
              <div className="flex items-center gap-1.5">
                {DAYS.map(day => {
                  const sel = selectedDays.has(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        sel
                          ? 'bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white border-transparent shadow-sm'
                          : 'bg-white border-[#ebebeb] text-[#9ca3af] hover:border-[#f78ca0]/40 hover:text-[#f78ca0]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 반복 없음 안내 */}
          {repeat === '없음' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              지정한 시간에 1회만 실행됩니다.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f0f0f0] flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-[#ebebeb] rounded-lg text-sm text-[#6b7280] hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button onClick={() => onSave(time)}
            className="flex-1 px-4 py-2.5 bg-primary-blue text-white rounded-lg text-sm font-medium hover:shadow-md transition-shadow">
            예약 생성
          </button>
        </div>
      </div>
    </div>
  );
}

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
  getNodeStatus: (stage: string) => 'inactive' | 'running' | 'complete';
  selectedGroupIds: Set<string>;
  setSelectedGroupIds: Dispatch<SetStateAction<Set<string>>>;
  showScheduleModal: boolean;
  setShowScheduleModal: Dispatch<SetStateAction<boolean>>;
  scheduledAlarms: Array<{ time: string; id: string }>;
  setScheduledAlarms: Dispatch<SetStateAction<Array<{ time: string; id: string }>>>;
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
selectedGroupIds,
setSelectedGroupIds,
showScheduleModal,
setShowScheduleModal,
scheduledAlarms,
setScheduledAlarms,
}: TestGroupPageProps) => {
  // Depth 0 — Group List
  if (testDepth === 0) {
    const filteredGroups = mockTestGroups.filter(g =>
      g.id.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
    );

    const totalTCs = filteredGroups.reduce((sum, g) => sum + g.tcCount, 0);

    return (
      <div className="flex h-full min-h-0 flex-col bg-gray-50">

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
          <div className="ml-auto flex items-center gap-2">
            <button 
              disabled={selectedGroupIds.size === 0}
              onClick={() => setShowScheduleModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                selectedGroupIds.size === 0
                  ? 'bg-gray-100 text-[#9ca3af] cursor-not-allowed'
                  : 'bg-white border border-[#f0f0f0] text-[#1a1a2e] hover:bg-gray-50 shadow-sm'
              }`}>
              <Clock className="w-4 h-4" /> 예약 설정
            </button>
            <button className="px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
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

              return (
                <div key={group.id} className="px-5 py-4 hover:bg-gray-50/70 transition-colors">

                  {/* ── Row 1: Checkbox · ID · Name · Status · Run button ── */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group.id)}
                      onChange={(e) => {
                        const newIds = new Set(selectedGroupIds);
                        if (e.target.checked) {
                          newIds.add(group.id);
                        } else {
                          newIds.delete(group.id);
                        }
                        setSelectedGroupIds(newIds);
                      }}
                      className="w-4 h-4 rounded cursor-pointer accent-[#f78ca0]"
                    />
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
                          className="p-0.5 bg-status-pass text-white rounded flex-shrink-0">
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
                        setTestDepth(1);
                        setCurrentPage('테스트그룹');
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

        {/* 예약 설정 팝업 */}
        {showScheduleModal && (
          <ScheduleModal
            selectedGroupCount={selectedGroupIds.size}
            onClose={() => setShowScheduleModal(false)}
            onSave={time => {
              setScheduledAlarms(prev => [...prev, { time, id: `alarm-${Date.now()}` }]);
              setShowScheduleModal(false);
              setSelectedGroupIds(new Set());
            }}
          />
        )}
      </div>
    );
  }

  // Depth 1 — Execution Screen
  if (testDepth === 1) {
    const selectedScenariosForTest = mockScenarios.filter(s =>
      scenarioSidebarTab === 'TOTAL' || s.id === scenarioFilter
    );

    // Resizable sidebar state
    const [depth1SidebarWidth, setDepth1SidebarWidth] = React.useState<number | null>(null);
    const depth1DragRef = React.useRef(false);
    const depth1SidebarRef = React.useRef<HTMLDivElement>(null);
    const depth1StartX = React.useRef(0);
    const depth1StartW = React.useRef(0);
    const depth1RuntimeLogRef = React.useRef<HTMLDivElement>(null);
    const handleDepth1DragStart = (e: React.MouseEvent) => {
      depth1DragRef.current = true;
      depth1StartX.current = e.clientX;
      depth1StartW.current = depth1SidebarRef.current?.getBoundingClientRect().width ?? 0;
      const onMove = (ev: MouseEvent) => {
        if (!depth1DragRef.current) return;
        const parentWidth = depth1SidebarRef.current?.parentElement?.clientWidth ?? window.innerWidth;
        setDepth1SidebarWidth(Math.max(240, Math.min(parentWidth - 420, depth1StartW.current + ev.clientX - depth1StartX.current)));
      };
      const onUp = () => { depth1DragRef.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="bg-white border-b border-[#f0f0f0] p-4 flex-shrink-0">
          <button onClick={() => setTestDepth(0)}
            className="flex items-center gap-2 text-[#6b7280] hover:text-[#1a1a2e]">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{selectedTestGroup || 'TEST GROUP'}</span>
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar — resizable */}
          <div ref={depth1SidebarRef} className="bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0 min-h-0" style={{ width: depth1SidebarWidth ?? '50%' }}>
            {/* Tabs: TOTAL / PASS / ⊗ */}
            {(() => {
              const allTCs = mockScenarios.flatMap(s =>
                (mockTestCases[s.id] || []).map(tc => ({ sId: s.id, sName: s.name, tc }))
              );
              const passedTCs = allTCs.filter(({ tc }) => tc.status === 'passed' || tc.status === 'completed');
              const failedTCs = allTCs.filter(({ tc }) => tc.status === 'failed');
              const passedByTS = passedTCs.reduce((acc, item) => {
                if (!acc[item.sId]) acc[item.sId] = [];
                acc[item.sId].push(item);
                return acc;
              }, {} as Record<string, typeof passedTCs>);
              const failedByTS = failedTCs.reduce((acc, item) => {
                if (!acc[item.sId]) acc[item.sId] = [];
                acc[item.sId].push(item);
                return acc;
              }, {} as Record<string, typeof failedTCs>);

              const scrollToLog = (logIdx: number) => {
                setHighlightedLogIdx(logIdx);
                setTimeout(() => {
                  const container = depth1RuntimeLogRef.current;
                  const target = container?.querySelector<HTMLElement>(`#d1-log-${logIdx}`);
                  if (!container || !target) return;

                  const containerRect = container.getBoundingClientRect();
                  const targetRect = target.getBoundingClientRect();
                  container.scrollTo({
                    top: container.scrollTop + targetRect.top - containerRect.top - (container.clientHeight / 2) + (target.clientHeight / 2),
                    behavior: 'smooth',
                  });
                }, 50);
              };

              return (
                <>
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

                  <div className={`flex-1 min-h-0 overflow-y-auto ${scenarioSidebarTab === 'TOTAL' ? 'p-2' : ''}`}>
                    {/* TOTAL tab */}
                    {scenarioSidebarTab === 'TOTAL' && (
                      <div className="space-y-1">
                        {selectedScenariosForTest.map(scenario => {
                          const isExpanded = expandedScenarios.includes(scenario.id);
                          const tcs = mockTestCases[scenario.id] || [];
                          return (
                            <div key={scenario.id} className="border border-[#f0f0f0] rounded">
                              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setExpandedScenarios(prev =>
                                    prev.includes(scenario.id) ? prev.filter(id => id !== scenario.id) : [...prev, scenario.id]
                                  );
                                  scrollToLog(0);
                                }}>
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
                                        const logIdx = tc.status === 'failed'
                                          ? mockTestLogs.findIndex(l => l.isError)
                                          : 0;
                                        scrollToLog(Math.max(0, logIdx));
                                      }}>
                                      {isTCExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{tc.id} {tc.name}</div>
                                      </div>
                                      <StatusIcon status={tc.status} size="w-3 h-3" />
                                    </div>
                                    {isTCExpanded && tc.testVariables.map(tv => (
                                      <div key={tv.id} className="ml-5 flex items-center gap-2 p-1.5 text-xs text-[#6b7280] cursor-pointer hover:bg-gray-50"
                                        onClick={() => scrollToLog(tv.status === 'failed' ? 4 : 0)}>
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
                    )}

                    {/* PASS tab */}
                    {scenarioSidebarTab === 'PASS' && (
                      <div>
                        {passedTCs.length === 0 && (
                          <div className="text-center py-10 text-xs text-[#9ca3af]">완료된 테스트케이스 없음</div>
                        )}
                        {Object.entries(passedByTS).map(([sId, items]) => (
                          <div key={sId}>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                              <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                              <span className="text-xs font-semibold text-[#1a1a2e]">{sId}</span>
                              <span className="ml-auto text-xs text-status-pass">PASS {items.length}</span>
                            </div>
                            {items.map(({ tc }, idx) => (
                              <div key={`${sId}_${tc.id}_${idx}`}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer hover:bg-gray-50"
                                onClick={() => scrollToLog(0)}>
                                <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-[#1a1a2e] truncate">{tc.id}</div>
                                  <div className="text-[10px] text-[#9ca3af] truncate">{tc.name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ⊗ FAIL tab */}
                    {scenarioSidebarTab === 'FILTERED' && (
                      <div>
                        {failedTCs.length === 0 && (
                          <div className="text-center py-10 text-xs text-[#9ca3af]">실패한 테스트케이스 없음</div>
                        )}
                        {Object.entries(failedByTS).map(([sId, items]) => (
                          <div key={sId}>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                              <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                              <span className="text-xs font-semibold text-[#1a1a2e]">{sId}</span>
                              <span className="ml-auto text-xs text-status-fail">FAIL {items.length}</span>
                            </div>
                            {items.map(({ tc }, idx) => (
                              <div key={`${sId}_${tc.id}_${idx}`}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer hover:bg-gray-50"
                                onClick={() => {
                                  const logIdx = mockTestLogs.findIndex(l => l.isError);
                                  scrollToLog(Math.max(0, logIdx));
                                }}>
                                <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-[#1a1a2e] truncate">{tc.id}</div>
                                  <div className="text-[10px] text-[#9ca3af] truncate">{tc.name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Execution Controls */}
            <div className="p-4 border-t border-[#f0f0f0] space-y-2 bg-white flex-shrink-0">
              <div className="flex gap-2 justify-center items-center">
                <button
                  onClick={() => {
                    // 정지 버튼 클릭일 때만 팝업
                    if (isTestRunning) {
                      setShowCompletionModal(true);
                      setIsTestRunning(false);
                    } else {
                      // 실행 버튼 클릭
                      setIsTestRunning(true);
                    }
                  }}
                  className="flex-1 min-w-0 px-3 py-2 bg-primary-blue text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                  {isTestRunning ? <><Pause className="w-4 h-4" /> 정지</> : <><Play className="w-4 h-4" /> 실행</>}
                </button>
                <button
                  onClick={() => { setCompletedAgentStages([]); setCurrentAgentStage(''); setIsTestRunning(false); }}
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center justify-center gap-1.5">
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
          <div className="flex-1 min-w-0 overflow-hidden bg-gray-50 p-4">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <AgentProgressStrip getNodeStatus={getNodeStatus} />
              <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4">
              {/* Playwright Logs */}
              <TerminalFrame title="qapilot-preview - zsh" bodyClassName="aspect-video flex items-center justify-center p-4">
                <div className="text-center text-[#9aa0a6]">
                  {isTestRunning ? (
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                  ) : (
                    <Eye className="w-8 h-8 mx-auto mb-3 opacity-70" />
                  )}
                  <div className="font-mono text-xs">
                    {isTestRunning ? '실시간 브라우저 화면' : '테스트 실행 중 실시간 화면이 표시됩니다'}
                  </div>
                </div>
              </TerminalFrame>
              <RuntimeTerminal logs={mockTestLogs} highlightedLogIdx={highlightedLogIdx} idPrefix="d1-log" scrollContainerRef={depth1RuntimeLogRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
              <CheckCircle2 className="w-12 h-12 text-primary-blue mx-auto mb-4" />
              <div className="font-semibold text-lg mb-2">테스트 실행이 완료되었습니다.</div>
              <div className="text-sm text-[#6b7280] mb-6">결과 페이지로 이동하시겠습니까?</div>
              <div className="flex gap-3">
                <button onClick={() => {
                  setShowCompletionModal(false);
                  setRunningTests(prev => prev.map(t => t.id === selectedRunningTestId ? { ...t, status: 'completed' } : t));
                  setSelectedRunningTestId(null);
                  setTestDepth(0);
                  setCurrentPage('테스트');
                  setTestSubTab('HISTORY');
                  setTestSubmenuExpanded(true);
                  setHistoryFilter('ALL');
                }}
                  className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg font-medium">
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
