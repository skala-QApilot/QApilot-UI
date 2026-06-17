import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import type { Scenario, TestCase } from '../../api/scenarios';

// ── Prometheus (OTel) ─────────────────────────────────────────────────────────

const PROMETHEUS_URL =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_PROMETHEUS_URL ||
  'http://localhost:19090';

interface PromResult {
  metric: Record<string, string>;
  value: [number, string];
}

interface OtelEdge {
  from: string;
  to: string;
  rps: number;
  latencyMs: number;
  errorRate: number;
  isVirtual?: boolean;
}

const DB_NAMES = new Set(['minibss', 'postgres', 'postgresql', 'mysql', 'redis', 'mongo']);
function normalizeOtelName(name: string): string {
  return DB_NAMES.has(name.toLowerCase()) ? 'db' : name;
}

async function fetchOtelGraph(): Promise<OtelEdge[]> {
  const pq = (expr: string) =>
    fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(expr)}`, {
      signal: AbortSignal.timeout(4000),
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((j: { data: { result: PromResult[] } }) => j.data.result);

  const [raw, latSumRaw, latCntRaw, errRaw, rpsRate] = await Promise.allSettled([
    pq('traces_service_graph_request_total'),
    pq('traces_service_graph_request_server_seconds_sum'),
    pq('traces_service_graph_request_server_seconds_count'),
    pq('traces_service_graph_request_failed_total'),
    pq('rate(traces_service_graph_request_total[5m])'),
  ]);

  const rawEdges = raw.status === 'fulfilled' ? raw.value : [];
  if (rawEdges.length === 0) return [];

  const latSum  = latSumRaw.status  === 'fulfilled' ? latSumRaw.value  : [];
  const latCnt  = latCntRaw.status  === 'fulfilled' ? latCntRaw.value  : [];
  const errList = errRaw.status     === 'fulfilled' ? errRaw.value     : [];
  const rateList= rpsRate.status    === 'fulfilled' ? rpsRate.value    : [];

  const key = (m: Record<string, string>) =>
    `${normalizeOtelName(m.client)}→${normalizeOtelName(m.server)}`;

  const latSumMap = new Map<string, number>();
  for (const r of latSum) latSumMap.set(key(r.metric), parseFloat(r.value[1]) || 0);
  const latCntMap = new Map<string, number>();
  for (const r of latCnt) latCntMap.set(key(r.metric), parseFloat(r.value[1]) || 0);
  const errMap = new Map<string, number>();
  for (const r of errList) errMap.set(key(r.metric), parseFloat(r.value[1]) || 0);
  const rateMap = new Map<string, number>();
  for (const r of rateList) rateMap.set(key(r.metric), parseFloat(r.value[1]) || 0);
  const totalMap = new Map<string, number>();
  for (const r of rawEdges) totalMap.set(key(r.metric), parseFloat(r.value[1]) || 0);

  const seen = new Map<string, OtelEdge>();
  for (const r of rawEdges) {
    const from = normalizeOtelName(r.metric.client);
    const to   = normalizeOtelName(r.metric.server);
    if (from === to) continue;
    const k = `${from}→${to}`;
    if (seen.has(k)) continue;
    const total = totalMap.get(k) ?? 0;
    const lSum  = latSumMap.get(k) ?? 0;
    const lCnt  = latCntMap.get(k) ?? 0;
    seen.set(k, {
      from, to,
      rps:       rateMap.get(k) ?? 0,
      latencyMs: lCnt > 0 ? (lSum / lCnt) * 1000 : 0,
      errorRate: total > 0 ? Math.min(1, (errMap.get(k) ?? 0) / total) : 0,
      isVirtual: r.metric.connection_type === 'virtual_node',
    });
  }
  return [...seen.values()];
}

// ── Scenario-derived service extraction ───────────────────────────────────────

const CONTAINER_DIRS = new Set([
  'src', 'lib', 'libs', 'packages', 'pkg', 'apps',
  'services', 'microservices', 'modules', 'internal', 'cmd',
]);

const DEPTH_KEYWORDS: Array<{ depth: number; keywords: string[] }> = [
  { depth: 0, keywords: ['frontend', 'web', 'ui', 'client', 'app'] },
  { depth: 1, keywords: ['backend', 'api', 'server', 'gateway', 'bff'] },
  { depth: 2, keywords: ['service', 'svc', 'worker', 'job', 'processor'] },
  { depth: 3, keywords: ['db', 'database', 'data', 'postgres', 'mysql', 'redis', 'mongo', 'cache', 'storage'] },
];

function serviceDepth(name: string): number {
  const n = name.toLowerCase();
  for (const { depth, keywords } of DEPTH_KEYWORDS) {
    if (keywords.some(k => n.includes(k))) return depth;
  }
  return 1;
}

function fileToService(filePath: string): string | null {
  const parts = filePath.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
  if (parts.length === 0) return null;
  const isDoc = /\.(md|pdf|txt|docx|xlsx|csv)$/i.test(parts[parts.length - 1]);
  if (parts.length === 1 && isDoc) return null;
  for (let i = 0; i < Math.min(parts.length - 1, 3); i++) {
    const part = parts[i];
    if (part.startsWith('.')) continue;
    if (/\.(py|js|ts|go|java|rs|rb)$/.test(part)) continue;
    if (CONTAINER_DIRS.has(part.toLowerCase())) {
      if (i + 1 < parts.length - 1 && !CONTAINER_DIRS.has(parts[i + 1].toLowerCase())) {
        return parts[i + 1];
      }
      continue;
    }
    return part;
  }
  return null;
}

function apiToService(tc: { api?: string | null; when?: string }): string | null {
  const src = tc.api || tc.when || '';
  const m = src.match(/\/(?:api|v\d+)\/([\w-]+)/);
  return m ? m[1] : null;
}

// ── Graph types ───────────────────────────────────────────────────────────────

interface GNode {
  id: string;
  label: string;
  passRate: number | null;
  rps?: number;
  latencyMs?: number;
  errorRate?: number;
}

interface GEdge {
  from: string;
  to: string;
  rps?: number;
  latencyMs?: number;
  errorRate?: number;
  isVirtual?: boolean;
}

// ── Build OTel graph ──────────────────────────────────────────────────────────

function buildOtelGraph(edges: OtelEdge[]): { nodes: GNode[]; edges: GEdge[] } {
  const nodeIds = new Set<string>();
  for (const e of edges) { nodeIds.add(e.from); nodeIds.add(e.to); }

  // Aggregate incoming edge metrics per node
  const incoming = new Map<string, OtelEdge[]>();
  for (const e of edges) {
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to)!.push(e);
  }

  const nodes: GNode[] = [...nodeIds].map(id => {
    const inc = incoming.get(id) ?? [];
    const rps = inc.reduce((s, e) => s + e.rps, 0);
    const latencyMs = inc.length ? inc.reduce((s, e) => s + e.latencyMs, 0) / inc.length : 0;
    const errorRate = inc.length ? inc.reduce((s, e) => s + e.errorRate, 0) / inc.length : 0;
    return { id, label: id, passRate: null, rps, latencyMs, errorRate };
  });

  return { nodes, edges };
}

// ── Build scenario graph ──────────────────────────────────────────────────────

function buildScenarioGraph(
  scenarios: Scenario[],
  testCasesByTs: Record<string, TestCase[]>,
): { nodes: GNode[]; edges: GEdge[] } {
  const statMap: Record<string, { passed: number; total: number }> = {};
  const scenServiceSets: Set<string>[] = [];

  for (const ts of scenarios) {
    const files: string[] = ts.affected_files ?? [];
    const tcs: TestCase[] = testCasesByTs[ts.ts_id] ?? (ts.test_cases as TestCase[]) ?? [];
    const svcs = new Set<string>();

    for (const f of files) {
      const s = fileToService(f);
      if (s) svcs.add(s);
    }
    if (svcs.size === 0) {
      for (const tc of tcs) {
        const s = apiToService(tc);
        if (s) svcs.add(s);
      }
    }

    for (const id of svcs) {
      if (!statMap[id]) statMap[id] = { passed: 0, total: 0 };
    }
    if (svcs.size > 0) scenServiceSets.push(svcs);

    for (const tc of tcs) {
      const svc = apiToService(tc) ?? [...svcs][0];
      if (!svc || !statMap[svc]) continue;
      if (tc.last_run_status === 'passed') { statMap[svc].passed++; statMap[svc].total++; }
      else if (tc.last_run_status === 'failed') { statMap[svc].total++; }
    }
  }

  if (Object.keys(statMap).length === 0) return { nodes: [], edges: [] };

  const nodes: GNode[] = Object.entries(statMap).map(([id, { passed, total }]) => ({
    id, label: id,
    passRate: total > 0 ? passed / total : null,
  }));

  const edgeSet = new Set<string>();
  const edges: GEdge[] = [];
  for (const svcs of scenServiceSets) {
    const sorted = [...svcs].sort((a, b) => serviceDepth(a) - serviceDepth(b));
    for (let i = 0; i < sorted.length - 1; i++) {
      const k = `${sorted[i]}→${sorted[i + 1]}`;
      if (!edgeSet.has(k)) { edgeSet.add(k); edges.push({ from: sorted[i], to: sorted[i + 1] }); }
    }
  }
  return { nodes, edges };
}

// ── Layout ────────────────────────────────────────────────────────────────────

const VB_W = 700;
const VB_H = 270;
const NODE_R = 50;

interface Pt { x: number; y: number; }

const STATIC_POS: Record<string, Pt> = {
  user:               { x: VB_W * 0.08, y: VB_H / 2 },
  frontend:           { x: VB_W * 0.20, y: VB_H / 2 },
  backend:            { x: VB_W * 0.44, y: VB_H / 2 },
  'contracts-service':{ x: VB_W * 0.68, y: VB_H * 0.30 },
  contracts:          { x: VB_W * 0.68, y: VB_H * 0.30 },
  db:                 { x: VB_W * 0.68, y: VB_H * 0.70 },
};

function computeLayout(nodes: GNode[]): Record<string, Pt> {
  const byDepth: Record<number, GNode[]> = {};
  for (const n of nodes) {
    if (STATIC_POS[n.id]) continue;
    const d = serviceDepth(n.id);
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(n);
  }

  const positions: Record<string, Pt> = {};
  for (const n of nodes) {
    if (STATIC_POS[n.id]) positions[n.id] = STATIC_POS[n.id];
  }

  const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b);
  const cols = depths.length || 1;
  depths.forEach((d, colIdx) => {
    const group = byDepth[d];
    const x = VB_W * (colIdx + 1) / (cols + 1);
    group.forEach((n, rowIdx) => {
      positions[n.id] = { x, y: VB_H * (rowIdx + 1) / (group.length + 1) };
    });
  });

  return positions;
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function edgePath(from: Pt, to: Pt): string {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  return `M ${(from.x + ux * NODE_R).toFixed(1)} ${(from.y + uy * NODE_R).toFixed(1)} L ${(to.x - ux * (NODE_R + 8)).toFixed(1)} ${(to.y - uy * (NODE_R + 7)).toFixed(1)}`;
}

function midPt(from: Pt, to: Pt): Pt {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 10 };
}

function errColor(rate: number): string {
  if (rate > 0.1)  return '#F2495C';
  if (rate > 0.02) return '#FADE2A';
  return '#73BF69';
}

function passRateColor(rate: number | null): string {
  if (rate === null) return '#3615CF';
  if (rate >= 0.8) return '#73BF69';
  if (rate >= 0.5) return '#FADE2A';
  return '#F2495C';
}

function fmt(v: number, unit: string): string {
  if (v === 0) return '—';
  return v < 10 ? `${v.toFixed(1)} ${unit}` : `${Math.round(v)} ${unit}`;
}

// ── SVG renderer ──────────────────────────────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const STROKE_COLORS = ['#73BF69', '#FADE2A', '#F2495C', '#3615CF', '#9ca3af'] as const;

function GraphSvg({
  nodes, edges, isOtel,
}: {
  nodes: GNode[];
  edges: GEdge[];
  isOtel: boolean;
}) {
  const basePositions = useMemo(() => computeLayout(nodes), [nodes]);
  const [dragPos, setDragPos] = useState<Record<string, Pt>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const positions = { ...basePositions, ...dragPos };

  const svgCoords = (e: MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VB_W, y: ((e.clientY - r.top) / r.height) * VB_H };
  };

  const onNodeDown = (id: string, e: MouseEvent) => {
    e.preventDefault();
    const c = svgCoords(e);
    dragging.current = { id, ox: c.x - positions[id].x, oy: c.y - positions[id].y };
  };
  const onMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    const { id, ox, oy } = dragging.current;
    const c = svgCoords(e);
    setDragPos(prev => ({ ...prev, [id]: { x: c.x - ox, y: c.y - oy } }));
  };
  const onUp = () => { dragging.current = null; };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet"
      width="100%" height="100%" style={{ display: 'block' }}
      onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <defs>
        {STROKE_COLORS.map(c => (
          <filter key={`glow-${c}`} id={`glow-${c.replace('#', '')}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
        {STROKE_COLORS.map(c => (
          <marker key={c} id={`arr-${c.replace('#', '')}`}
            viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        ))}
      </defs>

      {/* edges */}
      {edges.map(e => {
        const fp = positions[e.from], tp = positions[e.to];
        if (!fp || !tp) return null;
        const color = isOtel && e.errorRate !== undefined ? errColor(e.errorRate) : '#9ca3af';
        const mid = midPt(fp, tp);
        return (
          <g key={`${e.from}→${e.to}`}>
            <path d={edgePath(fp, tp)} stroke={color} strokeWidth={6} fill="none"
              opacity={e.isVirtual ? 0.1 : 0.25} strokeDasharray={e.isVirtual ? '5 4' : undefined} />
            <path d={edgePath(fp, tp)} stroke={color} strokeWidth={2} fill="none"
              opacity={e.isVirtual ? 0.5 : 1} strokeDasharray={e.isVirtual ? '5 4' : undefined}
              markerEnd={`url(#arr-${color.replace('#', '')})`} />
            {isOtel && e.rps !== undefined && e.rps > 0 && (
              <text x={mid.x} y={mid.y} textAnchor="middle"
                fill={color} fontSize={8.5} fontWeight="700" fontFamily={FONT}>
                {fmt(e.rps, 'r/s')}
              </text>
            )}
          </g>
        );
      })}

      {/* nodes */}
      {nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;

        const color = isOtel && n.errorRate !== undefined
          ? errColor(n.errorRate)
          : passRateColor(n.passRate);
        const glowId = `glow-${color.replace('#', '')}`;
        const hasOtelData = isOtel && n.rps !== undefined;
        const hasPassRate = !isOtel && n.passRate !== null;

        return (
          <g key={n.id} filter={`url(#${glowId})`} style={{ cursor: 'grab' }}
            onMouseDown={e => onNodeDown(n.id, e)}>
            <circle cx={pos.x} cy={pos.y} r={NODE_R + 8}
              fill="none" stroke={color} strokeWidth={1.5} opacity={0.2}>
              <animate attributeName="r" values={`${NODE_R + 4};${NODE_R + 16};${NODE_R + 4}`} dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={pos.x} cy={pos.y} r={NODE_R + 6}
              fill="none" stroke={color} strokeWidth={1.5} opacity={0.2} />
            <circle cx={pos.x} cy={pos.y} r={NODE_R}
              fill="white" stroke={color} strokeWidth={3} />

            <text x={pos.x} y={pos.y - (hasOtelData || hasPassRate ? 8 : 4)}
              textAnchor="middle" fill="#1e293b" fontSize={10} fontWeight="700" fontFamily={FONT}>
              {n.label}
            </text>

            {hasOtelData ? (
              <>
                <text x={pos.x} y={pos.y + 10} textAnchor="middle"
                  fill={color} fontSize={14} fontWeight="800" fontFamily={FONT}>
                  {fmt(n.rps!, 'r/s')}
                </text>
                <text x={pos.x} y={pos.y + 22} textAnchor="middle"
                  fill="#94a3b8" fontSize={9} fontFamily={FONT}>
                  {n.latencyMs! > 0 ? fmt(n.latencyMs!, 'ms/r') : '— ms/r'}
                </text>
              </>
            ) : hasPassRate ? (
              <>
                <text x={pos.x} y={pos.y + 10} textAnchor="middle"
                  fill={color} fontSize={15} fontWeight="800" fontFamily={FONT}>
                  {Math.round(n.passRate! * 100)}%
                </text>
                <text x={pos.x} y={pos.y + 22} textAnchor="middle"
                  fill="#94a3b8" fontSize={8} fontFamily={FONT}>
                  TC pass rate
                </text>
              </>
            ) : (
              <text x={pos.x} y={pos.y + 10} textAnchor="middle"
                fill={color} fontSize={9} fontWeight="600" fontFamily={FONT}>
                미실행
              </text>
            )}
          </g>
        );
      })}

      <text x={VB_W / 2} y={VB_H - 4} textAnchor="middle" fill="#cbd5e1" fontSize={8} fontFamily={FONT}>
        {isOtel ? 'OpenTelemetry · Tempo' : 'scenario-derived'}
      </text>
    </svg>
  );
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

type Mode = 'otel' | 'scenario';

function ModeToggle({ mode, onChange, otelAvailable }: {
  mode: Mode;
  onChange: (m: Mode) => void;
  otelAvailable: boolean | null; // null = checking
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-[#f9f8ff] p-0.5">
      <button
        onClick={() => onChange('otel')}
        title={otelAvailable === false ? 'Prometheus 연결 불가' : 'OpenTelemetry 실시간 데이터'}
        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all ${
          mode === 'otel'
            ? 'bg-[#3615CF] text-white shadow-sm'
            : 'text-[#6b7280] hover:text-[#1a1a2e]'
        } ${otelAvailable === false ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        disabled={otelAvailable === false}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
          otelAvailable === null ? 'bg-yellow-400' :
          otelAvailable ? 'bg-green-400' : 'bg-gray-400'
        }`} />
        OTel
      </button>
      <button
        onClick={() => onChange('scenario')}
        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
          mode === 'scenario'
            ? 'bg-[#3615CF] text-white shadow-sm'
            : 'text-[#6b7280] hover:text-[#1a1a2e]'
        }`}
      >
        시나리오
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
      <p className="text-xs font-semibold text-[#6b7280]">서비스 토폴로지 없음</p>
      <p className="text-[10px] text-[#9ca3af]">시나리오가 생성되면 자동으로 표시됩니다.</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SutServiceGraph({ serviceId }: { serviceId?: string | null }) {
  const scenarios     = useScenarioStore(s => s.scenarios);
  const testCasesByTs = useScenarioStore(s => s.testCasesByTs);
  const loadScenarios = useScenarioStore(s => s.loadScenarios);

  // OTel state
  const [otelEdges, setOtelEdges]       = useState<OtelEdge[] | null>(null);
  const [otelAvailable, setOtelAvailable] = useState<boolean | null>(null); // null=checking

  // Mode: 'otel' | 'scenario'
  const [mode, setMode] = useState<Mode>('otel');

  // Load scenarios if not already loaded
  useEffect(() => {
    if (!serviceId || scenarios.length > 0) return;
    loadScenarios(serviceId).catch(console.error);
  }, [serviceId, scenarios.length, loadScenarios]);

  // Try Prometheus once on mount
  useEffect(() => {
    fetchOtelGraph()
      .then(edges => {
        setOtelEdges(edges);
        setOtelAvailable(edges.length > 0);
        if (edges.length > 0) setMode('otel');
      })
      .catch(() => {
        setOtelAvailable(false);
        setMode('scenario');
      });
  }, []);

  const otelGraph    = useMemo(() => otelEdges ? buildOtelGraph(otelEdges) : null, [otelEdges]);
  const scenarioGraph = useMemo(() => buildScenarioGraph(scenarios, testCasesByTs), [scenarios, testCasesByTs]);

  const active = mode === 'otel' && otelGraph ? otelGraph : scenarioGraph;
  const isOtel = mode === 'otel' && !!otelGraph;

  const handleModeChange = (m: Mode) => {
    if (m === 'otel' && !otelAvailable) return;
    setMode(m);
  };

  if (active.nodes.length === 0 && otelAvailable !== null) return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end px-1 pt-1">
        <ModeToggle mode={mode} onChange={handleModeChange} otelAvailable={otelAvailable} />
      </div>
      <div className="flex-1"><EmptyState /></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end px-1 pt-1 flex-shrink-0">
        <ModeToggle mode={mode} onChange={handleModeChange} otelAvailable={otelAvailable} />
      </div>
      <div className="flex-1 min-h-0">
        <GraphSvg nodes={active.nodes} edges={active.edges} isOtel={isOtel} />
      </div>
    </div>
  );
}
