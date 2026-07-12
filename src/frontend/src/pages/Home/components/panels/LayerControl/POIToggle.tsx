import React from 'react';
import { Layers } from 'lucide-react';

interface POIToggleProps {
  active: boolean;
  onSelect: () => void;
}

export const POIToggle: React.FC<POIToggleProps> = ({ active, onSelect }) => {
  return (
    <div className="group relative pointer-events-auto flex justify-end items-center">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Xem Địa điểm (POIs)
      </span>
      <button
        onClick={onSelect}
        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${active ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
      >
        <Layers size={18} />
      </button>
    </div>
  );
};