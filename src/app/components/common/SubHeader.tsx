import type { ElementType, ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  icon: ElementType;
  count?: number;
}

interface SubHeaderProps {
  title: string;
  leftContent?: ReactNode;
  titleExtra?: ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  rightContent?: ReactNode;
  className?: string;
}

export const SubHeader = ({ title, leftContent, titleExtra, tabs, activeTab, onTabChange, rightContent, className = '' }: SubHeaderProps) => (
  <div className={`bg-[#f7f8f9] px-8 flex-shrink-0 ${tabs ? 'pt-[11.5px] pb-0' : 'py-[11.5px]'} ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {leftContent}
        {title && <span className="text-[15px] font-bold text-[#1a1a2e] leading-none">{title}</span>}
        {titleExtra}
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </div>

    {tabs && (
      <div className="flex items-center gap-1 mt-2">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange?.(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium relative transition-colors ${
                active ? 'text-[#1a1a2e]' : 'text-[#9ca3af] hover:text-[#6b7280]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  active ? 'bg-[#1a1a2e]/10 text-[#1a1a2e]' : 'bg-[#e5e7eb] text-[#9ca3af]'
                }`}>{count}</span>
              )}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-blue rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    )}
  </div>
);
