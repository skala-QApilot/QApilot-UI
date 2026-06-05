import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ChevronRight, Clock, XCircle } from 'lucide-react';
import { RTMDonutChart } from '../components/common/RTMDonutChart';
import { useRtmStore } from '../../store/rtmStore';
import { useScenarioStore } from '../../store/scenarioStore';
import type { RtmRequirement } from '../../api/rtm';

/** Zustand 무한 루프 회피 — `?? []` 인라인 fallback 은 매 렌더 새 배열 유발. */
const EMPTY_REQUIREMENTS: RtmRequirement[] = [];

function formatKstDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export const RTMPage = () => {
  // 선택된 RTM 버전의 requirements 에서 derive — store-backed.
  const selectedRtmVersion = useRtmStore((s) => s.getSelectedVersion());
  const rtmRequirements = selectedRtmVersion?.requirements ?? EMPTY_REQUIREMENTS;
  const serviceId = selectedRtmVersion?.serviceId ?? null;

  // TC 이름 조회용 — scenarioStore 에서 testCasesByTs 로 flat map 구성.
  const testCasesByTs = useScenarioStore((s) => s.testCasesByTs);
  const scenarioLoadState = useScenarioStore((s) => s.loadState);
  useEffect(() => {
    if (serviceId && scenarioLoadState === 'idle') {
      useScenarioStore.getState().loadScenarios(serviceId);
    }
  }, [serviceId, scenarioLoadState]);
  const tcNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const tcs of Object.values(testCasesByTs)) {
      for (const tc of tcs) {
        if (tc.tc_id) m[tc.tc_id] = tc.name;
      }
    }
    return m;
  }, [testCasesByTs]);

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
                  {['TS', 'TC', '테스트 케이스명', '최근 테스트 일자', 'PASS / FAIL'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f0f0f0]">
                {selectedFr.history.map((raw, i) => {
                  const row = raw as { ts?: string; tc?: string; date?: string; pass?: boolean };
                  const tcName = row.tc ? (tcNameMap[row.tc] ?? '') : '';
                  const dateStr = row.date ? formatKstDate(row.date) : '—';
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.ts ?? ''}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1a1a2e]">{row.tc ?? ''}</span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <span className="text-xs text-[#374151] leading-snug">{tcName || <span className="text-[#9ca3af]">—</span>}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-[#6b7280] font-mono">{dateStr}</span>
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
