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
      @keyframes circle-glow-pulse {
        0%, 100% {
          box-shadow: 0 0 0px 0px rgba(54, 21, 207, 0);
        }
        50% {
          box-shadow: 0 0 10px 5px rgba(54, 21, 207, 0.55);
        }
      }
      .circle-glow-active {
        animation: circle-glow-pulse 1.4s ease-in-out infinite;
      }
      .circle-glow-complete {
        box-shadow: 0 0 8px 3px rgba(54, 21, 207, 0.35);
      }
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
              {/* Circle — glow on the circle itself */}
              <div
                className={`w-2.5 h-2.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  complete
                    ? 'bg-primary-blue circle-glow-complete'
                    : active
                      ? 'bg-primary-blue/25 ring-1 ring-primary-blue/50 circle-glow-active'
                      : 'bg-[#d8dce4]'
                }`}
              >
                {complete && <Check className="w-1.5 h-1.5 text-white" />}
              </div>

              {/* Label */}
              <span
                className={`mt-1 text-[9px] font-medium ${
                  active || complete ? 'text-[#1a1a2e]' : 'text-[#b0b5c0]'
                }`}
              >
                {stage.label.length > 7 ? stage.label.slice(0, 6) + '…' : stage.label}
              </span>
            </div>

            {/* Connector line */}
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
