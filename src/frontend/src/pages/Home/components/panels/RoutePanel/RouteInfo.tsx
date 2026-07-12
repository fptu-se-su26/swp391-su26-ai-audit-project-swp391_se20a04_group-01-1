import React from 'react';
import { CloudRain, AlertTriangle } from 'lucide-react';

interface RouteInfoProps {
  avoidFlood: boolean;
  setAvoidFlood: (val: boolean) => void;
  avoidCongestion: boolean;
  setAvoidCongestion: (val: boolean) => void;
  routeAlertMessage: string | null;
}

export const RouteInfo: React.FC<RouteInfoProps> = ({
  avoidFlood,
  setAvoidFlood,
  avoidCongestion,
  setAvoidCongestion,
  routeAlertMessage,
}) => {
  return (
    <>
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Chi tiết lộ trình</h3>

      <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-2">
        <div className="flex items-center gap-2">
          <CloudRain size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold text-slate-700">Tránh vùng ngập lụt</span>
        </div>
        <button type="button" onClick={() => setAvoidFlood(!avoidFlood)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${avoidFlood ? "bg-blue-600" : "bg-slate-200"}`}>
          <span style={{ transform: avoidFlood ? "translateX(18px)" : "translateX(2px)" }} className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200" />
        </button>
      </div>

      <div className="flex items-center justify-between p-2 bg-amber-50/50 rounded-xl border border-amber-100/50 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="text-[10px] font-bold text-slate-700">Tránh ùn tắc (Kẹt xe)</span>
        </div>
        <button type="button" onClick={() => setAvoidCongestion(!avoidCongestion)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${avoidCongestion ? "bg-amber-600" : "bg-slate-200"}`}>
          <span style={{ transform: avoidCongestion ? "translateX(18px)" : "translateX(2px)" }} className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200" />
        </button>
      </div>

      {routeAlertMessage && (
        <div className={`text-[10px] font-bold px-3 py-2 rounded-xl mb-3 border ${routeAlertMessage.includes("an toàn") ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" : "bg-amber-50 text-amber-700 border-amber-200/50"}`}>
          {routeAlertMessage}
        </div>
      )}
    </>
  );
};
