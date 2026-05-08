interface ExecutionHistoryRowItem {
  id: string;
  groupId: string;
  executionNumber: number;
  startDate: string;
  duration?: string;
  pass: number;
  fail: number;
  notRun: number;
}

interface ExecutionHistoryRowProps {
  exec: ExecutionHistoryRowItem;
  onClick?: () => void;
}

export const ExecutionHistoryRow = ({ exec, onClick }: ExecutionHistoryRowProps) => {
  const total = exec.pass + exec.fail + exec.notRun;
  const passPct  = total > 0 ? (exec.pass   / total) * 100 : 0;
  const failPct  = total > 0 ? (exec.fail   / total) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-5 py-3 hover:bg-gray-50 transition-colors text-left rounded px-2 -mx-2"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-[#374151]">{exec.groupId}</span>
        <span className="text-xs text-[#c4c9d4] ml-2">#{exec.executionNumber}</span>
      </div>
      <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.startDate}</span>
      {exec.duration && (
        <span className="text-xs text-[#c4c9d4] flex-shrink-0">{exec.duration}</span>
      )}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className="text-xs font-medium text-status-pass">{exec.pass}P</span>
        <span className="text-xs font-medium text-status-fail">{exec.fail}F</span>
        <span className="text-xs font-medium text-[#9ca3af]">{exec.notRun}N</span>
        <div className="w-[70px] h-1.5 rounded-full overflow-hidden flex bg-[#f0f0f0]">
          <div style={{ width: `${passPct}%`, background: 'var(--status-pass)' }} />
          <div style={{ width: `${failPct}%`, background: 'var(--status-fail)' }} />
        </div>
      </div>
    </button>
  );
};
