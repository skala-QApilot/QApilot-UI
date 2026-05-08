import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  showFilterButton?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = '검색...',
  showFilterButton = false,
  onFilterClick,
  className = '',
}: SearchBarProps) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
        <input
          type="text"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full h-7 pl-6 pr-2 text-[11px] border border-[#f0f0f0] rounded-lg bg-[#f9f9fb] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#3615CF]/20 transition-colors"
        />
      </div>
      {showFilterButton && (
        <button
          onClick={onFilterClick}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#3615CF] hover:bg-[#3615CF]/8 transition-colors flex-shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
