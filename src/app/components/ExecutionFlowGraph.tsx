import { useRef, useEffect, type MouseEvent } from 'react';

// 실행 흐름 그래프(실행 DAG): 테스트 run 중 실제로 관찰된 API 호출 흐름.
// 노드 = API 엔드포인트(method+경로, 숫자 id는 {id}로 정규화), 방향 엣지 = "A 호출 다음 B 호출"(같은 TC 내 연속).
// 엣지 굵기 = 전이 빈도, 노드에 호출/에러 수. 여러 테스트가 공통으로 지나는 경로가 굵게 드러난다.

export interface FlowCall {
  method: string;
  url: string;
  statusCode?: number | null;
}

interface FNode {
  id: string;       // "GET /api/orders/{id}"
  method: string;
  path: string;
  calls: number;
  errors: number;
  x: number; y: number; w: number; h: number;
  layer: number;
}
interface FEdge { from: string; to: string; count: number; }
interface Camera { x: number; y: number; scale: number; }

// ── style ──────────────────────────────────────────────────────────────────
const METHOD_COLOR: Record<string, string> = {
  GET: '#5E9E7E', POST: '#3615CF', PUT: '#D9A441', PATCH: '#D9A441', DELETE: '#C27272',
};
function methodColor(m: string) { return METHOD_COLOR[m.toUpperCase()] ?? '#9ca3af'; }

const NODE_W = 158, NODE_H = 40;
const LAYER_GAP = 188, NODE_V_GAP = 26;

// ── endpoint 정규화 ──
function stripUrl(url: string): string {
  let p = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('#')[0];
  p = p.replace(/\/[0-9]+(?=\/|$)/g, '/{id}').replace(/\/[0-9a-f-]{8,}(?=\/|$)/g, '/{id}');
  return p || '/';
}
function epKey(c: FlowCall): string { return `${(c.method || 'GET').toUpperCase()} ${stripUrl(c.url || '/')}`; }

// ── run 진행 데이터(시퀀스 목록) → 노드/엣지 ──
export function buildFlow(sequences: FlowCall[][]): { nodes: FNode[]; edges: FEdge[] } {
  const nodeMap = new Map<string, FNode>();
  const edgeMap = new Map<string, FEdge>();
  const touch = (key: string, method: string, path: string, isErr: boolean) => {
    let n = nodeMap.get(key);
    if (!n) { n = { id: key, method, path, calls: 0, errors: 0, x: 0, y: 0, w: NODE_W, h: NODE_H, layer: 0 }; nodeMap.set(key, n); }
    n.calls++; if (isErr) n.errors++;
  };
  for (const seq of sequences) {
    let prev: string | null = null;
    for (const c of seq) {
      const key = epKey(c);
      const method = (c.method || 'GET').toUpperCase();
      const path = stripUrl(c.url || '/');
      const isErr = typeof c.statusCode === 'number' && c.statusCode >= 400;
      touch(key, method, path, isErr);
      if (prev && prev !== key) {
        const ek = prev + '' + key;
        const e = edgeMap.get(ek);
        if (e) e.count++;
        else edgeMap.set(ek, { from: prev, to: key, count: 1 });
      }
      prev = key;
    }
  }
  return { nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
}

// ── 레이어드 레이아웃(longest-path BFS, back-edge 무시) ──
function computeLayout(nodes: FNode[], edges: FEdge[], canvasW: number, canvasH: number): FNode[] {
  if (nodes.length === 0) return [];
  const ids = new Set(nodes.map(n => n.id));
  const out = new Map<string, string[]>();
  nodes.forEach(n => out.set(n.id, []));
  edges.forEach(e => { if (e.from !== e.to && ids.has(e.from) && ids.has(e.to)) out.get(e.from)!.push(e.to); });

  const layers = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const roots = nodes.filter(n => !edges.some(e => e.to === n.id && e.from !== n.id && ids.has(e.from)));
  const startIds = roots.length > 0 ? roots.map(r => r.id) : [nodes[0].id];
  const queue = [...startIds];
  const visited = new Set<string>();
  let guard = 0;
  while (queue.length && guard++ < nodes.length * 50) {
    const id = queue.shift()!;
    const layer = layers.get(id) ?? 0;
    for (const next of out.get(id) ?? []) {
      if ((layers.get(next) ?? 0) < layer + 1) { layers.set(next, layer + 1); queue.push(next); }
      else if (!visited.has(next)) queue.push(next);
    }
    visited.add(id);
  }

  const byLayer = new Map<number, string[]>();
  layers.forEach((l, id) => { if (!byLayer.has(l)) byLayer.set(l, []); byLayer.get(l)!.push(id); });
  const numLayers = Math.max(...layers.values()) + 1;
  const maxInLayer = Math.max(...[...byLayer.values()].map(a => a.length));

  const H_PAD = 40, V_PAD = 30;
  const adaptiveLayerGap = numLayers > 1
    ? Math.min(LAYER_GAP, Math.max(120, Math.floor((canvasW - H_PAD * 2 - NODE_W) / (numLayers - 1))))
    : LAYER_GAP;
  const adaptiveVGap = maxInLayer > 1
    ? Math.max(10, Math.min(NODE_V_GAP, Math.floor((canvasH - V_PAD * 2 - NODE_H * maxInLayer) / (maxInLayer - 1))))
    : NODE_V_GAP;

  const startX = H_PAD;
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  byLayer.forEach((layerIds, layer) => {
    // 호출 많은 노드 위로
    layerIds.sort((a, b) => (nodeById.get(b)!.calls) - (nodeById.get(a)!.calls));
    const count = layerIds.length;
    const totalH = count * NODE_H + (count - 1) * adaptiveVGap;
    const sY = Math.max(V_PAD, (canvasH - totalH) / 2);
    layerIds.forEach((id, idx) => {
      const n = nodeById.get(id)!;
      n.layer = layer;
      n.x = startX + layer * adaptiveLayerGap;
      n.y = sY + idx * (NODE_H + adaptiveVGap);
    });
  });
  return nodes;
}

function fitCamera(nodes: FNode[], width: number, height: number): Camera {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h); }
  const P = 28, bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
  const scale = Math.max(0.1, Math.min((width - 2 * P) / bw, (height - 2 * P) / bh, 1.1));
  return { x: (width - bw * scale) / 2 - minX * scale, y: (height - bh * scale) / 2 - minY * scale, scale };
}

// ── helpers ──
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
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * 0.45); ctx.lineTo(-size * 0.6, 0); ctx.lineTo(-size, size * 0.45); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function reachable(id: string, edges: FEdge[]): Set<string> {
  const set = new Set<string>([id]); const q = [id];
  while (q.length) {
    const cur = q.shift()!;
    edges.forEach(e => {
      if (e.from === cur && !set.has(e.to)) { set.add(e.to); q.push(e.to); }
      if (e.to === cur && !set.has(e.from)) { set.add(e.from); q.push(e.from); }
    });
  }
  return set;
}

export default function ExecutionFlowGraph({
  sequences,
  width = 520,
  height = 420,
}: {
  sequences: FlowCall[][];
  width?: number;
  height?: number;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const nodesRef    = useRef<FNode[]>([]);
  const edgesRef    = useRef<FEdge[]>([]);
  const selectedRef = useRef<string | null>(null);
  const hoveredRef  = useRef<string | null>(null);
  const cameraRef   = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const rafRef      = useRef(0);

  type DragState = { node: FNode; offX: number; offY: number; startSX: number; startSY: number };
  type PanState  = { startSX: number; startSY: number; camX: number; camY: number };
  const dragRef = useRef<DragState | null>(null);
  const panRef  = useRef<PanState | null>(null);

  // ── build + layout ──
  useEffect(() => {
    const { nodes, edges } = buildFlow(sequences);
    computeLayout(nodes, edges, width, height);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    cameraRef.current = fitCamera(nodes, width, height);
    if (selectedRef.current && !nodes.some(n => n.id === selectedRef.current)) selectedRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequences, width, height]);

  // ── wheel zoom ──
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
      const next = Math.max(0.2, Math.min(4, cam.scale * factor));
      const ratio = next / cam.scale;
      cam.x = mx - (mx - cam.x) * ratio; cam.y = my - (my - cam.y) * ratio; cam.scale = next;
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // ── render ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxEdge = () => Math.max(1, ...edgesRef.current.map(e => e.count));

    const tick = () => {
      const nodes = nodesRef.current, edges = edgesRef.current, cam = cameraRef.current;
      const active = selectedRef.current ?? hoveredRef.current;
      const hlSet = active ? reachable(active, edges) : null;
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const me = maxEdge();

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#F2F3F5'; ctx.fillRect(0, 0, width, height);
      ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(cam.scale, cam.scale);

      // edges
      edges.forEach(e => {
        const s = nodeMap.get(e.from), d = nodeMap.get(e.to);
        if (!s || !d) return;
        const isHL = !hlSet || (hlSet.has(e.from) && hlSet.has(e.to));
        const isBack = s.x > d.x - 4;
        let x1: number, y1: number, x2: number, y2: number, c1x: number, c1y: number, c2x: number, c2y: number, ang: number;
        if (!isBack) {
          x1 = s.x + s.w; y1 = s.y + s.h / 2; x2 = d.x; y2 = d.y + d.h / 2;
          const sp = Math.abs(x2 - x1) * 0.5; c1x = x1 + sp; c1y = y1; c2x = x2 - sp; c2y = y2; ang = Math.atan2(y2 - c2y, x2 - c2x);
        } else {
          x1 = s.x + s.w / 2; y1 = s.y + s.h; x2 = d.x + d.w / 2; y2 = d.y + d.h;
          const low = Math.max(y1, y2) + 40; c1x = x1; c1y = low; c2x = x2; c2y = low; ang = Math.atan2(y2 - c2y, x2 - c2x);
        }
        ctx.save();
        ctx.globalAlpha = isHL ? 0.8 : 0.08;
        ctx.strokeStyle = '#8a94a6';
        ctx.lineWidth = 1 + 3 * (e.count / me);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2); ctx.stroke();
        ctx.fillStyle = '#8a94a6'; arrow(ctx, x2, y2, ang, 7);
        ctx.restore();
      });

      // nodes
      nodes.forEach(n => {
        const isSel = selectedRef.current === n.id;
        const isHov = hoveredRef.current === n.id && !isSel;
        const isHL = !hlSet || hlSet.has(n.id);
        const col = methodColor(n.method);
        const hasErr = n.errors > 0;
        ctx.save();
        ctx.globalAlpha = isHL ? 1 : 0.22;
        if (isSel || isHov) { ctx.shadowBlur = 14 / cam.scale; ctx.shadowColor = isSel ? 'rgba(54,21,207,0.3)' : 'rgba(0,0,0,0.12)'; ctx.shadowOffsetY = 2 / cam.scale; }
        rrect(ctx, n.x, n.y, n.w, n.h, 9); ctx.fillStyle = 'white'; ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        rrect(ctx, n.x, n.y, n.w, n.h, 9);
        ctx.strokeStyle = isSel ? '#3615CF' : hasErr ? '#C27272' : '#e5e7eb';
        ctx.lineWidth = (isSel ? 2.4 : hasErr ? 1.8 : 1.2) / cam.scale; ctx.stroke();

        ctx.fillStyle = col; rrect(ctx, n.x, n.y + 8, 3, n.h - 16, 2); ctx.fill();
        ctx.fillStyle = col;
        ctx.font = 'bold 8px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(n.method, n.x + 10, n.y + 13);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(trunc(n.path, 19), n.x + 10, n.y + 27);

        // calls / errors 배지
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#9ca3af'; ctx.font = '8px -apple-system, sans-serif';
        ctx.fillText(`${n.calls}회`, n.x + n.w - 8, n.y + 13);
        if (hasErr) { ctx.fillStyle = '#C27272'; ctx.font = 'bold 8px -apple-system, sans-serif'; ctx.fillText(`에러 ${n.errors}`, n.x + n.w - 8, n.y + 27); }
        ctx.restore();
      });
      ctx.restore();

      // header
      ctx.save();
      ctx.fillStyle = '#9ca3af'; ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(`실행 흐름 · 엔드포인트 ${nodes.length} · 전이 ${edges.length}`, 14, 16);
      ctx.restore();

      // legend
      const legend = [
        { c: METHOD_COLOR.GET, t: 'GET' }, { c: METHOD_COLOR.POST, t: 'POST' },
        { c: METHOD_COLOR.PUT, t: 'PUT/PATCH' }, { c: METHOD_COLOR.DELETE, t: 'DELETE' }, { c: '#C27272', t: '에러' },
      ];
      let lx = 14; const ly = height - 14;
      ctx.save(); ctx.font = '9px -apple-system, sans-serif'; ctx.textBaseline = 'middle';
      legend.forEach(it => {
        ctx.fillStyle = it.c; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b7280'; ctx.textAlign = 'left'; ctx.fillText(it.t, lx + 8, ly);
        lx += 16 + ctx.measureText(it.t).width + 12;
      });
      ctx.restore();

      if (Math.abs(cam.scale - 1) > 0.08) {
        const pct = Math.round(cam.scale * 100), bx = width - 42, by = height - 16;
        ctx.save(); ctx.fillStyle = 'rgba(26,26,46,0.5)'; rrect(ctx, bx - 20, by - 11, 44, 22, 6); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, bx, by); ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  // ── pointer ──
  function cvPos(e: MouseEvent<HTMLCanvasElement>) {
    const el = canvasRef.current!; const rect = el.getBoundingClientRect();
    return { sx: (e.clientX - rect.left) * (el.width / rect.width), sy: (e.clientY - rect.top) * (el.height / rect.height) };
  }
  function toWorld(sx: number, sy: number) { const { x, y, scale } = cameraRef.current; return { x: (sx - x) / scale, y: (sy - y) / scale }; }
  function hitTest(sx: number, sy: number): FNode | null {
    const { x, y } = toWorld(sx, sy);
    return nodesRef.current.find(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) ?? null;
  }
  function cur(v: string) { if (canvasRef.current) canvasRef.current.style.cursor = v; }

  function onMouseDown(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e); const hit = hitTest(sx, sy);
    if (hit) { const w = toWorld(sx, sy); dragRef.current = { node: hit, offX: w.x - hit.x, offY: w.y - hit.y, startSX: sx, startSY: sy }; }
    else { const cam = cameraRef.current; panRef.current = { startSX: sx, startSY: sy, camX: cam.x, camY: cam.y }; }
    cur('grabbing');
  }
  function onMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    if (dragRef.current) { const w = toWorld(sx, sy); const { node, offX, offY } = dragRef.current; node.x = w.x - offX; node.y = w.y - offY; return; }
    if (panRef.current) { const { startSX, startSY, camX, camY } = panRef.current; cameraRef.current.x = camX + (sx - startSX); cameraRef.current.y = camY + (sy - startSY); return; }
    const hit = hitTest(sx, sy); hoveredRef.current = hit?.id ?? null; cur(hit ? 'pointer' : 'grab');
  }
  function onMouseUp(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    if (dragRef.current) {
      const { node, startSX, startSY } = dragRef.current;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) selectedRef.current = selectedRef.current === node.id ? null : node.id;
      dragRef.current = null;
    } else if (panRef.current) {
      const { startSX, startSY } = panRef.current;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) selectedRef.current = null;
      panRef.current = null;
    }
    cur(hitTest(sx, sy) ? 'pointer' : 'grab');
  }
  function onMouseLeave() { dragRef.current = null; panRef.current = null; hoveredRef.current = null; cur('default'); }
  function onDblClick(e: MouseEvent<HTMLCanvasElement>) { const { sx, sy } = cvPos(e); if (!hitTest(sx, sy)) cameraRef.current = fitCamera(nodesRef.current, width, height); }

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
