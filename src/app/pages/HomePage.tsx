import React from 'react';
import { FileList } from '../components/common/FileList';
import { ExecutionHistoryRow } from '../components/common/ExecutionHistoryRow';
import { PassRateChart } from '../components/common/PassRateChart';
import { Cell, Pie, PieChart } from 'recharts';
import { mockExecutionHistory, mockPassHistory, mockRTMRequirements } from '../data/mockData';

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{children}</span>
);

export function HomePage({
  setCurrentPage,
  navigateToHistory,
  activeTab = 'overview',
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
  activeTab?: string;
}) {
  void navigateToHistory;

  const totalReqs = mockRTMRequirements.length;
  const metReqs = mockRTMRequirements.filter(r => r.status === '충족').length;
  const unmetReqs = mockRTMRequirements.filter(r => r.status === '미충족').length;
  const unrunReqs = mockRTMRequirements.filter(r => r.totalCount === 0).length;
  const overallPassTotal = mockRTMRequirements.reduce((s, r) => s + r.passCount, 0);
  const overallTotal = mockRTMRequirements.reduce((s, r) => s + r.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;

  const pieData = [
    { name: '충족', value: metReqs },
    { name: '미충족', value: unmetReqs },
    { name: '미측정', value: unrunReqs },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* 상단 — RTM + PASS율 */}
          <div className="flex items-start gap-12 px-10 py-9 border-b border-[#f0f0f0]">

            {/* RTM */}
            <div className="flex-shrink-0">
              <Label>RTM</Label>
              <div className="flex items-center gap-6 mt-4">
                <div className="relative" style={{ width: 175, height: 175 }}>
                  <PieChart width={175} height={175}>
                    <Pie
                      data={pieData} cx={80} cy={80}
                      innerRadius={48} outerRadius={78}
                      dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}
                    >
                      <Cell fill="#3615CF" />
                      <Cell fill="var(--tertiary-blue)" />
                      <Cell fill="#E5E7EB" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#1a1a2e]">{overallPct}%</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { color: '#3615CF',  label: '충족',   value: metReqs },
                    { color: '#C5C0EC', label: '미충족', value: unmetReqs },
                    { color: '#E5E7EB', label: '미측정', value: unrunReqs },
                  ].map(({ color, label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-sm text-[#9ca3af] w-12">{label}</span>
                      <span className="text-base font-semibold text-[#374151]">{value}건</span>
                    </div>
                  ))}
                  <div className="text-xs text-[#d1d5db] pt-1">전체 {totalReqs}건</div>
                </div>
              </div>
            </div>

            <PassRateChart data={mockPassHistory} />
          </div>

          {/* 하단 — FILES + 이력 2분할 */}
          <div className="flex divide-x divide-[#f0f0f0]">

            {/* FILES */}
            <div className="flex-1 min-w-0 px-10 py-9">
              <FileList />
            </div>

            {/* 이력 */}
            <div className="flex-1 min-w-0 px-10 py-9">
              <Label>이력</Label>
              <div className="mt-4 space-y-0.5">
                {mockExecutionHistory.map(exec => (
                  <ExecutionHistoryRow
                    key={exec.id}
                    exec={exec}
                    onClick={() => setCurrentPage('테스트')}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="flex-1 flex items-center justify-center text-[#9ca3af] text-sm">
          준비 중입니다
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 flex items-center justify-center text-[#9ca3af] text-sm">
          준비 중입니다
        </div>
      )}
    </div>
  );
}
