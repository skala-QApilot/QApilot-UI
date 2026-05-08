import React from 'react';
import { FileList } from '../components/common/FileList';
import { Cell, Pie, PieChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mockExecutionHistory, mockRTMRequirements } from '../data/mockData';

const mockPassHistory = [
  { date: '4/20', pass: 72, fail: 15, total: 87 },
  { date: '4/21', pass: 75, fail: 14, total: 89 },
  { date: '4/22', pass: 78, fail: 11, total: 89 },
  { date: '4/23', pass: 80, fail: 10, total: 90 },
  { date: '4/24', pass: 77, fail: 13, total: 90 },
  { date: '4/25', pass: 83, fail: 7, total: 90 },
  { date: '4/26', pass: 87, fail: 4, total: 91 },
  { date: '4/27', pass: 85, fail: 6, total: 91 },
];

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
                      <Cell fill="#f43b47" />
                      <Cell fill="#E5E7EB" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#1a1a2e]">{overallPct}%</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { color: '#3615CF', label: '충족', value: metReqs },
                    { color: '#f43b47', label: '미충족', value: unmetReqs },
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

            {/* PASS율 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <Label>PASS율</Label>
                <div className="flex items-center gap-5">
                  {[
                    { color: '#3615CF', label: 'PASS', dashed: false },
                    { color: '#9ca3af', label: '전체', dashed: false },
                    { color: '#f43b47', label: 'FAIL', dashed: true },
                  ].map(({ color, label, dashed }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <svg width="18" height="10">
                        <line x1="0" y1="5" x2="18" y2="5"
                          stroke={color} strokeWidth="2"
                          strokeDasharray={dashed ? '3 2' : undefined} />
                      </svg>
                      <span className="text-xs text-[#9ca3af]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={165}>
                <LineChart data={mockPassHistory} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#c4c9d4' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#c4c9d4' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Line type="monotone" dataKey="pass" stroke="#3615CF" strokeWidth={2.5} dot={false} name="PASS" />
                  <Line type="monotone" dataKey="total" stroke="#c4c9d4" strokeWidth={2} dot={false} name="전체" />
                  <Line type="monotone" dataKey="fail" stroke="#f43b47" strokeWidth={2} strokeDasharray="4 2" dot={false} name="FAIL" />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
                {mockExecutionHistory.map(exec => {
                  const total = exec.pass + exec.fail;
                  const pct = total > 0 ? Math.round((exec.pass / total) * 100) : 0;
                  return (
                    <button
                      key={exec.id}
                      onClick={() => setCurrentPage('테스트')}
                      className="w-full flex items-center gap-5 py-3 hover:bg-gray-50 transition-colors text-left rounded px-2 -mx-2"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-[#374151]">{exec.groupId}</span>
                        <span className="text-xs text-[#c4c9d4] ml-2">#{exec.executionNumber}</span>
                      </div>
                      <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.startDate}</span>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="text-xs font-medium text-[#3615CF]">{exec.pass}P</span>
                        <span className="text-xs font-medium text-[#f43b47]">{exec.fail}F</span>
                        <div className="w-[70px] h-1.5 rounded-full bg-[#f0f0f0] overflow-hidden">
                          <div className="h-full bg-[#3615CF] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
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
