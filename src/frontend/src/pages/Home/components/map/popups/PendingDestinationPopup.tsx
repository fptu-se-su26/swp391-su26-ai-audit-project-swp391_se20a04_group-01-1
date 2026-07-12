import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { Navigation, X } from 'lucide-react';
import { useUIStore } from '../../../../../store/uiStore';
import { formatCoordinateLabel } from '../../../utils/searchUtils';

export interface PendingDestinationPopupProps {
  pendingDestination: any;
  routeController: any;
  onClose: () => void;
}
export const PendingDestinationPopup: React.FC<PendingDestinationPopupProps> = ({ pendingDestination, routeController, onClose }) => {
  const uiState = useUIStore();

  if (!uiState.pendingDestination) return null;

  return (
    <Popup
      longitude={uiState.pendingDestination.lng}
      latitude={uiState.pendingDestination.lat}
      anchor="bottom"
      onClose={onClose}
      closeOnClick={false}
      closeButton={false}
      offset={[0, -35]}
      className="z-50"
    >
      <div className="p-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 font-sans relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Navigation size={13} className="rotate-45" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <h4 className="font-black text-[12px] text-slate-800 leading-tight">Chỉ đường tới đây?</h4>
            <p className="text-[9px] text-slate-400 font-semibold truncate">
              {uiState.pendingDestination.lng.toFixed(5)}, {uiState.pendingDestination.lat.toFixed(5)}
            </p>
          </div>
          <button
            onClick={() => uiState.setUIState({ pendingDestination: null })}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-95 shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mb-3 text-left leading-normal">
          Hệ thống sẽ vẽ lộ trình tối ưu và cảnh báo tránh các vùng ngập lụt nếu có.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const { lng, lat } = uiState.pendingDestination;
              const label = formatCoordinateLabel(lng, lat);
              routeController.validateLocation(lng, lat, label, "destination",
                () => {
                  routeController.setDestination({ lng, lat, label });
                  routeController.setDestinationQuery(label);
                  if (routeController.userLocation && !routeController.origin) {
                    routeController.setOrigin({ lng: routeController.userLocation.lng, lat: routeController.userLocation.lat, label: "Vị trí của bạn" });
                    routeController.setOriginQuery("Vị trí của bạn");
                  }
                  uiState.setUIState({ pendingDestination: null });
                },
                () => {
                  routeController.setDestination(null);
                  routeController.setDestinationQuery("");
                  uiState.setUIState({ pendingDestination: null });
                }
              );
            }}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black py-2 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            Chỉ đường
          </button>
          <button
            onClick={() => { uiState.setUIState({ showReportModal: true, pendingDestination: null }); }}
            className="bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-bold py-2 px-3 rounded-xl hover:bg-orange-100 hover:text-orange-700 transition-all active:scale-95"
          >
            Báo cáo
          </button>
          <button
            onClick={() => uiState.setUIState({ pendingDestination: null })}
            className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] font-bold py-2 px-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95"
          >
            Hủy
          </button>
        </div>
      </div>
    </Popup>
  );
};
