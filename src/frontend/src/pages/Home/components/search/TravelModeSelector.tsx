import React from 'react';
import { Car, Footprints, Bike } from 'lucide-react';

interface TravelModeSelectorProps {
  routeData: any;
  travelMode: "driving" | "walking" | "cycling";
  setTravelMode: (mode: "driving" | "walking" | "cycling") => void;
}

/**
 * TravelModeSelector
 * Chỉ chịu trách nhiệm chọn phương tiện di chuyển (ô tô / đi bộ / xe đạp).
 * Phần tóm tắt tuyến đường, cảnh báo và các hành động (lưu/chia sẻ/yêu thích)
 * đã được tách sang panels/RoutePanel/.
 */
export const TravelModeSelector: React.FC<TravelModeSelectorProps> = ({
  routeData,
  travelMode,
  setTravelMode,
}) => {
  if (!routeData) return null;

  return (
    <div className="flex gap-4 bg-slate-50 p-1 rounded-xl">
      <button onClick={() => setTravelMode("driving")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === "driving" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
        <Car size={13} /> Ô tô
      </button>
      <button onClick={() => setTravelMode("walking")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === "walking" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
        <Footprints size={13} /> Đi bộ
      </button>
      <button onClick={() => setTravelMode("cycling")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === "cycling" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
        <Bike size={13} /> Xe đạp
      </button>
    </div>
  );
};
