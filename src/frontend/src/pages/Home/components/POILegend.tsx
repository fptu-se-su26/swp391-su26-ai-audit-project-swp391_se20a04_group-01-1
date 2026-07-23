import React from "react";
import { POI_RATING_LEVELS } from "../../../utils/poiRatingColors";

interface POILegendProps {
  show: boolean;
  // true khi TrafficLegend cũng đang hiển thị cùng lúc → cần đẩy lên trên để không đè lên nhau
  stacked?: boolean;
}

// POI_RATING_LEVELS đang xếp theo thứ tự cao → thấp (dùng cho getPoiRatingColor),
// đảo ngược lại để vẽ thanh theo chiều thấp (trái) → cao (phải), giống hướng thanh giao thông.
const BAR_LEVELS = [...POI_RATING_LEVELS]
  .filter((l) => l.min !== null)
  .reverse();
const NO_RATING_LEVEL = POI_RATING_LEVELS.find((l) => l.min === null)!;

export const POILegend: React.FC<POILegendProps> = ({ show, stacked }) => {
  if (!show) return null;

  return (
    <div
      className={`absolute left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-slate-200 z-10 pointer-events-auto items-center gap-3 text-[11px] md:text-xs font-medium text-slate-600 hidden md:flex transition-all duration-200 ${
        stacked ? "bottom-16" : "bottom-6"
      }`}
    >
      <span className="font-bold text-slate-800 whitespace-nowrap">
        Mức đánh giá POI
      </span>
      <div className="w-px h-4 bg-slate-300"></div>

      <span className="italic">Thấp</span>
      <div className="flex items-center gap-0.5">
        {BAR_LEVELS.map((level) => (
          <div
            key={level.label}
            className="w-5 h-2 rounded-sm"
            style={{ backgroundColor: level.color }}
            title={level.label}
          ></div>
        ))}
      </div>
      <span className="italic">Cao</span>

      <div className="w-px h-4 bg-slate-300"></div>

      <div className="flex items-center gap-1" title={NO_RATING_LEVEL.label}>
        <div
          className="w-3 h-3 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: NO_RATING_LEVEL.color }}
        ></div>
        <span className="whitespace-nowrap">{NO_RATING_LEVEL.label}</span>
      </div>
    </div>
  );
};
