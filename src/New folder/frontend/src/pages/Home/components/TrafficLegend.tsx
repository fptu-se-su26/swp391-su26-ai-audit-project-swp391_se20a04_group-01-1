import React from "react";

interface TrafficLegendProps {
  show: boolean;
}

export const TrafficLegend: React.FC<TrafficLegendProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-slate-200 z-10 pointer-events-auto flex items-center gap-3 text-[11px] md:text-xs font-medium text-slate-600 hidden md:flex">
      <span className="font-bold text-slate-800">Giao thông thời gian thực</span>
      <div className="w-px h-4 bg-slate-300"></div>
      <span className="italic">Nhanh</span>
      <div className="flex items-center gap-0.5">
        <div className="w-5 h-2 bg-[#22c55e] rounded-sm"></div>
        <div className="w-5 h-2 bg-[#f59e0b] rounded-sm"></div>
        <div className="w-5 h-2 bg-[#ef4444] rounded-sm"></div>
        <div className="w-5 h-2 bg-[#7f1d1d] rounded-sm"></div>
      </div>
      <span className="italic">Chậm</span>
    </div>
  );
};
