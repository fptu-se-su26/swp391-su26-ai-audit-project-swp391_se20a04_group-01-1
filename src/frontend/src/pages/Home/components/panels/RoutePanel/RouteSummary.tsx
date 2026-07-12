import React from 'react';

interface RouteSummaryProps {
  routeData: any;
}

export const RouteSummary: React.FC<RouteSummaryProps> = ({ routeData }) => {
  return (
    <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
      <div>
        <p className="text-[10px] text-slate-400 font-semibold">KHOẢNG CÁCH</p>
        <p className="text-lg font-black text-slate-800">{routeData.totalDistanceKm} km</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-slate-400 font-semibold">THỜI GIAN</p>
        <p className="text-lg font-black text-blue-600">{routeData.totalTimeMin} phút</p>
      </div>
    </div>
  );
};
