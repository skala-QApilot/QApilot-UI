import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Search, XCircle } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mockExecutionHistory } from '../data/mockData';

type HistoryDetailTab = 'FAIL' | 'PASS';

interface ExecutionHistoryPageProps {
  historyFilter: string;
  setHistoryFilter: Dispatch<SetStateAction<string>>;
  selectedExecutionId: string | null;
  setSelectedExecutionId: Dispatch<SetStateAction<string | null>>;
  selectedFailTC: string | null;
  setSelectedFailTC: Dispatch<SetStateAction<string | null>>;
  historyDetailTab: HistoryDetailTab;
  setHistoryDetailTab: Dispatch<SetStateAction<HistoryDetailTab>>;
  retestCheckedIds: Set<string>;
  setRetestCheckedIds: Dispatch<SetStateAction<Set<string>>>;
  setShowRetestNavModal: Dispatch<SetStateAction<boolean>>;
}

export const ExecutionHistoryPage = ({
  historyFilter,
  setHistoryFilter,
  selectedExecutionId,
  setSelectedExecutionId,
  selectedFailTC,
  setSelectedFailTC,
  historyDetailTab,
  setHistoryDetailTab,
  retestCheckedIds,
  setRetestCheckedIds,
  setShowRetestNavModal,
}: ExecutionHistoryPageProps) => {
  const mockDetailErrors = [
    {
      id: 'TS3_TC1', scenario: 'TS3', testCase: 'TC1', tcName: '상품 추가',
      category: 'UI오류',
      description: '장바구니 아이콘 수량 표시 오류',
      details: '장바구니에 상품 3개 추가 후 아이콘에 표시되는 수량이 2개로 잘못 표시됨',
      analysis: 'UI 상태 업데이트 로직에서 마지막 추가 항목이 반영되지 않음',
      solutions: [
        '1. CartIcon 컴포넌트의 useEffect 의존성 배열에 cartItems 추가',
        '2. Redux store의 cartSlice에서 addItem action 후 즉시 count 재계산',
        '3. API 응답 후 UI 강제 리렌더링 트리거',
      ],
      errorLog: 'Error: Cart count mismatch\n  at CartIcon.updateCount (CartIcon.tsx:42:15)\n  at Array.forEach (<anonymous>)\n  at updateState (store.js:128:8)',
    },
    {
      id: 'TS1_TC2', scenario: 'TS1', testCase: 'TC2', tcName: '비밀번호 오류',
      category: 'API오류',
      description: '비밀번호 오류 메시지 미표시',
      details: '잘못된 비밀번호 입력 시 오류 메시지가 표시되지 않고 빈 화면 상태 유지됨',
      analysis: 'API /auth/login 응답의 error 필드가 UI 컴포넌트에 바인딩되지 않음',
      solutions: [
        '1. AuthForm 컴포넌트에서 API error 응답 처리 로직 추가',
        '2. error state를 useState로 관리하고 렌더링 조건 수정',
      ],
      errorLog: 'TypeError: Cannot read property "message" of undefined\n  at AuthForm.handleError (AuthForm.tsx:88:22)\n  at async login (auth.ts:34:5)',
    },
    {
      id: 'TS2_TC1', scenario: 'TS2', testCase: 'TC1', tcName: '검색어 입력',
      category: '데이터불일치',
      description: '검색 자동완성 목록 누락',
      details: '3자 이상 입력 시 자동완성 API 호출은 성공하나 목록이 UI에 반영되지 않음',
      analysis: 'AutoComplete 컴포넌트의 useEffect에서 deps 배열 누락으로 재렌더링 안됨',
      solutions: [
        '1. useEffect deps 배열에 searchQuery 추가',
        '2. 자동완성 목록 상태를 부모 컴포넌트로 lift up',
      ],
      errorLog: 'Warning: Missing dependency "searchQuery" in useEffect hook\n  at AutoComplete (AutoComplete.tsx:56)\n  Expected items to update but state was stale',
    },
  ];

  const mockPassCases = [
    { id: 'TS1_TC1', scenario: 'TS1', testCase: 'TC1', tcName: '로그인 성공', runtimeLog: 'PASS: navigate to /login\nPASS: fill email\nPASS: fill password\nPASS: click submit\nPASS: assert redirect to /dashboard' },
    { id: 'TS2_TC2', scenario: 'TS2', testCase: 'TC2', tcName: '상품 목록 조회', runtimeLog: 'PASS: navigate to /products\nPASS: assert list length > 0\nPASS: assert image src exists\nPASS: GET /api/products 200 142ms' },
    { id: 'TS3_TC2', scenario: 'TS3', testCase: 'TC2', tcName: '결제 완료', runtimeLog: 'PASS: navigate to /cart\nPASS: click checkout\nPASS: POST /api/orders 201 320ms\nPASS: assert success message' },
  ];

  const failsByTS = mockDetailErrors.reduce((acc, err) => {
    if (!acc[err.scenario]) acc[err.scenario] = [];
    acc[err.scenario].push(err);
    return acc;
  }, {} as Record<string, typeof mockDetailErrors>);

  const passByTS = mockPassCases.reduce((acc, p) => {
    if (!acc[p.scenario]) acc[p.scenario] = [];
    acc[p.scenario].push(p);
    return acc;
  }, {} as Record<string, typeof mockPassCases>);

  const filtered = mockExecutionHistory.filter(exec => {
    if (historyFilter === 'ALL') return true;
    if (historyFilter === 'FAIL') return exec.fail > 0;
    if (historyFilter === 'HITL') return exec.hitlPending > 0;
    if (historyFilter === 'PASS') return exec.pass > 0;
    if (historyFilter === '미실행') return exec.notRun > 0;
    return true;
  });

  if (selectedExecutionId) {
    const exec = mockExecutionHistory.find(e => e.id === selectedExecutionId);
    if (!exec) return null;

    const activeError = historyDetailTab === 'FAIL' ? (mockDetailErrors.find(e => e.id === selectedFailTC) ?? mockDetailErrors[0]) : null;
    const activePass = historyDetailTab === 'PASS' ? (mockPassCases.find(p => p.id === selectedFailTC) ?? null) : null;

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="bg-white border-b border-[#f0f0f0] px-5 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => { setSelectedExecutionId(null); setSelectedFailTC(null); setRetestCheckedIds(new Set()); setHistoryDetailTab('FAIL'); }}
            className="flex items-center gap-1.5 text-[#6b7280] hover:text-[#1a1a2e]">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">이력</span>
          </button>
          <div className="w-px h-4 bg-[#e5e7eb]" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{exec.groupId}</span>
            <span className="text-xs text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]">{exec.executionNumber}번째 실행</span>
            <span className="text-xs text-[#9ca3af]">{exec.startDate}</span>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-[#f0f0f0] rounded text-xs hover:bg-gray-50 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button className="px-3 py-1.5 bg-white border border-[#f0f0f0] rounded text-xs hover:bg-gray-50 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">
            <div className="px-4 border-b border-[#f0f0f0] flex items-center gap-0 flex-shrink-0">
              {([
                { id: 'FAIL' as const, label: 'FAIL', count: exec.fail, color: 'text-[#FF9A86]' },
                { id: 'PASS' as const, label: 'PASS', count: exec.pass, color: 'text-[#9AB17A]' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setHistoryDetailTab(tab.id); setSelectedFailTC(null); }}
                  className={`px-4 py-3 text-xs font-semibold relative flex items-center gap-1.5 transition-colors ${
                    historyDetailTab === tab.id ? tab.color : 'text-[#9ca3af] hover:text-[#6b7280]'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                    historyDetailTab === tab.id
                      ? (tab.id === 'FAIL' ? 'bg-red-100 text-[#FF9A86]' : 'bg-green-100 text-[#9AB17A]')
                      : 'bg-gray-100 text-[#9ca3af]'
                  }`}>{tab.count}</span>
                  {historyDetailTab === tab.id && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.id === 'FAIL' ? 'bg-[#FF9A86]' : 'bg-[#9AB17A]'}`} />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {historyDetailTab === 'FAIL' && Object.entries(failsByTS).map(([tsId, errors]) => (
                <div key={tsId}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                    <input type="checkbox"
                      checked={errors.every(e => retestCheckedIds.has(e.id))}
                      onChange={checked => {
                        const next = new Set(retestCheckedIds);
                        errors.forEach(e => checked.target.checked ? next.add(e.id) : next.delete(e.id));
                        setRetestCheckedIds(next);
                      }}
                      className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0"
                    />
                    <XCircle className="w-3.5 h-3.5 text-[#FF9A86] flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                    <span className="ml-auto text-xs text-[#FF9A86]">FAIL {errors.length}</span>
                  </div>
                  {errors.map(err => {
                    const isActive = (selectedFailTC ?? mockDetailErrors[0].id) === err.id;
                    const isChecked = retestCheckedIds.has(err.id);
                    return (
                      <div
                        key={err.id}
                        onClick={() => setSelectedFailTC(err.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                          isActive ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/10 border-l-2 border-l-[#f78ca0]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input type="checkbox"
                          checked={isChecked}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            const next = new Set(retestCheckedIds);
                            e.target.checked ? next.add(err.id) : next.delete(err.id);
                            setRetestCheckedIds(next);
                          }}
                          className="w-3.5 h-3.5 accent-[#f78ca0] flex-shrink-0"
                        />
                        <XCircle className="w-3.5 h-3.5 text-[#FF9A86] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[#1a1a2e] truncate">{err.testCase}</div>
                          <div className="text-[10px] text-[#9ca3af] truncate">{err.tcName}</div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setShowRetestNavModal(true); setRetestCheckedIds(new Set([err.id])); }}
                          title="재테스트 실행"
                          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[#9ca3af] hover:text-[#f78ca0] hover:bg-[#f78ca0]/10 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {historyDetailTab === 'PASS' && Object.entries(passByTS).map(([tsId, passes]) => (
                <div key={tsId}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-[#f0f0f0]">
                    <CheckCircle className="w-3.5 h-3.5 text-[#9AB17A] flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                    <span className="ml-auto text-xs text-[#9AB17A]">PASS {passes.length}</span>
                  </div>
                  {passes.map(p => {
                    const isActive = selectedFailTC === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedFailTC(p.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                          isActive ? 'bg-gradient-to-r from-[#9AB17A]/10 to-[#9AB17A]/5 border-l-2 border-l-[#9AB17A]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-[#9AB17A] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[#1a1a2e] truncate">{p.testCase}</div>
                          <div className="text-[10px] text-[#9ca3af] truncate">{p.tcName}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {historyDetailTab === 'FAIL' && retestCheckedIds.size > 0 && (
              <div className="p-3 border-t border-[#f0f0f0] flex-shrink-0">
                <button
                  onClick={() => setShowRetestNavModal(true)}
                  className="w-full px-3 py-2 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  재시나리오 그룹 생성 ({retestCheckedIds.size}건)
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
            {historyDetailTab === 'FAIL' && activeError && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-[#FF9A86]" />
                  <span className="font-semibold text-[#1a1a2e]">{activeError.scenario} › {activeError.testCase}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-red-100 text-red-700">{activeError.category}</span>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">① 장애 분류</div>
                  <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-sm rounded border border-red-200 font-medium">
                    {activeError.category}
                  </span>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">② 장애 분류 상세</div>
                  <div className="text-sm font-medium text-[#1a1a2e] mb-1">{activeError.description}</div>
                  <div className="text-sm text-[#6b7280]">{activeError.details}</div>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">③ 원인 분석</div>
                  <div className="text-sm text-[#6b7280]">{activeError.analysis}</div>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">④ 해결 방안</div>
                  <div className="space-y-2">
                    {activeError.solutions.map((sol, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded border border-[#f0f0f0]">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="text-sm text-[#6b7280]">{sol.replace(/^\d+\.\s*/, '')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {historyDetailTab === 'PASS' && (
              activePass ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#9AB17A]" />
                    <span className="font-semibold text-[#1a1a2e]">{activePass.scenario} › {activePass.testCase}</span>
                    <span className="px-2 py-0.5 text-xs rounded font-medium bg-green-100 text-[#9AB17A]">PASS</span>
                  </div>
                  <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                    <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">테스트 결과</div>
                    <div className="text-sm font-medium text-[#9AB17A]">모든 검증 항목 통과</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
                  <CheckCircle className="w-8 h-8 mb-2 opacity-25" />
                  <div className="text-sm">좌측에서 PASS 항목을 선택하세요</div>
                </div>
              )
            )}
          </div>

          <div className="w-64 bg-white border-l border-[#f0f0f0] flex flex-col overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-[#f0f0f0]">
              <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">UI 캡처</div>
              <div className="w-full h-36 bg-gray-100 rounded border border-[#f0f0f0] flex items-center justify-center">
                <div className="text-center text-[#9ca3af]">
                  <Eye className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <div className="text-xs">스크린샷</div>
                </div>
              </div>
            </div>
            <div className="p-4 flex-1">
              <div className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">
                {historyDetailTab === 'PASS' ? 'Runtime 로그' : 'Runtime 에러 로그'}
              </div>
              <div className="bg-[#1e1e2e] rounded p-3 overflow-x-auto">
                {historyDetailTab === 'FAIL' && activeError && activeError.errorLog.split('\n').map((line, i) => (
                  <div key={i} className={`font-mono text-[10px] leading-5 ${
                    i === 0 ? 'text-[#FF9A86] font-semibold' : 'text-[#9ca3af]'
                  }`}>{line}</div>
                ))}
                {historyDetailTab === 'PASS' && activePass && activePass.runtimeLog.split('\n').map((line, i) => (
                  <div key={i} className="font-mono text-[10px] leading-5 text-[#9AB17A]">{line}</div>
                ))}
                {historyDetailTab === 'PASS' && !activePass && (
                  <div className="text-[10px] text-[#6b7280]">항목을 선택하면 로그가 표시됩니다</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overallStatus = (exec: typeof mockExecutionHistory[0]) => {
    if (exec.fail > 0) return 'fail';
    if (exec.hitlPending > 0) return 'hitl';
    return 'pass';
  };

  const groupColors: Record<string, string> = {
    '시나리오 그룹 #1': '#f78ca0',
    '시나리오 그룹 #2': '#6b8cdb',
    '시나리오 그룹 #3': '#9AB17A',
  };

  const allGroups = [...new Set(mockExecutionHistory.map(e => e.groupId))];
  const allDates = [...new Set(mockExecutionHistory.map(e => e.startDate.slice(5, 10)))].sort();
  const chartData = allDates.map(date => {
    const point: Record<string, any> = { date };
    allGroups.forEach(g => {
      const exec = mockExecutionHistory.find(e => e.startDate.slice(5, 10) === date && e.groupId === g);
      if (exec) {
        const total = exec.pass + exec.fail + exec.hitlPending + exec.notRun;
        point[g] = total > 0 ? Math.round((exec.pass / total) * 100) : 0;
      } else {
        point[g] = null;
      }
    });
    return point;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#f0f0f0] rounded-lg shadow-lg px-3 py-2 text-xs">
        <div className="font-semibold text-[#1a1a2e] mb-1">{label}</div>
        {payload.filter((p: any) => p.value != null).map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-[#6b7280]">{p.dataKey.replace('시나리오 그룹 ', 'SG')}</span>
            <span className="font-semibold ml-auto pl-3 text-[#1a1a2e]">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
      <div className="border-b border-[#f0f0f0] px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="font-semibold text-base text-[#1a1a2e]">테스트 결과</div>
        <div className="text-xs text-[#9ca3af]">총 {filtered.length}건</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input type="text" placeholder="그룹명 검색..."
              className="pl-8 pr-3 py-1.5 border border-[#f0f0f0] rounded text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30" />
          </div>
          <select
            value={historyFilter}
            onChange={e => setHistoryFilter(e.target.value)}
            className="pl-3 pr-7 py-1.5 border border-[#f0f0f0] rounded text-sm text-[#6b7280] bg-white focus:outline-none focus:ring-1 focus:ring-[#f78ca0]/30 appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
            <option value="ALL">전체</option>
            <option value="FAIL">FAIL</option>
            <option value="HITL">HITL</option>
            <option value="PASS">PASS</option>
            <option value="미실행">미실행</option>
          </select>
        </div>
      </div>

      <div className="border-b border-[#f0f0f0] px-6 pt-3 pb-2 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#9ca3af] font-medium">일자별 PASS 비율 (%)</span>
          <div className="flex items-center gap-3">
            {allGroups.map(g => (
              <div key={g} className="flex items-center gap-1.5 text-[10px] text-[#6b7280]">
                <span className="w-5 h-0.5 rounded inline-block" style={{ background: groupColors[g] ?? '#9ca3af' }} />
                {g.replace('시나리오 그룹 ', 'SG')}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
              tickFormatter={v => `${v}%`} width={36} />
            <Tooltip content={<CustomTooltip />} />
            {allGroups.map(g => (
              <Line key={g} type="monotone" dataKey={g}
                stroke={groupColors[g] ?? '#9ca3af'} strokeWidth={2}
                dot={{ r: 4, fill: groupColors[g] ?? '#9ca3af', strokeWidth: 2, stroke: 'white' }}
                activeDot={{ r: 5 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="grid items-center px-6 py-2 border-b border-[#f0f0f0] bg-gray-50"
          style={{ gridTemplateColumns: '24px 1fr 130px 90px 120px 80px' }}>
          <div />
          <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
            실행 정보
            <span className="text-[#c4c9d4]">⇅</span>
          </div>
          <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
            실행 일시
            <span className="text-[#c4c9d4]">⇅</span>
          </div>
          <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">상태</div>
          <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide flex items-center gap-1">
            count
            <span className="text-[#c4c9d4]">⇅</span>
          </div>
          <div />
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-[#9ca3af]">조건에 맞는 실행 이력이 없습니다.</div>
        )}

        {filtered.map(exec => {
          const st = overallStatus(exec);
          const total = exec.pass + exec.fail + exec.hitlPending + exec.notRun;
          return (
            <div key={exec.id}
              className="grid items-center px-6 py-3.5 border-b border-[#f5f5f5] hover:bg-gray-50/60 transition-colors cursor-pointer group"
              style={{ gridTemplateColumns: '24px 1fr 130px 90px 120px 80px' }}
              onClick={() => { setSelectedExecutionId(exec.id); setSelectedFailTC(null); }}>

              <div className="flex items-center">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  st === 'fail' ? 'bg-[#FF9A86]' :
                  st === 'hitl' ? 'bg-[#B8860B]' :
                  'bg-[#9AB17A]'
                }`} />
              </div>

              <div>
                <div className="font-mono text-sm text-[#1a1a2e]">
                  {exec.groupId.replace('시나리오 그룹', 'SG')}
                  <span className="text-[#9ca3af] font-sans"> · </span>
                  <span className="text-[#6b7280] text-xs font-sans">{exec.executionNumber}번째 실행</span>
                </div>
              </div>

              <div className="text-xs text-[#6b7280] font-mono">{exec.startDate}</div>

              <div>
                {st === 'fail' && (
                  <span className="text-xs font-medium text-[#FF9A86]">
                    FAIL {Math.round((exec.fail / total) * 100)}%
                  </span>
                )}
                {st === 'hitl' && (
                  <span className="text-xs font-medium text-[#B8860B]">HITL 대기</span>
                )}
                {st === 'pass' && (
                  <span className="text-xs font-medium text-[#9AB17A]">PASS</span>
                )}
              </div>

              <div className="text-xs text-[#9ca3af] font-mono space-x-2">
                <span className="text-[#9AB17A]">P{exec.pass}</span>
                <span className="text-[#FF9A86]">F{exec.fail}</span>
                <span className="text-[#B8860B]">H{exec.hitlPending}</span>
                <span>N{exec.notRun}</span>
              </div>

              <div className="flex justify-end">
                <ChevronRight className="w-4 h-4 text-[#c4c9d4] group-hover:text-[#9ca3af] transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
