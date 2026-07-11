import React, { useState } from "react";
import {
  Search,
  ArrowUpDown,
  CloudRain,
  AlertTriangle,
  Car,
  Footprints,
  Bike,
  Heart,
  Share2,
  Navigation,
  Bookmark,
} from "lucide-react";

import { savedRouteService } from "../../../services/savedRouteService";
import { showPremiumToast } from "../../../utils/toastUtils";
import { useFavoritePoiStore } from "../../../store/favoritePoiStore";
import { LocationPoint } from "../hooks/useMapRouting";
import { Volume2, VolumeX } from "lucide-react";
import { usePreferenceStore } from "../../../store/preferenceStore";
import { useVoiceGuidance } from "../hooks/useVoiceGuidance";

interface RouteData {
  totalDistanceKm: number;
  totalTimeMin: number;
  coordinates: [number, number][];
}

interface RoutePanelProps {
  viewMode: "pois" | "events";
  destination: LocationPoint | null;
  origin: LocationPoint | null;
  originQuery: string;
  destinationQuery: string;
  showSuggestions: boolean;
  suggestions: any[];
  routeData: RouteData | null;
  avoidFlood: boolean;
  avoidCongestion: boolean;
  routeAlertMessage: string | null;
  travelMode: "driving" | "walking" | "cycling";
  isSharingRoute: boolean;
  searchContainerRef: React.RefObject<HTMLDivElement | null>;
  countdown: number;
  onStartNavigation: () => void;

  setDestinationQuery: (val: string) => void;
  setOriginQuery: (val: string) => void;
  setActiveInputField: (field: "origin" | "destination" | null) => void;
  setShowSuggestions: (val: boolean) => void;
  handleSwapLocations: () => void;
  handleSelectSuggestion: (item: any) => void;
  setAvoidFlood: (val: boolean) => void;
  setAvoidCongestion: (val: boolean) => void;
  setTravelMode: (mode: "driving" | "walking" | "cycling") => void;
  setShowSaveRouteModal: (val: boolean) => void;
  handleShareRoute: () => void;
  setRouteData: (val: RouteData | null) => void;
  setDestination: (val: LocationPoint | null) => void;
  setOrigin: (val: LocationPoint | null) => void;
  setRouteAlertMessage: (val: string | null) => void;
  setConfirmedFloodZoneIds: (val: string[]) => void;
  favoriteEventIds: Set<number>;
  onToggleEventFavorite: (eventId: number) => Promise<boolean>;
}

export function RoutePanel({
  viewMode,
  destination,
  origin,
  originQuery,
  destinationQuery,
  showSuggestions,
  suggestions,
  routeData,
  avoidFlood,
  avoidCongestion,
  routeAlertMessage,
  travelMode,
  isSharingRoute,
  searchContainerRef,

  setDestinationQuery,
  setOriginQuery,
  setActiveInputField,
  setShowSuggestions,
  handleSwapLocations,
  handleSelectSuggestion,
  setAvoidFlood,
  setAvoidCongestion,
  setTravelMode,
  setShowSaveRouteModal,
  handleShareRoute,
  setRouteData,
  setDestination,
  setOrigin,
  setRouteAlertMessage,
  setConfirmedFloodZoneIds,
  onStartNavigation,
  favoriteEventIds,
  onToggleEventFavorite,
}: RoutePanelProps) {
  const [isStarting, setIsStarting] = useState(false);
  const { favoriteIds, toggleFavorite } = useFavoritePoiStore();

  // Lấy ID của POI hoặc Event từ destination
  const destinationPoiId = destination?.poi_id;
  const destinationEventId = (destination as any)?.event_id;

  const { preferences, updatePreference } = usePreferenceStore();
  const { supported } = useVoiceGuidance();
  const isVoiceEnabled = preferences?.enable_voice_guide ?? true;

  // 1. ĐỒNG BỘ LOGIC YÊU THÍCH: Lấy trực tiếp từ favoriteEventIds của Home truyền xuống
  // Không dùng useState cục bộ ở đây nữa!
  const isFavDest = destinationPoiId
    ? favoriteIds.has(destinationPoiId)
    : destinationEventId
      ? favoriteEventIds.has(destinationEventId)
      : false;

  const canBeFavorited = !!(destinationPoiId || destinationEventId);

  const handleFavDestClick = async () => {
    if (!canBeFavorited) return;

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast(
        "Vui lòng đăng nhập để lưu địa điểm/sự kiện yêu thích.",
        "error",
      );
      return;
    }

    try {
      if (destinationPoiId) {
        // Lưu POI
        const res = await toggleFavorite(destinationPoiId);
        showPremiumToast(
          res
            ? "Đã lưu địa điểm vào danh sách yêu thích!"
            : "Đã xóa địa điểm khỏi danh sách yêu thích.",
          "success",
        );
      } else if (destinationEventId) {
        // Lưu Event: Gọi hàm được truyền từ Home.tsx xuống để đồng bộ 100%
        const isFav = await onToggleEventFavorite(destinationEventId);
        showPremiumToast(
          isFav
            ? "Đã lưu sự kiện vào danh sách yêu thích!"
            : "Đã xóa sự kiện khỏi danh sách.",
          "success",
        );
      }
    } catch (error) {
      console.error("Lỗi yêu thích:", error);
      showPremiumToast("Không thể cập nhật trạng thái yêu thích.", "error");
    }
  };

  const handleStartTrip = async () => {
    if (!origin || !destination || !routeData) return;

    setIsStarting(true);
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    try {
      if (token) {
        await savedRouteService.saveRoute({
          origin_name: originQuery || origin.label || "Vị trí hiện tại",
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_name: destinationQuery || destination.label || "Điểm đến",
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          route_name: `Lịch sử: ${originQuery || "Điểm đi"} ➔ ${destinationQuery || "Điểm đến"}`,
          route_data: JSON.stringify(routeData.coordinates),
          distance_meters: routeData.totalDistanceKm * 1000,
          duration_seconds: routeData.totalTimeMin * 60,
          profile: travelMode,
        });
      }
      onStartNavigation();
      showPremiumToast(
        token
          ? "Đã bắt đầu chuyến đi và lưu vào lịch sử!"
          : "Đã bắt đầu chuyến đi!",
        "success",
      );
    } catch (error) {
      console.error("Lỗi khi lưu lịch sử lộ trình:", error);
      showPremiumToast(
        "Đã bắt đầu chuyến đi nhưng không thể lưu lịch sử do lỗi mạng.",
        "warning",
      );
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ Sửa điều kiện chặn hiển thị: Cho phép cả pois VÀ events
  if (viewMode !== "pois" && viewMode !== "events") return null;

  return (
    <div ref={searchContainerRef} className="relative">
      {!destination ? (
        <div className="w-80 h-[42px] bg-white rounded-full shadow-md border border-slate-200/60 flex items-center px-4">
          <Search className="text-blue-500 mr-2 shrink-0" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm địa điểm tại Đà Nẵng..."
            value={destinationQuery}
            onChange={(e) => {
              setDestinationQuery(e.target.value);
              setActiveInputField("destination");
            }}
            onFocus={() => {
              setActiveInputField("destination");
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="w-full bg-transparent outline-none text-xs font-medium text-slate-700 placeholder-slate-400"
          />
        </div>
      ) : (
        <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col gap-3 relative">
          <div className="absolute left-[26px] top-[34px] bottom-[34px] w-[2px] border-l-2 border-dashed border-slate-200"></div>
          <div className="flex items-center gap-3 relative">
            <span className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white z-10 flex items-center justify-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            </span>
            <input
              type="text"
              placeholder="Chọn điểm đi (Mặc định: Vị trí của bạn)"
              value={originQuery}
              onChange={(e) => {
                setOriginQuery(e.target.value);
                setActiveInputField("origin");
              }}
              onFocus={() => {
                setActiveInputField("origin");
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
            />
          </div>
          <div className="flex items-center gap-3 relative">
            <span className="text-red-500 z-10 text-sm font-bold shrink-0">
              📍
            </span>
            <input
              type="text"
              placeholder="Chọn điểm đến..."
              value={destinationQuery}
              onChange={(e) => {
                setDestinationQuery(e.target.value);
                setActiveInputField("destination");
              }}
              onFocus={() => {
                setActiveInputField("destination");
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
            />
          </div>
          <button
            onClick={handleSwapLocations}
            className="absolute right-6 top-[40px] w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
            title="Đảo ngược vị trí"
          >
            <ArrowUpDown size={14} />
          </button>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
          {suggestions.map((item: any) => (
            <button
              key={item.id}
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-start gap-2 text-[11px] font-medium text-slate-700 border-b border-slate-50 last:border-b-0"
            >
              <span className="text-slate-400 mt-0.5">📍</span>
              <div>
                <div className="font-bold text-slate-800 line-clamp-1">
                  {item.text_vi || item.text}
                </div>
                <div className="text-slate-400 text-[10px] line-clamp-1 mt-0.5">
                  {item.place_name_vi || item.place_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {routeData && (
        <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 mt-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Chi tiết lộ trình
          </h3>

          {/* Toggle tránh ngập lụt */}
          <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-2">
            <div className="flex items-center gap-2">
              <CloudRain size={14} className="text-blue-500" />
              <span className="text-[10px] font-bold text-slate-700">
                Tránh vùng ngập lụt
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAvoidFlood(!avoidFlood)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${avoidFlood ? "bg-blue-600" : "bg-slate-200"}`}
            >
              <span
                style={{
                  transform: avoidFlood
                    ? "translateX(18px)"
                    : "translateX(2px)",
                }}
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
              />
            </button>
          </div>

          {/* Toggle tránh kẹt xe */}
          <div className="flex items-center justify-between p-2 bg-amber-50/50 rounded-xl border border-amber-100/50 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold text-slate-700">
                Tránh ùn tắc (Kẹt xe)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAvoidCongestion(!avoidCongestion)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${avoidCongestion ? "bg-amber-600" : "bg-slate-200"}`}
            >
              <span
                style={{
                  transform: avoidCongestion
                    ? "translateX(18px)"
                    : "translateX(2px)",
                }}
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
              />
            </button>
          </div>

          {/* Thông báo cảnh báo lộ trình */}
          {routeAlertMessage && (
            <div
              className={`text-[10px] font-bold px-3 py-2 rounded-xl mb-3 border ${routeAlertMessage.includes("an toàn") ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" : "bg-amber-50 text-amber-700 border-amber-200/50"}`}
            >
              {routeAlertMessage}
            </div>
          )}

          {/* Chế độ di chuyển */}
          <div className="flex gap-4 mb-3 bg-slate-50 p-1 rounded-xl">
            <button
              onClick={() => setTravelMode("driving")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === "driving" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Car size={13} /> Ô tô/Xe máy
            </button>
            <button
              onClick={() => setTravelMode("walking")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === "walking" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Footprints size={13} /> Đi bộ
            </button>
            <button
              onClick={() => setTravelMode("cycling")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === "cycling" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Bike size={13} /> Xe đạp
            </button>
          </div>

          {/* Thông tin khoảng cách & thời gian */}
          <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">
                KHOẢNG CÁCH
              </p>
              <p className="text-lg font-black text-slate-800">
                {routeData.totalDistanceKm} km
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-semibold">
                THỜI GIAN DỰ KIẾN
              </p>
              <p className="text-lg font-black text-blue-600">
                {routeData.totalTimeMin} phút
              </p>
            </div>
          </div>

          {/* Khu vực chứa nút Âm thanh & Bắt đầu chuyến đi */}
          <div className="flex items-center gap-2 mt-4">
            {/* Nút Bật/Tắt Giọng nói */}
            {supported && (
              <button
                type="button"
                onClick={() =>
                  updatePreference("enable_voice_guide", !isVoiceEnabled)
                }
                className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                  isVoiceEnabled
                    ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                }`}
                title={
                  isVoiceEnabled
                    ? "Tắt chỉ đường giọng nói"
                    : "Bật chỉ đường giọng nói"
                }
              >
                {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            )}

            {/* Nút Bắt đầu duy nhất */}
            <button
              onClick={onStartNavigation}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              <Navigation size={18} />
              BẮT ĐẦU CHUYẾN ĐI
            </button>
          </div>

          {/* Nhóm nút phụ */}
          <div className="flex flex-col gap-2 mt-3">
            {/* Hàng: Lưu lộ trình + Chia sẻ */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveRouteModal(true)}
                className="flex-1 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bookmark size={13} className="fill-current" /> Lưu lộ trình
              </button>
              <button
                onClick={handleShareRoute}
                disabled={isSharingRoute}
                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Share2 size={13} />{" "}
                {isSharingRoute ? "Đang tạo..." : "Chia sẻ"}
              </button>
            </div>

            {/* ✅ Nút yêu thích điểm đến (POI hoặc Event) */}
            {canBeFavorited ? (
              <button
                onClick={handleFavDestClick}
                className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  isFavDest
                    ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Heart size={13} className={isFavDest ? "fill-current" : ""} />
                {isFavDest ? "Đã lưu yêu thích" : "Lưu địa điểm/sự kiện"}
              </button>
            ) : (
              <div className="text-[10px] text-center text-slate-400 italic py-1">
                Địa điểm này không thể lưu vào yêu thích.
              </div>
            )}

            {/* Nút xóa lộ trình */}
            <button
              onClick={() => {
                setRouteData(null);
                setDestination(null);
                setOrigin(null);
                setOriginQuery("");
                setDestinationQuery("");
                setRouteAlertMessage(null);
              }}
              className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl text-[11px] font-bold hover:bg-rose-50 hover:text-rose-600 transition-all"
            >
              Xóa lộ trình
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
