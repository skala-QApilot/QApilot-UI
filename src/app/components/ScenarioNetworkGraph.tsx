import { useRef, useEffect, type MouseEvent } from 'react';

export interface TSNode { id: string; label: string; name: string; frs: string[]; }
export interface TCNode { id: string; label: string; name: string; frs: string[]; parent: string; }
export interface TVNode { id: string; label: string; name: string; frs: string[]; parent: string; }

export interface ScenarioNetworkGraphProps {
  tsNodes: TSNode[];
  tcNodes: TCNode[];
  tvNodes: TVNode[];
  width?: number;
  height?: number;
  selectedId?: string | null;
  onNodeSelect?: (id: string | null) => void;
}

interface SimNode {
  id: string;
  kind: 'TS' | 'TC' | 'TV';
  label: string;
  name: string;
  frs: string[];
  parent?: string;
  r: number;
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  visible: boolean;
  pinned: boolean;
  hoverScale: number;
}

interface Camera { x: number; y: number; scale: number; }
interface FREdge  { a: SimNode; b: SimNode; count: number; }

// ── zoom thresholds (scale) ───────────────────────────────────────────────────
const ZOOM_SHOW_TV = 1.6;   // enter "show-all-TV" mode above this
const ZOOM_HIDE_TV = 1.35;  // exit  "show-all-TV" mode below this (hysteresis)

// ── node radii + flat style ───────────────────────────────────────────────────
const BASE_R = { TS: 18, TC: 13, TV: 8 } as const;

const STYLE = {
  TS: { bg: 'rgba(54,21,207,0.08)', bgSel: '#3615CF', stroke: '#3615CF', text: '#2b1e7f', textSel: '#fff', glow: 'rgba(54,21,207,0.28)' },
  TC: { bg: 'rgba(154,177,122,0.14)', bgSel: '#9AB17A', stroke: '#9AB17A', text: '#5f7250', textSel: '#fff', glow: 'rgba(154,177,122,0.26)' },
  TV: { bg: 'rgba(148,163,184,0.12)', bgSel: '#94A3B8', stroke: '#94A3B8', text: '#64748b', textSel: '#fff', glow: 'rgba(148,163,184,0.24)' },
} as const;

const GRAPH_BG = '#f8fafc';
const GRAPH_MARGIN = 72;

// ── module-level cache: persists across remounts ──────────────────────────────
// ScenarioPage is an inline component inside App, so it remounts on every
// App state change. We cache node positions + camera here so the simulation
// survives those remounts.
interface NodeCache {
  hash: string;
  nodes: SimNode[];
  frEdges: FREdge[];
  camera: Camera;
  selectedTC: string | null;
}
let _cache: NodeCache | null = null;

// ── pure helpers ──────────────────────────────────────────────────────────────

function computeHash(ts: TSNode[], tc: TCNode[], tv: TVNode[]): string {
  return [
    ts.map(n => `${n.id}:${n.name}:${n.frs.join('+')}`).join(','),
    tc.map(n => `${n.id}|${n.parent}:${n.name}:${n.frs.join('+')}`).join(','),
    tv.map(n => `${n.id}|${n.parent}:${n.name}:${n.frs.join('+')}`).join(','),
  ].join('§');
}

function sharedFRs(a: SimNode, b: SimNode): number {
  const s = new Set(a.frs);
  return b.frs.filter(f => s.has(f)).length;
}

function spring(a: SimNode, b: SimNode, len: number, k: number) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const f = (d - len) * k / d;
  if (!a.pinned) { a.vx += dx * f; a.vy += dy * f; }
  if (!b.pinned) { b.vx -= dx * f; b.vy -= dy * f; }
}

function buildNodes(ts: TSNode[], tc: TCNode[], tv: TVNode[], w: number, h: number): SimNode[] {
  const cx = w / 2, cy = h / 2;
  const nodes: SimNode[] = [];

  ts.forEach((t, i) => {
    const angle = ts.length > 1 ? (2 * Math.PI * i) / ts.length : 0;
    nodes.push({ id: t.id, kind: 'TS', label: t.label, name: t.name, frs: t.frs, r: BASE_R.TS,
      x: cx + 140 * Math.cos(angle), y: cy + 110 * Math.sin(angle),
      vx: 0, vy: 0, alpha: 1, visible: true, pinned: false, hoverScale: 1 });
  });

  tc.forEach(t => {
    const par = nodes.find(n => n.id === t.parent);
    nodes.push({ id: t.id, kind: 'TC', label: t.label, name: t.name, frs: t.frs, parent: t.parent, r: BASE_R.TC,
      x: (par?.x ?? cx) + (Math.random() - 0.5) * 80,
      y: (par?.y ?? cy) + (Math.random() - 0.5) * 80,
      vx: 0, vy: 0, alpha: 1, visible: true, pinned: false, hoverScale: 1 });
  });

  tv.forEach(t => {
    const par = nodes.find(n => n.id === t.parent);
    nodes.push({ id: t.id, kind: 'TV', label: t.label, name: t.name, frs: t.frs, parent: t.parent, r: BASE_R.TV,
      x: par?.x ?? cx, y: par?.y ?? cy,
      vx: 0, vy: 0, alpha: 0, visible: false, pinned: false, hoverScale: 1 });
  });

  return nodes;
}

function buildFREdges(nodes: SimNode[]): FREdge[] {
  const edges: FREdge[] = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const n = sharedFRs(nodes[i], nodes[j]);
      if (n > 0) edges.push({ a: nodes[i], b: nodes[j], count: n });
    }
  return edges;
}

function truncateLabel(value: string, maxLen: number): string {
  return value.length > maxLen ? value.slice(0, maxLen - 1) + '...' : value;
}

function connectedSet(id: string, nodes: SimNode[]): Set<string> {
  const set = new Set<string>([id]);
  const node = nodes.find(n => n.id === id);
  if (!node) return set;
  if (node.kind === 'TS') {
    nodes.forEach(tc => {
      if (tc.parent !== id) return;
      set.add(tc.id);
      nodes.forEach(tv => { if (tv.parent === tc.id) set.add(tv.id); });
    });
  } else if (node.kind === 'TC') {
    if (node.parent) set.add(node.parent);
    nodes.forEach(tv => { if (tv.parent === id) set.add(tv.id); });
  } else {
    if (node.parent) {
      set.add(node.parent);
      const tc = nodes.find(n => n.id === node.parent);
      if (tc?.parent) set.add(tc.parent);
    }
  }
  return set;
}

function computeFRHighlight(nodeId: string, nodes: SimNode[]): Set<string> {
  const target = nodes.find(n => n.id === nodeId);
  if (!target || target.frs.length === 0) return new Set();
  const result = new Set<string>();
  nodes.forEach(other => {
    if (other.id === nodeId) return;
    if (sharedFRs(target, other) > 0) result.add(other.id);
  });
  return result;
}

function bloomTVForTC(tcId: string, nodes: SimNode[], tcNode?: SimNode) {
  nodes.forEach(n => {
    if (n.kind !== 'TV') return;
    if (n.parent === tcId) {
      n.visible = true;
      if (n.alpha < 0.1 && tcNode) {
        n.x  = tcNode.x + (Math.random() - 0.5) * 3;
        n.y  = tcNode.y + (Math.random() - 0.5) * 3;
        n.vx = (Math.random() - 0.5) * 1.2;
        n.vy = (Math.random() - 0.5) * 1.2;
      }
    } else {
      n.visible = false;
    }
  });
}

function tcIdForNode(node: SimNode): string | null {
  if (node.kind === 'TC') return node.id;
  if (node.kind === 'TV') return node.parent ?? null;
  return null;
}

function applySelection(id: string | null, nodes: SimNode[], selectedIdRef: { current: string | null }, frHighlightRef: { current: Set<string> }, selectedTCRef: { current: string | null }) {
  selectedIdRef.current = id;
  frHighlightRef.current = id ? computeFRHighlight(id, nodes) : new Set();

  if (!id) return;

  const node = nodes.find(n => n.id === id);
  if (!node) return;

  const tcId = tcIdForNode(node);
  if (tcId) {
    selectedTCRef.current = tcId;
    bloomTVForTC(tcId, nodes, nodes.find(n => n.id === tcId));
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ScenarioNetworkGraph({
  tsNodes, tcNodes, tvNodes, width = 680, height = 420,
  selectedId, onNodeSelect,
}: ScenarioNetworkGraphProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const nodesRef        = useRef<SimNode[]>([]);
  const frEdgesRef      = useRef<FREdge[]>([]);
  const selectedTCRef   = useRef<string | null>(null);
  const selectedIdRef   = useRef<string | null>(null);
  const frHighlightRef  = useRef<Set<string>>(new Set());
  const hoveredIdRef    = useRef<string | null>(null);
  const cameraRef       = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const zoomTVModeRef   = useRef(false);
  const frameRef        = useRef(0);
  const rafRef          = useRef<number>(0);
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;

  const dragRef = useRef<{ node: SimNode; offX: number; offY: number; startSX: number; startSY: number } | null>(null);
  const panRef  = useRef<{ startSX: number; startSY: number; camX: number; camY: number } | null>(null);

  // ── init / restore from cache ────────────────────────────────────────────
  useEffect(() => {
    const hash = computeHash(tsNodes, tcNodes, tvNodes);

    if (_cache && _cache.hash === hash && _cache.nodes.length > 0) {
      // Restore — same data, just a remount (e.g. App state change)
      nodesRef.current     = _cache.nodes;
      frEdgesRef.current   = buildFREdges(_cache.nodes); // rebuild refs to same objects
      cameraRef.current    = { ..._cache.camera };
      selectedTCRef.current = _cache.selectedTC;
      zoomTVModeRef.current = _cache.camera.scale > ZOOM_SHOW_TV;
    } else {
      // Fresh build (new data or first mount)
      const nodes = buildNodes(tsNodes, tcNodes, tvNodes, width, height);
      nodesRef.current     = nodes;
      frEdgesRef.current   = buildFREdges(nodes);
      cameraRef.current    = { x: 0, y: 0, scale: 1 };
      selectedTCRef.current = null;
      zoomTVModeRef.current = false;
    }

    applySelection(selectedId ?? null, nodesRef.current, selectedIdRef, frHighlightRef, selectedTCRef);

    // Save to cache on unmount
    return () => {
      _cache = {
        hash,
        nodes:      nodesRef.current,
        frEdges:    frEdgesRef.current,
        camera:     { ...cameraRef.current },
        selectedTC: selectedTCRef.current,
      };
    };
  }, [tsNodes, tcNodes, tvNodes, width, height]);

  // ── sync external selectedId ─────────────────────────────────────────────
  useEffect(() => {
    const newId = selectedId ?? null;

    if (!newId) {
      applySelection(null, nodesRef.current, selectedIdRef, frHighlightRef, selectedTCRef);
      return;
    }

    const nodes = nodesRef.current;
    applySelection(newId, nodes, selectedIdRef, frHighlightRef, selectedTCRef);
  }, [selectedId]);

  // ── non-passive wheel ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect  = canvas.getBoundingClientRect();
      const mx    = (e.clientX - rect.left)  * (canvas.width  / rect.width);
      const my    = (e.clientY - rect.top)   * (canvas.height / rect.height);
      const cam   = cameraRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next  = Math.max(0.2, Math.min(5, cam.scale * factor));
      const ratio = next / cam.scale;
      cam.x = mx - (mx - cam.x) * ratio;
      cam.y = my - (my - cam.y) * ratio;
      cam.scale = next;
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // ── RAF simulation + render ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = width / 2, cy = height / 2;

    const tick = () => {
      frameRef.current++;
      const nodes   = nodesRef.current;
      const frEdges = frEdgesRef.current;
      const cam     = cameraRef.current;

      // ── zoom-based TV visibility ──────────────────────────────────────────
      const wasZoomMode = zoomTVModeRef.current;
      if (!wasZoomMode && cam.scale > ZOOM_SHOW_TV) {
        zoomTVModeRef.current = true;
        nodes.forEach(n => {
          if (n.kind !== 'TV') return;
          n.visible = true;
          if (n.alpha < 0.1) {
            const par = nodes.find(p => p.id === n.parent);
            if (par) {
              n.x = par.x + (Math.random() - 0.5) * 3;
              n.y = par.y + (Math.random() - 0.5) * 3;
              n.vx = (Math.random() - 0.5) * 1.2;
              n.vy = (Math.random() - 0.5) * 1.2;
            }
          }
        });
      } else if (wasZoomMode && cam.scale < ZOOM_HIDE_TV) {
        zoomTVModeRef.current = false;
        const tc = selectedTCRef.current;
        nodes.forEach(n => {
          if (n.kind === 'TV') n.visible = tc ? n.parent === tc : false;
        });
      }

      // ── fade TV ──────────────────────────────────────────────────────────
      nodes.forEach(n => {
        if (n.kind !== 'TV') return;
        n.alpha += ((n.visible ? 1 : 0) - n.alpha) * 0.1;
      });

      // ── hover scale ───────────────────────────────────────────────────────
      nodes.forEach(n => {
        const t = hoveredIdRef.current === n.id ? 1.2 : 1.0;
        n.hoverScale += (t - n.hoverScale) * 0.14;
      });

      const active = nodes.filter(n => n.kind !== 'TV' || n.alpha > 0.01);

      // ── physics ───────────────────────────────────────────────────────────
      active.forEach(n => {
        if (n.pinned) return;
        n.vx += (cx - n.x) * 0.0015;
        n.vy += (cy - n.y) * 0.0015;
      });

      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        for (let j = i + 1; j < active.length; j++) {
          const b = active[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d  = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minD = a.r + b.r + 28;
          if (d < minD) {
            const mag = (minD - d) / d * 0.5;
            if (!a.pinned) { a.vx += dx * mag; a.vy += dy * mag; }
            if (!b.pinned) { b.vx -= dx * mag; b.vy -= dy * mag; }
          }
        }
      }

      nodes.forEach(n => {
        if (n.kind === 'TC') {
          const par = nodes.find(p => p.id === n.parent);
          if (par) spring(par, n, 90, 0.05);
        }
        if (n.kind === 'TV' && n.visible) {
          const par = nodes.find(p => p.id === n.parent);
          if (par) spring(par, n, 60, 0.08);
        }
      });

      const tsAll = nodes.filter(n => n.kind === 'TS');
      for (let i = 0; i < tsAll.length; i++)
        for (let j = i + 1; j < tsAll.length; j++) {
          const s = sharedFRs(tsAll[i], tsAll[j]);
          spring(tsAll[i], tsAll[j], 160 - s * 15, 0.012);
        }

      const tcAll = nodes.filter(n => n.kind === 'TC');
      for (let i = 0; i < tcAll.length; i++)
        for (let j = i + 1; j < tcAll.length; j++) {
          const s = sharedFRs(tcAll[i], tcAll[j]);
          spring(tcAll[i], tcAll[j], 120 - s * 12, 0.015);
        }

      nodes.forEach(n => {
        if (n.pinned) return;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x  += n.vx;  n.y  += n.vy;
        n.x   = Math.max(GRAPH_MARGIN, Math.min(width  - GRAPH_MARGIN, n.x));
        n.y   = Math.max(GRAPH_MARGIN, Math.min(height - GRAPH_MARGIN, n.y));
      });

      // ── render ────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = GRAPH_BG;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.scale, cam.scale);

      const selId     = selectedIdRef.current;
      const connected = selId ? connectedSet(selId, nodes) : null;
      const frHL      = frHighlightRef.current;
      const activeIds  = selId ? new Set([selId, ...Array.from(connected ?? []), ...Array.from(frHL)]) : null;
      // Breathing pulse for FR highlight ring
      const pulse = 0.5 + 0.5 * Math.sin(frameRef.current * 0.07);

      // 1. Parent–child edges
      nodes.forEach(n => {
        if (!n.parent) return;
        const par  = nodes.find(p => p.id === n.parent);
        if (!par) return;
        const fadeA = n.kind === 'TV' ? n.alpha : 1;
        if (fadeA < 0.01) return;
        const isConn  = !activeIds || (activeIds.has(n.id) && activeIds.has(par.id));
        const opacity = fadeA * (isConn ? (n.kind === 'TV' ? 0.48 : 0.55) : 0.05);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.moveTo(par.x, par.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = isConn && selId ? '#3615CF' : '#cbd5e1';
        ctx.lineWidth   = isConn && selId ? 1.6 : 1;
        if (n.kind === 'TV') ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // 2. FR-shared edges
      frEdges.forEach(edge => {
        const fadeA = Math.min(
          edge.a.kind === 'TV' ? edge.a.alpha : 1,
          edge.b.kind === 'TV' ? edge.b.alpha : 1,
        );
        if (fadeA < 0.01) return;

        const isSelectedFR = !!selId && (edge.a.id === selId || edge.b.id === selId || (frHL.has(edge.a.id) && frHL.has(edge.b.id)));
        const isDimmed = !!activeIds && !isSelectedFR;
        ctx.save();
        ctx.globalAlpha = fadeA * (isSelectedFR ? 0.82 : isDimmed ? 0.04 : 0.16);
        ctx.beginPath();
        ctx.moveTo(edge.a.x, edge.a.y);
        ctx.lineTo(edge.b.x, edge.b.y);
        ctx.strokeStyle = isSelectedFR ? '#f9a84d' : '#d6b37a';
        ctx.lineWidth = (isSelectedFR ? 2.2 : 1) / cam.scale;
        ctx.setLineDash([7 / cam.scale, 5 / cam.scale]);
        if (isSelectedFR) {
          ctx.shadowBlur = 12 / cam.scale;
          ctx.shadowColor = 'rgba(249,168,77,0.42)';
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // 2. Nodes
      nodes.forEach(n => {
        const fadeA  = n.kind === 'TV' ? n.alpha : 1;
        const dimmed = activeIds ? !activeIds.has(n.id) : false;
        const total  = fadeA * (dimmed ? 0.34 : 1);
        if (total < 0.02) return;

        const r          = n.r * n.hoverScale;
        const st         = STYLE[n.kind];
        const isSelected = selId === n.id;
        const isHovered  = hoveredIdRef.current === n.id && !isSelected;
        const isFRHL     = frHL.has(n.id);
        const isDirect   = !!connected?.has(n.id);
        const fillColor  = dimmed ? '#edf2f7' : isSelected ? st.bgSel : st.bg;
        const strokeColor = dimmed ? '#cbd5e1' : st.stroke;
        const mainTextColor = dimmed ? '#94a3b8' : isSelected ? st.textSel : st.stroke;
        const nameTextColor = dimmed ? '#94a3b8' : isSelected ? st.stroke : '#475569';

        ctx.save();
        ctx.globalAlpha = total;

        // FR highlight breathing ring (amber)
        if (isFRHL) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + (9 + pulse * 4) / cam.scale, 0, Math.PI * 2);
          ctx.strokeStyle = '#f9a84d';
          ctx.lineWidth   = 3.2 / cam.scale;
          ctx.globalAlpha = total * (0.5 + pulse * 0.28);
          ctx.stroke();
          ctx.globalAlpha = total;
        }

        // Selection glow ring
        if (isSelected) {
          ctx.shadowBlur  = 20 / cam.scale;
          ctx.shadowColor = st.glow;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 8 / cam.scale, 0, Math.PI * 2);
          ctx.strokeStyle = st.stroke;
          ctx.lineWidth   = 2.8 / cam.scale;
          ctx.globalAlpha = total * 0.55;
          ctx.stroke();
          ctx.shadowBlur  = 0;
          ctx.globalAlpha = total;
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4 / cam.scale, 0, Math.PI * 2);
          ctx.strokeStyle = st.stroke;
          ctx.lineWidth   = 1.4 / cam.scale;
          ctx.globalAlpha = total * 0.25;
          ctx.stroke();
          ctx.globalAlpha = total;
        }

        // Connected node subtle glow
        if (!isSelected && !isFRHL && isDirect) {
          ctx.shadowBlur  = 8 / cam.scale;
          ctx.shadowColor = st.glow;
        }

        // Flat fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.shadowBlur  = 0;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = (isSelected ? 2.4 : isFRHL ? 2 : 1.3) / cam.scale;
        ctx.stroke();

        // Label
        const maxLen = n.kind === 'TS' ? 6 : n.kind === 'TC' ? 5 : 4;
        const text   = truncateLabel(n.label, maxLen);
        ctx.fillStyle    = mainTextColor;
        ctx.font         = `bold ${n.kind === 'TS' ? 9 : n.kind === 'TC' ? 8 : 7}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, n.x, n.y);

        // Node name below
        const nameMaxLen = n.kind === 'TS' ? 12 : n.kind === 'TC' ? 11 : 10;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = total * (isSelected || isFRHL ? 0.95 : dimmed ? 0.62 : 0.74);
        ctx.fillStyle = nameTextColor;
        ctx.font = `${n.kind === 'TV' ? 7 : 8}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(truncateLabel(n.name, nameMaxLen), n.x, n.y + r + 6 / cam.scale);
        ctx.globalAlpha = total;

        ctx.restore();
      });

      ctx.restore();

      // Zoom badge
      const pct = Math.round(cam.scale * 100);
      if (Math.abs(cam.scale - 1) > 0.06) {
        ctx.save();
        const bx = width - 52, by = height - 22;
        ctx.fillStyle = 'rgba(26,26,46,0.55)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx - 24, by - 11, 52, 22, 7);
        else ctx.rect(bx - 24, by - 11, 52, 22);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct}%`, bx, by);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  // ── interaction ───────────────────────────────────────────────────────────

  function canvasPos(e: MouseEvent<HTMLCanvasElement>) {
    const el = canvasRef.current!;
    const rect = el.getBoundingClientRect();
    return { sx: (e.clientX - rect.left) * (el.width / rect.width),
             sy: (e.clientY - rect.top)  * (el.height / rect.height) };
  }

  function toWorld(sx: number, sy: number) {
    const { x, y, scale } = cameraRef.current;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  }

  function hitTest(sx: number, sy: number): SimNode | null {
    const { x, y } = toWorld(sx, sy);
    for (const kind of ['TV', 'TC', 'TS'] as const) {
      for (const n of nodesRef.current) {
        if (n.kind !== kind) continue;
        if (n.kind === 'TV' && n.alpha < 0.5) continue;
        const dx = x - n.x, dy = y - n.y;
        if (dx * dx + dy * dy <= (n.r * n.hoverScale) ** 2) return n;
      }
    }
    return null;
  }

  function setCursor(v: string) { if (canvasRef.current) canvasRef.current.style.cursor = v; }

  function onMouseDown(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasPos(e);
    const hit = hitTest(sx, sy);
    if (hit) {
      hit.pinned = true;
      const w = toWorld(sx, sy);
      dragRef.current = { node: hit, offX: w.x - hit.x, offY: w.y - hit.y, startSX: sx, startSY: sy };
    } else {
      const cam = cameraRef.current;
      panRef.current = { startSX: sx, startSY: sy, camX: cam.x, camY: cam.y };
    }
    setCursor('grabbing');
  }

  function onMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasPos(e);
    if (dragRef.current) {
      const w = toWorld(sx, sy);
      const { node, offX, offY } = dragRef.current;
      node.x = w.x - offX; node.y = w.y - offY;
      node.vx = 0; node.vy = 0;
      return;
    }
    if (panRef.current) {
      const { startSX, startSY, camX, camY } = panRef.current;
      cameraRef.current.x = camX + (sx - startSX);
      cameraRef.current.y = camY + (sy - startSY);
      return;
    }
    const hit = hitTest(sx, sy);
    hoveredIdRef.current = hit?.id ?? null;
    setCursor(hit ? 'pointer' : 'grab');
  }

  function onMouseUp(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasPos(e);
    if (dragRef.current) {
      const { node, startSX, startSY } = dragRef.current;
      node.pinned = false;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) handleClick(node);
      dragRef.current = null;
    } else if (panRef.current) {
      const { startSX, startSY } = panRef.current;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) {
        selectedIdRef.current  = null;
        frHighlightRef.current = new Set();
        onNodeSelectRef.current?.(null);
      }
      panRef.current = null;
    }
    setCursor(hitTest(sx, sy) ? 'pointer' : 'grab');
  }

  function onMouseLeave() {
    if (dragRef.current) { dragRef.current.node.pinned = false; dragRef.current = null; }
    panRef.current       = null;
    hoveredIdRef.current = null;
    setCursor('default');
  }

  function onDblClick(e: MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasPos(e);
    if (!hitTest(sx, sy)) cameraRef.current = { x: 0, y: 0, scale: 1 };
  }

  function handleClick(node: SimNode) {
    const nodes = nodesRef.current;

    if (selectedIdRef.current === node.id) {
      applySelection(null, nodes, selectedIdRef, frHighlightRef, selectedTCRef);
      onNodeSelectRef.current?.(null);
    } else {
      applySelection(node.id, nodes, selectedIdRef, frHighlightRef, selectedTCRef);
      onNodeSelectRef.current?.(node.id);
    }

    if (node.kind === 'TC') {
      if (selectedTCRef.current === node.id) {
        selectedTCRef.current = null;
        if (!zoomTVModeRef.current) nodes.forEach(n => { if (n.kind === 'TV') n.visible = false; });
      } else {
        selectedTCRef.current = node.id;
        if (!zoomTVModeRef.current) bloomTVForTC(node.id, nodes, node);
      }
    }
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
