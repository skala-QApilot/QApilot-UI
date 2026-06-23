import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';

interface RuntimeLog {
  time: string;
  action: string;
  apiMethod?: string;
  endpoint?: string;
  status: number | null;
  responseTime?: string;
  isError?: boolean;
  hitl?: boolean;
}

interface RuntimeTerminalProps {
  logs: RuntimeLog[];
  highlightedLogIdx: number | null;
  idPrefix: string;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

interface TerminalFrameProps {
  title: string;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}

export const TerminalFrame = ({ title, children, bodyClassName = '', className = '' }: TerminalFrameProps) => (
  <div className={`overflow-hidden rounded-xl border border-[#d7d9df] bg-[#242a35] ${className}`}>
    <div className="flex h-9 items-center gap-2 border-b border-[#171c24] bg-[#f2f2f2] px-3">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      <span className="ml-2 min-w-0 truncate text-xs font-semibold text-[#5f6368]">
        {title}
      </span>
    </div>
    <div className={`bg-[#242a35] ${bodyClassName}`}>
      {children}
    </div>
  </div>
);

export const RuntimeTerminal = ({ logs, highlightedLogIdx, idPrefix, scrollContainerRef }: RuntimeTerminalProps) => {
  // scrollContainerRef 가 없으면 자체 ref 로 폴백 (자동 스크롤용).
  const localRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollContainerRef ?? localRef;

  // 로그 갱신 시 항상 맨 아래로 — 라이브 로그 tail 추적 (스크롤 하단 고정).
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, containerRef]);

  return (
  <TerminalFrame
    title="qapilot-runtime - zsh"
    className="flex min-h-0 flex-1 flex-col"
    bodyClassName="min-h-0 flex-1 overflow-y-auto"
  >
    <div
      ref={containerRef}
      className="h-full min-h-0 space-y-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed text-[#e8eaed]"
    >
      {logs.map((log, idx) => (
        <div
          key={idx}
          id={`${idPrefix}-${idx}`}
          className={`rounded px-2 py-1.5 ${
            idx === highlightedLogIdx ? 'bg-primary-blue/25' : log.isError ? 'bg-status-fail/15' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[#8ab4f8]">qapilot</span>
            <span className="text-[#9aa0a6]">{log.time}</span>
            {log.apiMethod && (
              <span className="ml-auto text-[#e8eaed]">
                <span className="font-semibold">{log.apiMethod}</span> {log.endpoint} ·{' '}
                <span className={log.status === 200 ? 'text-status-pass' : 'text-status-fail'}>
                  {log.status}
                </span>
                {' '}· {log.responseTime}
              </span>
            )}
          </div>
          <div className="mt-0.5 whitespace-pre-wrap pl-4 text-[#e8eaed]">$ {log.action}</div>
          {log.hitl && (
            <div className="mt-1 pl-4 text-status-fail">! HITL 플래그</div>
          )}
        </div>
      ))}
      <div className="px-2 py-1.5">
        <span className="text-[#8ab4f8]">qapilot</span>
        <span className="ml-2 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#e8eaed]" />
      </div>
    </div>
  </TerminalFrame>
  );
};
