import { Check, Loader2 } from 'lucide-react';

const AGENT_STAGES = [
  { key: 'UI', label: 'UI' },
  { key: 'API', label: 'API' },
  { key: 'DB', label: 'DB' },
  { key: 'Cross-check', label: 'Cross-check' },
  { key: '원인 분석', label: 'analysis' },
  { key: 'Report 생성', label: 'report' },
];

interface AgentProgressStripProps {
  getNodeStatus: (stage: string) => 'inactive' | 'running' | 'complete';
}

export const AgentProgressStrip = ({ getNodeStatus }: AgentProgressStripProps) => (
  <div className="flex h-14 flex-shrink-0 items-center rounded-lg border border-[#eceef3] bg-white px-4">
    <div className="grid w-full grid-cols-[repeat(6,minmax(0,1fr))] items-center gap-2">
      {AGENT_STAGES.map((stage, index) => {
        const status = getNodeStatus(stage.key);
        const active = status === 'running';
        const complete = status === 'complete';

        return (
          <div key={stage.key} className="flex min-w-0 items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  complete
                    ? 'bg-primary-blue text-white'
                    : active
                      ? 'bg-primary-blue/15 text-primary-blue ring-2 ring-primary-blue/25'
                      : 'bg-[#eef0f4] text-[#9ca3af]'
                }`}
              >
                {complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  stage.label.slice(0, 2)
                )}
              </div>
              <span
                className={`truncate text-[11px] font-semibold ${
                  active || complete ? 'text-[#1a1a2e]' : 'text-[#9ca3af]'
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < AGENT_STAGES.length - 1 && (
              <div className={`mx-1 h-px w-7 flex-shrink-0 ${complete ? 'bg-primary-blue' : 'bg-[#d8dce4]'}`} />
            )}
          </div>
        );
      })}
    </div>
  </div>
);
