import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Search, XCircle } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mockExecutionHistory } from '../data/mockData';
import { ExecutionHistoryPageDetail } from './ExecutionHistoryPageDetail';

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
  // 상세 페이지로 이동했을 때
  if (selectedExecutionId) {
    return (
      <ExecutionHistoryPageDetail
        selectedExecutionId={selectedExecutionId}
        setSelectedExecutionId={setSelectedExecutionId}
        selectedFailTC={selectedFailTC}
        setSelectedFailTC={setSelectedFailTC}
        historyDetailTab={historyDetailTab}
        setHistoryDetailTab={setHistoryDetailTab}
        retestCheckedIds={retestCheckedIds}
        setRetestCheckedIds={setRetestCheckedIds}
        setShowRetestNavModal={setShowRetestNavModal}
      />
    );
  }

  // 목록 화면

  const filtered = mockExecutionHistory.filter(exec => {
    if (historyFilter === 'ALL') return true;
    if (historyFilter === 'FAIL') return exec.fail > 0;
    if (historyFilter === 'HITL') return exec.hitlPending > 0;
    if (historyFilter === 'PASS') return exec.pass > 0;
    if (historyFilter === '미실행') return exec.notRun > 0;
    return true;
  });

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
