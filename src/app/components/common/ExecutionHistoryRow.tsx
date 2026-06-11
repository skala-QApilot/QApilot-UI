import { Loader2 } from 'lucide-react';

interface ExecutionHistoryRowItem {
  id: string;
  groupId: string;
  executionNumber?: number;
  startDate: string;
  duration?: string;
  pass: number;
  fail: number;
  /** 검증 미완 (실행됐지만 자동 검증 불가 — 수동 검토 대상). 미실행(N)과 구분 */
  skipped?: number;
  notRun: number;
}

interface ExecutionHistoryRowProps {
  exec: ExecutionHistoryRowItem;
  onClick?: () => void;
  loading?: boolean;
}

export const ExecutionHistoryRow = ({ exec, onClick, loading = false }: ExecutionHistoryRowProps) => {
  const skipped = exec.skipped ?? 0;
  const total = exec.pass + exec.fail + skipped + exec.notRun;
  const passPct = total > 0 ? (exec.pass / total) * 100 : 0;
  const failPct = total > 0 ? (exec.fail / total) * 100 : 0;
  const skipPct = total > 0 ? (skipped / total) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-5 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-[#374151]">{exec.groupId}</span>
        {exec.executionNumber !== undefined && (
          <span className="text-xs text-[#c4c9d4] ml-2">#{exec.executionNumber}</span>
        )}
      </div>
      <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.startDate}</span>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 text-primary-blue animate-spin flex-shrink-0" />
      ) : (
        exec.duration && (
          <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.duration}</span>
        )
      )}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {!loading && (
          <>
            <span className="text-xs font-medium text-status-pass">{exec.pass}P</span>
            <span className="text-xs font-medium text-status-fail">{exec.fail}F</span>
            {skipped > 0 && (
              <span className="text-xs font-medium text-[#d4a017]" title="검증 미완 (자동화 불가 — 수동 검토)">{skipped}S</span>
            )}
            <span className="text-xs font-medium text-[#9ca3af]">{exec.notRun}N</span>
          </>
        )}
        <div className="w-[70px] h-1.5 rounded-full overflow-hidden flex bg-[#f0f0f0]">
          {loading
            ? <div className="w-full h-full bg-[#e5e7eb] animate-pulse rounded-full" />
            : <>
                <div style={{ width: `${passPct}%`, background: 'var(--status-pass)' }} />
                <div style={{ width: `${failPct}%`, background: 'var(--status-fail)' }} />
                <div style={{ width: `${skipPct}%`, background: '#d4a017' }} />
              </>
          }
        </div>
      </div>
    </button>
  );
};
