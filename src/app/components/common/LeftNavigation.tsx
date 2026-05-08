import React from 'react';
import { CheckSquare, Home, Layers, RotateCcw, User } from 'lucide-react';

export const SIDEBAR_BG = '#f2f3f5';

interface LeftNavigationProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  testSubTab: 'INPROGRESS' | 'HISTORY';
  setTestSubTab: (tab: 'INPROGRESS' | 'HISTORY') => void;
  runningTests: Array<{ id: string; status: 'running' | 'completed' }>;
}

export const LeftNavigation = ({
  currentPage,
  setCurrentPage,
  testSubTab,
  setTestSubTab,
  runningTests,
}: LeftNavigationProps) => {
  const isTestPage = currentPage === '테스트';
  const runningCount = runningTests.filter(t => t.status === 'running').length;

  const SB = SIDEBAR_BG;
  const N = 20;

  const NavItem = ({
    icon: Icon, label, active, onClick, badge,
  }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void; badge?: number }) => (
    <div className="relative w-full" style={{ overflow: 'visible' }}>
      {active && (
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
      <button
        onClick={onClick}
        title={label}
        style={{ zIndex: 1 }}
        className={`relative w-full flex items-center justify-center h-[58px] transition-colors group ${
          active ? 'bg-white' : 'hover:bg-black/5'
        }`}
      >
        <span className="relative flex items-center justify-center">
          <Icon className={`w-6 h-6 transition-colors ${
            active ? 'text-[#3615CF]' : 'text-[#9ca3af] group-hover:text-[#6b7280]'
          }`} />
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[22px] h-[22px] px-1 bg-[#3615CF] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {badge}
            </span>
          )}
        </span>
      </button>
    </div>
  );

  return (
    <div className="h-full w-[68px] flex flex-col pt-4 pb-2.5 flex-shrink-0" style={{ background: SB }}>
      <div className="flex-1 flex flex-col items-center justify-center pb-16" style={{ gap: N, overflow: 'visible' }}>
        <NavItem icon={Home} label="홈" active={currentPage === 'HOME'}
          onClick={() => setCurrentPage('HOME')} />
        <NavItem icon={Layers} label="시나리오" active={currentPage === '시나리오'}
          onClick={() => setCurrentPage('시나리오')} />
        <NavItem icon={RotateCcw} label="이력" active={isTestPage && testSubTab === 'HISTORY'}
          badge={runningCount}
          onClick={() => { setCurrentPage('테스트'); setTestSubTab('HISTORY'); }} />
        <NavItem icon={CheckSquare} label="RTM" active={currentPage === 'RTM'}
          onClick={() => setCurrentPage('RTM')} />
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
