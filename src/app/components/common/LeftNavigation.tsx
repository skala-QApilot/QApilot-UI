import React from 'react';
import { NavLink } from 'react-router';
import { CheckSquare, Home, Layers, RotateCcw, User } from 'lucide-react';

export const SIDEBAR_BG = '#f2f3f5';

interface LeftNavigationProps {
  slug: string;
  runningTests: Array<{ id: string; status: 'running' | 'aborted' | 'completed' }>;
}

export const LeftNavigation = ({ slug, runningTests }: LeftNavigationProps) => {
  const runningCount = runningTests.filter(t => t.status === 'running').length;
  const SB = SIDEBAR_BG;
  const N = 20;

  const NavItem = ({
    to, icon: Icon, label, badge, end: endProp,
  }: { to: string; icon: React.ElementType; label: string; badge?: number; end?: boolean }) => (
    <NavLink
      to={to}
      end={endProp}
      className={({ isActive }) => `relative w-full block ${isActive ? 'is-active' : ''}`}
      style={{ overflow: 'visible' }}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <>
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                top: -N, right: 0, width: N, height: N,
                background: SB, borderBottomRightRadius: N,
              }} />
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                bottom: -N, right: 0, width: N, height: N,
                background: SB, borderTopRightRadius: N,
              }} />
            </>
          )}
          <div
            title={label}
            className={`relative w-[calc(100%-8px)] flex flex-col items-center justify-center gap-1 h-[64px] rounded-l-[18px] ml-2 transition-colors group ${
              isActive ? 'bg-white' : ''
            }`}
          >
            <span className="relative flex items-center justify-center">
              <Icon className={`w-5 h-5 transition-colors ${
                isActive ? 'text-[#3615CF]' : 'text-[#9ca3af] group-hover:text-[#6b7280]'
              }`} />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-[#3615CF] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {badge}
                </span>
              )}
            </span>
            <span className={`text-[10px] font-medium leading-tight text-center whitespace-pre-line transition-colors ${
              isActive ? 'text-[#3615CF]' : 'text-[#9ca3af] group-hover:text-[#6b7280]'
            }`}>{label}</span>
          </div>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="h-full w-[68px] flex flex-col pt-4 pb-2.5 flex-shrink-0" style={{ background: SB, isolation: 'isolate' }}>
      <div className="flex-1 flex flex-col items-center justify-center pb-16" style={{ gap: N, overflow: 'visible' }}>
        <NavItem to={`/${slug}`} icon={Home} label="홈" end />
        <NavItem to={`/${slug}/scenarios`} icon={Layers} label="시나리오" />
        <NavItem to={`/${slug}/test`} icon={RotateCcw} label={"테스트\n이력"} badge={runningCount} />
        <NavItem to={`/${slug}/rtm`} icon={CheckSquare} label="RTM" />
      </div>
      <button
        title="프로필"
        className="w-full flex items-center justify-center h-12 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
      >
        <User className="w-5 h-5" />
      </button>
    </div>
  );
};
