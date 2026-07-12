import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { useUIStore } from '../../../../../store/uiStore';

export interface TrafficPopupProps {
  alert: any;
  onClose: () => void;
}
export const TrafficPopup: React.FC<TrafficPopupProps> = ({ alert, onClose }) => {
  const uiState = useUIStore();

  if (!uiState.mapControls.traffic || !uiState.selectedTrafficAlert) return null;

  return (
    <Popup
      longitude={uiState.selectedTrafficAlert.longitude}
      latitude={uiState.selectedTrafficAlert.latitude}
      anchor="top"
      onClose={() => uiState.setUIState({ selectedTrafficAlert: null })}
      closeButton={true}
      closeOnClick={false}
      offset={[0, 10]}
      className="z-50"
    >
      <div className="p-4 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans text-left">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${uiState.selectedTrafficAlert.type === "CONGESTION" ? "bg-orange-50 border-orange-200 text-orange-600" : uiState.selectedTrafficAlert.type === "ACCIDENT" ? "bg-red-50 border-red-200 text-red-600" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
            {uiState.selectedTrafficAlert.type === "CONGESTION" ? "Kẹt xe" : uiState.selectedTrafficAlert.type === "ACCIDENT" ? "Tai nạn" : "Thi công"}
          </span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${uiState.selectedTrafficAlert.severity === "HIGH" ? "bg-red-100 border-red-300 text-red-700" : uiState.selectedTrafficAlert.severity === "MEDIUM" ? "bg-orange-100 border-orange-300 text-orange-700" : "bg-blue-100 border-blue-300 text-blue-700"}`}>
            {uiState.selectedTrafficAlert.severity}
          </span>
        </div>
        <h4 className="font-extrabold text-sm text-slate-800 leading-snug mb-1">{uiState.selectedTrafficAlert.title}</h4>
        {uiState.selectedTrafficAlert.description && (
          <p className="text-xs text-slate-600 mb-2 leading-relaxed">{uiState.selectedTrafficAlert.description}</p>
        )}
        <p className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
          📍 {uiState.selectedTrafficAlert.location}
        </p>
      </div>
    </Popup>
  );
};
