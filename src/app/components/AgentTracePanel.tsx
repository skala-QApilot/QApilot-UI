import React, { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, Globe, Loader2, Wrench, X, Zap } from 'lucide-react';
import type { AgentTraceItem, AgentStage } from '../data/mockData';

const STAGE_COLOR: Record<AgentStage, { bg: string; text: string; border: string; dot: string }> = {
  '시나리오': { bg: 'bg-[#f78ca0]/8',  text: 'text-[#f78ca0]',  border: 'border-[#f78ca0]/30', dot: 'bg-[#f78ca0]' },
  '테스트':   { bg: 'bg-blue-50',       text: 'text-blue-600',   border: 'border-blue-200',      dot: 'bg-blue-500' },
  '원인분석': { bg: 'bg-violet-50',     text: 'text-violet-600', border: 'border-violet-200',    dot: 'bg-violet-500' },
};

const MCP_SERVER_COLOR: Record<string, string> = {
  github:      'bg-slate-100 text-slate-700',
  notion:      'bg-indigo-50 text-indigo-700',
  playwright:  'bg-emerald-50 text-emerald-700',
  'api-server':'bg-amber-50 text-amber-700',
  sentry:      'bg-red-50 text-red-700',
};

function TraceStep({ item }: { item: AgentTraceItem }) {
  const [open, setOpen] = useState(false);
  const stageCol = STAGE_COLOR[item.stage];
  const hasDetail = !!(item.params || item.result);

  if (item.type === 'stage_start') {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div className={`w-2 h-2 rounded-full ${stageCol.dot} flex-shrink-0`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${stageCol.text}`}>{item.stage}</span>
        <div className={`flex-1 h-px ${stageCol.border.replace('border-', 'bg-').replace('/30', '/25')}`} />
      </div>
    );
  }

  if (item.type === 'stage_done') {
    return (
      <div className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg ${stageCol.bg} border ${stageCol.border} my-1`}>
        <CheckCircle className={`w-3 h-3 flex-shrink-0 ${stageCol.text}`} />
        <span className={`text-[10.5px] font-medium ${stageCol.text}`}>{item.label}</span>
        {item.status === 'running' && <Loader2 className={`w-3 h-3 ml-auto animate-spin ${stageCol.text}`} />}
      </div>
    );
  }

  if (item.type === 'think') {
    return (
      <div className="flex gap-2.5 py-1">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px]">💭</span>
          </div>
          <div className="w-px flex-1 bg-[#f0f0f0] mt-1" />
        </div>
        <div className="pb-2 flex-1 min-w-0">
          <p className="text-[10.5px] text-[#6b7280] italic leading-[1.6]">{item.label}</p>
        </div>
      </div>
    );
  }

  // tool / mcp
  const isMcp = item.type === 'mcp';
  const Icon = isMcp ? Globe : Wrench;
  const iconBg = isMcp ? 'bg-emerald-100' : 'bg-blue-100';
  const iconColor = isMcp ? 'text-emerald-600' : 'text-blue-600';
  const serverStyle = isMcp && item.mcpServer ? (MCP_SERVER_COLOR[item.mcpServer] ?? 'bg-slate-100 text-slate-600') : '';

  return (
    <div className="flex gap-2.5 py-1">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-5 h-5 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-2.5 h-2.5 ${iconColor}`} />
        </div>
        <div className="w-px flex-1 bg-[#f0f0f0] mt-1" />
      </div>
      <div className="pb-2 flex-1 min-w-0">
        {/* 헤더 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isMcp && item.mcpServer && (
            <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${serverStyle}`}>
              MCP · {item.mcpServer}
            </span>
          )}
          <span className="font-mono text-[10.5px] font-semibold text-[#1a1a2e]">{item.label}</span>
          {item.subLabel && <span className="text-[9.5px] text-[#9ca3af]">— {item.subLabel}</span>}
          <div className="ml-auto flex items-center gap-1.5">
            {item.duration && (
              <span className="text-[9px] text-[#c4c9d4] font-mono">{item.duration}</span>
            )}
            {item.status === 'error' && <span className="text-[9px] text-red-400 font-medium">↯</span>}
            {item.status === 'running' && <Loader2 className="w-3 h-3 text-[#9ca3af] animate-spin" />}
            {hasDetail && (
              <button onClick={() => setOpen(o => !o)}
                className="w-4 h-4 flex items-center justify-center text-[#9ca3af] hover:text-[#6b7280]">
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* 파라미터 / 결과 */}
        {open && hasDetail && (
          <div className="mt-1.5 space-y-1">
            {item.params && (
              <div className="rounded border border-slate-100 bg-slate-50 overflow-hidden">
                <div className="px-2 py-0.5 bg-slate-100 border-b border-slate-100">
                  <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">Request</span>
                </div>
                <pre className="px-2.5 py-1.5 text-[10px] font-mono text-slate-700 overflow-x-auto leading-[1.6] whitespace-pre-wrap">{item.params}</pre>
              </div>
            )}
            {item.result && (
              <div className={`rounded border overflow-hidden ${item.status === 'error' ? 'border-red-100 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
                <div className={`px-2 py-0.5 border-b ${item.status === 'error' ? 'bg-red-100 border-red-100' : 'bg-emerald-100 border-emerald-100'}`}>
                  <span className={`text-[8.5px] font-semibold uppercase tracking-wider ${item.status === 'error' ? 'text-red-400' : 'text-emerald-500'}`}>
                    Response
                  </span>
                </div>
                <pre className={`px-2.5 py-1.5 text-[10px] font-mono overflow-x-auto leading-[1.6] whitespace-pre-wrap ${item.status === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{item.result}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentTracePanelProps {
  items: AgentTraceItem[];
  onClose: () => void;
}

export default function AgentTracePanel({ items, onClose }: AgentTracePanelProps) {
  const stages: AgentStage[] = ['시나리오', '테스트', '원인분석'];
  const [activeStage, setActiveStage] = useState<AgentStage | 'all'>('all');

  const filtered = activeStage === 'all' ? items : items.filter(i => i.stage === activeStage);

  const toolCount = items.filter(i => i.type === 'tool').length;
  const mcpCount  = items.filter(i => i.type === 'mcp').length;
  const lastRunning = items.find(i => i.status === 'running');

  return (
    <div className="flex flex-col bg-white border-b border-[#f0f0f0] shadow-lg" style={{ maxHeight: '420px' }}>
      {/* ── 상단 헤더 ── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[#f0f0f0] bg-gradient-to-r from-[#f78ca0]/5 to-transparent flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#f78ca0] to-[#fe9a8b] flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-[11px] font-semibold text-[#1a1a2e]">Agent 실행 트레이스</span>
        </div>

        {/* 통계 칩 */}
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-medium rounded-full">
            🔧 Tool ×{toolCount}
          </span>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-medium rounded-full">
            🌐 MCP ×{mcpCount}
          </span>
        </div>

        {/* 현재 활동 */}
        {lastRunning && (
          <div className="flex items-center gap-1.5 ml-1">
            <Loader2 className="w-3 h-3 text-[#f78ca0] animate-spin flex-shrink-0" />
            <span className="text-[10px] text-[#f78ca0] font-medium truncate max-w-[220px]">
              {lastRunning.label}
            </span>
          </div>
        )}

        {/* 스테이지 필터 */}
        <div className="ml-auto flex items-center gap-1">
          {(['all', ...stages] as const).map(s => (
            <button key={s} onClick={() => setActiveStage(s)}
              className={`px-2 py-0.5 rounded text-[9.5px] font-medium transition-colors ${
                activeStage === s
                  ? s === 'all' ? 'bg-[#1a1a2e] text-white'
                    : `${STAGE_COLOR[s as AgentStage].bg} ${STAGE_COLOR[s as AgentStage].text} border ${STAGE_COLOR[s as AgentStage].border}`
                  : 'text-[#9ca3af] hover:bg-gray-50'
              }`}>
              {s === 'all' ? '전체' : s}
            </button>
          ))}
        </div>

        <button onClick={onClose} className="ml-2 p-1 hover:bg-gray-100 rounded text-[#9ca3af] flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── 트레이스 로그 ── */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {filtered.map(item => <TraceStep key={item.id} item={item} />)}
      </div>
    </div>
  );
}
