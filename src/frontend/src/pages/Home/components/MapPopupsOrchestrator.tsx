import React from "react";
import { Popup } from "react-map-gl/mapbox";
import { Navigation, X, RouteOff } from "lucide-react";
import { EventRoad } from "../../../services/eventRoadService";

interface MapPopupsOrchestratorProps {
  // PendingDestination props
  pendingDestination: { lng: number; lat: number } | null;
  setPendingDestination: (val: { lng: number; lat: number } | null) => void;
  userLocation: { lng: number; lat: number } | null;
  setOrigin: (val: any) => void;
  setOriginQuery: (val: string) => void;
  setDestination: (val: any) => void;
  setDestinationQuery: (val: string) => void;
  origin: any;
  validateLocation: (
    lng: number,
    lat: number,
    label: string,
    type: string,
    onSuccess: () => void,
    onError: () => void
  ) => void;
  handleOpenReportModal: (lat: number, lng: number) => void;

  // FloodZone props
  selectedFloodZone: any | null;
  setSelectedFloodZone: (val: any | null) => void;
  mapControls: {
    layers: boolean;
    traffic: boolean;
    flood: boolean;
  };

  // TrafficAlert props
  selectedTrafficAlert: any | null;
  setSelectedTrafficAlert: (val: any | null) => void;

  // EventRoad props
  selectedRoadPopup: EventRoad | null;
  setSelectedRoadPopup: (val: EventRoad | null) => void;
  isRoadRestrictionActive: (road: EventRoad, date: Date) => boolean;
}

export const MapPopupsOrchestrator: React.FC<MapPopupsOrchestratorProps> = ({
  pendingDestination,
  setPendingDestination,
  userLocation,
  setOrigin,
  setOriginQuery,
  setDestination,
  setDestinationQuery,
  origin,
  validateLocation,
  handleOpenReportModal,

  selectedFloodZone,
  setSelectedFloodZone,
  mapControls,

  selectedTrafficAlert,
  setSelectedTrafficAlert,

  selectedRoadPopup,
  setSelectedRoadPopup,
  isRoadRestrictionActive,
}) => {
  return (
    <>
      {/* 1. PENDING DESTINATION POPUP */}
      {pendingDestination && (
        <Popup
          longitude={pendingDestination.lng}
          latitude={pendingDestination.lat}
          anchor="bottom"
          onClose={() => setPendingDestination(null)}
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
                <h4 className="font-black text-[12px] text-slate-800 leading-tight">
                  Chỉ đường tới đây?
                </h4>
                <p className="text-[9px] text-slate-400 font-semibold truncate">
                  {pendingDestination.lng.toFixed(5)},{" "}
                  {pendingDestination.lat.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => setPendingDestination(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-95 shrink-0"
                title="Đóng"
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
                  const { lng, lat } = pendingDestination;
                  const label = `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
                  validateLocation(
                    lng,
                    lat,
                    label,
                    "destination",
                    () => {
                      setDestination({ lng, lat, label });
                      setDestinationQuery(label);
                      if (userLocation && !origin) {
                        setOrigin({
                          lng: userLocation.lng,
                          lat: userLocation.lat,
                          label: "Vị trí của bạn",
                        });
                        setOriginQuery("Vị trí của bạn");
                      }
                      setPendingDestination(null);
                    },
                    () => {
                      setDestination(null);
                      setDestinationQuery("");
                      setPendingDestination(null);
                    },
                  );
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black py-2 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                Chỉ đường
              </button>
              <button
                onClick={() => {
                  if (pendingDestination) {
                    handleOpenReportModal(
                      pendingDestination.lat,
                      pendingDestination.lng
                    );
                  }
                }}
                className="bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-bold py-2 px-3 rounded-xl hover:bg-orange-100 hover:text-orange-700 transition-all active:scale-95"
              >
                Báo cáo
              </button>
              <button
                onClick={() => setPendingDestination(null)}
                className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] font-bold py-2 px-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95"
              >
                Hủy
              </button>
            </div>
          </div>
        </Popup>
      )}

      {/* 2. FLOOD ZONE POPUP */}
      {selectedFloodZone && mapControls.flood && (
        <Popup
          longitude={selectedFloodZone.lng}
          latitude={selectedFloodZone.lat}
          anchor="bottom"
          onClose={() => setSelectedFloodZone(null)}
          closeOnClick={false}
          offset={[0, -15]}
          className="z-50"
        >
          <div className="p-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans">
            <h3 className="font-bold text-[13px] mb-1.5 leading-tight">
              {selectedFloodZone.properties.name}
            </h3>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] text-slate-500 font-semibold">
                Mức độ:
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  selectedFloodZone.properties.risk_level === "High"
                    ? "bg-red-100 text-red-600"
                    : selectedFloodZone.properties.risk_level === "Medium"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {selectedFloodZone.properties.risk_level === "High"
                  ? "Cao"
                  : selectedFloodZone.properties.risk_level === "Medium"
                  ? "Trung bình"
                  : "Thấp"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5 pb-1.5">
              {selectedFloodZone.properties.description}
            </p>
          </div>
        </Popup>
      )}

      {/* 3. TRAFFIC ALERT POPUP */}
      {mapControls.traffic && selectedTrafficAlert && (
        <Popup
          longitude={selectedTrafficAlert.longitude}
          latitude={selectedTrafficAlert.latitude}
          anchor="top"
          onClose={() => setSelectedTrafficAlert(null)}
          closeButton={true}
          closeOnClick={false}
          offset={[0, 10]}
          className="z-50"
        >
          <div className="p-4 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans text-left">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                  selectedTrafficAlert.type === "CONGESTION"
                    ? "bg-orange-50 border-orange-200 text-orange-600"
                    : selectedTrafficAlert.type === "ACCIDENT"
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-blue-50 border-blue-200 text-blue-600"
                }`}
              >
                {selectedTrafficAlert.type === "CONGESTION"
                  ? "Kẹt xe"
                  : selectedTrafficAlert.type === "ACCIDENT"
                  ? "Tai nạn"
                  : "Thi công"}
              </span>
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                  selectedTrafficAlert.severity === "HIGH"
                    ? "bg-red-100 border-red-300 text-red-700"
                    : selectedTrafficAlert.severity === "MEDIUM"
                    ? "bg-orange-100 border-orange-300 text-orange-700"
                    : "bg-blue-100 border-blue-300 text-blue-700"
                }`}
              >
                {selectedTrafficAlert.severity}
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-slate-800 leading-snug mb-1">
              {selectedTrafficAlert.title}
            </h4>
            {selectedTrafficAlert.description && (
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                {selectedTrafficAlert.description}
              </p>
            )}
            <p className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
              📍 {selectedTrafficAlert.location}
            </p>
          </div>
        </Popup>
      )}

      {/* 4. EVENT ROAD POPUP */}
      {selectedRoadPopup &&
        selectedRoadPopup.geojson_coords &&
        selectedRoadPopup.geojson_coords.length > 0 && (
          <Popup
            longitude={selectedRoadPopup.geojson_coords[0][0]}
            latitude={selectedRoadPopup.geojson_coords[0][1]}
            anchor="top"
            onClose={() => setSelectedRoadPopup(null)}
            closeButton={true}
            closeOnClick={false}
            offset={[0, 10]}
            className="z-50"
          >
            <div className="p-3 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className={`p-1 rounded-lg shrink-0 ${
                    isRoadRestrictionActive(selectedRoadPopup, new Date())
                      ? "bg-red-100 text-red-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <RouteOff size={14} />
                </div>
                <h4 className="font-bold text-[12px] leading-tight text-slate-800">
                  {selectedRoadPopup.road_name}
                </h4>
              </div>

              {(() => {
                const active = isRoadRestrictionActive(
                  selectedRoadPopup,
                  new Date()
                );
                return (
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold mb-1.5 border ${
                      active
                        ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    {active
                      ? "🔴 ĐANG ÁP DỤNG CẤM ĐƯỜNG"
                      : "⚪ ĐANG MỞ (CHƯA ĐẾN GIỜ CẤM)"}
                  </div>
                );
              })()}

              <p className="text-[10px] text-slate-500 mb-1.5 font-bold">
                {selectedRoadPopup.restriction_type === "CLOSED"
                  ? "🔴 Cấm hoàn toàn"
                  : selectedRoadPopup.restriction_type === "LIMITED"
                  ? "🟡 Hạn chế lưu thông"
                  : selectedRoadPopup.restriction_type === "ONE_WAY"
                  ? "🔵 Đường một chiều"
                  : "Hạn chế cấm đỗ"}
              </p>

              <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 mb-1.5 leading-relaxed">
                {selectedRoadPopup.description ||
                  "Hạn chế giao thông phục vụ sự kiện."}
              </p>
            </div>
          </Popup>
        )}
    </>
  );
};
