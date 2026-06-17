import { ExecutionHistoryRow } from './ExecutionHistoryRow';
import type { UiExecutionRow } from '../../../store/testStore';

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{children}</span>
);

interface ExecutionHistoryListProps {
  history: UiExecutionRow[];
  onRowClick?: () => void;
}

export const ExecutionHistoryList = ({ history, onRowClick }: ExecutionHistoryListProps) => {
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <Label>이력</Label>
      </div>
      <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {history.map(exec => (
          <ExecutionHistoryRow
            key={exec.id}
            exec={exec}
            onClick={onRowClick}
          />
        ))}
      </div>
    </div>
  );
};
