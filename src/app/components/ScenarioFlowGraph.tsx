import { useRef, useEffect, type MouseEvent } from 'react';
import type { TSFlowEdge, TSFlowEdgeType } from '../data/mockData';

export interface TSFlowNode {
  id: string;
  label: string; // "TS1"
  name: string;  // "사용자 로그인"
}

interface LayoutNode extends TSFlowNode {
  x: number; y: number;
  w: number; h: number;
  layer: number;
  posInLayer: number;
}

interface Camera { x: number; y: number; scale: number; }

// ── style map ──────────────────────────────────────────────────────────────────
const EDGE_COLOR: Record<TSFlowEdgeType, { stroke: string; label: string; dash: number[] }> = {
  success: { stroke: '#5E9E7E', label: '#5E9E7E', dash: [] },
  failure: { stroke: '#C27272', label: '#C27272', dash: [6, 3] },
  branch:  { stroke: '#7B61D4', label: '#7B61D4', dash: [4, 3] },
  default: { stroke: '#c0c6d0', label: '#9ca3af', dash: [] },
};

const NODE_W     = 130;
const NODE_H     = 56;
const LAYER_GAP  = 210;
const NODE_V_GAP = 72;

// ── layout: assign layers via longest-path BFS, ignoring back-edges ──────────
function computeLayout(nodes: TSFlowNode[], edges: TSFlowEdge[], canvasW: number, canvasH: number): LayoutNode[] {
  if (nodes.length === 0) return [];

  const ids = new Set(nodes.map(n => n.id));
  // Build forward adjacency (exclude self-loops for layout)
  const out = new Map<string, string[]>();
  nodes.forEach(n => out.set(n.id, []));
  edges.forEach(e => {
    if (e.from !== e.to && ids.has(e.from) && ids.has(e.to)) {
      out.get(e.from)!.push(e.to);
    }
  });

  // Longest path from any source → layer
  const layers = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const roots = nodes.filter(n => !edges.some(e => e.to === n.id && e.from !== n.id && ids.has(e.from)));
  const startIds = roots.length > 0 ? roots.map(r => r.id) : [nodes[0].id];
  const queue: string[] = [...startIds];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const layer = layers.get(id) ?? 0;
    (out.get(id) ?? []).forEach(next => {
      const cur = layers.get(next) ?? 0;
      if (layer + 1 > cur) layers.set(next, layer + 1);
      queue.push(next);
    });
  }
  // Unvisited: put in layer 0
  nodes.forEach(n => { if (!visited.has(n.id)) layers.set(n.id, 0); });

  // Count & position within layer
  const byLayer = new Map<number, string[]>();
  layers.forEach((l, id) => {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  });

  const maxLayer = Math.max(...Array.from(layers.values()));
  const numLayers = maxLayer + 1;

  // Adaptive gap: shrink to fit canvas, never let nodes overflow horizontally
  const H_PAD = 60;
  const adaptiveGap = numLayers > 1
    ? Math.min(LAYER_GAP, Math.floor((canvasW - H_PAD * 2 - NODE_W) / (numLayers - 1)))
    : LAYER_GAP;
  const totalW = (numLayers - 1) * adaptiveGap + NODE_W;
  const startX = Math.max(H_PAD, (canvasW - totalW) / 2);

  // Adaptive vertical gap: shrink if many nodes in one layer
  const maxNodesInLayer = Math.max(...Array.from(byLayer.values()).map(a => a.length));
  const V_PAD = 60;
  const adaptiveVGap = maxNodesInLayer > 1
    ? Math.min(NODE_V_GAP, Math.floor((canvasH - V_PAD * 2 - NODE_H * maxNodesInLayer) / (maxNodesInLayer - 1)))
    : NODE_V_GAP;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const result: LayoutNode[] = [];

  byLayer.forEach((ids, layer) => {
    const count = ids.length;
    const totalH = count * NODE_H + (count - 1) * Math.max(8, adaptiveVGap);
    const startY = Math.max(V_PAD, (canvasH - totalH) / 2);
    ids.forEach((id, idx) => {
      const base = nodeMap.get(id)!;
      result.push({
        ...base,
        x: startX + layer * adaptiveGap,
        y: startY + idx * (NODE_H + Math.max(8, adaptiveVGap)),
        w: NODE_W, h: NODE_H,
        layer,
        posInLayer: idx,
      });
    });
  });

  return result;
}

// ── rounded rect helper ───────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);      ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

// ── arrowhead (pointing in direction `angle`) ─────────────────────────────────
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size = 9) {
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

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ── reachable set from a node (both directions) ───────────────────────────────
function reachable(id: string, edges: TSFlowEdge[]): Set<string> {
  const set = new Set<string>([id]);
  const q = [id];
  while (q.length) {
    const cur = q.shift()!;
    edges.forEach(e => {
      if (e.from === cur && !set.has(e.to)) { set.add(e.to); q.push(e.to); }
      if (e.to === cur && !set.has(e.from)) { set.add(e.from); q.push(e.from); }
    });
  }
  return set;
}

// ── module-level position cache ───────────────────────────────────────────────
let _posCache: Map<string, { x: number; y: number }> | null = null;
let _posCacheKey = '';

export default function ScenarioFlowGraph({
  tsNodes,
  flowEdges,
  width = 680,
  height = 420,
  selectedId,
  onNodeSelect,
}: {
  tsNodes: TSFlowNode[];
  flowEdges: TSFlowEdge[];
  width?: number;
  height?: number;
  selectedId?: string | null;
  onNodeSelect?: (id: string | null) => void;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const nodesRef     = useRef<LayoutNode[]>([]);
  const selectedRef  = useRef<string | null>(null);
  const hoveredRef   = useRef<string | null>(null);
  const cameraRef    = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const rafRef       = useRef(0);
  const onSelectRef  = useRef(onNodeSelect);
  onSelectRef.current = onNodeSelect;

  type DragState = { node: LayoutNode; offX: number; offY: number; startSX: number; startSY: number };
  type PanState  = { startSX: number; startSY: number; camX: number; camY: number };
  const dragRef = useRef<DragState | null>(null);
  const panRef  = useRef<PanState | null>(null);

  // ── init layout ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const cacheKey = tsNodes.map(n => n.id).join(',') + '|' + flowEdges.map(e => `${e.from}>${e.to}`).join(',');
    const layout = computeLayout(tsNodes, flowEdges, width, height);

    // Restore dragged positions from cache if same data
    if (_posCache && _posCacheKey === cacheKey) {
      layout.forEach(n => {
        const cached = _posCache!.get(n.id);
        if (cached) { n.x = cached.x; n.y = cached.y; }
      });
    }
    _posCacheKey = cacheKey;
    nodesRef.current = layout;
    selectedRef.current = selectedId ?? null;

    return () => {
      // Save positions on unmount
      _posCache = new Map(nodesRef.current.map(n => [n.id, { x: n.x, y: n.y }]));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tsNodes, flowEdges, width, height]);

  useEffect(() => { selectedRef.current = selectedId ?? null; }, [selectedId]);

  // ── non-passive wheel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const mx     = (e.clientX - rect.left) * (canvas.width  / rect.width);
      const my     = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const cam    = cameraRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next   = Math.max(0.25, Math.min(4, cam.scale * factor));
      const ratio  = next / cam.scale;
      cam.x = mx - (mx - cam.x) * ratio;
      cam.y = my - (my - cam.y) * ratio;
      cam.scale = next;
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // ── render loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const nodes  = nodesRef.current;
      const edges  = flowEdges;
      const cam    = cameraRef.current;
      const selId  = selectedRef.current;
      const hovId  = hoveredRef.current;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#F2F3F5';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.scale, cam.scale);

      const hlSet = selId ? reachable(selId, edges) : null;

      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // ── 1. Edges ────────────────────────────────────────────────────────────
      edges.forEach(edge => {
        const src = nodeMap.get(edge.from);
        const dst = nodeMap.get(edge.to);
        if (!src || !dst) return;

        const col     = EDGE_COLOR[edge.type ?? 'default'];
        const isHL    = !hlSet || (hlSet.has(edge.from) && hlSet.has(edge.to));
        const isSelf  = edge.from === edge.to;
        const alpha   = isHL ? 0.92 : 0.14;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle  = col.stroke;
        ctx.fillStyle    = col.stroke;
        ctx.lineWidth    = isHL && selId ? 2.2 : 1.4;
        if (col.dash.length) ctx.setLineDash(col.dash);

        if (isSelf) {
          // Self-loop: small arc above the node
          const cx2 = src.x + src.w / 2;
          const cy2 = src.y;
          const loopR = 28;
          ctx.beginPath();
          ctx.arc(cx2, cy2 - loopR, loopR, 0.3, Math.PI - 0.3);
          ctx.stroke();
          ctx.setLineDash([]);
          // arrowhead at end of arc (pointing down-right)
          ctx.fillStyle = col.stroke;
          arrow(ctx, cx2 + loopR * Math.sin(0.3), cy2 - loopR + loopR * (1 - Math.cos(0.3)), Math.PI / 2 + 0.3, 7);
        } else {
          const isBack = src.x > dst.x + dst.w * 0.5;
          let x1: number, y1: number, x2: number, y2: number;
          let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
          let endAngle: number;

          if (!isBack) {
            // Forward edge: right-center → left-center
            x1 = src.x + src.w;  y1 = src.y + src.h / 2;
            x2 = dst.x;           y2 = dst.y + dst.h / 2;
            const spread = Math.abs(x2 - x1) * 0.55;
            cp1x = x1 + spread; cp1y = y1;
            cp2x = x2 - spread; cp2y = y2;
            endAngle = Math.atan2(y2 - cp2y, x2 - cp2x);
          } else {
            // Backward edge: route BELOW nodes to stay within canvas
            x1 = src.x + src.w / 2;  y1 = src.y + src.h;
            x2 = dst.x + dst.w / 2;  y2 = dst.y + dst.h;
            const lowestY = Math.max(y1, y2);
            const arcDepth = Math.min(lowestY + 56, height - 18) - lowestY;
            const midX = (x1 + x2) / 2;
            cp1x = x1 + (midX - x1) * 0.4; cp1y = lowestY + arcDepth;
            cp2x = x2 + (midX - x2) * 0.4; cp2y = lowestY + arcDepth;
            endAngle = Math.atan2(y2 - cp2y, x2 - cp2x);
          }

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrowhead
          ctx.fillStyle = col.stroke;
          arrow(ctx, x2, y2, endAngle, 8);

          // Edge label — always show at midpoint of bezier
          if (edge.label) {
            const t = 0.5;
            const mt = (a: number, b: number, c: number, d: number) => {
              const t2 = 1 - t;
              return t2**3*a + 3*t2**2*t*b + 3*t2*t**2*c + t**3*d;
            };
            const lx = mt(x1, cp1x, cp2x, x2);
            const ly = mt(y1, cp1y, cp2y, y2) - 11;
            const txt = trunc(edge.label, 10);
            ctx.font = `bold 9px -apple-system, BlinkMacSystemFont, sans-serif`;
            const tw = ctx.measureText(txt).width;
            const pad = 6;

            // Label pill bg
            ctx.save();
            ctx.globalAlpha = alpha * (isHL ? 1 : 0.5);
            rrect(ctx, lx - tw/2 - pad, ly - 9, tw + pad*2, 18, 5);
            ctx.fillStyle = 'white';
            ctx.shadowBlur = isHL ? 4 : 0;
            ctx.shadowColor = 'rgba(0,0,0,0.08)';
            ctx.fill();
            ctx.strokeStyle = col.stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = col.label;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(txt, lx, ly);
            ctx.restore();
          }
        }

        ctx.restore();
      });

      // ── 2. Nodes ────────────────────────────────────────────────────────────
      nodes.forEach(n => {
        const isSel = selId === n.id;
        const isHov = hovId === n.id && !isSel;
        const isHL  = !hlSet || hlSet.has(n.id);
        const alpha = isHL ? 1 : 0.28;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Drop shadow
        if (isSel || isHov) {
          ctx.shadowBlur   = 18 / cam.scale;
          ctx.shadowColor  = isSel ? 'rgba(54,21,207,0.35)' : 'rgba(0,0,0,0.12)';
          ctx.shadowOffsetY = 2 / cam.scale;
        }

        // Node body
        rrect(ctx, n.x, n.y, n.w, n.h, 10);
        ctx.fillStyle = isSel ? '#3615CF' : 'white';
        ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        // Border
        rrect(ctx, n.x, n.y, n.w, n.h, 10);
        ctx.strokeStyle = isSel ? '#3615CF' : isHov ? '#5b35e8' : '#e5e7eb';
        ctx.lineWidth   = (isSel ? 2.5 : isHov ? 1.8 : 1.2) / cam.scale;
        ctx.stroke();

        // Left accent bar
        if (!isSel) {
          ctx.fillStyle = '#3615CF';
          rrect(ctx, n.x, n.y + 10, 3, n.h - 20, 2);
          ctx.fill();
        }

        // TS badge
        const bx = n.x + 10, by = n.y + 10;
        rrect(ctx, bx, by, 24, 14, 3);
        ctx.fillStyle = isSel ? 'rgba(255,255,255,0.25)' : 'rgba(54,21,207,0.10)';
        ctx.fill();
        ctx.fillStyle = isSel ? 'white' : '#3615CF';
        ctx.font = 'bold 8px -apple-system, sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TS', bx + 12, by + 7);

        // ID
        ctx.fillStyle = isSel ? 'white' : '#1a1a2e';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x + 40, n.y + 17);

        // Name
        ctx.fillStyle = isSel ? 'rgba(255,255,255,0.8)' : '#6b7280';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(trunc(n.name, 13), n.x + 10, n.y + n.h - 14);

        ctx.restore();
      });

      ctx.restore();

      // ── 3. Legend (screen space — fixed) ─────────────────────────────────────
      const legend: Array<{ type: TSFlowEdgeType; label: string }> = [
        { type: 'success', label: '성공 분기' },
        { type: 'failure', label: '실패 분기' },
        { type: 'branch',  label: '조건 분기' },
        { type: 'default', label: '기본 흐름' },
      ];
      const lx0 = 16, ly0 = height - 18;
      legend.forEach((item, i) => {
        const x = lx0 + i * 96;
        const c = EDGE_COLOR[item.type];
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 2;
        if (c.dash.length) ctx.setLineDash(c.dash);
        ctx.beginPath(); ctx.moveTo(x, ly0); ctx.lineTo(x + 18, ly0); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#6b7280';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(item.label, x + 22, ly0);
        ctx.restore();
      });

      // ── 4. Zoom badge (screen space — fixed) ─────────────────────────────────
      if (Math.abs(cam.scale - 1) > 0.08) {
        const pct = Math.round(cam.scale * 100);
        const bx = width - 44, by = height - 20;
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
  }, [width, height, flowEdges]);

  // ── helpers ───────────────────────────────────────────────────────────────────
  function cvPos(e: MouseEvent<HTMLCanvasElement>) {
    const el = canvasRef.current!;
    const rect = el.getBoundingClientRect();
    return { sx: (e.clientX - rect.left) * (el.width / rect.width), sy: (e.clientY - rect.top) * (el.height / rect.height) };
  }
  function toWorld(sx: number, sy: number) {
    const { x, y, scale } = cameraRef.current;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  }
  function hitTest(sx: number, sy: number): LayoutNode | null {
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
    hoveredRef.current = hit?.id ?? null;
    cur(hit ? 'pointer' : 'grab');
  }

  function onMouseUp(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = cvPos(e);
    if (dragRef.current) {
      const { node, startSX, startSY } = dragRef.current;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) {
        const next = selectedRef.current === node.id ? null : node.id;
        selectedRef.current = next;
        onSelectRef.current?.(next);
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
    if (!hitTest(sx, sy)) cameraRef.current = { x: 0, y: 0, scale: 1 };
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
