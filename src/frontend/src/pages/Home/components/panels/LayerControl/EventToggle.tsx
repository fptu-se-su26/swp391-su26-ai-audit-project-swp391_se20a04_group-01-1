import React from 'react';
import { Calendar } from 'lucide-react';

interface EventToggleProps {
  active: boolean;
  onSelect: () => void;
}

export const EventToggle: React.FC<EventToggleProps> = ({ active, onSelect }) => {
  return (
    <div className="group relative pointer-events-auto flex justify-end items-center mt-2">
      <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Xem Sự Kiện
      </span>
      <button
        onClick={onSelect}
        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all active:scale-95 ${active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
      >
        <Calendar size={18} />
      </button>
    </div>
  );
};
