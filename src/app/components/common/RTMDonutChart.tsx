import { Cell, Pie, PieChart } from 'recharts';

const COLORS = [
  { fill: '#3615CF',  label: '충족',   textClass: 'text-[#3615CF]' },
  { fill: '#C5C0EC',  label: '미충족', textClass: 'text-[#9ca3af]' },
  { fill: '#E5E7EB',  label: '미측정', textClass: 'text-[#9ca3af]' },
];

interface RTMDonutChartProps {
  metReqs: number;
  unmetReqs: number;
  unrunReqs: number;
  totalReqs: number;
  overallPct: number;
  size?: 'sm' | 'lg';
}

export const RTMDonutChart = ({
  metReqs, unmetReqs, unrunReqs, totalReqs, overallPct, size = 'lg',
}: RTMDonutChartProps) => {
  const isLg = size === 'lg';

  const chartSize   = isLg ? 175 : 120;
  const cx          = isLg ? 80  : 55;
  const cy          = isLg ? 80  : 55;
  const innerRadius = isLg ? 48  : 36;
  const outerRadius = isLg ? 78  : 54;

  const counts = [metReqs, unmetReqs, unrunReqs];
  const total  = counts.reduce((a, b) => a + b, 0);
  const data   = total > 0
    ? counts.map(v => ({ value: v }))
    : [{ value: 0 }, { value: 0 }, { value: 1 }];

  return (
    <div className="flex items-center" style={{ gap: isLg ? 24 : 16 }}>
      {/* Donut */}
      <div className="relative flex-shrink-0" style={{ width: chartSize, height: chartSize }}>
        <PieChart width={chartSize} height={chartSize}>
          <Pie
            data={data}
            cx={cx} cy={cy}
            innerRadius={innerRadius} outerRadius={outerRadius}
            dataKey="value"
            startAngle={90} endAngle={-270}
            strokeWidth={0}
          >
            {COLORS.map(c => <Cell key={c.label} fill={c.fill} />)}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-[#1a1a2e] ${isLg ? 'text-xl' : 'text-sm'}`}>
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className={isLg ? 'space-y-4' : 'space-y-2'}>
        {COLORS.map((c, i) => (
          <div key={c.label} className="flex items-center" style={{ gap: isLg ? 12 : 8 }}>
            <span
              className="rounded-full flex-shrink-0"
              style={{
                width: isLg ? 10 : 8,
                height: isLg ? 10 : 8,
                background: c.fill,
              }}
            />
            <span
              className={`text-[#9ca3af] ${isLg ? 'text-sm w-12' : 'text-xs w-10'}`}
            >
              {c.label}
            </span>
            <span
              className={`font-semibold ${isLg ? 'text-base text-[#374151]' : `text-xs ${c.textClass}`}`}
            >
              {counts[i]}건
            </span>
          </div>
        ))}
        <div className={`text-[#d1d5db] pt-1 ${isLg ? 'text-xs' : 'text-[10px]'}`}>
          전체 {totalReqs}건
        </div>
      </div>
    </div>
  );
};
