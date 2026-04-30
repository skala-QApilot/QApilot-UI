import { CheckCircle2, Clock, FileText, FolderOpen, GitBranch, Plus, Upload, XCircle } from 'lucide-react';

// ── Static data ───────────────────────────────────────────────────────────────

const PROJECT = { name: 'Commerce App', branch: 'main', lastRun: 'Overnight 02:00' };
const RELEASE = { score: 72, blocked: true, critical: 3, hitl: 12 };

const KPI_CARDS = [
  { label: 'Pass Rate', value: '91.2%', spark: [84,85,87,88,90,91,90,91.2], sparkColor: '#9AB17A', valueColor: '#9AB17A', accent: '#9AB17A' },
  { label: 'New Fail',  value: '4',     spark: [2,2,3,4,5,7,5,4],           sparkColor: '#f78ca0', valueColor: '#f78ca0', accent: '#f78ca0' },
  { label: '시나리오',  value: '48',    sub: '생성 시나리오', valueColor: '#1a1a2e', accent: '#6b8cdb' },
  { label: 'RTM',       value: '62%',   sub: '요구사항 커버', valueColor: '#6b8cdb', accent: '#6b8cdb' },
  { label: '요구사항',  value: '24',    sub: '등록 FR',       valueColor: '#1a1a2e', accent: '#9AB17A' },
  { label: 'HITL',      value: '12',    sub: '승인 대기',     valueColor: '#f59e0b', accent: '#f59e0b' },
];

const FAILURES = [
  { type: 'UI 오류',       count: 12, pct: 36 },
  { type: 'API 오류',      count: 9,  pct: 27 },
  { type: 'Data mismatch', count: 6,  pct: 18 },
  { type: 'Environment',   count: 4,  pct: 12 },
  { type: 'Policy rule',   count: 2,  pct:  6 },
];

const DOC_FILES = [
  { name: 'PRD',              sub: '제품 요구사항 정의서', version: 'v2.3', date: '04/30', reflected: true  },
  { name: '인터페이스 정의서', sub: 'API 연동 스펙',       version: 'v1.8', date: '04/29', reflected: true  },
  { name: 'API 명세서',       sub: 'REST endpoint 정의',  version: 'v3.0', date: '04/28', reflected: false },
  { name: '화면 설계서',      sub: 'UI/UX 와이어프레임',  version: 'v1.5', date: '04/27', reflected: true  },
  { name: '유스케이스',       sub: 'UC 시나리오 정의',    version: 'v2.1', date: '04/25', reflected: false },
];

const TEST_HISTORY = [
  { date: '04/30 02:00', branch: 'main',    total: 124, pass: 113, fail: 11, status: 'FAIL', rtm: { v: 62, r: 24, u: 14 } },
  { date: '04/29 02:00', branch: 'main',    total: 118, pass: 110, fail:  8, status: 'FAIL', rtm: { v: 58, r: 28, u: 14 } },
  { date: '04/28 02:00', branch: 'feature', total:  96, pass:  91, fail:  5, status: 'PASS', rtm: { v: 72, r: 18, u: 10 } },
  { date: '04/27 02:00', branch: 'main',    total: 118, pass: 115, fail:  3, status: 'PASS', rtm: { v: 75, r: 15, u: 10 } },
  { date: '04/26 02:00', branch: 'main',    total: 112, pass: 108, fail:  4, status: 'PASS', rtm: { v: 70, r: 20, u: 10 } },
];

// ── SVG helpers ───────────────────────────────────────────────────────────────

function DonutScore({ score, blocked }: { score: number; blocked: boolean }) {
  const r = 44, circ = 2 * Math.PI * r;
  const stroke = blocked ? '#ef4444' : score >= 80 ? '#9AB17A' : '#f59e0b';
  return (
    <svg width="108" height="108" viewBox="0 0 108 108" className="flex-shrink-0">
      <circle cx="54" cy="54" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle cx="54" cy="54" r={r} fill="none" stroke={stroke} strokeWidth="10"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 54 54)" />
      <text x="54" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1a2e">{score}</text>
      <text x="54" y="65" textAnchor="middle" fontSize="10" fill="#9ca3af">/100</text>
    </svg>
  );
}

function Sparkline({ data, color, w = 64, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  const mx = Math.max(...data), mn = Math.min(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage({
  setCurrentPage,
  navigateToHistory,
}: {
  setCurrentPage: (page: string) => void;
  navigateToHistory: (filter: string) => void;
}) {
  const maxCount = Math.max(...FAILURES.map(f => f.count));

  return (
    <div className="h-full flex flex-col bg-[#F2F3F5] overflow-hidden">

      {/* ── Info bar ── */}
      <div className="flex-shrink-0 bg-white border-b border-[#ebebeb] px-6 py-2.5 flex items-center gap-5">
        <span className="text-sm font-semibold text-[#1a1a2e]">QA Agent Dashboard</span>
        <span className="text-[#e5e7eb] select-none">|</span>
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <GitBranch className="w-3.5 h-3.5" />{PROJECT.branch}
        </div>
        <span className="text-xs text-[#9ca3af]">{PROJECT.name}</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <Clock className="w-3.5 h-3.5" />Last Run: {PROJECT.lastRun}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-6 gap-2.5 flex-shrink-0">
          {KPI_CARDS.map((card, i) => (
            <div key={i}
              className="bg-white rounded-lg border border-[#ebebeb] px-3.5 py-3 cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden"
              onClick={() => {
                if (i === 0) navigateToHistory('PASS');
                else if (i === 1) navigateToHistory('FAIL');
                else if (i === 3) setCurrentPage('RTM');
                else if (i === 5) navigateToHistory('HITL');
              }}
            >
              {/* accent left border */}
              <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r" style={{ backgroundColor: card.accent }} />
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-1.5 pl-1">
                {card.label}
              </div>
              <div className="flex items-end justify-between gap-1 pl-1">
                <div>
                  <div className="text-xl font-bold leading-tight" style={{ color: card.valueColor }}>
                    {card.value}
                  </div>
                  {'sub' in card && card.sub &&
                    <div className="text-[10px] text-[#9ca3af] mt-0.5">{card.sub}</div>}
                </div>
                {'spark' in card && card.spark &&
                  <Sparkline data={card.spark} color={card.sparkColor ?? '#9ca3af'} />}
              </div>
            </div>
          ))}
        </div>

        {/* ── 2-column main ── */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">

          {/* ── Col 1: Release Readiness (top) + Failure Breakdown (bottom) ── */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* Release Readiness */}
            <div className="bg-white rounded-lg border border-[#ebebeb] flex-shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f0f0f0]">
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                  Release Readiness
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <DonutScore score={RELEASE.score} blocked={RELEASE.blocked} />
                  <div className="min-w-0">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2 ${
                      RELEASE.blocked
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-[#9AB17A]/10 text-[#9AB17A] border border-[#9AB17A]/20'
                    }`}>
                      {RELEASE.blocked ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {RELEASE.blocked ? 'BLOCKED' : 'PASS'}
                    </div>
                    <div className="text-sm font-semibold text-[#1a1a2e]">
                      {RELEASE.blocked ? '배포 불가' : '배포 가능'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Critical', value: `${RELEASE.critical}건`, color: 'text-red-500' },
                    { label: 'HITL',     value: `${RELEASE.hitl}건`,     color: 'text-amber-500' },
                    { label: 'Last Run', value: PROJECT.lastRun,          color: 'text-[#6b7280]' },
                    { label: 'Branch',   value: PROJECT.branch,           color: 'text-[#6b8cdb]' },
                  ].map(item => (
                    <div key={item.label} className="px-2.5 py-2 bg-[#f9f9fb] rounded-lg">
                      <div className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-wide mb-0.5">
                        {item.label}
                      </div>
                      <div className={`text-xs font-semibold truncate ${item.color}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Failure Breakdown */}
            <div className="bg-white rounded-lg border border-[#ebebeb] flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                  Failure Breakdown
                </span>
                <span className="text-[11px] text-[#9ca3af]">
                  총 {FAILURES.reduce((s, f) => s + f.count, 0)}건
                </span>
              </div>
              <div className="p-4 space-y-3">
                {FAILURES.map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#4b5563]">{f.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#9ca3af]">{f.pct}%</span>
                        <span className="text-xs font-semibold text-[#6b7280] w-4 text-right">{f.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] transition-all"
                        style={{ width: `${(f.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Col 2: FILES + Test History ── */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* FILES */}
            <div className="flex-[5] bg-white rounded-lg border border-[#ebebeb] flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-[#9ca3af]" />
                  <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">Files</span>
                </div>
                <button className="px-2.5 py-1 bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] text-white rounded text-[10px] flex items-center gap-1 hover:opacity-90 transition-opacity">
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#f9f9fb]">
                {DOC_FILES.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-[#9ca3af] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1a1a2e] truncate">{f.name}</div>
                      <div className="text-[10px] text-[#9ca3af] truncate">{f.version} · {f.date}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                      f.reflected
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-500'
                    }`}>{f.reflected ? '반영됨' : '미반영'}</span>
                    <button className="p-1 rounded hover:bg-gray-100 text-[#9ca3af] hover:text-[#6b7280] flex-shrink-0 transition-colors" title="업데이트">
                      <Upload className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 테스트 이력 */}
            <div className="flex-[4] bg-white rounded-lg border border-[#ebebeb] flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wide">
                  테스트 이력
                </span>
                <button onClick={() => navigateToHistory('')} className="text-[10px] text-[#6b8cdb] hover:underline">
                  전체 보기
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#f5f5f5]">
                {TEST_HISTORY.map((t, i) => (
                  <div key={i}
                    className="px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigateToHistory(t.status)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          t.status === 'PASS' ? 'bg-[#9AB17A]' : 'bg-red-400'
                        }`} />
                        <span className="text-xs font-medium text-[#1a1a2e]">{t.date}</span>
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5 text-[#c4c9d4]" />
                          <span className="text-[10px] text-[#c4c9d4]">{t.branch}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#9AB17A] font-semibold">{t.pass}P</span>
                        <span className="text-[10px] text-[#e5e7eb]">/</span>
                        <span className="text-[10px] text-red-400 font-semibold">{t.fail}F</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 ${
                          t.status === 'PASS' ? 'bg-[#9AB17A]/10 text-[#9AB17A]' : 'bg-red-50 text-red-500'
                        }`}>{t.status}</span>
                      </div>
                    </div>
                    {/* Pass/Fail + RTM stacked bars */}
                    <div className="space-y-1">
                      <div className="flex h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#9AB17A]" style={{ width: `${(t.pass / t.total) * 100}%` }} />
                        <div className="bg-red-400"   style={{ width: `${(t.fail / t.total) * 100}%` }} />
                        <div className="bg-[#f3f4f6] flex-1" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[#c4c9d4] w-6 flex-shrink-0">RTM</span>
                        <div className="flex flex-1 h-1 rounded-full overflow-hidden">
                          <div className="bg-[#9AB17A]" style={{ width: `${t.rtm.v}%` }} />
                          <div className="bg-[#f59e0b]" style={{ width: `${t.rtm.r}%` }} />
                          <div className="bg-[#e5e7eb]" style={{ width: `${t.rtm.u}%` }} />
                        </div>
                        <span className="text-[9px] text-[#9AB17A] font-semibold flex-shrink-0">{t.rtm.v}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
