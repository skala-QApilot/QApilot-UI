import React from 'react';
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface LineConfig {
  dataKey: string;
  stroke: string;
  strokeWidth?: number;
  dashed?: boolean;
  name: string;
  gradient?: boolean;
}

interface PassRateChartProps {
  data: any[];
  title?: string;
  lines?: LineConfig[];
  height?: number;
  legend?: Array<{ color: string; label: string; dashed?: boolean }>;
  customTooltip?: React.ReactNode;
  className?: string;
  stickyAxes?: boolean;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{children}</span>
);

const Y_AXIS_WIDTH = 36;
const X_AXIS_HEIGHT = 24;

export const PassRateChart = ({
  data,
  title = 'PASS율',
  lines,
  height = 165,
  legend,
  className,
  stickyAxes = false,
}: PassRateChartProps) => {
  const defaultLines: LineConfig[] = [
    { dataKey: 'pass', stroke: 'var(--status-pass)', strokeWidth: 2.5, name: 'PASS', gradient: true },
    { dataKey: 'total', stroke: '#9ca3af', strokeWidth: 2, name: '전체' },
    { dataKey: 'fail', stroke: 'var(--status-fail)', strokeWidth: 2, dashed: true, name: 'FAIL' },
    { dataKey: 'unverified', stroke: '#7c8db5', strokeWidth: 1.5, dashed: true, name: 'UNVERIFIED' },
    { dataKey: 'skipped', stroke: '#d4a017', strokeWidth: 1.5, dashed: true, name: 'SKIPPED' },
  ];

  const defaultLegend = [
    { color: 'var(--status-pass)', label: 'PASS', dashed: false },
    { color: '#9ca3af',             label: '전체', dashed: false },
    { color: 'var(--status-fail)',  label: 'FAIL', dashed: true },
    { color: '#7c8db5',             label: 'UNVERIFIED', dashed: true },
    { color: '#d4a017',             label: 'SKIPPED', dashed: true },
  ];

  const chartLines = lines || defaultLines;
  const chartLegend = legend || defaultLegend;

  const gradientLines = chartLines.filter(l => l.gradient);

  const header = (
    <div className="flex items-center justify-between mb-3">
      <Label>{title}</Label>
      <div className="flex items-center gap-5">
        {chartLegend.map(({ color, label, dashed }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width="18" height="10">
              <line x1="0" y1="5" x2="18" y2="5"
                stroke={color} strokeWidth="2"
                strokeDasharray={dashed ? '3 2' : undefined} />
            </svg>
            <span className="text-xs text-[#9ca3af]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    if (!stickyAxes) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, [stickyAxes]);

  const PX_PER_POINT = containerWidth > 0 ? Math.floor(containerWidth / 8) : 40;
  const chartWidth = Math.max(containerWidth, data.length * PX_PER_POINT);

  const gradientDefs = (
    <defs>
      {gradientLines.map(l => (
        <linearGradient key={l.dataKey} id={`grad-${l.dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={l.stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={l.stroke} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );

  if (stickyAxes) {
    return (
      <div className={className ?? 'flex-1 min-w-0'}>
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0 whitespace-nowrap">
            <Label>{title}</Label>
          </div>
          <div className="flex-1 flex justify-end" style={{ paddingRight: 10 }}>
            <div className="flex items-center gap-5">
              {chartLegend.map(({ color, label, dashed }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <svg width="18" height="10">
                    <line x1="0" y1="5" x2="18" y2="5"
                      stroke={color} strokeWidth="2.5"
                      strokeDasharray={dashed ? '3 2' : undefined} />
                  </svg>
                  <span className="text-xs font-bold" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex" style={{ height }}>

          {/* Fixed Y-axis panel */}
          <div className="flex-shrink-0 bg-transparent" style={{ width: Y_AXIS_WIDTH + 4 }}>
            <LineChart
              width={Y_AXIS_WIDTH + 4}
              height={height}
              data={data}
              margin={{ top: 2, right: 0, bottom: X_AXIS_HEIGHT, left: 0 }}
            >
              <YAxis
                tick={{ fontSize: 11, fill: '#c4c9d4' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                width={Y_AXIS_WIDTH}
              />
            </LineChart>
          </div>

          {/* Scrollable data + X-axis */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-w-0 overflow-x-auto no-scrollbar"
            style={{ scrollbarWidth: 'none' } as React.CSSProperties}
          >
            <ComposedChart
              width={chartWidth}
              height={height}
              data={data}
              margin={{ top: 2, right: 10, bottom: 0, left: 0 }}
            >
              {gradientDefs}
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#c4c9d4' }}
                axisLine={false}
                tickLine={false}
                height={X_AXIS_HEIGHT}
                padding={{ left: 8, right: 8 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              {chartLines.map(line =>
                line.gradient ? (
                  <Area
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth || 2}
                    fill={`url(#grad-${line.dataKey})`}
                    dot={false}
                    name={line.name}
                    connectNulls
                  />
                ) : (
                  <Line
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth || 2}
                    strokeDasharray={line.dashed ? '4 2' : undefined}
                    dot={false}
                    name={line.name}
                    connectNulls
                  />
                )
              )}
            </ComposedChart>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? 'flex-1 min-w-0'}>
      {header}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
          {gradientDefs}
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#c4c9d4' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#c4c9d4' }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          {chartLines.map(line =>
            line.gradient ? (
              <Area
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth || 2}
                fill={`url(#grad-${line.dataKey})`}
                dot={false}
                name={line.name}
                connectNulls
              />
            ) : (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.dashed ? '4 2' : undefined}
                dot={false}
                name={line.name}
                connectNulls
              />
            )
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
