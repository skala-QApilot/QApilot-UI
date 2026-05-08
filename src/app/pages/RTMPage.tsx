import { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, Clock, Download, XCircle } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { mockRTMRequirements, mockRTMVersions } from '../data/mockData';

export const RTMPage = () => {
  const [selectedFrId, setSelectedFrId] = useState(mockRTMRequirements[0].frId);
  const [selectedRtmVersion, setSelectedRtmVersion] = useState(mockRTMVersions[0].id);
  const [rtmVersionOpen, setRtmVersionOpen] = useState(false);

  const currentRtmVersion = mockRTMVersions.find(v => v.id === selectedRtmVersion) ?? mockRTMVersions[0];

  const selectedFr = mockRTMRequirements.find(r => r.frId === selectedFrId) ?? mockRTMRequirements[0];
  const totalReqs = mockRTMRequirements.length;
  const metReqs = mockRTMRequirements.filter(r => r.status === '충족').length;
  const unmetReqs = mockRTMRequirements.filter(r => r.status === '미충족').length;
  const unrunReqs = mockRTMRequirements.filter(r => r.totalCount === 0).length;

  const overallPassTotal = mockRTMRequirements.reduce((s, r) => s + r.passCount, 0);
  const overallTotal = mockRTMRequirements.reduce((s, r) => s + r.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;
  const overallPieData = overallTotal > 0
    ? [{ value: overallPassTotal }, { value: overallTotal - overallPassTotal }]
    : [{ value: 0 }, { value: 1 }];

  const mockTesters: Record<string, string> = {
    'TS1_TC1': '김지수', 'TS1_TC2': '이민준', 'TS1_TC3': '박서연',
    'TS2_TC1': '최현우', 'TS3_TC3': '정유진',
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">

      {/* ── Left Panel — FR list ── */}
      <div className="w-72 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">

        {/* Header — RTM 버전 선택 + CSV */}
        <div className="px-5 py-2.5 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setRtmVersionOpen(!rtmVersionOpen)}
              className="flex items-center gap-1.5 group"
            >
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 group-hover:bg-gray-200 transition-colors">
                <span className="text-[10px] font-medium text-[#6b7280]">{currentRtmVersion.id}</span>
                <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
              </div>
            </button>
            {rtmVersionOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-[#f0f0f0] z-50">
                <div className="p-2">
                  <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide px-2 py-1.5">RTM 버전 선택</div>
                  {mockRTMVersions.map(ver => (
                    <button
                      key={ver.id}
                      onClick={() => { setSelectedRtmVersion(ver.id); setRtmVersionOpen(false); }}
                      className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left hover:bg-gray-50 transition-colors ${
                        selectedRtmVersion === ver.id ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/5' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${selectedRtmVersion === ver.id ? 'bg-[#f78ca0]' : 'bg-gray-300'}`} />
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${selectedRtmVersion === ver.id ? 'text-[#f78ca0]' : 'text-[#1a1a2e]'}`}>
                          {ver.label}
                        </div>
                        <div className="text-[10px] text-[#9ca3af] mt-0.5">{ver.date} · {ver.basedOn}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="px-3 py-1.5 bg-white border border-[#f0f0f0] rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>

        {/* Overall donut + summary */}
        <div className="px-5 py-5 border-b border-[#f0f0f0] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
              <PieChart width={120} height={120}>
                <Pie data={overallPieData} cx={55} cy={55} innerRadius={36} outerRadius={54}
                  dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  <Cell fill="#9AB17A" />
                  <Cell fill="#E5E7EB" />
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-[#1a1a2e]">{overallPct}%</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#9ca3af] w-8">전체</span>
                <span className="font-semibold text-[#1a1a2e]">{totalReqs}건</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#9AB17A] flex-shrink-0" />
                <span className="text-[#9ca3af] w-8">충족</span>
                <span className="font-semibold text-[#9AB17A]">{metReqs}건</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF9A86] flex-shrink-0" />
                <span className="text-[#9ca3af] w-8">미충족</span>
                <span className="font-semibold text-[#FF9A86]">{unmetReqs}건</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#BFC6C4] flex-shrink-0" />
                <span className="text-[#9ca3af] w-8">미실행</span>
                <span className="font-semibold text-[#9ca3af]">{unrunReqs}건</span>
              </div>
            </div>
          </div>
        </div>

        {/* FR list */}
        <div className="flex-1 overflow-y-auto">
          {mockRTMRequirements.map(req => {
            const isActive = selectedFrId === req.frId;
            const pct = req.totalCount > 0 ? Math.round((req.passCount / req.totalCount) * 100) : 0;
            const fillColor = req.totalCount === 0 ? '#BFC6C4' : req.status === '충족' ? '#9AB17A' : '#FF9A86';
            const statusLabel = req.totalCount === 0 ? '미실행' : req.status;
            const statusClass = req.totalCount === 0
              ? 'bg-gray-100 text-[#9ca3af]'
              : req.status === '충족' ? 'bg-green-100 text-[#9AB17A]' : 'bg-red-100 text-[#FF9A86]';

            return (
              <button
                key={req.frId}
                onClick={() => setSelectedFrId(req.frId)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#f0f0f0] ${
                  isActive
                    ? 'bg-gradient-to-r from-[#f78ca0]/10 to-[#fe9a8b]/8 border-l-[3px] border-l-[#f78ca0]'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Mini donut */}
                <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
                  <svg width={40} height={40}>
                    <circle cx={20} cy={20} r={16} fill="none" stroke="#E5E7EB" strokeWidth={4} />
                    <circle
                      cx={20} cy={20} r={16}
                      fill="none"
                      stroke={fillColor}
                      strokeWidth={4}
                      strokeDasharray={`${2 * Math.PI * 16 * pct / 100} ${2 * Math.PI * 16}`}
                      strokeLinecap="round"
                      transform="rotate(-90 20 20)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-bold leading-none" style={{ color: fillColor }}>
                      {req.totalCount > 0 ? `${pct}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#f78ca0]' : 'text-[#9ca3af]'}`}>
                      {req.frId}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-xs text-[#1a1a2e] truncate leading-snug">{req.content}</div>
                </div>

                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? 'text-[#f78ca0]' : 'text-[#d1d5db]'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right — TC execution history table ── */}
      <div className="flex-1 flex flex-col bg-[#EDEEF0] overflow-hidden">

        {/* Selected FR header */}
        <div className="bg-white border-b border-[#f0f0f0] px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-sm font-bold text-[#1a1a2e]">{selectedFr.frId}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            selectedFr.totalCount === 0 ? 'bg-gray-100 text-[#9ca3af]' :
            selectedFr.status === '충족' ? 'bg-green-100 text-[#9AB17A]' : 'bg-red-100 text-[#FF9A86]'
          }`}>{selectedFr.totalCount === 0 ? '미실행' : selectedFr.status}</span>
          <span className="text-sm text-[#6b7280] flex-1 min-w-0 truncate">{selectedFr.content}</span>
          <span className="text-xs text-[#9ca3af] flex-shrink-0 font-mono">
            {selectedFr.passCount}/{selectedFr.totalCount} PASS
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {selectedFr.history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#9ca3af]">
              <Clock className="w-8 h-8 mb-2 opacity-25" />
              <div className="text-sm">실행 이력이 없습니다</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[#E4E5E8] border-b border-[#D5D6DA] z-10">
                <tr>
                  {['TS', 'TC', '최신실행 이력 ID', '최근테스트자', 'PASS / FAIL'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f0f0f0]">
                {selectedFr.history.map((row, i) => {
                  const tester = mockTesters[`${row.ts}_${row.tc}`] ?? '—';
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.ts}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.tc}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-[#6b7280]">{row.latestTest}</div>
                        <div className="text-[10px] text-[#9ca3af] mt-0.5">{row.date}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#f78ca0]/20 to-[#fe9a8b]/20 flex items-center justify-center text-[10px] font-semibold text-[#f78ca0] flex-shrink-0">
                            {tester !== '—' ? tester[0] : '?'}
                          </div>
                          <span className="text-xs text-[#6b7280]">{tester}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          row.pass ? 'bg-green-100 text-[#9AB17A]' : 'bg-red-100 text-[#FF9A86]'
                        }`}>
                          {row.pass
                            ? <CheckCircle className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />
                          }
                          {row.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
