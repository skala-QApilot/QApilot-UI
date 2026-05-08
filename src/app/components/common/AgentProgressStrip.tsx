import { Fragment } from 'react';
import { Check } from 'lucide-react';

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
  <>
    <style>{`
      @keyframes agent-glow-pulse {
        0%, 100% { opacity: 0.25; box-shadow: 0 0 3px 1px rgba(54, 21, 207, 0.3); }
        50%       { opacity: 1;    box-shadow: 0 0 10px 4px rgba(54, 21, 207, 0.65); }
      }
      .agent-glow { animation: agent-glow-pulse 1.4s ease-in-out infinite; }
    `}</style>

    <div className="flex flex-shrink-0 items-start px-6 py-2">
      {AGENT_STAGES.map((stage, index) => {
        const status   = getNodeStatus(stage.key);
        const active   = status === 'running';
        const complete = status === 'complete';
        const isLast   = index === AGENT_STAGES.length - 1;

        return (
          <Fragment key={stage.key}>
            <div className="flex flex-col items-center flex-shrink-0">
              {/* Circle */}
              <div
                className={`w-2.5 h-2.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  complete
                    ? 'bg-primary-blue'
                    : active
                      ? 'bg-primary-blue/20 ring-1 ring-primary-blue/40'
                      : 'bg-[#d8dce4]'
                }`}
              >
                {complete && <Check className="w-1.5 h-1.5 text-white" />}
              </div>

              {/* Glow light below circle */}
              <div
                className={`mt-0.5 w-3 h-[3px] rounded-full transition-all duration-300 ${
                  active ? 'bg-primary-blue agent-glow' : ''
                }`}
                style={
                  complete
                    ? { background: 'var(--primary-blue, #3615CF)', opacity: 0.4, boxShadow: '0 0 4px 1px rgba(54,21,207,0.25)' }
                    : !active
                      ? { background: 'transparent' }
                      : undefined
                }
              />

              {/* Label */}
              <span
                className={`mt-1 text-[9px] font-medium ${
                  active || complete ? 'text-[#1a1a2e]' : 'text-[#b0b5c0]'
                }`}
              >
                {stage.label.length > 7 ? stage.label.slice(0, 6) + '…' : stage.label}
              </span>
            </div>

            {/* Connector line — vertically centered to circle (5 px = half of 10 px circle) */}
            {!isLast && (
              <div
                className={`flex-1 h-px mx-3 mt-[5px] ${
                  complete ? 'bg-primary-blue/40' : 'bg-[#d8dce4]'
                }`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  </>
);
