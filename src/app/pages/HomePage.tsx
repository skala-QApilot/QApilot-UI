import { AlertTriangle, CheckCircle2, Clock, GitBranch, XCircle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type KPICard = {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  spark?: number[];
  color?: string;
};

// ── Static dashboard data ────────────────────────────────────────────────────

const PROJECT = { name: 'Commerce App', branch: 'main', lastRun: 'Overnight 02:00' };
const RELEASE = { score: 72, blocked: true, critical: 3 };

const ISSUES = [
  { priority: 'P0', issue: '주문 취소 상태 불일치', type: 'Cross-check', fr: 'FR-008', action: 'Trace' },
  { priority: 'P0', issue: '관리자 권한 버튼 노출',  type: 'Auth/UI',     fr: 'FR-006', action: '원인 보기' },
  { priority: 'P1', issue: '요금제 금액 불일치',     type: 'API/Data',   fr: 'FR-008', action: '로그 보기' },
];

const KPI_CARDS: KPICard[] = [
  { label: 'Pass Rate',     value: '91.2%', spark: [84,85,87,88,90,91,90,91.2], color: '#9AB17A' },
  { label: 'New Fail',      value: '4',     spark: [2,2,3,4,5,7,5,4],           color: '#f78ca0' },
  { label: 'Critical',      value: '3',     sub: 'P0 Issues', alert: true },
  { label: 'HITL Pending',  value: '12',    sub: '승인 대기' },
  { label: 'Unverified FR', value: '5',     sub: '미검증 FR' },
];

const MATRIX_COLS = ['Normal', 'Edge', 'Auth', 'API', 'Cross'];
const MATRIX_ROWS = [
  { name: '회원가입',   vals: [true, true,  true,  true,  true],  result: 'Pass'     },
  { name: '주문취소',   vals: [true, false, true,  false, false], result: 'Critical' },
  { name: '요금제변경', vals: [true, true,  true,  true,  false], result: 'Fail'     },
  { name: '관리자권한', vals: [true, true,  false, true,  false], result: 'Critical' },
];

const FAILURES = [
  { type: 'UI 오류',       count: 12 },
  { type: 'API 오류',      count: 9  },
  { type: 'Data mismatch', count: 6  },
  { type: 'Environment',   count: 4  },
  { type: 'Policy rule',   count: 2  },
];

const RTM = {
  verified: 62, risk: 24, unverified: 14,
  items: [
    { fr: 'FR-008', topic: 'Cross-check', status: 'Blocked'  },
    { fr: 'FR-014', topic: 'HITL',        status: 'Review'   },
    { fr: 'FR-018', topic: 'Overnight',   status: 'Verified' },
  ],
};

const EXEC_STEPS = [
  { step: 'Code Scan',    done: true  },
  { step: 'Scenario Gen', done: true  },
  { step: 'Test Run',     done: true  },
  { step: 'Cross-check',  done: false },
  { step: 'Root Cause',   done: true  },
  { step: 'Report',       done: true  },
];

// ── Mini SVG charts ──────────────────────────────────────────────────────────

function DonutScore({ score, blocked }: { score: number; blocked: boolean }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const stroke = blocked ? '#ef4444' : score >= 80 ? '#9AB17A' : '#f59e0b';
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="flex-shrink-0">
      <circle cx="52" cy="52" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle cx="52" cy="52" r={r} fill="none" stroke={stroke} strokeWidth="10"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 52 52)" />
      <text x="52" y="48" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1a1a2e">{score}</text>
      <text x="52" y="64" textAnchor="middle" fontSize="10" fill="#9ca3af">/100</text>
    </svg>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 72, H = 26;
  const mx = Math.max(...data), mn = Math.min(...data), rng = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - mn) / rng) * (H - 4) - 2}`)
    .join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function HomePage({
  setCurrentPage,
  navigateToHistory,
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
}) {
  const maxFail = Math.max(...FAILURES.map(f => f.count));

  return (
    <div className="h-full flex flex-col bg-[#F2F3F5] overflow-hidden">

      {/* ── Project info bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-[#f0f0f0] px-6 py-2.5 flex items-center gap-5">
        <span className="text-sm font-semibold text-[#1a1a2e]">QA Agent Dashboard</span>
        <span className="text-[#d1d5db] select-none">|</span>
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{PROJECT.branch}</span>
        </div>
        <span className="text-xs text-[#9ca3af]">Project: {PROJECT.name}</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Last Run: {PROJECT.lastRun}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── Row 1: Release Readiness + Critical Issues ── */}
        <div className="grid grid-cols-12 gap-3">

          {/* 1. Release Readiness */}
          <div className="col-span-4 bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-5 flex flex-col">
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
              Release Readiness
            </div>
            <div className="flex items-center gap-5 flex-1">
              <DonutScore score={RELEASE.score} blocked={RELEASE.blocked} />
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2.5 ${
                  RELEASE.blocked
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-[#9AB17A]/10 text-[#9AB17A] border border-[#9AB17A]/20'
                }`}>
                  {RELEASE.blocked
                    ? <XCircle className="w-3.5 h-3.5" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {RELEASE.blocked ? 'BLOCKED' : 'PASS'}
                </div>
                <div className="text-sm font-semibold text-[#1a1a2e] mb-2">
                  {RELEASE.blocked ? '배포 불가' : '배포 가능'}
                </div>
                <div className="text-[11px] text-[#9ca3af] space-y-1">
                  <div>Critical: <span className="text-red-500 font-semibold">{RELEASE.critical}건</span></div>
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{PROJECT.lastRun}</div>
                  <div className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{PROJECT.branch}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Critical Issues */}
          <div className="col-span-8 bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                Critical Issues
              </div>
              <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                차단 이슈 {ISSUES.length}건
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f5f5f5]">
                  {['Priority', 'Issue', 'Type', 'FR', 'Action'].map(h => (
                    <th key={h} className="pb-2 text-left text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ISSUES.map((row, i) => (
                  <tr key={i} className="border-b border-[#f9f9fb] hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.priority === 'P0' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>{row.priority}</span>
                    </td>
                    <td className="py-3 text-sm font-medium text-[#1a1a2e]">{row.issue}</td>
                    <td className="py-3 text-xs text-[#6b7280] px-2">{row.type}</td>
                    <td className="py-3 text-xs font-mono font-medium text-[#6b8cdb] px-2">{row.fr}</td>
                    <td className="py-3">
                      <button
                        onClick={() => navigateToHistory('FAIL')}
                        className="px-3 py-1 text-[11px] font-medium bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded-full hover:shadow-sm transition-shadow whitespace-nowrap"
                      >
                        {row.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Row 2: KPI Cards ── */}
        <div className="grid grid-cols-5 gap-3">
          {KPI_CARDS.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                if (i === 0) navigateToHistory('PASS');
                else if (i === 1 || i === 2) navigateToHistory('FAIL');
                else if (i === 3) navigateToHistory('HITL');
                else setCurrentPage('RTM');
              }}
            >
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">
                {card.label}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className={`text-2xl font-bold leading-tight ${
                    card.alert        ? 'text-red-500'    :
                    i === 0           ? 'text-[#9AB17A]'  :
                    i === 1           ? 'text-[#f78ca0]'  :
                    'text-[#1a1a2e]'
                  }`}>{card.value}</div>
                  {card.sub && <div className="text-[10px] text-[#9ca3af] mt-0.5">{card.sub}</div>}
                </div>
                {card.spark && <Sparkline data={card.spark} color={card.color ?? '#9ca3af'} />}
              </div>
            </div>
          ))}
        </div>

        {/* ── Row 3: Scenario Matrix + Failure Breakdown ── */}
        <div className="grid grid-cols-12 gap-3">

          {/* 4. Scenario Result Matrix */}
          <div className="col-span-8 bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-5">
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
              Scenario Result Matrix
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f5f5f5]">
                  <th className="pb-2 text-left text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                    Scenario
                  </th>
                  {MATRIX_COLS.map(c => (
                    <th key={c} className="pb-2 text-center text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide w-14">
                      {c}
                    </th>
                  ))}
                  <th className="pb-2 text-center text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide w-20">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-[#f9f9fb] hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 text-sm font-medium text-[#1a1a2e]">{row.name}</td>
                    {row.vals.map((v, j) => (
                      <td key={j} className="py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold ${
                          v ? 'bg-[#9AB17A]/10 text-[#9AB17A]' : 'bg-red-50 text-red-500'
                        }`}>
                          {v ? '✓' : '✕'}
                        </span>
                      </td>
                    ))}
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.result === 'Pass'     ? 'bg-[#9AB17A]/10 text-[#9AB17A]' :
                        row.result === 'Critical' ? 'bg-red-50 text-red-500'         :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {row.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Failure Breakdown */}
          <div className="col-span-4 bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                Failure Breakdown
              </div>
              <div className="text-[11px] text-[#9ca3af]">
                총 {FAILURES.reduce((s, f) => s + f.count, 0)}건
              </div>
            </div>
            <div className="space-y-3">
              {FAILURES.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[#4b5563]">{f.type}</span>
                    <span className="text-xs font-semibold text-[#6b7280]">{f.count}</span>
                  </div>
                  <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b]"
                      style={{ width: `${(f.count / maxFail) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 4: RTM Coverage + Execution Flow ── */}
        <div className="grid grid-cols-12 gap-3 pb-4">

          {/* 6. RTM Coverage */}
          <div className="col-span-8 bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-5">
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
              RTM Coverage
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden mb-2.5">
              <div style={{ width: `${RTM.verified}%` }}   className="bg-[#9AB17A]" />
              <div style={{ width: `${RTM.risk}%` }}       className="bg-[#f59e0b]" />
              <div style={{ width: `${RTM.unverified}%` }} className="bg-[#e5e7eb]" />
            </div>
            <div className="flex items-center gap-6 mb-4">
              {[
                { label: 'Verified',   pct: RTM.verified,   color: '#9AB17A' },
                { label: 'Risk',       pct: RTM.risk,       color: '#f59e0b' },
                { label: 'Unverified', pct: RTM.unverified, color: '#d1d5db' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-[11px] text-[#6b7280]">{l.label}</span>
                  <span className="text-[11px] font-semibold text-[#1a1a2e]">{l.pct}%</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {RTM.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#f9f9fb]">
                  <span className="text-xs font-mono font-semibold text-[#6b8cdb] w-14">{item.fr}</span>
                  <span className="text-xs text-[#4b5563] flex-1">{item.topic}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    item.status === 'Blocked'  ? 'bg-red-50 text-red-500'           :
                    item.status === 'Review'   ? 'bg-amber-50 text-amber-600'       :
                    'bg-[#9AB17A]/10 text-[#9AB17A]'
                  }`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Execution Flow */}
          <div className="col-span-4 bg-white rounded-xl border border-[#f0f0f0] shadow-sm p-5">
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">
              Execution Flow
            </div>
            <div>
              {EXEC_STEPS.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      s.done ? 'bg-[#9AB17A]/15' : 'bg-red-50'
                    }`}>
                      {s.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#9AB17A]" />
                        : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    {i < EXEC_STEPS.length - 1 && (
                      <div className={`w-px h-5 ${s.done ? 'bg-[#9AB17A]/25' : 'bg-[#e5e7eb]'}`} />
                    )}
                  </div>
                  <span className={`text-sm pt-0.5 ${!s.done ? 'text-red-500 font-semibold' : 'text-[#1a1a2e]'}`}>
                    {s.step}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
