import React from 'react';
import { TrendingUp } from 'lucide-react';

interface TrafficToggleProps {
  active: boolean;
  onToggle: () => void;
}

export const TrafficToggle: React.FC<TrafficToggleProps> = ({ active, onToggle }) => {
  return (
    <div className="group relative pointer-events-auto flex justify-end items-center">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Cảnh báo giao thông
      </span>
      <button
        onClick={onToggle}
        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${active ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
      >
        <TrendingUp size={18} />
      </button>
    </div>
  );
};
