import { useState } from 'react';
import { CheckCircle, ChevronRight, Clock, XCircle } from 'lucide-react';
import { RTMDonutChart } from '../components/common/RTMDonutChart';
import { useRtmStore } from '../../store/rtmStore';
import type { RtmRequirement } from '../../api/rtm';

/** Zustand 무한 루프 회피 — `?? []` 인라인 fallback 은 매 렌더 새 배열 유발. */
const EMPTY_REQUIREMENTS: RtmRequirement[] = [];

export const RTMPage = () => {
  // 선택된 RTM 버전의 requirements 에서 derive — store-backed.
  const selectedRtmVersion = useRtmStore((s) => s.getSelectedVersion());
  const rtmRequirements = selectedRtmVersion?.requirements ?? EMPTY_REQUIREMENTS;

  const [selectedFrId, setSelectedFrId] = useState<string>(rtmRequirements[0]?.frId ?? '');

  const selectedFr = rtmRequirements.find(r => r.frId === selectedFrId) ?? rtmRequirements[0];
  const totalReqs = rtmRequirements.length;
  const metReqs = rtmRequirements.filter(r => r.status === '충족').length;
  const unmetReqs = rtmRequirements.filter(r => r.status === '미충족').length;
  // 미측정 = status 기준. totalCount===0(연결 TC 없음)은 '미측정'의 부분집합일 뿐 —
  // 연결된 TC 가 있으나 미실행/부분측정인 요구사항도 백엔드가 '미측정'으로 분류한다.
  const unrunReqs = rtmRequirements.filter(r => r.status === '미측정').length;

  const overallPassTotal = rtmRequirements.reduce((s, r) => s + r.passCount, 0);
  const overallTotal = rtmRequirements.reduce((s, r) => s + r.totalCount, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallPassTotal / overallTotal) * 100) : 0;
  const mockTesters: Record<string, string> = {
    'TS1_TC1': '김지수', 'TS1_TC2': '이민준', 'TS1_TC3': '박서연',
    'TS2_TC1': '최현우', 'TS3_TC3': '정유진',
  };

  // 빈 상태 — RTM 버전 없음 또는 requirements 비어있음 (로드 전 / 신규 서비스).
  if (!selectedFr) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#EDEEF0]">
        <div className="text-center text-[#9ca3af]">
          <div className="text-sm font-medium mb-1">RTM 데이터가 없습니다</div>
          <div className="text-xs">시나리오 생성 후 RTM 버전이 만들어지면 표시됩니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">

      {/* ── Left Panel — FR list ── */}
      <div className="w-72 bg-white border-r border-[#f0f0f0] flex flex-col flex-shrink-0">

        {/* Overall donut + summary */}
        <div className="px-5 py-5 border-b border-[#f0f0f0] flex-shrink-0">
          <RTMDonutChart
            metReqs={metReqs}
            unmetReqs={unmetReqs}
            unrunReqs={unrunReqs}
            totalReqs={totalReqs}
            overallPct={overallPct}
            size="sm"
          />
        </div>

        {/* FR list */}
        <div className="flex-1 overflow-y-auto">
          {rtmRequirements.map(req => {
            const isActive = selectedFrId === req.frId;
            const pct = req.totalCount > 0 ? Math.round((req.passCount / req.totalCount) * 100) : 0;
            const isUnmeasured = req.status === '미측정';
            const fillColor = isActive
              ? (isUnmeasured ? '#d1d5db' : req.status === '충족' ? '#3615CF' : '#C5C0EC')
              : (isUnmeasured ? '#d1d5db' : '#6b7280');
            const trackColor = isActive ? '#E5E7EB' : '#f3f4f6';
            const statusLabel = req.status;
            const statusClass = isUnmeasured
              ? 'bg-[#f3f4f6] text-[#9ca3af]'
              : req.status === '충족' ? 'bg-[#EAE8F9] text-[#3615CF]' : 'bg-[#EAE8F9]/60 text-[#6b7280]';

            return (
              <button
                key={req.frId}
                onClick={() => setSelectedFrId(req.frId)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#f0f0f0] ${
                  isActive
                    ? 'bg-[#EAE8F9]/50 border-l-[3px] border-l-[#3615CF]'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Mini donut */}
                <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
                  <svg width={40} height={40}>
                    <circle cx={20} cy={20} r={16} fill="none" stroke={trackColor} strokeWidth={4} />
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
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#3615CF]' : 'text-[#9ca3af]'}`}>
                      {req.frId}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-xs text-[#1a1a2e] truncate leading-snug">{req.content}</div>
                </div>

                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? 'text-[#3615CF]' : 'text-[#d1d5db]'}`} />
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
            selectedFr.status === '미측정' ? 'bg-[#f3f4f6] text-[#9ca3af]' :
            selectedFr.status === '충족' ? 'bg-[#EAE8F9] text-[#3615CF]' : 'bg-[#EAE8F9]/60 text-[#6b7280]'
          }`}>{selectedFr.status}</span>
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
                {selectedFr.history.map((raw, i) => {
                  // RtmRequirementHistoryEntry 가 [key: string]: unknown — JSX 렌더링용 string 캐스팅.
                  const row = raw as { ts?: string; tc?: string; latestTest?: string; date?: string; pass?: boolean };
                  const tester = mockTesters[`${row.ts}_${row.tc}`] ?? '—';
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.ts ?? ''}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.tc ?? ''}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-[#6b7280]">{row.latestTest ?? ''}</div>
                        <div className="text-[10px] text-[#9ca3af] mt-0.5">{row.date ?? ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#EAE8F9] flex items-center justify-center text-[10px] font-semibold text-[#3615CF] flex-shrink-0">
                            {tester !== '—' ? tester[0] : '?'}
                          </div>
                          <span className="text-xs text-[#6b7280]">{tester}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          row.pass
                            ? 'bg-green-100 text-status-pass'
                            : 'bg-red-100 text-status-fail'
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
