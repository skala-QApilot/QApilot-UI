import { useRef, useEffect, type MouseEvent } from 'react';

// 시나리오 ↔ API 엔드포인트 이분 그래프 (엔드포인트 단위 변경 영향).
// 좌측 = 시나리오가 검증하는 API 엔드포인트(TC.api), 우측 = 시나리오. 엣지 = "이 시나리오가 이 API를 친다".
// 여러 시나리오가 공유하는 엔드포인트 = 허브(×N) = 그 API를 바꾸면 깨질 수 있는 시나리오 집합.

export interface EndpointScenario {
  id: string;        // ts_id
  name: string;
  endpoints: string[]; // "METHOD /path" 목록 (TC.api distinct)
}

type NodeKind = 'endpoint' | 'scenario';

interface GNode {
  key: string;      // 'e:GET /api/orders' | 's:TS-001'
  kind: NodeKind;
  id: string;       // api | ts_id
  label: string;    // path | ts_id
  sub: string;      // method | 시나리오명
  method: string;   // endpoint만
  degree: number;   // endpoint: #시나리오(fan-in), scenario: #엔드포인트
  x: number; y: number; w: number; h: number;
}

interface Edge { a: string; b: string; } // a = endpoint key, b = scenario key
interface Camera { x: number; y: number; scale: number; }

// ── style ──────────────────────────────────────────────────────────────────
const METHOD_COLOR: Record<string, string> = {
  GET: '#5E9E7E', POST: '#3615CF', PUT: '#D9A441', PATCH: '#D9A441', DELETE: '#C27272',
};
function methodColor(m: string) { return METHOD_COLOR[m.toUpperCase()] ?? '#9ca3af'; }
function splitApi(api: string): { method: string; path: string } {
  const i = api.indexOf(' ');
  return i > 0 ? { method: api.slice(0, i), path: api.slice(i + 1) } : { method: '', path: api };
}

const EP_W = 186, EP_H = 30;
const SCEN_W = 150, SCEN_H = 44;
const H_PAD = 72, V_PAD = 46;
const MAX_GAP = 60, MIN_GAP_E = 6, MIN_GAP_S = 12;

// ── helpers ────────────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);      ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size = 8) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.45);
  ctx.lineTo(-size * 0.6, 0);
  ctx.lineTo(-size, size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ── layout: 엔드포인트 좌 / 시나리오 우, 엔드포인트는 barycenter 정렬로 교차 최소화 ──
function computeLayout(scenarios: EndpointScenario[], width: number, height: number):
  { nodes: GNode[]; edges: Edge[]; adj: Map<string, Set<string>> } {
  const nodes: GNode[] = [];
  const edges: Edge[] = [];
  const adj = new Map<string, Set<string>>();
  if (scenarios.length === 0) return { nodes, edges, adj };

  const link = (a: string, b: string) => {
    (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
    (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
  };

  // 엔드포인트 → 연결된 시나리오 인덱스
  const epToIdx = new Map<string, number[]>();
  scenarios.forEach((s, i) => {
    for (const ep of s.endpoints) {
      if (!epToIdx.has(ep)) epToIdx.set(ep, []);
      epToIdx.get(ep)!.push(i);
    }
  });

  const epOrder = [...epToIdx.keys()].sort((a, b) => {
    const ba = epToIdx.get(a)!.reduce((p, c) => p + c, 0) / epToIdx.get(a)!.length;
    const bb = epToIdx.get(b)!.reduce((p, c) => p + c, 0) / epToIdx.get(b)!.length;
    return ba - bb || a.localeCompare(b);
  });

  const place = (count: number, nodeH: number, minGap: number) => {
    const idealGap = count > 1 ? (height - 2 * V_PAD - count * nodeH) / (count - 1) : 0;
    const gap = Math.max(minGap, Math.min(MAX_GAP, idealGap));
    const totalH = count * nodeH + (count - 1) * gap;
    return { gap, startY: Math.max(V_PAD, (height - totalH) / 2) };
  };

  const epX = H_PAD;
  const scenX = Math.max(epX + EP_W + 80, width - H_PAD - SCEN_W);

  const epLayout = place(epOrder.length, EP_H, MIN_GAP_E);
  epOrder.forEach((api, idx) => {
    const { method, path } = splitApi(api);
    nodes.push({
      key: 'e:' + api, kind: 'endpoint', id: api,
      label: path, sub: method, method, degree: epToIdx.get(api)!.length,
      x: epX, y: epLayout.startY + idx * (EP_H + epLayout.gap), w: EP_W, h: EP_H,
    });
  });

  const scenLayout = place(scenarios.length, SCEN_H, MIN_GAP_S);
  scenarios.forEach((s, idx) => {
    nodes.push({
      key: 's:' + s.id, kind: 'scenario', id: s.id,
      label: s.id, sub: s.name, method: '', degree: s.endpoints.length,
      x: scenX, y: scenLayout.startY + idx * (SCEN_H + scenLayout.gap), w: SCEN_W, h: SCEN_H,
    });
    for (const ep of s.endpoints) {
      edges.push({ a: 'e:' + ep, b: 's:' + s.id });
      link('e:' + ep, 's:' + s.id);
    }
  });

  return { nodes, edges, adj };
}

// ── fit-to-view: 전체 노드 bbox를 뷰포트에 맞춰 카메라 산출(작은 그래프는 100% 초과 확대 안 함) ──
function fitCamera(nodes: GNode[], width: number, height: number): Camera {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
  }
  const P = 36;
  const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const scale = Math.max(0.1, Math.min((width - 2 * P) / bw, (height - 2 * P) / bh, 1));
  return {
    x: (width - bw * scale) / 2 - minX * scale,
    y: (height - bh * scale) / 2 - minY * scale,
    scale,
  };
}

// ── module-level position cache (드래그한 위치 유지) ──
let _posCache: Map<string, { x: number; y: number }> | null = null;
let _posCacheKey = '';

export default function ScenarioEndpointGraph({
  scenarios,
  width = 680,
  height = 420,
  selectedId,
  onNodeSelect,
}: {
  scenarios: EndpointScenario[];
  width?: number;
  height?: number;
  selectedId?: string | null;
  onNodeSelect?: (id: string | null) => void;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const nodesRef    = useRef<GNode[]>([]);
  const edgesRef    = useRef<Edge[]>([]);
  const adjRef      = useRef<Map<string, Set<string>>>(new Map());
  const selectedRef = useRef<string | null>(null); // 'e:..' | 's:..' | null
  const hoveredRef  = useRef<string | null>(null);
  const cameraRef   = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const rafRef      = useRef(0);
  const onSelectRef = useRef(onNodeSelect);
  onSelectRef.current = onNodeSelect;

  type DragState = { node: GNode; offX: number; offY: number; startSX: number; startSY: number };
  type PanState  = { startSX: number; startSY: number; camX: number; camY: number };
  const dragRef = useRef<DragState | null>(null);
  const panRef  = useRef<PanState | null>(null);

  const selKeyFromProp = (sid: string | null | undefined) =>
    sid ? 's:' + sid.split('_')[0] : null;

  // ── layout ──
  useEffect(() => {
    const cacheKey = scenarios.map(s => s.id + '#' + s.endpoints.join('|')).join(',');
    const { nodes, edges, adj } = computeLayout(scenarios, width, height);
    if (_posCache && _posCacheKey === cacheKey) {
      nodes.forEach(n => { const c = _posCache!.get(n.key); if (c) { n.x = c.x; n.y = c.y; } });
    }
    _posCacheKey = cacheKey;
    nodesRef.current = nodes;
    edgesRef.current = edges;
    adjRef.current = adj;
    selectedRef.current = selKeyFromProp(selectedId);
    cameraRef.current = fitCamera(nodes, width, height); // 로드/리사이즈 시 전체가 뷰포트에 들어오게
    return () => { _posCache = new Map(nodesRef.current.map(n => [n.key, { x: n.x, y: n.y }])); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, width, height]);

  useEffect(() => { selectedRef.current = selKeyFromProp(selectedId); }, [selectedId]);

  // ── non-passive wheel zoom ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const cam = cameraRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next = Math.max(0.25, Math.min(4, cam.scale * factor));
      const ratio = next / cam.scale;
      cam.x = mx - (mx - cam.x) * ratio;
      cam.y = my - (my - cam.y) * ratio;
      cam.scale = next;
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // ── render loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const adj   = adjRef.current;
      const cam   = cameraRef.current;
      const active = selectedRef.current ?? hoveredRef.current;

      const hlSet = active ? new Set<string>([active, ...(adj.get(active) ?? [])]) : null;
      const nodeMap = new Map(nodes.map(n => [n.key, n]));

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#F2F3F5';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.scale, cam.scale);

      // ── edges ──
      edges.forEach(edge => {
        const src = nodeMap.get(edge.a); // endpoint
        const dst = nodeMap.get(edge.b); // scenario
        if (!src || !dst) return;
        const isHL = !hlSet || (hlSet.has(edge.a) && hlSet.has(edge.b));
        const x1 = src.x + src.w, y1 = src.y + src.h / 2;
        const x2 = dst.x,         y2 = dst.y + dst.h / 2;
        const spread = Math.max(40, Math.abs(x2 - x1) * 0.45);

        ctx.save();
        ctx.globalAlpha = isHL ? 0.85 : 0.1;
        ctx.strokeStyle = isHL && active ? methodColor(src.method) : '#b9c0cc';
        ctx.lineWidth = isHL && active ? 2 : 1.1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + spread, y1, x2 - spread, y2, x2, y2);
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle as string;
        arrow(ctx, x2, y2, 0, 7);
        ctx.restore();
      });

      // ── nodes ──
      nodes.forEach(n => {
        const isSel = selectedRef.current === n.key;
        const isHL = !hlSet || hlSet.has(n.key);
        ctx.save();
        ctx.globalAlpha = isHL ? 1 : 0.24;

        if (isSel) {
          ctx.shadowBlur = 16 / cam.scale;
          ctx.shadowColor = 'rgba(54,21,207,0.32)';
          ctx.shadowOffsetY = 2 / cam.scale;
        }
        rrect(ctx, n.x, n.y, n.w, n.h, 9);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        if (n.kind === 'endpoint') {
          const col = methodColor(n.method);
          rrect(ctx, n.x, n.y, n.w, n.h, 9);
          ctx.strokeStyle = isSel ? '#3615CF' : '#e5e7eb';
          ctx.lineWidth = (isSel ? 2.4 : 1.2) / cam.scale;
          ctx.stroke();

          // method 색 좌측 바
          ctx.fillStyle = col;
          rrect(ctx, n.x, n.y + 7, 3, n.h - 14, 2);
          ctx.fill();

          // method 태그
          ctx.fillStyle = col;
          ctx.font = 'bold 8px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(n.method, n.x + 10, n.y + n.h / 2);
          const mw = ctx.measureText(n.method).width;

          // path
          ctx.fillStyle = '#1a1a2e';
          ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillText(trunc(n.label, 24), n.x + 14 + mw, n.y + n.h / 2);

          // fan-in 허브 배지 (여러 시나리오가 같은 API를 침 = 변경 위험)
          if (n.degree > 1) {
            const bx = n.x + n.w - 22, by = n.y + (n.h - 13) / 2;
            rrect(ctx, bx, by, 18, 13, 3);
            ctx.fillStyle = 'rgba(54,21,207,0.10)';
            ctx.fill();
            ctx.fillStyle = '#3615CF';
            ctx.font = 'bold 8px -apple-system, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('×' + n.degree, bx + 9, by + 7);
          }
        } else {
          // 시나리오 노드
          const orphan = n.degree === 0;
          rrect(ctx, n.x, n.y, n.w, n.h, 9);
          ctx.strokeStyle = isSel ? '#3615CF' : orphan ? '#D9A441' : '#e5e7eb';
          ctx.lineWidth = (isSel ? 2.4 : 1.2) / cam.scale;
          if (orphan) ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          if (!isSel && !orphan) {
            ctx.fillStyle = '#3615CF';
            rrect(ctx, n.x, n.y + 9, 3, n.h - 18, 2);
            ctx.fill();
          }
          ctx.fillStyle = '#1a1a2e';
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(n.label, n.x + 12, n.y + 16);
          ctx.fillStyle = '#6b7280';
          ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText(trunc(n.sub, 15), n.x + 12, n.y + n.h - 13);
          if (orphan) {
            ctx.fillStyle = '#B07D1F';
            ctx.font = 'bold 8px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('API 미연결', n.x + n.w - 8, n.y + 12);
          }
        }
        ctx.restore();
      });

      ctx.restore();

      // ── column headers (screen space) ──
      const epNodes = nodes.filter(n => n.kind === 'endpoint');
      const hubCount = epNodes.filter(n => n.degree > 1).length;
      ctx.save();
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`엔드포인트 · ${epNodes.length}`, 16, 18);
      if (hubCount > 0) {
        ctx.fillStyle = '#3615CF';
        ctx.fillText(`허브 ${hubCount}`, 16 + ctx.measureText(`엔드포인트 · ${epNodes.length}`).width + 10, 18);
      }
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'right';
      ctx.fillText(`시나리오 · ${nodes.length - epNodes.length}`, width - 16, 18);
      ctx.restore();

      // ── legend (screen space) ──
      const legend: Array<{ c: string; t: string }> = [
        { c: METHOD_COLOR.GET, t: 'GET' },
        { c: METHOD_COLOR.POST, t: 'POST' },
        { c: METHOD_COLOR.PUT, t: 'PUT/PATCH' },
        { c: METHOD_COLOR.DELETE, t: 'DELETE' },
      ];
      let lx = 16; const ly = height - 16;
      ctx.save();
      ctx.font = '9px -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      legend.forEach(item => {
        ctx.fillStyle = item.c;
        ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'left';
        ctx.fillText(item.t, lx + 9, ly);
        lx += 18 + ctx.measureText(item.t).width + 14;
      });
      ctx.restore();

      // ── zoom badge ──
      if (Math.abs(cam.scale - 1) > 0.08) {
        const pct = Math.round(cam.scale * 100);
        const bx = width - 44, by = height - 18;
        ctx.save();
        ctx.fillStyle = 'rgba(26,26,46,0.5)';
        rrect(ctx, bx - 20, by - 11, 44, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, bx, by);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  // ── pointer helpers ──
  function cvPos(e: MouseEvent<HTMLCanvasElement>) {
    const el = canvasRef.current!;
    const rect = el.getBoundingClientRect();
    return { sx: (e.clientX - rect.left) * (el.width / rect.width), sy: (e.clientY - rect.top) * (el.height / rect.height) };
  }
  function toWorld(sx: number, sy: number) {
    const { x, y, scale } = cameraRef.current;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  }
  function hitTest(sx: number, sy: number): GNode | null {
    const { x, y } = toWorld(sx, sy);
    return nodesRef.current.find(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) ?? null;
  }
  function cur(v: string) { if (canvasRef.current) canvasRef.current.style.cursor = v; }

  function onMouseDown(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    const hit = hitTest(sx, sy);
    if (hit) {
      const w = toWorld(sx, sy);
      dragRef.current = { node: hit, offX: w.x - hit.x, offY: w.y - hit.y, startSX: sx, startSY: sy };
    } else {
      const cam = cameraRef.current;
      panRef.current = { startSX: sx, startSY: sy, camX: cam.x, camY: cam.y };
    }
    cur('grabbing');
  }

  function onMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    if (dragRef.current) {
      const w = toWorld(sx, sy);
      const { node, offX, offY } = dragRef.current;
      node.x = w.x - offX; node.y = w.y - offY;
      return;
    }
    if (panRef.current) {
      const { startSX, startSY, camX, camY } = panRef.current;
      cameraRef.current.x = camX + (sx - startSX);
      cameraRef.current.y = camY + (sy - startSY);
      return;
    }
    const hit = hitTest(sx, sy);
    hoveredRef.current = hit?.key ?? null;
    cur(hit ? 'pointer' : 'grab');
  }

  function onMouseUp(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    if (dragRef.current) {
      const { node, startSX, startSY } = dragRef.current;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) {
        const key = node.key;
        const next = selectedRef.current === key ? null : key;
        selectedRef.current = next;
        // 시나리오 선택만 우측 패널과 동기화. 엔드포인트 선택은 그래프 내부 하이라이트 전용.
        if (node.kind === 'scenario') onSelectRef.current?.(next ? node.id : null);
        else if (!next) onSelectRef.current?.(null);
      }
      dragRef.current = null;
    } else if (panRef.current) {
      const { startSX, startSY } = panRef.current;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) {
        selectedRef.current = null;
        onSelectRef.current?.(null);
      }
      panRef.current = null;
    }
    cur(hitTest(sx, sy) ? 'pointer' : 'grab');
  }

  function onMouseLeave() {
    dragRef.current = null;
    panRef.current = null;
    hoveredRef.current = null;
    cur('default');
  }

  function onDblClick(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    if (!hitTest(sx, sy)) cameraRef.current = fitCamera(nodesRef.current, width, height);
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onDoubleClick={onDblClick}
      style={{ display: 'block', cursor: 'grab' }}
    />
  );
}
