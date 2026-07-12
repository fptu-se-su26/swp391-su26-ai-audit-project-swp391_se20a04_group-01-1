import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { RouteOff } from 'lucide-react';
import { useUIStore } from '../../../../../store/uiStore';

export interface EventRoadPopupProps {
  road: any;
  isRoadRestrictionActive: (road: any, date: Date) => boolean;
  onClose: () => void;
}

export const EventRoadPopup: React.FC<EventRoadPopupProps> = ({ road, isRoadRestrictionActive, onClose }) => {
  const uiState = useUIStore();

  if (!uiState.selectedRoadPopup || !uiState.selectedRoadPopup.geojson_coords || uiState.selectedRoadPopup.geojson_coords.length === 0) {
    return null;
  }

  const active = isRoadRestrictionActive(uiState.selectedRoadPopup, new Date());

  return (
    <Popup
      longitude={uiState.selectedRoadPopup.geojson_coords[0][0]}
      latitude={uiState.selectedRoadPopup.geojson_coords[0][1]}
      anchor="top"
      onClose={() => uiState.setUIState({ selectedRoadPopup: null })}
      closeButton={true}
      closeOnClick={false}
      offset={[0, 10]}
      className="z-50"
    >
      <div className="p-3 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`p-1 rounded-lg shrink-0 ${active ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
            <RouteOff size={14} />
          </div>
          <h4 className="font-bold text-[12px] leading-tight text-slate-800">{uiState.selectedRoadPopup.road_name}</h4>
        </div>

        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold mb-1.5 border ${active ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
          {active ? "🔴 ĐANG ÁP DỤNG CẤM ĐƯỜNG" : "⚪ ĐANG MỞ (CHƯA ĐẾN GIỜ CẤM)"}
        </div>

        <p className="text-[10px] text-slate-500 mb-1.5 font-bold">
          {uiState.selectedRoadPopup.restriction_type === "CLOSED" ? "🔴 Cấm hoàn toàn" : uiState.selectedRoadPopup.restriction_type === "LIMITED" ? "🟡 Hạn chế lưu thông" : uiState.selectedRoadPopup.restriction_type === "ONE_WAY" ? "🔵 Đường một chiều" : "Hạn chế cấm đỗ"}
        </p>

        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 mb-1.5 leading-relaxed">
          {uiState.selectedRoadPopup.description || "Hạn chế giao thông phục vụ sự kiện."}
        </p>
      </div>
    </Popup>
  );
};
