import React from 'react';
import { ArrowUpDown } from 'lucide-react';

interface SearchActionsProps {
  onSwapLocations: () => void;
}

/**
 * SearchActions
 * Các hành động thao tác nhanh gắn liền với khối input tìm kiếm (VD: đảo chiều điểm đi/đến).
 */
export const SearchActions: React.FC<SearchActionsProps> = ({ onSwapLocations }) => {
  return (
    <button
      onClick={onSwapLocations}
      className="absolute right-6 top-[40px] w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
      title="Đảo ngược vị trí"
    >
      <ArrowUpDown size={14} />
    </button>
  );
};
