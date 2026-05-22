import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle, ChevronLeft, Download, Eye, RotateCcw, XCircle } from 'lucide-react';
import { SubHeader } from '../components/common/SubHeader';
import { useTestStore } from '../../store/testStore';

type HistoryDetailTab = 'FAIL' | 'PASS';

interface TestResultPageProps {
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

export const TestResultPage = ({
  selectedExecutionId,
  setSelectedExecutionId,
  selectedFailTC,
  setSelectedFailTC,
  historyDetailTab,
  setHistoryDetailTab,
  retestCheckedIds,
  setRetestCheckedIds,
  setShowRetestNavModal,
}: TestResultPageProps) => {
  const mockDetailErrors = [
    {
      id: 'TS3_TC1', scenario: 'TS3', testCase: 'TC1', tcName: '상품 추가',
      errorCode: 'UI_RENDER_ERROR',
      summary: 'UI 상태 업데이트 로직에서 마지막 추가 항목이 반영되지 않음',
      solutions: [
        { cause: 'CartIcon 컴포넌트의 useEffect가 cartItems 변경을 감지하지 못함', solution: 'useEffect 의존성 배열에 cartItems 추가' },
        { cause: 'Redux store의 addItem action 후 count 재계산 누락', solution: 'cartSlice에서 addItem action 후 즉시 count 재계산 로직 추가' },
        { cause: 'API 응답 후 UI 동기화 미처리', solution: 'API 응답 후 UI 강제 리렌더링 트리거' },
      ],
      errorLog: 'Error: Cart count mismatch\n  at CartIcon.updateCount (CartIcon.tsx:42:15)\n  at Array.forEach (<anonymous>)\n  at updateState (store.js:128:8)',
    },
    {
      id: 'TS1_TC2', scenario: 'TS1', testCase: 'TC2', tcName: '비밀번호 오류',
      errorCode: '401',
      summary: 'API /auth/login 응답의 error 필드가 UI 컴포넌트에 바인딩되지 않음',
      solutions: [
        { cause: 'AuthForm에서 API error 응답 처리 로직 부재', solution: 'AuthForm 컴포넌트에서 API error 응답 처리 로직 추가' },
        { cause: 'error state 관리 미흡으로 렌더링 조건 누락', solution: 'error state를 useState로 관리하고 렌더링 조건 수정' },
      ],
      errorLog: 'TypeError: Cannot read property "message" of undefined\n  at AuthForm.handleError (AuthForm.tsx:88:22)\n  at async login (auth.ts:34:5)',
    },
    {
      id: 'TS2_TC1', scenario: 'TS2', testCase: 'TC1', tcName: '검색어 입력',
      errorCode: 'UI_STALE_STATE',
      summary: 'AutoComplete 컴포넌트의 useEffect에서 deps 배열 누락으로 재렌더링 안됨',
      solutions: [
        { cause: 'useEffect deps 배열에 searchQuery 누락', solution: 'useEffect deps 배열에 searchQuery 추가' },
        { cause: '자동완성 상태 관리 위치 부적절', solution: '자동완성 목록 상태를 부모 컴포넌트로 lift up' },
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

  if (!selectedExecutionId) return null;

  // selectedExecutionId 는 testStore.getExecutionHistory() 가 만든 trace_id.
  // store getter 가 매번 새 배열을 만드므로 1회성 lookup 패턴 (조회 즉시 종료) 으로 안전.
  const exec = useTestStore.getState().getExecutionHistory().find(e => e.id === selectedExecutionId);
  if (!exec) return null;

  const activeError = historyDetailTab === 'FAIL' ? (mockDetailErrors.find(e => e.id === selectedFailTC) ?? mockDetailErrors[0]) : null;
  const activePass = historyDetailTab === 'PASS' ? (mockPassCases.find(p => p.id === selectedFailTC) ?? null) : null;

  const formatDuration = (duration: string) => duration;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <SubHeader
        leftContent={(
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedExecutionId(null);
                setSelectedFailTC(null);
              }}
              className="flex items-center gap-1 text-[#9ca3af] hover:text-[#3615CF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">이력</span>
            </button>
            <div className="w-px h-4 bg-[#e5e7eb]" />
          </>
        )}
        title={exec.groupId}
        titleExtra={(
          <div className="flex items-center gap-3 ml-1">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#3615CF]/10 text-[#3615CF]">#{exec.executionNumber}번째 실행</span>
            <span className="text-sm text-[#9ca3af]">{exec.startDate}</span>
            <span className="text-sm text-[#9ca3af]">{formatDuration(exec.duration)}</span>
          </div>
        )}
        rightContent={(
          <>
            <button className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className="px-3 py-1.5 bg-transparent border border-[#e5e7eb] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] hover:bg-white flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </>
        )}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">
          <div className="px-4 border-b border-[#f0f0f0] flex items-center gap-0 flex-shrink-0">
            {([
              { id: 'FAIL' as const, label: 'FAIL', count: exec.fail, color: 'text-status-fail' },
              { id: 'PASS' as const, label: 'PASS', count: exec.pass, color: 'text-status-pass' },
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
                    ? (tab.id === 'FAIL' ? 'bg-status-fail/15 text-status-fail' : 'bg-status-pass/15 text-status-pass')
                    : 'bg-gray-100 text-[#9ca3af]'
                }`}>{tab.count}</span>
                {historyDetailTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.id === 'FAIL' ? 'bg-status-fail' : 'bg-status-pass'}`} />
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
                    className="w-3.5 h-3.5 accent-[var(--status-fail)] flex-shrink-0"
                  />
                  <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  <span className="ml-auto text-xs text-status-fail">FAIL {errors.length}</span>
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
                        className="w-3.5 h-3.5 accent-[var(--status-fail)] flex-shrink-0"
                      />
                      <XCircle className="w-3.5 h-3.5 text-status-fail flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#1a1a2e] truncate">{err.testCase}</div>
                        <div className="text-[10px] text-[#9ca3af] truncate">{err.tcName}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setShowRetestNavModal(true); setRetestCheckedIds(new Set([err.id])); }}
                        title="재테스트 실행"
                        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[#9ca3af] hover:text-status-fail hover:bg-status-fail/10 transition-colors"
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
                  <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#1a1a2e]">{tsId}</span>
                  <span className="ml-auto text-xs text-status-pass">PASS {passes.length}</span>
                </div>
                {passes.map(p => {
                  const isActive = selectedFailTC === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedFailTC(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-b border-[#f0f0f0] cursor-pointer ${
                        isActive ? 'bg-gradient-to-r from-status-pass/10 to-status-pass/5 border-l-2 border-l-status-pass' : 'hover:bg-gray-50'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-status-pass flex-shrink-0" />
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
            <div className="px-4 pt-4 pb-6 border-t border-[#f0f0f0] flex-shrink-0">
              <button
                onClick={() => setShowRetestNavModal(true)}
                className="w-full px-3 py-2 bg-[#3615CF] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md hover:bg-[#3615CF]/90 transition-all"
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
                <XCircle className="w-5 h-5 text-status-fail" />
                <span className="font-semibold text-[#1a1a2e]">{activeError.scenario} › {activeError.testCase}</span>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">① 에러 코드</div>
                <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-sm rounded border border-red-200 font-medium">
                  {activeError.errorCode}
                </span>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">② 현재 상태 요약</div>
                <div className="text-sm text-[#6b7280]">{activeError.summary}</div>
              </div>
              <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">③ 원인 분석 및 해결 방안</div>
                <div className="space-y-2">
                  {activeError.solutions.map((sol, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded border border-[#f0f0f0]">
                      <span className="w-5 h-5 rounded-full bg-status-fail text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1a1a2e]">{sol.cause}</div>
                        <div className="mt-2 rounded border border-[#e5e7eb] bg-white px-3 py-2">
                          <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1">해결 방안</div>
                          <div className="text-sm text-[#6b7280]">{sol.solution}</div>
                        </div>
                      </div>
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
                  <CheckCircle className="w-5 h-5 text-status-pass" />
                  <span className="font-semibold text-[#1a1a2e]">{activePass.scenario} › {activePass.testCase}</span>
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-green-100 text-status-pass">PASS</span>
                </div>
                <div className="bg-white rounded-lg border border-[#f0f0f0] p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">테스트 결과</div>
                  <div className="text-sm font-medium text-status-pass">모든 검증 항목 통과</div>
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
                  i === 0 ? 'text-status-fail font-semibold' : 'text-[#9ca3af]'
                }`}>{line}</div>
              ))}
              {historyDetailTab === 'PASS' && activePass && activePass.runtimeLog.split('\n').map((line, i) => (
                <div key={i} className="font-mono text-[10px] leading-5 text-status-pass">{line}</div>
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
};
