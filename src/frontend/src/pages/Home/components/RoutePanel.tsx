import React, { useEffect, useState, useRef } from "react";
import {
  saveFavoriteLocation,
  getFavoriteLocations,
  deleteFavoriteLocation,
} from "../../../services/favoriteLocationService";
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
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  MapPin,
  Flag,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
} from "lucide-react";

import { savedRouteService } from "../../../services/savedRouteService";
import { showPremiumToast } from "../../../utils/toastUtils";
import { useFavoritePoiStore } from "../../../store/favoritePoiStore";
import { LocationPoint, RouteData, RouteStep } from "../hooks/useMapRouting";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface RoutePanelProps {
  hidden?: boolean;
  loadingSearch: boolean;
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
  setActiveInputField: (field: any) => void;
  setShowSuggestions: (val: boolean) => void;
  handleSwapLocations: () => void;
  handleSelectSuggestion: (item: any) => void;
  setAvoidFlood: (val: boolean) => void;
  setAvoidCongestion: (val: boolean) => void;
  setTravelMode: (mode: "driving" | "walking" | "cycling") => void;
  setShowSaveRouteModal: (val: boolean) => void;
  onOpenSaveRouteModal: () => void;
  handleShareRoute: () => void;
  setRouteData: (val: RouteData | null) => void;
  setDestination: (val: LocationPoint | null) => void;
  setOrigin: (val: LocationPoint | null) => void;
  setRouteAlertMessage: (val: string | null) => void;
  setConfirmedFloodZoneIds: (val: string[]) => void;
  favoriteEventIds: Set<number>;
  onToggleEventFavorite: (eventId: number) => Promise<boolean>;
  waypoints?: LocationPoint[];
  setWaypoints?: React.Dispatch<React.SetStateAction<LocationPoint[]>>;
  waypointQueries?: string[];
  setWaypointQueries?: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RoutePanel({
  hidden,
  loadingSearch,
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
  onOpenSaveRouteModal,
  handleShareRoute,
  setRouteData,
  setDestination,
  setOrigin,
  setRouteAlertMessage,
  setConfirmedFloodZoneIds,
  onStartNavigation,
  favoriteEventIds,
  onToggleEventFavorite,
  waypoints,
  setWaypoints,
  waypointQueries,
  setWaypointQueries,
}: RoutePanelProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCustomLocationFavorited, setIsCustomLocationFavorited] =
    useState(false);
  const { favoriteIds, toggleFavorite } = useFavoritePoiStore();

  // new states to prevent duplicate clicks
  const [isSavingFav, setIsSavingFav] = useState(false);
  const [localFavState, setLocalFavState] = useState<boolean | null>(null);

  // Responsive Drag / Collapse State (Chỉ áp dụng cho giao diện mobile/responsive)
  const [isMobileExpanded, setIsMobileExpanded] = useState(true);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;
    if (diffY > 40) {
      setIsMobileExpanded(false);
      touchStartY.current = null;
    } else if (diffY < -40) {
      setIsMobileExpanded(true);
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  // Voice Search integration
  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition();
  const [listeningTarget, setListeningTarget] = useState<
    "destination" | "origin" | null
  >(null);

  const handleToggleVoiceSearch = (target: "destination" | "origin") => {
    if (!isSpeechSupported) {
      showPremiumToast(
        "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói Web Speech API.",
        "error",
      );
      return;
    }
    if (isListening && listeningTarget === target) {
      stopListening();
      setListeningTarget(null);
    } else {
      setListeningTarget(target);
      setActiveInputField(target);
      startListening("vi-VN");
      showPremiumToast(
        "🎙️ Đang lắng nghe... Vui lòng đọc tên địa điểm.",
        "info",
      );
    }
  };

  useEffect(() => {
    if (transcript && listeningTarget) {
      if (listeningTarget === "destination") {
        setDestinationQuery(transcript);
        setActiveInputField("destination");
        if (setShowSuggestions) setShowSuggestions(true);
      } else if (listeningTarget === "origin") {
        setOriginQuery(transcript);
        setActiveInputField("origin");
        if (setShowSuggestions) setShowSuggestions(true);
      }
    }
  }, [transcript, listeningTarget]);

  useEffect(() => {
    if (speechError) {
      showPremiumToast(speechError, "error");
      setListeningTarget(null);
    }
  }, [speechError]);

  // Lấy ID của POI hoặc Event từ destination
  const destinationPoiId = destination?.poi_id;
  const destinationEventId = (destination as any)?.event_id;

  // Reset local state khi thay đổi điểm đến
  useEffect(() => {
    setLocalFavState(null);
  }, [
    destinationPoiId,
    destinationEventId,
    destination?.lat,
    destination?.lng,
  ]);

  useEffect(() => {
    // Hàm xử lý khi nhận được tín hiệu cập nhật danh sách yêu thích
    const handleFavoritesUpdated = () => {
      // Reset trạng thái trước khi kiểm tra lại
      setIsCustomLocationFavorited(false);

      // Kiểm tra các địa điểm yêu thích tùy chỉnh
      const checkIfCustomFavorited = async () => {
        if (!destination) return;
        if (destinationPoiId || destinationEventId) return; // system POI / event handled elsewhere
        if (destination.lat === undefined || destination.lng === undefined)
          return;

        try {
          const favs = await getFavoriteLocations();
          if (Array.isArray(favs)) {
            const match = favs.find((f: any) => {
              if (f.source_place_id && (destination as any).id) {
                return (
                  f.source_place_id === (destination as any).id ||
                  f.source_place_id === (destination as any).place_id
                );
              }
              // fallback: distance-based (~20 meters)
              const dLat = Math.abs(f.latitude - destination.lat);
              const dLng = Math.abs(f.longitude - destination.lng);
              return dLat < 0.00025 && dLng < 0.00025;
            });
            setIsCustomLocationFavorited(!!match);
          }
        } catch (err) {
          // ignore
        }
      };

      checkIfCustomFavorited();
    };

    // 1. Chạy ngay khi destination thay đổi (như code ban đầu của bạn)
    handleFavoritesUpdated();

    // 2. Lắng nghe sự kiện "favorites:updated" khi có hành động Thêm/Xóa ở nơi khác (như ProfilePage)
    window.addEventListener("favorites:updated", handleFavoritesUpdated);

    // 3. Cleanup sự kiện khi component unmount hoặc destination thay đổi[cite: 3]
    return () => {
      window.removeEventListener("favorites:updated", handleFavoritesUpdated);
    };
  }, [destination, destinationPoiId, destinationEventId]);

  // 1. ĐỒNG BỘ LOGIC YÊU THÍCH: Kết hợp state cục bộ và state global
  const derivedIsFavDest = destinationPoiId
    ? favoriteIds.has(destinationPoiId)
    : destinationEventId
      ? favoriteEventIds.has(destinationEventId)
      : isCustomLocationFavorited;

  const isFavDest = localFavState !== null ? localFavState : derivedIsFavDest;

  // Luôn cho phép hiển thị nút yêu thích vì giờ đã hỗ trợ cả địa điểm tự do
  const canBeFavorited = !!destinationQuery || !!destination;

  const forwardGeocode = async (query: string) => {
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(query)}&access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=1&language=vi`,
      );
      const data = await response.json();
      if (data?.features && data.features.length > 0) {
        const f = data.features[0];
        return {
          lat: f.geometry?.coordinates?.[1],
          lng: f.geometry?.coordinates?.[0],
          label:
            f.properties?.full_address || f.properties?.name || f.text || query,
          sourcePlaceId: f.properties?.mapbox_id || f.id || undefined,
          rawFeature: f,
        };
      }
      return null;
    } catch (err) {
      console.error("Forward geocode error:", err);
      return null;
    }
  };

  const findExistingCustomFavorite = async (
    lat?: number,
    lng?: number,
    sourcePlaceId?: string,
    name?: string,
  ) => {
    try {
      const favs = await getFavoriteLocations();
      if (!Array.isArray(favs)) return null;
      return (
        favs.find((f: any) => {
          if (sourcePlaceId && f.source_place_id) {
            return f.source_place_id === sourcePlaceId;
          }
          // name match fallback
          if (name && f.name && f.name === name) return true;
          if (lat !== undefined && lng !== undefined) {
            const dLat = Math.abs(f.latitude - lat);
            const dLng = Math.abs(f.longitude - lng);
            return dLat < 0.00025 && dLng < 0.00025; // ~ <30m
          }
          return false;
        }) || null
      );
    } catch (err) {
      console.error("Error checking existing favorites:", err);
      return null;
    }
  };

  const handleFavDestClick = async () => {
    if (!canBeFavorited || isSavingFav) return;

    // Kiểm tra đăng nhập
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast(
        "Vui lòng đăng nhập để lưu địa điểm/sự kiện yêu thích.",
        "error",
      );
      return;
    }

    setIsSavingFav(true);

    try {
      // 1) POI đã có trong hệ thống
      if (destinationPoiId) {
        try {
          const res = await toggleFavorite(destinationPoiId);
          setLocalFavState(res);
          showPremiumToast(
            res
              ? "Đã lưu địa điểm vào danh sách yêu thích!"
              : "Đã xóa địa điểm khỏi danh sách yêu thích.",
            "success",
          );
        } catch (err: any) {
          // Nếu toggleFavorite trả về lỗi 404 (POI không tồn tại) => fallback: lưu như custom location nếu có tọa độ
          console.warn("toggleFavorite error:", err);
          const status = err?.response?.status;
          if (status === 404) {
            // fallback to saving custom location if we have coords
            const lat = destination?.lat;
            const lng = destination?.lng;
            const label = destination?.label || destinationQuery;
            const sourcePlaceId =
              (destination as any)?.id || (destination as any)?.place_id;
            if (lat !== undefined && lng !== undefined) {
              // check existing then save
              const existing = await findExistingCustomFavorite(
                lat,
                lng,
                sourcePlaceId,
                label,
              );
              if (existing) {
                await deleteFavoriteLocation(existing.favorite_id);
                setIsCustomLocationFavorited(false);
                setLocalFavState(false);
                showPremiumToast("Đã xóa khỏi danh sách yêu thích!", "success");
              } else {
                await saveFavoriteLocation(
                  label || destinationQuery,
                  lat,
                  lng,
                  sourcePlaceId,
                );
                setIsCustomLocationFavorited(true);
                setLocalFavState(true);
                showPremiumToast(
                  "Đã lưu địa điểm tự do vào danh sách yêu thích!",
                  "success",
                );
              }
              // notify others
              window.dispatchEvent(new CustomEvent("favorites:updated"));
            } else {
              showPremiumToast("Không có toạ độ để lưu địa điểm.", "error");
            }
          } else {
            showPremiumToast(
              "Không thể cập nhật trạng thái yêu thích lúc này.",
              "error",
            );
          }
        } finally {
          setIsSavingFav(false);
        }
        return;
      }

      // 2) Event -> dùng onToggleEventFavorite (đã truyền từ Home)
      if (destinationEventId) {
        try {
          const isFav = await onToggleEventFavorite(destinationEventId);
          setLocalFavState(isFav);
          showPremiumToast(
            isFav
              ? "Đã lưu sự kiện vào danh sách yêu thích!"
              : "Đã xóa sự kiện khỏi danh sách.",
            "success",
          );
        } catch (err) {
          console.error("Error toggling event favorite:", err);
          showPremiumToast("Không thể cập nhật sự kiện yêu thích.", "error");
        } finally {
          setIsSavingFav(false);
        }
        return;
      }

      // 3) Địa điểm tự do (custom): cần coords. Nếu chưa có coords, gọi forward-geocode từ destinationQuery
      let lat = destination?.lat;
      let lng = destination?.lng;
      let label = destination?.label || destinationQuery;
      let sourcePlaceId =
        (destination as any)?.id || (destination as any)?.place_id;

      if ((lat === undefined || lng === undefined) && destinationQuery) {
        const resolved = await forwardGeocode(destinationQuery);
        if (!resolved) {
          showPremiumToast(
            "Không tìm thấy địa điểm. Vui lòng thử lại hoặc chọn từ gợi ý.",
            "error",
          );
          setIsSavingFav(false);
          return;
        }
        lat = resolved.lat;
        lng = resolved.lng;
        label = resolved.label;
        sourcePlaceId = resolved.sourcePlaceId;
        // update destination in parent UI (so user sees marker)
        setDestination({
          lat,
          lng,
          label,
          ...(sourcePlaceId ? { id: sourcePlaceId } : {}),
        } as any);
        setDestinationQuery(label);
      }

      if (lat === undefined || lng === undefined) {
        showPremiumToast(
          "Thiếu toạ độ địa điểm. Vui lòng chọn vị trí hợp lệ.",
          "error",
        );
        setIsSavingFav(false);
        return;
      }

      // Kiểm tra xem đã có favorite tương ứng chưa
      const existing = await findExistingCustomFavorite(
        lat,
        lng,
        sourcePlaceId,
        label,
      );
      if (existing) {
        // Nếu tồn tại -> xóa (toggle)
        try {
          await deleteFavoriteLocation(existing.favorite_id);
          setIsCustomLocationFavorited(false);
          setLocalFavState(false);
          showPremiumToast("Đã xóa khỏi danh sách yêu thích!", "success");
          // notify others
          window.dispatchEvent(new CustomEvent("favorites:updated"));
        } catch (err) {
          console.error("Error deleting favorite location:", err);
          showPremiumToast("Không thể xóa địa điểm yêu thích.", "error");
        } finally {
          setIsSavingFav(false);
        }
        return;
      }

      // Nếu chưa tồn tại -> lưu
      try {
        await saveFavoriteLocation(
          label || destinationQuery,
          lat,
          lng,
          sourcePlaceId,
        );
        setIsCustomLocationFavorited(true);
        setLocalFavState(true);
        showPremiumToast(
          "Đã lưu địa điểm tự do vào danh sách yêu thích!",
          "success",
        );
        // notify others
        window.dispatchEvent(new CustomEvent("favorites:updated"));
      } catch (err) {
        console.error("Lỗi khi lưu favorite location:", err);
        showPremiumToast("Không thể lưu địa điểm lúc này.", "error");
      } finally {
        setIsSavingFav(false);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý yêu thích:", error);
      showPremiumToast("Có lỗi xảy ra. Vui lòng thử lại.", "error");
      setIsSavingFav(false);
    }
  };

  const handleStartTrip = () => {
    if (!origin || !destination || !routeData) return;
    onStartNavigation();
    showPremiumToast("Dẫn đường đã bắt đầu!", "success");
  };

  // ✅ Sửa điều kiện chặn hiển thị: Cho phép cả pois VÀ events
  if (hidden) return null;
  if (viewMode !== "pois" && viewMode !== "events") return null;

  return (
    <>
      <div ref={searchContainerRef} className="relative z-50 flex flex-col gap-2 max-h-[calc(100dvh-3.5rem)]">
        {/* Khung ô nhập liệu & gợi ý tìm kiếm */}
        <div className="relative z-50 shrink-0">
          {!destination ? (
            <div className="w-full h-[42px] bg-white rounded-full shadow-md border border-slate-200/60 flex items-center px-4">
              <Search className="text-blue-500 mr-2 shrink-0" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm địa điểm..."
                value={destinationQuery}
                onChange={(e) => {
                  setDestinationQuery(e.target.value);
                  setActiveInputField("destination");
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setActiveInputField("destination");
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full bg-transparent outline-none text-xs font-medium text-slate-700 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => handleToggleVoiceSearch("destination")}
                className={`ml-2 p-1.5 rounded-full transition-all shrink-0 ${
                  isListening && listeningTarget === "destination"
                    ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-300"
                    : "text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                }`}
                title={
                  isListening && listeningTarget === "destination"
                    ? "Đang lắng nghe giọng nói..."
                    : "Tìm kiếm bằng giọng nói"
                }
              >
                {isListening && listeningTarget === "destination" ? (
                  <MicOff size={16} />
                ) : (
                  <Mic size={16} />
                )}
              </button>
            </div>
          ) : (
            <div className="w-full max-h-[35dvh] overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col gap-3 relative">
              <div className="absolute left-[26px] top-[34px] bottom-[34px] w-[2px] border-l-2 border-dashed border-slate-200"></div>
              <div className="flex items-center gap-3 relative">
                <span className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white z-10 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                </span>
                <div className="relative w-full flex items-center">
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
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceSearch("origin")}
                    className={`absolute right-2 p-1 rounded-full transition-all shrink-0 ${
                      isListening && listeningTarget === "origin"
                        ? "bg-red-500 text-white animate-pulse"
                        : "text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                    }`}
                    title={
                      isListening && listeningTarget === "origin"
                        ? "Đang lắng nghe..."
                        : "Tìm bằng giọng nói"
                    }
                  >
                    {isListening && listeningTarget === "origin" ? (
                      <MicOff size={14} />
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Chặng đi giữa (Waypoints) */}
              {waypoints &&
                waypoints.map((wp, idx) => (
                  <div
                    key={`waypoint-input-${idx}`}
                    className="flex items-center gap-3 relative"
                  >
                    <span className="w-4 h-4 rounded-full border-2 border-slate-400 bg-white z-10 flex items-center justify-center shrink-0 text-[9px] font-black text-slate-500">
                      {String.fromCharCode(66 + idx)}
                    </span>
                    <div className="relative w-full flex items-center">
                      <input
                        type="text"
                        placeholder={`Chọn điểm dừng ${idx + 1}...`}
                        value={waypointQueries?.[idx] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (setWaypointQueries) {
                            setWaypointQueries((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }
                          setActiveInputField(`waypoint-${idx}`);
                        }}
                        onFocus={() => {
                          setActiveInputField(`waypoint-${idx}`);
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
                      />
                      <button
                        onClick={() => {
                          if (setWaypoints && setWaypointQueries) {
                            setWaypoints((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                            setWaypointQueries((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }
                        }}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 font-bold text-sm"
                        title="Xóa điểm dừng"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

              <div className="flex items-center gap-3 relative">
                <span className="text-red-500 z-10 text-sm font-bold shrink-0">
                  📍
                </span>
                <div className="relative w-full flex items-center">
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
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleVoiceSearch("destination")}
                    className={`absolute right-2 p-1 rounded-full transition-all shrink-0 ${
                      isListening && listeningTarget === "destination"
                        ? "bg-red-500 text-white animate-pulse"
                        : "text-slate-400 hover:text-blue-600 hover:bg-slate-200"
                    }`}
                    title={
                      isListening && listeningTarget === "destination"
                        ? "Đang lắng nghe..."
                        : "Tìm bằng giọng nói"
                    }
                  >
                    {isListening && listeningTarget === "destination" ? (
                      <MicOff size={14} />
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Nút Thêm điểm dừng */}
              {(!waypoints || waypoints.length < 3) && (
                <button
                  onClick={() => {
                    if (setWaypoints && setWaypointQueries) {
                      setWaypoints((prev) => [
                        ...prev,
                        { lat: undefined, lng: undefined, label: "" } as any,
                      ]);
                      setWaypointQueries((prev) => [...prev, ""]);
                    }
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 font-semibold self-start ml-7 mt-0.5 hover:underline"
                >
                  <span className="text-sm font-bold">+</span> Thêm điểm dừng
                </button>
              )}

              {(!waypoints || waypoints.length === 0) && (
                <button
                  onClick={handleSwapLocations}
                  className="absolute right-6 top-[40px] w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                  title="Đảo ngược vị trí"
                >
                  <ArrowUpDown size={14} />
                </button>
              )}
            </div>
          )}

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 w-full max-h-[min(45dvh,320px)] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-[999]">
              {loadingSearch ? (
                <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-slate-500">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <span>Đang tìm địa điểm...</span>
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((item: any) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full min-h-12 text-left p-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-start gap-2 text-[11px] font-medium text-slate-700 border-b border-slate-50 last:border-b-0"
                  >
                    <span className="text-slate-400 mt-0.5" aria-hidden="true">
                      📍
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 line-clamp-1">
                        {item.text_vi || item.text}
                      </div>

                      <div className="text-slate-500 text-[10px] line-clamp-2 mt-0.5">
                        {item.place_name_vi || item.place_name}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <div className="text-sm font-semibold text-slate-700">
                    Không tìm thấy địa điểm
                  </div>

                  <div className="text-[11px] text-slate-500 mt-1">
                    Hãy thử nhập tên đường, địa danh hoặc quận khác.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {routeData && (
          <div
            className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar transition-all duration-300 max-md:fixed max-md:left-3 max-md:right-3 max-md:bottom-3 max-md:w-auto max-md:mt-0 max-md:z-[100] max-md:rounded-2xl ${
              isMobileExpanded
                ? "max-md:max-h-[82dvh]"
                : "max-md:max-h-[145px] max-md:overflow-hidden"
            }`}
          >
            {/* THANH KÉO (DRAG HANDLE) CHỈ HIỆN TRÊN MOBILE / RESPONSIVE */}
            <div
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="md:hidden w-full flex flex-col items-center pb-2 cursor-pointer touch-none select-none border-b border-slate-100 mb-2"
            >
              <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors mb-1" />
              <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-500 px-1">
                <span className="uppercase tracking-wider">Chi tiết lộ trình</span>
                <span className="text-blue-600 font-extrabold flex items-center gap-1">
                  {isMobileExpanded ? "Thu gọn ▼" : "Kéo lên mở rộng ▲"}
                </span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 max-md:hidden">
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

            {/* Nút bắt đầu chuyến đi */}
            <button
              onClick={handleStartTrip}
              disabled={isStarting}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              <Navigation
                size={16}
                className={isStarting ? "animate-pulse" : ""}
              />
              {isStarting ? "ĐANG KHỞI HÀNH..." : "BẮT ĐẦU CHUYẾN ĐI"}
            </button>

            {/* Nhóm nút phụ */}
            <div className="flex flex-col gap-2 mt-3">
              {/* Hàng: Lưu lộ trình + Chia sẻ */}
              <div className="flex gap-2">
                <button
                  onClick={onOpenSaveRouteModal}
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
                  disabled={isSavingFav}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    isFavDest
                      ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Heart
                    size={13}
                    className={isFavDest ? "fill-current" : ""}
                  />
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
    </>
  );
}
// --- Turn-by-Turn Steps Component ---
export function TurnByTurnSteps({ steps }: { steps: RouteStep[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredSteps = steps.filter(
    (s) => s.maneuver.type !== "depart" && s.maneuver.type !== "arrive",
  );
  const displaySteps = isExpanded ? steps : steps.slice(0, 3);

  const getStepIcon = (type: string, modifier?: string) => {
    if (type === "turn" || type === "end of road" || type === "fork") {
      if (modifier?.includes("left"))
        return <CornerUpLeft size={14} className="text-blue-600" />;
      if (modifier?.includes("right"))
        return <CornerUpRight size={14} className="text-blue-600" />;
    }
    if (type === "depart")
      return <Navigation size={14} className="text-emerald-600" />;
    if (type === "arrive") return <Flag size={14} className="text-red-500" />;
    if (type === "rotary" || type === "roundabout")
      return <RotateCcw size={14} className="text-violet-600" />;
    if (type === "merge" || type === "on ramp" || type === "off ramp")
      return <ArrowUp size={14} className="text-blue-500 rotate-45" />;
    return <ArrowUp size={14} className="text-slate-600" />;
  };

  const formatDist = (m: number) => {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <MapPin size={12} className="text-blue-500" />
          Hướng dẫn chi tiết ({filteredSteps.length} bước)
        </h4>
        <span className="text-slate-400 group-hover:text-blue-500 transition-colors">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <div className="flex flex-col gap-0 max-h-[40vh] overflow-y-auto scrollbar-none pr-1">
        {displaySteps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-b-0 group/step hover:bg-slate-50/50 rounded-lg px-1 transition-colors"
          >
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center group-hover/step:bg-blue-50 group-hover/step:border-blue-200 transition-colors">
                {getStepIcon(step.maneuver.type, step.maneuver.modifier)}
              </div>
              {idx < displaySteps.length - 1 && (
                <div className="w-px h-full min-h-[8px] bg-slate-200 mt-1" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-800 leading-snug">
                {step.maneuver.instruction || step.name || "Tiếp tục đi thẳng"}
              </p>
              {step.name && step.maneuver.instruction && (
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {step.name}
                </p>
              )}
            </div>

            <span className="text-[10px] font-bold text-slate-400 shrink-0 pt-0.5">
              {step.distance > 0 ? formatDist(step.distance) : ""}
            </span>
          </div>
        ))}
      </div>

      {steps.length > 3 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
        >
          Xem thêm {steps.length - 3} bước nữa...
        </button>
      )}
    </div>
  );
}
