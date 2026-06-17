import { useEffect, useRef } from 'react';
import { getStatistics } from '../../api/results';
import type { ResultStatistics } from '../../api/results';
import type { Service } from '../pages/DashHomePage';

const NODE_R = 38;
const GRAPH_BG = '#f9f8ff';
const MARGIN = NODE_R + 20;

interface SimNode {
  service: Service;
  stats: ResultStatistics | null;
  loading: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
  hoverScale: number;
}

interface Edge { a: SimNode; b: SimNode; }

function nodeColors(stats: ResultStatistics | null, loading: boolean) {
  if (loading) return { fill: '#f3f4f6', stroke: '#d1d5db', labelColor: '#9ca3af', ratioColor: '#9ca3af' };
  if (!stats || stats.total === 0)
    return { fill: 'rgba(148,163,184,0.12)', stroke: '#94a3b8', labelColor: '#475569', ratioColor: '#94a3b8' };
  const pct = Math.round((stats.passed / stats.total) * 100);
  if (pct >= 80) return { fill: 'rgba(16,185,129,0.12)', stroke: '#10b981', labelColor: '#064e3b', ratioColor: '#10b981' };
  if (pct >= 50) return { fill: 'rgba(245,158,11,0.12)', stroke: '#f59e0b', labelColor: '#78350f', ratioColor: '#f59e0b' };
  return { fill: 'rgba(239,68,68,0.10)', stroke: '#ef4444', labelColor: '#7f1d1d', ratioColor: '#ef4444' };
}

function slugGroup(slug: string): string {
  return (slug.split(/[-_]/)[0] ?? slug).toLowerCase();
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

interface Props {
  services: Service[];
  onServiceSelect: (service: Service) => void;
  width: number;
  height: number;
}

export function ServiceGraphCanvas({ services, onServiceSelect, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const hoveredRef = useRef<SimNode | null>(null);
  const dragRef = useRef<{ node: SimNode; offX: number; offY: number; startSX: number; startSY: number } | null>(null);
  const rafRef = useRef<number>(0);
  const onSelectRef = useRef(onServiceSelect);
  onSelectRef.current = onServiceSelect;

  // Build nodes + edges when services change
  useEffect(() => {
    const cx = width / 2, cy = height / 2;
    const n = services.length;
    const radius = Math.min(width, height) * 0.28;

    const nodes: SimNode[] = services.map((s, i) => {
      const angle = n > 1 ? (2 * Math.PI * i) / n - Math.PI / 2 : 0;
      return {
        service: s,
        stats: null,
        loading: true,
        x: n === 1 ? cx : cx + radius * Math.cos(angle),
        y: n === 1 ? cy : cy + radius * Math.sin(angle),
        vx: 0, vy: 0,
        pinned: false,
        hoverScale: 1,
      };
    });
    nodesRef.current = nodes;

    // Edges: same slug prefix → related services
    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ga = slugGroup(nodes[i].service.id);
        const gb = slugGroup(nodes[j].service.id);
        if (ga === gb && ga.length > 1) {
          edges.push({ a: nodes[i], b: nodes[j] });
        }
      }
    }
    edgesRef.current = edges;
  }, [services, width, height]);

  // Fetch statistics per service
  useEffect(() => {
    services.forEach(svc => {
      const key = svc.serviceId ?? svc.id;
      const node = nodesRef.current.find(n => n.service === svc);
      if (!node) return;
      node.loading = true;
      node.stats = null;
      getStatistics(key)
        .then(st => { node.stats = st; })
        .catch(() => { node.stats = null; })
        .finally(() => { node.loading = false; });
    });
  }, [services]);

  // Canvas hit test (screen coords)
  function hitTest(sx: number, sy: number): SimNode | null {
    for (const n of nodesRef.current) {
      const r = NODE_R * n.hoverScale;
      const dx = sx - n.x, dy = sy - n.y;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  }

  function canvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
    const el = canvasRef.current!;
    const rect = el.getBoundingClientRect();
    return {
      sx: (e.clientX - rect.left) * (el.width / rect.width),
      sy: (e.clientY - rect.top)  * (el.height / rect.height),
    };
  }

  // RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = width / 2, cy = height / 2;

    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Center gravity
      nodes.forEach(n => {
        if (n.pinned) return;
        n.vx += (cx - n.x) * 0.0018;
        n.vy += (cy - n.y) * 0.0018;
      });

      // Node repulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minD = NODE_R * 2 + 70;
          if (d < minD) {
            const mag = ((minD - d) / d) * 0.4;
            if (!a.pinned) { a.vx += dx * mag; a.vy += dy * mag; }
            if (!b.pinned) { b.vx -= dx * mag; b.vy -= dy * mag; }
          }
        }
      }

      // Edge spring (pull connected nodes toward each other)
      edges.forEach(e => {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const target = NODE_R * 2 + 100;
        const f = ((d - target) / d) * 0.025;
        if (!e.a.pinned) { e.a.vx += dx * f; e.a.vy += dy * f; }
        if (!e.b.pinned) { e.b.vx -= dx * f; e.b.vy -= dy * f; }
      });

      // Hover scale animation
      nodes.forEach(n => {
        const target = hoveredRef.current === n ? 1.14 : 1.0;
        n.hoverScale += (target - n.hoverScale) * 0.14;
      });

      // Integrate + boundary
      nodes.forEach(n => {
        if (n.pinned) return;
        n.vx *= 0.84; n.vy *= 0.84;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(MARGIN, Math.min(width  - MARGIN, n.x));
        n.y = Math.max(MARGIN, Math.min(height - MARGIN, n.y));
      });

      // ── Render ──────────────────────────────────────────────────────────

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = GRAPH_BG;
      ctx.fillRect(0, 0, width, height);

      // Edges
      edges.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.strokeStyle = '#c7d2fe';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });

      // Nodes
      nodes.forEach(n => {
        const r = NODE_R * n.hoverScale;
        const { fill, stroke, labelColor, ratioColor } = nodeColors(n.stats, n.loading);
        const isHovered = hoveredRef.current === n;

        // Hover glow ring
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 9, 0, Math.PI * 2);
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.18;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Drop shadow
        ctx.shadowBlur = isHovered ? 18 : 8;
        ctx.shadowColor = isHovered ? stroke + '55' : 'rgba(54,21,207,0.06)';

        // Circle fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = isHovered ? 2.2 : 1.6;
        ctx.stroke();

        // Service name
        ctx.fillStyle = labelColor;
        ctx.font = `600 10px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncate(n.service.name, 13), n.x, n.y - 8);

        // Pass rate / status
        if (n.loading) {
          ctx.fillStyle = '#9ca3af';
          ctx.font = `9px -apple-system, sans-serif`;
          ctx.fillText('loading…', n.x, n.y + 8);
        } else if (n.stats && n.stats.total > 0) {
          const pct = Math.round((n.stats.passed / n.stats.total) * 100);
          ctx.fillStyle = ratioColor;
          ctx.font = `bold 13px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillText(`${pct}%`, n.x, n.y + 9);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `9px -apple-system, sans-serif`;
          ctx.fillText('no data', n.x, n.y + 8);
        }
      });

      // Legend (bottom-right)
      const legend = [
        { color: '#10b981', label: '≥ 80%' },
        { color: '#f59e0b', label: '50–79%' },
        { color: '#ef4444', label: '< 50%' },
        { color: '#94a3b8', label: '데이터 없음' },
      ];
      const lx = width - 110, ly = height - 14 - legend.length * 18;
      legend.forEach((item, i) => {
        const y = ly + i * 18;
        ctx.beginPath();
        ctx.arc(lx + 6, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = item.color + '30';
        ctx.fill();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#6b7280';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, lx + 16, y);
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  // ── Interaction ──────────────────────────────────────────────────────────

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasCoords(e);
    if (dragRef.current) {
      const { node, offX, offY } = dragRef.current;
      node.x = sx - offX;
      node.y = sy - offY;
      node.vx = 0; node.vy = 0;
      return;
    }
    const hit = hitTest(sx, sy);
    hoveredRef.current = hit;
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'default';
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasCoords(e);
    const hit = hitTest(sx, sy);
    if (hit) {
      hit.pinned = true;
      dragRef.current = { node: hit, offX: sx - hit.x, offY: sy - hit.y, startSX: sx, startSY: sy };
    }
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    const { sx, sy } = canvasCoords(e);
    if (dragRef.current) {
      const { node, startSX, startSY } = dragRef.current;
      node.pinned = false;
      if (Math.hypot(sx - startSX, sy - startSY) < 4) {
        onSelectRef.current(node.service);
      }
      dragRef.current = null;
    }
  }

  function onMouseLeave() {
    if (dragRef.current) {
      dragRef.current.node.pinned = false;
      dragRef.current = null;
    }
    hoveredRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ display: 'block' }}
    />
  );
}
