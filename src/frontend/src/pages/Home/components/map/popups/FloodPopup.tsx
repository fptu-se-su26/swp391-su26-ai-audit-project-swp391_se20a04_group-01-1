import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { useUIStore } from '../../../../../store/uiStore';

export interface FloodPopupProps {
  floodZone: any;
  onClose: () => void;
}
export const FloodPopup: React.FC<FloodPopupProps> = ({ floodZone, onClose }) => {
  const uiState = useUIStore();

  if (!uiState.selectedFloodZone || !uiState.mapControls.flood) return null;

  return (
    <Popup
      longitude={uiState.selectedFloodZone.lng}
      latitude={uiState.selectedFloodZone.lat}
      anchor="bottom"
      onClose={() => uiState.setUIState({ selectedFloodZone: null })}
      closeOnClick={false}
      offset={[0, -15]}
      className="z-50"
    >
      <div className="p-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans">
        <h3 className="font-bold text-[13px] mb-1.5 leading-tight">{uiState.selectedFloodZone.properties.name}</h3>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] text-slate-500 font-semibold">Mức độ:</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${uiState.selectedFloodZone.properties.risk_level === "High" ? "bg-red-100 text-red-600" : uiState.selectedFloodZone.properties.risk_level === "Medium" ? "bg-orange-100 text-orange-600" : "bg-yellow-100 text-yellow-600"}`}>
            {uiState.selectedFloodZone.properties.risk_level === "High" ? "Cao" : uiState.selectedFloodZone.properties.risk_level === "Medium" ? "Trung bình" : "Thấp"}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5 pb-1.5">
          {uiState.selectedFloodZone.properties.description}
        </p>
      </div>
    </Popup>
  );
};
