import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ProfilePage from "../Profile/ProfilePage";
import Map, {
  NavigationControl,
  Marker,
  Source,
  Layer,
  MapRef,
  Popup,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { io } from 'socket.io-client';

import { eventRoadService, EventRoad } from "../../services/eventRoadService";
import { findSafeEventRoute } from "../../utils/eventRouteUtils";
import { usePreferenceStore } from "../../store/preferenceStore";
import { useFavoritePoiStore } from "../../store/favoritePoiStore";
import { findSafeTrafficRoute } from "../../utils/trafficRouteUtils";
import {
  findSafeRoute as findSafeRouteZone,
  findFloodZoneContainingPoint,
  isPointInsideFloodZone,
} from "../../utils/floodZoneRouteUtils";
import { formatToVNTime } from "../../utils/dateUtils";

import {
  Search,
  Navigation,
  Bell,
  User,
  Settings,
  X,
  ShieldAlert,
  Ban,
  CloudRain,
  Compass,
  Utensils,
  Hotel,
  Gamepad2,
  Landmark,
  DollarSign,
  Layers,
  TrendingUp,
  RouteOff,
  Car,
  Footprints,
  Bike,
  ArrowUpDown,
  Calendar,
  AlertTriangle,
  Construction,
  CheckCircle2,
  Heart,
  Share2,
  Bookmark,
  Copy,
  ExternalLink,
} from "lucide-react";
import { showPremiumToast } from "../../utils/toastUtils";
import {
  savedRouteService,
  SavedRoute,
} from "../../services/savedRouteService";
import { useMapRouting } from "./hooks/useMapRouting";
import { useFloodZones } from "./hooks/useFloodZones";
import { useEventRoads } from "./hooks/useEventRoads";
import { useUserLocation } from "./hooks/useUserLocation";
import { ConfirmModal } from "./components/ConfirmModal";
import { RoutePanel } from "./components/RoutePanel";
import { MapToolbar } from "./components/MapToolbar";
import { AlertBanner } from "./components/AlertBanner";
import { WeatherWidget } from "./components/WeatherWidget";

import POIsLayer from "./components/POIsLayer";
import { poiAPI, eventAPI, trafficAlertAPI } from "../../services/api";
import { POIData } from "./components/POIPopup";
import POIFeaturedSidebar from "./components/POIFeaturedSidebar";
import EventsLayer, { EventData } from "./components/EventsLayer";
import EventsSidebar from "./components/EventsSidebar";
import EventDetailSidebar from "./components/EventDetailSidebar";
import NotificationCenter from "./components/NotificationCenter";
import {
  useNotificationStore,
  AppNotification,
} from "../../store/notificationStore";
import { AIChatbot } from "./components/AIChatbot";

const filterCategories = [
  { id: "attractions", label: "Điểm tham quan", icon: Compass },
  { id: "restaurants", label: "Nhà hàng", icon: Utensils },
  { id: "hotels", label: "Khách sạn", icon: Hotel },
  { id: "entertainment", label: "Giải trí", icon: Gamepad2 },
  { id: "museums", label: "Bảo tàng", icon: Landmark },
  { id: "atm", label: "ATM", icon: DollarSign },
];

const mockAlerts = [
  {
    id: 1,
    type: "flood",
    title: "Ngập lụt",
    content:
      "Đường Nguyễn Văn Linh đang có nguy cơ ngập cao, mức nước dự báo 20–30cm. Tránh di chuyển qua khu vực này.",
    location: "Nguyễn Văn Linh, Hải Châu",
    time: "Vừa cập nhật",
  },
  {
    id: 2,
    type: "block",
    title: "Cấm đường",
    content:
      "Đường Trần Hưng Đạo bị cấm từ 18:00–23:00 do sự kiện DIFF 2026. Lưu ý lộ trình thay thế qua Hùng Vương.",
    location: "Trần Hưng Đạo, Hải Châu",
    time: "Có hiệu lực từ 18:00",
  },
  {
    id: 3,
    type: "flood",
    title: "Ngập lụt",
    content: "Khu vực chân cầu Tuyên Sơn nước dâng nhanh do triều cường.",
    location: "Chân cầu Tuyên Sơn",
    time: "10 phút trước",
  },
];

function getCirclePolygon(
  center: [number, number],
  radiusInMeters: number,
  points = 64,
): [number, number][] {
  const [lng, lat] = center;
  const R = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const dByR = radiusInMeters / R;

  const coordinates: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;

    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(dByR) +
        Math.cos(latRad) * Math.sin(dByR) * Math.cos(angle),
    );

    const newLngRad =
      lngRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(dByR) * Math.cos(latRad),
        Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad),
      );

    coordinates.push([
      (newLngRad * 180) / Math.PI,
      (newLatRad * 180) / Math.PI,
    ]);
  }

  coordinates.push(coordinates[0]);
  return coordinates;
}

export default function Home() {
  // KHOẢNG KHAI BÁO STATE VÀ REFS BẮT BUỘC PHẢI Ở TRONG COMPONENT
  const mapRef = useRef<MapRef>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const watchPositionId = useRef<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const tab = queryParams.get("tab");

  const userRole = localStorage.getItem("userRole");
  const [showAlertPopup, setShowAlertPopup] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Notification store
  const { unreadCount, startPolling, stopPolling } = useNotificationStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Quản lý trạng thái mở rộng/thu nhỏ của WeatherWidget
  const [isWeatherExpanded, setIsWeatherExpanded] = useState<boolean>(() => {
    return localStorage.getItem('weather_widget_collapsed') !== 'true';
  });

  const handleToggleWeather = () => {
    const nextState = !isWeatherExpanded;
    setIsWeatherExpanded(nextState);
    localStorage.setItem('weather_widget_collapsed', (!nextState).toString());
  };

  // States cho Chế độ Tiết kiệm băng thông & Ngoại tuyến
  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return typeof localStorage !== 'undefined' && localStorage.getItem('low_bandwidth_mode') === 'true';
  });
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showPremiumToast('Đã khôi phục kết nối mạng internet.', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsLowBandwidth(true);
      showPremiumToast('Mất kết nối mạng. Đã chuyển sang chế độ Ngoại tuyến khẩn cấp.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection;
    if (conn) {
      const checkConnectionSpeed = () => {
        if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g') {
          setIsLowBandwidth(true);
          showPremiumToast('Phát hiện sóng di động yếu (2G/3G). Đã tự động kích hoạt Tiết kiệm băng thông.', 'info');
        }
      };
      conn.addEventListener('change', checkConnectionSpeed);
      checkConnectionSpeed();
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        conn.removeEventListener('change', checkConnectionSpeed);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // States cho Chia sẻ vị trí trực tiếp (Live Location Sharing)
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [liveShareToken, setLiveShareToken] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const shareWatchId = useRef<number | null>(null);

  // Cleanup kết nối socket và GPS watch khi unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (shareWatchId.current !== null) navigator.geolocation.clearWatch(shareWatchId.current);
    };
  }, []);

  // Watch position định vị GPS và gửi tọa độ thời gian thực qua socket
  useEffect(() => {
    if (!isSharingLocation || !liveShareToken) {
      if (shareWatchId.current !== null) {
        navigator.geolocation.clearWatch(shareWatchId.current);
        shareWatchId.current = null;
      }
      return;
    }
    if (!navigator.geolocation) {
      showPremiumToast('Thiết bị không hỗ trợ định vị GPS.', 'error');
      setIsSharingLocation(false);
      return;
    }
    shareWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('update-location', {
            shareToken: liveShareToken,
            lat: latitude,
            lng: longitude,
            heading: heading || 0
          });
        }
      },
      (err) => console.error('❌ [Share GPS] Lỗi định vị:', err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => {
      if (shareWatchId.current !== null) {
        navigator.geolocation.clearWatch(shareWatchId.current);
        shareWatchId.current = null;
      }
    };
  }, [isSharingLocation, liveShareToken]);

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(1);

  // State lưu trữ dữ liệu ngập lụt
  const {
    floodZones,
    setFloodZones,
    confirmedFloodZoneIds,
    setConfirmedFloodZoneIds,
    fetchFloodZones,
  } = useFloodZones();
  const [selectedFloodZone, setSelectedFloodZone] = useState<any | null>(null);
  const [hoveredFloodZone, setHoveredFloodZone] = useState<any | null>(null);

  // State lưu trữ POIs
  const [pois, setPois] = useState<POIData[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POIData | null>(null);

  // State cho Sự Kiện
  const [viewMode, setViewMode] = useState<"pois" | "events">("pois");
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventCategories, setEventCategories] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [favoriteEventIds, setFavoriteEventIds] = useState<Set<number>>(
    new Set(),
  );
  const [showEventsSidebar, setShowEventsSidebar] = useState(true);

  // State cho Đường cấm sự kiện
  const {
    eventRoads,
    setEventRoads,
    activeOrSelectedEventRoads,
    isRoadRestrictionActive,
    fetchEventRoads,
  } = useEventRoads(selectedEvent);
  const [selectedRoadPopup, setSelectedRoadPopup] = useState<EventRoad | null>(
    null,
  );

  // State cho Cảnh báo giao thông (Traffic Alerts)
  const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
  const [selectedTrafficAlert, setSelectedTrafficAlert] = useState<any | null>(
    null,
  );
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    type: "CONGESTION",
    title: "",
    description: "",
    location: "",
    latitude: 16.0544,
    longitude: 108.2022,
    severity: "MEDIUM",
  });

  const [mapControls, setMapControls] = useState({
    layers: true,
    traffic: true,
    flood: false,
  });

  const [avoidFlood, setAvoidFlood] = useState<boolean>(true);
  const [avoidCongestion, setAvoidCongestion] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<{
    username: string;
    avatar_url?: string;
  } | null>(null);

  // Stores hooks
  const { preferences, fetchPreferences, updateAllPreferences } =
    usePreferenceStore();
  const { fetchFavoriteIds } = useFavoritePoiStore();

  // Map routing states
  const [activeInputField, setActiveInputField] = useState<
    "origin" | "destination" | null
  >(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [pendingDestination, setPendingDestination] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showCustomConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void,
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onCancel();
      },
    });
  };

  const {
    origin,
    setOrigin,
    originQuery,
    setOriginQuery,
    destination,
    setDestination,
    destinationQuery,
    setDestinationQuery,
    travelMode,
    setTravelMode,
    routeData,
    setRouteData,
    loadingRoute,
    setLoadingRoute,
    routeAlertMessage,
    setRouteAlertMessage,
    isLoadedRouteRef,
    applyRouteToState,
  } = useMapRouting(mapRef, {
    avoidFlood,
    avoidCongestion,
    confirmedFloodZoneIds,
    floodZones,
    activeEventRoads: activeOrSelectedEventRoads,
    trafficAlerts,
    isLowBandwidth,
    isOffline,
  });

  // CÁC HÀM XỬ LÝ DẪN ĐƯỜNG (NAVIGATION)
  const handleStartNavigation = () => {
    if (!navigator.geolocation) {
      showPremiumToast("Thiết bị không hỗ trợ GPS.", "error");
      return;
    }

    if (watchPositionId.current !== null) return;
    setIsNavigating(true);

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        // Nếu bạn có hàm setUserLocation từ useUserLocation, bạn có thể gọi ở đây
        // setUserLocation({ lat: latitude, lng: longitude });

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 18,
          pitch: 60,
          bearing: heading ?? 0,
          duration: 500,
        });
      },
      (err) => {
        console.error(err);
        showPremiumToast("Không thể lấy GPS.", "error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    );
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    if (watchPositionId.current !== null) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
    }
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, zoom: 14 });
  };

  // Cleanup watcher when component unmounts
  useEffect(() => {
    return () => {
      if (watchPositionId.current !== null) {
        navigator.geolocation.clearWatch(watchPositionId.current);
      }
    };
  }, []);

  const handleOpenReportModal = (lat: number, lng: number) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast(
        "Vui lòng đăng nhập để gửi báo cáo sự cố giao thông.",
        "error",
      );
      return;
    }

    setReportFormData({
      type: "CONGESTION",
      title: "",
      description: "",
      location: `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      latitude: lat,
      longitude: lng,
      severity: "MEDIUM",
    });
    setShowReportModal(true);
    setPendingDestination(null);
  };

  const handleSubmitTrafficReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await trafficAlertAPI.createTrafficAlert(reportFormData);
      if (response.data && response.data.success) {
        showPremiumToast(
          "Gửi báo cáo sự cố giao thông thành công! Đang chờ phê duyệt.",
          "success",
        );
        setShowReportModal(false);
        fetchTrafficAlerts();
      } else {
        showPremiumToast(
          response.data.message || "Lỗi gửi báo cáo sự cố.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Lỗi gửi báo cáo sự cố:", error);
      showPremiumToast(
        error.response?.data?.message || "Không thể gửi báo cáo lên hệ thống.",
        "error",
      );
    }
  };

  const handleEventClick = (evt: EventData) => {
    setSelectedEvent(evt);
    setShowSavedRoutesSidebar(false);
    setSelectedPOI(null);
    mapRef.current?.flyTo({
      center: [evt.longitude, evt.latitude],
      zoom: 15,
      duration: 1200,
    });
  };

  const handlePOIClick = (poi: POIData) => {
    setSelectedPOI(poi);
    mapRef.current?.flyTo({
      center: [poi.longitude, poi.latitude],
      zoom: 16,
      duration: 1200,
    });
  };

  const handleToggleShareLocation = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!token) {
      showPremiumToast('Vui lòng đăng nhập để sử dụng tính năng chia sẻ vị trí.', 'error');
      return;
    }
    if (isSharingLocation) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${apiUrl}/api/location/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ share_token: liveShareToken })
        });
        const data = await res.json();
        if (data.success) {
          setIsSharingLocation(false);
          setLiveShareToken(null);
          if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
          showPremiumToast('Đã dừng chia sẻ vị trí trực tiếp.', 'success');
        } else {
          showPremiumToast(data.message || 'Lỗi dừng chia sẻ.', 'error');
        }
      } catch (err) {
        showPremiumToast('Lỗi kết nối máy chủ.', 'error');
      }
    } else {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${apiUrl}/api/location/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.share_token) {
          const shareToken = data.share_token;
          setLiveShareToken(shareToken);
          socketRef.current = io(apiUrl);
          socketRef.current.on('connect', () => { socketRef.current.emit('join-session', { shareToken }); });
          setIsSharingLocation(true);
          const shareLink = `${window.location.origin}/track/${shareToken}`;
          navigator.clipboard.writeText(shareLink);
          showPremiumToast(`Đã bật chia sẻ vị trí trực tiếp! Link theo dõi đã được sao chép: ${shareLink}`, 'success', 6000);
        } else {
          showPremiumToast(data.message || 'Lỗi khởi tạo chia sẻ vị trí.', 'error');
        }
      } catch (err) {
        showPremiumToast('Lỗi kết nối máy chủ.', 'error');
      }
    }
  };

  const handleFavoriteEventToggle = async (eventObj: EventData) => {
    try {
      const res = await eventAPI.toggleFavorite(eventObj.event_id);
      const { isFavorite, favoriteCount } = res.data;

      setFavoriteEventIds((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.add(eventObj.event_id);
        } else {
          next.delete(eventObj.event_id);
        }
        return next;
      });

      setEvents((prev) =>
        prev.map((e) => {
          if (e.event_id === eventObj.event_id) {
            return { ...e, favorite_count: favoriteCount };
          }
          return e;
        }),
      );

      if (selectedEvent && selectedEvent.event_id === eventObj.event_id) {
        setSelectedEvent((prev) =>
          prev ? { ...prev, favorite_count: favoriteCount } : null,
        );
      }
    } catch (error) {
      console.error("Lỗi toggle yêu thích sự kiện:", error);
      throw error;
    }
  };

  const fetchUserProfile = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();
      if (data?.data) {
        setUserProfile(data.data);
      }
    } catch (err) {
      console.error("Error fetching user profile in Home:", err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // NEW CODE: Flood zone confirmation and route avoidance
  useEffect(() => {
    if (confirmedFloodZoneIds.length === 0) return;

    const newConfirmedIds = confirmedFloodZoneIds.filter((id) => {
      const zone = floodZones.find((z) => z.id === id);
      if (!zone) return false;

      const originInside = origin
        ? isPointInsideFloodZone([origin.lng, origin.lat], zone)
        : false;
      const destInside = destination
        ? isPointInsideFloodZone([destination.lng, destination.lat], zone)
        : false;

      return originInside || destInside;
    });

    if (newConfirmedIds.length !== confirmedFloodZoneIds.length) {
      setConfirmedFloodZoneIds(newConfirmedIds);
    }
  }, [origin, destination, confirmedFloodZoneIds]);

  const validateLocation = (
    lng: number,
    lat: number,
    label: string,
    type: "origin" | "destination",
    onApproved: () => void,
    onRejected: () => void,
  ) => {
    if (!mapControls.flood) {
      onApproved();
      return;
    }

    const zone = findFloodZoneContainingPoint([lng, lat], floodZones);
    if (zone && zone.depthCm > 10) {
      if (!confirmedFloodZoneIds.includes(zone.id)) {
        showCustomConfirm(
          "Xác nhận đi vào vùng ngập sâu",
          `Địa điểm bạn chọn đang nằm trong vùng ngập sâu ${zone.depthCm}cm. Bạn có chắc chắn muốn đi vào khu vực ngập lụt này không?`,
          () => {
            setConfirmedFloodZoneIds((prev) => [...prev, zone.id]);
            onApproved();
          },
          () => {
            showPremiumToast(
              "Bạn đã hủy chọn địa điểm trong vùng ngập. Vui lòng chọn địa điểm khác an toàn hơn.",
              "error",
            );
            onRejected();
          },
        );
      } else {
        onApproved();
      }
    } else if (zone && zone.depthCm <= 10) {
      showCustomConfirm(
        "Địa điểm ngập nhẹ",
        `Địa điểm bạn chọn đang ngập nhẹ khoảng ${zone.depthCm}cm. Bạn có muốn tiếp tục di chuyển tới đây không?`,
        () => {
          onApproved();
        },
        () => {
          onRejected();
        },
      );
    } else {
      onApproved();
    }
  };

  const { userLocation, setUserLocation, handleGetCurrentLocation } =
    useUserLocation(mapRef, validateLocation, setOrigin, setOriginQuery);

  // ============ SAVED ROUTES & SHARING ============
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showSavedRoutesSidebar, setShowSavedRoutesSidebar] = useState(false);
  const [showSaveRouteModal, setShowSaveRouteModal] = useState(false);
  const [saveRouteName, setSaveRouteName] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isSharingRoute, setIsSharingRoute] = useState(false);

  const fetchSavedRoutes = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const routes = await savedRouteService.getSavedRoutes();
      setSavedRoutes(routes);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lộ trình:", error);
    }
  };

  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (token) {
      fetchSavedRoutes();
    }
  }, [showSavedRoutesSidebar]);

  const handleSaveRoute = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast("Vui lòng đăng nhập để lưu lộ trình.", "error");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      return;
    }

    if (!routeData || !origin || !destination) {
      showPremiumToast("Không tìm thấy dữ liệu lộ trình để lưu.", "error");
      return;
    }

    setIsSavingRoute(true);
    try {
      await savedRouteService.saveRoute({
        origin_name: origin.label || originQuery,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.label || destinationQuery,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        route_name:
          saveRouteName.trim() ||
          `Lộ trình từ ${origin.label || "Vị trí hiện tại"} đến ${destination.label || "Điểm đến"}`,
        route_data: JSON.stringify(routeData.coordinates),
        distance_meters: Math.round(routeData.totalDistanceKm * 1000),
        duration_seconds: routeData.totalTimeMin * 60,
        profile: travelMode,
        is_emergency: avoidFlood || activeOrSelectedEventRoads.length > 0,
      });
      showPremiumToast("Lưu lộ trình thành công!", "success");
      setShowSaveRouteModal(false);
      setSaveRouteName("");
      fetchSavedRoutes();
    } catch (error: any) {
      console.error("Lỗi khi lưu lộ trình:", error);
      showPremiumToast(
        error.response?.data?.message || "Không thể lưu lộ trình.",
        "error",
      );
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleShareRoute = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast("Vui lòng đăng nhập để chia sẻ lộ trình.", "error");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      return;
    }

    if (!routeData || !origin || !destination) {
      showPremiumToast("Không tìm thấy dữ liệu lộ trình để chia sẻ.", "error");
      return;
    }

    setIsSharingRoute(true);
    try {
      const data = await savedRouteService.shareDirectRoute({
        origin_name: origin.label || originQuery,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.label || destinationQuery,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        route_name: `Chia sẻ - ${destination.label || "Điểm đến"}`,
        route_data: JSON.stringify(routeData.coordinates),
        distance_meters: Math.round(routeData.totalDistanceKm * 1000),
        duration_seconds: routeData.totalTimeMin * 60,
        profile: travelMode,
        is_emergency: avoidFlood || activeOrSelectedEventRoads.length > 0,
      });

      if (data.success && data.share_token) {
        const shareLink = `${window.location.origin}${import.meta.env.BASE_URL}dashboard?share=${data.share_token}`;
        setShareUrl(shareLink);
        setShowShareModal(true);
        showPremiumToast("Đã tạo liên kết chia sẻ!", "success");
      } else {
        showPremiumToast("Không thể tạo liên kết chia sẻ.", "error");
      }
    } catch (error: any) {
      console.error("Lỗi khi chia sẻ lộ trình:", error);
      showPremiumToast(
        error.response?.data?.message || "Không thể tạo liên kết chia sẻ.",
        "error",
      );
    } finally {
      setIsSharingRoute(false);
    }
  };

  const handleDeleteSavedRoute = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    showCustomConfirm(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa lộ trình này không?",
      async () => {
        try {
          await savedRouteService.deleteRoute(id);
          showPremiumToast("Đã xóa lộ trình!", "success");
          fetchSavedRoutes();
        } catch (error) {
          console.error("Lỗi khi xóa lộ trình:", error);
          showPremiumToast("Không thể xóa lộ trình.", "error");
        }
      },
      () => {},
    );
  };

  const handleSelectSavedRoute = (route: SavedRoute) => {
    setOrigin({
      lat: route.origin_lat,
      lng: route.origin_lng,
      label: route.origin_name || "Vị trí xuất phát",
    });
    setOriginQuery(route.origin_name || "Vị trí xuất phát");

    setDestination({
      lat: route.destination_lat,
      lng: route.destination_lng,
      label: route.destination_name || "Vị trí đến",
    });
    setDestinationQuery(route.destination_name || "Vị trí đến");
    setTravelMode(route.profile as any);

    let coords: [number, number][] = [];
    try {
      coords = JSON.parse(route.route_data);
    } catch (e) {
      console.error("Lỗi parse route_data:", e);
    }

    setRouteData({
      totalDistanceKm: parseFloat((route.distance_meters / 1000).toFixed(2)),
      totalTimeMin: Math.round(route.duration_seconds / 60),
      coordinates: coords,
    });

    if (coords.length > 0) {
      let minLng = coords[0][0],
        maxLng = coords[0][0];
      let minLat = coords[0][1],
        maxLat = coords[0][1];
      for (const c of coords) {
        if (c[0] < minLng) minLng = c[0];
        if (c[0] > maxLng) maxLng = c[0];
        if (c[1] < minLat) minLat = c[1];
        if (c[1] > maxLat) maxLat = c[1];
      }

      mapRef.current?.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 80, duration: 1500 },
      );
    }

    setShowSavedRoutesSidebar(false);
    showPremiumToast("Đã tải lộ trình đã lưu!", "success");
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const shareToken = queryParams.get("share");
    if (shareToken) {
      const loadSharedRoute = async () => {
        try {
          showPremiumToast("Đang tải lộ trình chia sẻ...", "success");
          const route = await savedRouteService.getSharedRoute(shareToken);
          if (route) {
            isLoadedRouteRef.current = true;
            setOrigin({
              lat: route.origin_lat,
              lng: route.origin_lng,
              label: route.origin_name || "Điểm xuất phát chia sẻ",
            });
            setOriginQuery(route.origin_name || "Điểm xuất phát chia sẻ");

            setDestination({
              lat: route.destination_lat,
              lng: route.destination_lng,
              label: route.destination_name || "Điểm đến chia sẻ",
            });
            setDestinationQuery(route.destination_name || "Điểm đến chia sẻ");
            setTravelMode(route.profile as any);

            let coords: [number, number][] = [];
            try {
              coords = JSON.parse(route.route_data);
            } catch (e) {
              console.error("Lỗi parse route_data:", e);
            }

            setRouteData({
              totalDistanceKm: parseFloat(
                (route.distance_meters / 1000).toFixed(2),
              ),
              totalTimeMin: Math.round(route.duration_seconds / 60),
              coordinates: coords,
            });

            if (coords.length > 0) {
              let minLng = coords[0][0],
                maxLng = coords[0][0];
              let minLat = coords[0][1],
                maxLat = coords[0][1];
              for (const c of coords) {
                if (c[0] < minLng) minLng = c[0];
                if (c[0] > maxLng) maxLng = c[0];
                if (c[1] < minLat) minLat = c[1];
                if (c[1] > maxLat) maxLat = c[1];
              }

              mapRef.current?.fitBounds(
                [
                  [minLng, minLat],
                  [maxLng, maxLat],
                ],
                { padding: 80, duration: 1500 },
              );
            }

            const newUrl =
              window.location.pathname +
              window.location.search.replace(/[\?&]share=[^&]+/, "");
            window.history.replaceState({}, "", newUrl || "/");
            showPremiumToast("Tải lộ trình chia sẻ thành công!", "success");
          }
        } catch (error) {
          console.error("Lỗi khi tải lộ trình chia sẻ:", error);
          showPremiumToast(
            "Không thể tải lộ trình chia sẻ. Liên kết có thể đã hết hạn.",
            "error",
          );
        }
      };
      loadSharedRoute();
    }
  }, [location.search]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const routeId = queryParams.get("routeId");
    if (routeId) {
      const loadSavedRouteById = async () => {
        try {
          showPremiumToast("Đang tải lộ trình đã lưu...", "success");
          const route = await savedRouteService.getRouteById(parseInt(routeId));
          if (route) {
            isLoadedRouteRef.current = true;
            setOrigin({
              lat: route.origin_lat,
              lng: route.origin_lng,
              label: route.origin_name || "Điểm xuất phát",
            });
            setOriginQuery(route.origin_name || "Điểm xuất phát");

            setDestination({
              lat: route.destination_lat,
              lng: route.destination_lng,
              label: route.destination_name || "Điểm đến",
            });
            setDestinationQuery(route.destination_name || "Điểm đến");
            setTravelMode(route.profile as any);

            let coords: [number, number][] = [];
            try {
              coords = JSON.parse(route.route_data);
            } catch (e) {
              console.error("Lỗi parse route_data:", e);
            }

            setRouteData({
              totalDistanceKm: parseFloat(
                (route.distance_meters / 1000).toFixed(2),
              ),
              totalTimeMin: Math.round(route.duration_seconds / 60),
              coordinates: coords,
            });

            if (coords.length > 0) {
              let minLng = coords[0][0],
                maxLng = coords[0][0];
              let minLat = coords[0][1],
                maxLat = coords[0][1];
              for (const c of coords) {
                if (c[0] < minLng) minLng = c[0];
                if (c[0] > maxLng) maxLng = c[0];
                if (c[1] < minLat) minLat = c[1];
                if (c[1] > maxLat) maxLat = c[1];
              }

              mapRef.current?.fitBounds(
                [
                  [minLng, minLat],
                  [maxLng, maxLat],
                ],
                { padding: 80, duration: 1500 },
              );
            }

            const newUrl =
              window.location.pathname +
              window.location.search.replace(/[\?&]routeId=[^&]+/, "");
            window.history.replaceState({}, "", newUrl || "/");
            showPremiumToast("Tải lộ trình thành công!", "success");
          }
        } catch (error) {
          console.error("Lỗi khi tải lộ trình đã lưu:", error);
          showPremiumToast("Không thể tải lộ trình đã lưu.", "error");
        }
      };
      loadSavedRouteById();
    }
  }, [location.search]);

  const selectedRoadPopupRef = useRef(selectedRoadPopup);
  const selectedPOIRef = useRef(selectedPOI);
  const selectedFloodZoneRef = useRef(selectedFloodZone);
  const pendingDestinationRef = useRef(pendingDestination);

  useEffect(() => {
    selectedRoadPopupRef.current = selectedRoadPopup;
  }, [selectedRoadPopup]);
  useEffect(() => {
    selectedPOIRef.current = selectedPOI;
  }, [selectedPOI]);
  useEffect(() => {
    selectedFloodZoneRef.current = selectedFloodZone;
  }, [selectedFloodZone]);
  useEffect(() => {
    pendingDestinationRef.current = pendingDestination;
  }, [pendingDestination]);

  const handleMapClick = (event: any) => {
    const { lng, lat } = event.lngLat;

    if (mapRef.current && mapControls.flood) {
      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: ["flood-zones-fill"],
      });

      if (features && features.length > 0) {
        const feature = features[0];
        const props = feature.properties || {};

        const zoneId = String(props.id);
        const zoneName = props.name || "Vùng ngập";
        const depthCm = Number(props.depthCm || 0);
        const label = `${zoneName} - ngập ${depthCm}cm`;

        setSelectedFloodZone({
          lng,
          lat,
          properties: props,
        });

        if (depthCm <= 10) {
          showCustomConfirm(
            "Định tuyến tới vùng ngập nhẹ",
            `Khu vực này đang ngập nhẹ khoảng ${depthCm}cm (Vẫn có thể di chuyển).\n\nBạn có muốn tìm đường đi tới đây không?`,
            () => {
              setDestination({ lng, lat, label });
              setDestinationQuery(label);

              if (userLocation) {
                setOrigin({
                  lng: userLocation.lng,
                  lat: userLocation.lat,
                  label: "Vị trí của bạn",
                });
                setOriginQuery("Vị trí của bạn");
              }
            },
            () => {
              setDestination(null);
              setDestinationQuery("");
              setRouteData(null);
              setRouteAlertMessage(null);
            },
          );
          return;
        }

        showCustomConfirm(
          "Định tuyến tới vùng ngập sâu",
          `Khu vực này đang ngập sâu ${depthCm}cm, có thể gây nguy hiểm cho phương tiện của bạn.\n\nBạn có chắc chắn muốn tiếp tục tìm đường tới đây không?`,
          () => {
            setConfirmedFloodZoneIds((prev) => {
              if (prev.includes(zoneId)) return prev;
              return [...prev, zoneId];
            });

            setDestination({ lng, lat, label });
            setDestinationQuery(label);

            if (userLocation) {
              setOrigin({
                lng: userLocation.lng,
                lat: userLocation.lat,
                label: "Vị trí của bạn",
              });
              setOriginQuery("Vị trí của bạn");
            }
          },
          () => {
            setDestination(null);
            setDestinationQuery("");
            setRouteData(null);
            setRouteAlertMessage(null);
          },
        );

        return;
      }
    }

    setPendingDestination({ lng, lat });
  };

  useEffect(() => {
    const query =
      activeInputField === "origin" ? originQuery : destinationQuery;

    if (!query.trim() || query === "Vị trí của bạn") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`,
        );
        const data = await response.json();
        if (data.features) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Lỗi lấy gợi ý tìm kiếm:", error);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [originQuery, destinationQuery, activeInputField]);

  const handleSelectSuggestion = (item: any) => {
    const [lng, lat] = item.center;
    const fullName = item.place_name_vi || item.place_name;

    validateLocation(
      lng,
      lat,
      fullName,
      activeInputField || "destination",
      () => {
        if (activeInputField === "origin") {
          setOrigin({ lng, lat, label: fullName });
          setOriginQuery(fullName);
        } else {
          setDestination({ lng, lat, label: fullName });
          setDestinationQuery(fullName);
        }

        setShowSuggestions(false);
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 1200,
        });
      },
      () => {
        if (activeInputField === "origin") {
          setOrigin(null);
          setOriginQuery("");
        } else {
          setDestination(null);
          setDestinationQuery("");
        }
        setShowSuggestions(false);
      },
    );
  };

  const handleSwapLocations = () => {
    if (!origin && !destination) return;
    const tempOrigin = origin;
    const tempOriginQuery = originQuery;
    setOrigin(destination);
    setOriginQuery(destinationQuery);
    setDestination(tempOrigin);
    setDestinationQuery(tempOriginQuery);
  };

  const geojsonData: any = routeData
    ? {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeData.coordinates,
        },
      }
    : null;

  const routeLayerStyle: any = {
    id: "route-line",
    type: "line",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#2563eb",
      "line-width": 6,
      "line-opacity": 0.85,
    },
  };

  useEffect(() => {
    if (showAlertPopup) {
      const interval = setInterval(() => {
        setCountdown((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            setShowAlertPopup(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showAlertPopup]);

  const handleFilterClick = (filterId: string) => {
    if (selectedFilter === filterId) {
      setSelectedFilter(null);
    } else {
      setSelectedFilter(filterId);
      setDestination(null);
      setDestinationQuery("");
      setRouteData(null);
      setOrigin(null);
      setOriginQuery("");
    }
  };

  const toggleMapControl = (controlName: keyof typeof mapControls) => {
    setMapControls((prev) => {
      const newValue = !prev[controlName];
      if (controlName === "flood" && !newValue) {
        setConfirmedFloodZoneIds([]);
      }
      return { ...prev, [controlName]: newValue };
    });
  };

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        const response = await poiAPI.getAllPOIs();
        if (response.data && response.data.data) {
          setPois(response.data.data);
        }
      } catch (error) {
        console.error("Lỗi tải POIs:", error);
      }
    };
    fetchPOIs();
  }, []);

  const fetchTrafficAlerts = async () => {
    try {
      const response = await trafficAlertAPI.getTrafficAlerts();
      if (response.data && response.data.success) {
        setTrafficAlerts(response.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách cảnh báo giao thông:", error);
    }
  };

  useEffect(() => {
    fetchTrafficAlerts();
  }, []);

  const fetchUserFavoriteEventIds = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const favsRes = await eventAPI.getFavoriteEventIds();
      if (favsRes.data && favsRes.data.data) {
        setFavoriteEventIds(new Set(favsRes.data.data));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách sự kiện yêu thích:", error);
    }
  };

  useEffect(() => {
    const fetchEventsAndCategories = async () => {
      try {
        const eventsRes = await eventAPI.getAllEvents("approved");
        if (eventsRes.data && eventsRes.data.data) {
          setEvents(eventsRes.data.data);
        }

        const catsRes = await eventAPI.getEventCategories();
        if (catsRes.data && catsRes.data.data) {
          setEventCategories(catsRes.data.data);
        }
      } catch (error) {
        console.error("Lỗi tải sự kiện/danh mục:", error);
      }
    };

    fetchEventsAndCategories();
    fetchUserFavoriteEventIds();
  }, []);
  const isPreferencesLoaded = useRef(false);
  // Chỉ dùng 1 useEffect này để đồng bộ Store -> UI
  // 1. Đồng bộ khi Store thay đổi (đảm bảo Home luôn update theo Settings)
  useEffect(() => {
    if (preferences) {
      setAvoidFlood(preferences.avoid_floods);
      setAvoidCongestion(preferences.avoid_congestion);
      setTravelMode(preferences.default_travel_mode);
      setMapControls((prev) => ({
        ...prev,
        traffic: preferences.show_traffic_layer,
      }));
    }
  }, [preferences]); // Chạy lại mỗi khi preferences thay đổi

  // 2. Lưu lên Server khi thao tác trực tiếp trên bản đồ
  // Chỉ chạy khi các state cục bộ (avoidFlood, v.v.) thay đổi do hành động người dùng
  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token || !preferences) return;

    // So sánh để tránh cập nhật dư thừa nếu không thay đổi
    const hasChanged =
      avoidFlood !== preferences.avoid_floods ||
      avoidCongestion !== preferences.avoid_congestion ||
      travelMode !== preferences.default_travel_mode ||
      mapControls.traffic !== preferences.show_traffic_layer;

    if (hasChanged) {
      updateAllPreferences({
        avoid_floods: avoidFlood,
        avoid_congestion: avoidCongestion,
        default_travel_mode: travelMode,
        show_traffic_layer: mapControls.traffic,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avoidFlood, avoidCongestion, travelMode, mapControls.traffic]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const routeId = queryParams.get("routeId");
    const shareToken = queryParams.get("share");
    const shouldSetAsOrigin = !routeId && !shareToken;
    handleGetCurrentLocation(false, shouldSetAsOrigin);
  }, []);

  useEffect(() => {
    if (pois && pois.length > 0) {
      const queryParams = new URLSearchParams(window.location.search);
      const poiIdStr = queryParams.get("poiId");
      if (poiIdStr) {
        const poiId = parseInt(poiIdStr);
        const foundPoi = pois.find((p) => p.poi_id === poiId);
        if (foundPoi) {
          setDestination({
            lng: foundPoi.longitude,
            lat: foundPoi.latitude,
            label: foundPoi.name,
            poi_id: foundPoi.poi_id,
          });
          setDestinationQuery(foundPoi.name);
          setSelectedPOI(foundPoi);
          setViewMode("pois");
          mapRef.current?.flyTo({
            center: [foundPoi.longitude, foundPoi.latitude],
            zoom: 15,
            duration: 1500,
          });
        }
      }
    }
  }, [pois, location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMapMove = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const floodZone = selectedFloodZoneRef.current;
    const dest = pendingDestinationRef.current;

    if (floodZone) {
      if (floodZone.lng !== undefined && floodZone.lat !== undefined) {
        if (!bounds.contains([floodZone.lng, floodZone.lat])) {
          setSelectedFloodZone(null);
        }
      }
    }

    if (dest) {
      if (!bounds.contains([dest.lng, dest.lat])) {
        setPendingDestination(null);
      }
    }
  };

  const eventRoadsGeoJSON: any = useMemo(() => {
    if (activeOrSelectedEventRoads.length === 0) return null;

    const now = new Date();
    const features = activeOrSelectedEventRoads
      .filter((road) => road.geojson_coords && road.geojson_coords.length > 0)
      .map((road) => ({
        type: "Feature",
        properties: {
          road_id: road.road_id,
          road_name: road.road_name,
          restriction_type: road.restriction_type,
          event_title: road.event_title || "Sự kiện cấm đường",
          description: road.description || "",
          isActive: isRoadRestrictionActive(road, now),
          isSelected:
            selectedRoadPopup && selectedRoadPopup.road_id === road.road_id,
        },
        geometry: {
          type: "LineString",
          coordinates: road.geojson_coords,
        },
      }));

    return {
      type: "FeatureCollection",
      features,
    };
  }, [activeOrSelectedEventRoads, selectedRoadPopup]);

  const floodGeoJSON: any = useMemo(() => {
    if (!floodZones || floodZones.length === 0) return null;

    return {
      type: "FeatureCollection",
      features: floodZones
        .filter(
          (zone) =>
            Array.isArray(zone.center) &&
            zone.center.length === 2 &&
            zone.radius,
        )
        .map((zone) => ({
          type: "Feature",
          properties: {
            id: zone.id,
            zone_id: zone.zone_id,
            name: zone.name,
            district: zone.district,
            risk_level: zone.risk_level,
            depthCm: zone.depthCm,
            level: zone.level,
            description: zone.description,
            typical_flood_months: zone.typical_flood_months,
            color:
              zone.level === "high"
                ? "#ef4444"
                : zone.level === "medium"
                  ? "#f97316"
                  : "#eab308",
          },
          geometry: {
            type: "Polygon",
            coordinates: [getCirclePolygon(zone.center, zone.radius)],
          },
        })),
    };
  }, [floodZones]);

  const trafficCongestionGeoJSON: any = useMemo(() => {
    if (!mapControls.traffic) return null;

    const congestionAlerts = trafficAlerts.filter(
      (alert) => alert.is_active && alert.type === "CONGESTION",
    );
    if (congestionAlerts.length === 0) return null;

    const features = congestionAlerts.map((alert) => ({
      type: "Feature",
      properties: {
        alert_id: alert.id,
        title: alert.title,
        severity: alert.severity,
        color: alert.severity === "HIGH" ? "#EF4444" : "#F59E0B",
      },
      geometry: {
        type: "Point",
        coordinates: [alert.longitude, alert.latitude],
      },
    }));

    return {
      type: "FeatureCollection",
      features,
    };
  }, [trafficAlerts, mapControls.traffic]);

  return (
    <div className="w-full h-screen relative bg-slate-100 overflow-hidden font-sans select-none">
      <style>{`
                .mapboxgl-popup-content {
                    padding: 0 !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip { border-top-color: #ffffff !important; }
                .mapboxgl-popup-anchor-top .mapboxgl-popup-tip { border-bottom-color: #ffffff !important; }
                .mapboxgl-popup-anchor-left .mapboxgl-popup-tip { border-right-color: #ffffff !important; }
                .mapboxgl-popup-anchor-right .mapboxgl-popup-tip { border-left-color: #ffffff !important; }
                .mapboxgl-popup-close-button {
                    font-size: 20px !important;
                    padding: 8px 12px !important;
                    color: #475569 !important;
                    font-weight: bold !important;
                    border-radius: 9999px !important;
                    line-height: 1 !important;
                    transition: all 0.2s !important;
                    z-index: 100 !important;
                    top: 6px !important;
                    right: 6px !important;
                }
                .mapboxgl-popup-close-button:hover {
                    background-color: #f1f5f9 !important;
                    color: #0f172a !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>

      <div className="absolute inset-0 z-0">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 108.2022,
            latitude: 16.0544,
            zoom: 13,
          }}
          onClick={handleMapClick}
          onMove={handleMapMove}
          onMouseMove={(event) => {
            if (!mapControls.flood) return;
            const features = mapRef.current?.queryRenderedFeatures(
              event.point,
              { layers: ["flood-zones-fill"] },
            );
            if (features && features.length > 0) {
              const f = features[0];
              setHoveredFloodZone({
                lng: event.lngLat.lng,
                lat: event.lngLat.lat,
                properties: f.properties,
              });
              if (mapRef.current)
                mapRef.current.getCanvas().style.cursor = "pointer";
            } else {
              setHoveredFloodZone(null);
              if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
            }
          }}
          interactiveLayerIds={["flood-zones-fill"]}
          style={{ width: "100%", height: "100%" }}
          mapStyle={isLowBandwidth ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/streets-v12"}
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
        >
          <NavigationControl position="bottom-right" showCompass={true} />

          {userLocation && (
            <Marker
              longitude={userLocation.lng}
              latitude={userLocation.lat}
              anchor="center"
            >
              <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse" />
            </Marker>
          )}

          {origin &&
            userLocation &&
            (origin.lng !== userLocation.lng ||
              origin.lat !== userLocation.lat) && (
              <Marker
                longitude={origin.lng}
                latitude={origin.lat}
                anchor="center"
              >
                <div className="w-4.5 h-4.5 bg-emerald-600 border-2 border-white rounded-full shadow-lg" />
              </Marker>
            )}

          {destination && (
            <Marker
              longitude={destination.lng}
              latitude={destination.lat}
              anchor="bottom"
            >
              <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer group">
                <svg
                  width="36"
                  height="42"
                  viewBox="0 0 36 42"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="filter drop-shadow-md transition-transform duration-200 group-hover:scale-110"
                >
                  <ellipse
                    cx="18"
                    cy="38"
                    rx="8"
                    ry="2.5"
                    fill="#64748b"
                    opacity="0.4"
                  />
                  <path
                    d="M18 0C8.06 0 0 8.06 0 18C0 27.5 18 40 18 40C18 40 36 27.5 36 18C36 8.06 27.94 0 18 0Z"
                    fill="#EF4444"
                  />
                  <circle cx="18" cy="16" r="5" fill="#991B1B" />
                </svg>
              </div>
            </Marker>
          )}

          {mapControls.flood && floodGeoJSON && (
            <Source id="flood-zones-source" type="geojson" data={floodGeoJSON}>
              <Layer
                id="flood-zones-fill"
                type="fill"
                paint={{
                  "fill-color": ["get", "color"],
                  "fill-opacity": 0.45,
                }}
              />
              <Layer
                id="flood-zones-outline"
                type="line"
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 2,
                  "line-opacity": 0.9,
                }}
              />
            </Source>
          )}

          {pendingDestination && (
            <>
              <Marker
                longitude={pendingDestination.lng}
                latitude={pendingDestination.lat}
                anchor="bottom"
              >
                <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer animate-bounce">
                  <svg
                    width="36"
                    height="42"
                    viewBox="0 0 36 42"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="filter drop-shadow-md"
                  >
                    <ellipse
                      cx="18"
                      cy="38"
                      rx="8"
                      ry="2.5"
                      fill="#64748b"
                      opacity="0.4"
                    />
                    <path
                      d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 24 18 24s18-10.5 18-24C36 8.059 27.941 0 18 0z"
                      fill="#ef4444"
                    />
                    <circle cx="18" cy="18" r="8" fill="white" />
                  </svg>
                </div>
              </Marker>

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
                    Hệ thống sẽ vẽ lộ trình tối ưu và cảnh báo tránh các vùng
                    ngập lụt nếu có.
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
                            pendingDestination.lng,
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
            </>
          )}

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

          {geojsonData && (
            <Source id="route-source" type="geojson" data={geojsonData}>
              <Layer {...routeLayerStyle} />
            </Source>
          )}

          {mapControls.traffic && trafficCongestionGeoJSON && (
            <Source
              id="traffic-congestion-source"
              type="geojson"
              data={trafficCongestionGeoJSON}
            >
              <Layer
                id="traffic-congestion-glow-outer"
                type="circle"
                paint={{
                  "circle-color": ["get", "color"],
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    11,
                    15,
                    15,
                    45,
                    18,
                    120,
                  ],
                  "circle-opacity": 0.15,
                  "circle-blur": 0.9,
                }}
              />
              <Layer
                id="traffic-congestion-glow-inner"
                type="circle"
                paint={{
                  "circle-color": ["get", "color"],
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    11,
                    8,
                    15,
                    25,
                    18,
                    65,
                  ],
                  "circle-opacity": 0.35,
                  "circle-blur": 0.5,
                }}
              />
            </Source>
          )}

          {eventRoadsGeoJSON && (
            <Source
              id="event-roads-source"
              type="geojson"
              data={eventRoadsGeoJSON}
            >
              <Layer
                id="event-roads-casing"
                type="line"
                paint={{
                  "line-color": "#000000",
                  "line-width": [
                    "case",
                    ["get", "isSelected"],
                    14.5,
                    ["case", ["get", "isActive"], 11.5, 7.5],
                  ],
                  "line-opacity": [
                    "case",
                    ["get", "isSelected"],
                    0.55,
                    ["case", ["get", "isActive"], 0.4, 0.25],
                  ],
                }}
              />
              <Layer
                id="event-roads-line-dashed"
                type="line"
                filter={["==", ["get", "restriction_type"], "CLOSED"]}
                paint={{
                  "line-color": "#EF4444",
                  "line-width": [
                    "case",
                    ["get", "isSelected"],
                    10.5,
                    ["case", ["get", "isActive"], 8.0, 5.0],
                  ],
                  "line-opacity": [
                    "case",
                    ["get", "isSelected"],
                    1.0,
                    ["case", ["get", "isActive"], 0.95, 0.55],
                  ],
                  "line-dasharray": [3, 2],
                }}
              />
              <Layer
                id="event-roads-line-solid"
                type="line"
                filter={["!=", ["get", "restriction_type"], "CLOSED"]}
                paint={{
                  "line-color": [
                    "match",
                    ["get", "restriction_type"],
                    "LIMITED",
                    "#F59E0B",
                    "ONE_WAY",
                    "#3B82F6",
                    "#EF4444",
                  ],
                  "line-width": [
                    "case",
                    ["get", "isSelected"],
                    10.5,
                    ["case", ["get", "isActive"], 8.0, 5.0],
                  ],
                  "line-opacity": [
                    "case",
                    ["get", "isSelected"],
                    1.0,
                    ["case", ["get", "isActive"], 0.95, 0.55],
                  ],
                }}
              />
            </Source>
          )}

          {activeOrSelectedEventRoads.map((road) => {
            if (!road.geojson_coords || road.geojson_coords.length === 0)
              return null;
            const startCoord = road.geojson_coords[0];
            const now = new Date();
            const isActive = isRoadRestrictionActive(road, now);
            const isSelected =
              selectedRoadPopup && selectedRoadPopup.road_id === road.road_id;
            const relatedEvent = events.find(
              (e) => e.event_id === road.event_id,
            );

            const getMarkerColor = () => {
              if (isSelected)
                return "bg-red-500 scale-110 ring-4 ring-red-500/30 z-30";
              if (!isActive) return "bg-slate-400";
              if (road.restriction_type === "LIMITED") return "bg-amber-500";
              if (road.restriction_type === "ONE_WAY") return "bg-blue-600";
              return "bg-red-600";
            };

            if (relatedEvent) {
              const categoryColor = relatedEvent.category_color || "#ef4444";
              return (
                <Marker
                  key={`marker-road-${road.road_id}`}
                  longitude={startCoord[0]}
                  latitude={startCoord[1]}
                  anchor="bottom"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode("events");
                      handleEventClick(relatedEvent);
                    }}
                    className={`relative flex items-center justify-center border-2 border-white rounded-full shadow-2xl cursor-pointer transform hover:scale-115 transition-all z-20 w-9 h-9`}
                    style={{ backgroundColor: categoryColor }}
                  >
                    {relatedEvent.thumbnail_url ? (
                      <img
                        src={relatedEvent.thumbnail_url}
                        alt={relatedEvent.title}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-white text-sm">
                        {relatedEvent.category_icon || "🎆"}
                      </span>
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 border border-white text-white w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md ${getMarkerColor()} p-0.5`}
                    >
                      <RouteOff size={9} />
                    </div>
                  </div>
                </Marker>
              );
            }

            return (
              <Marker
                key={`marker-road-${road.road_id}`}
                longitude={startCoord[0]}
                latitude={startCoord[1]}
                anchor="bottom"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoadPopup(road);
                  }}
                  className={`flex items-center justify-center border border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getMarkerColor()} ${isActive ? "animate-pulse" : ""}`}
                >
                  <RouteOff size={13} />
                </div>
              </Marker>
            );
          })}

          {mapControls.traffic &&
            trafficAlerts.map((alert) => {
              const getAlertColor = () => {
                if (alert.severity === "HIGH")
                  return "bg-red-600 ring-red-500/30";
                if (alert.severity === "MEDIUM")
                  return "bg-orange-500 ring-orange-400/30";
                return "bg-blue-500 ring-blue-400/30";
              };

              const renderAlertIcon = () => {
                if (alert.type === "CONGESTION") return <Car size={13} />;
                if (alert.type === "ACCIDENT")
                  return <AlertTriangle size={13} />;
                if (alert.type === "CONSTRUCTION")
                  return <Construction size={13} />;
                return <AlertTriangle size={13} />;
              };

              return (
                <Marker
                  key={`traffic-alert-${alert.id}`}
                  longitude={alert.longitude}
                  latitude={alert.latitude}
                  anchor="bottom"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrafficAlert(alert);
                      setSelectedPOI(null);
                      setSelectedEvent(null);
                      setSelectedRoadPopup(null);
                    }}
                    className={`flex items-center justify-center border border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getAlertColor()} ring-4`}
                  >
                    {renderAlertIcon()}
                  </div>
                </Marker>
              );
            })}

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
                      new Date(),
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

          {viewMode === "pois" ? (
            <POIsLayer
              pois={pois}
              selectedFilter={selectedFilter}
              onDirectionsClick={(poi) => {
                setDestination({
                  lng: poi.longitude,
                  lat: poi.latitude,
                  label: poi.name,
                  poi_id: poi.poi_id,
                });
                setDestinationQuery(poi.name);
                if (userLocation) {
                  setOrigin({
                    lng: userLocation.lng,
                    lat: userLocation.lat,
                    label: "Vị trí của bạn",
                  });
                  setOriginQuery("Vị trí của bạn");
                }
              }}
              selectedPOI={selectedPOI}
              onSelectPOI={setSelectedPOI}
            />
          ) : (
            <EventsLayer events={events} onSelectEvent={handleEventClick} />
          )}
        </Map>
      </div>

      {/* HEADER TRÊN CÙNG & PANEL TÌM ĐƯỜNG */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between gap-4 pointer-events-none">
        <div className="relative pointer-events-auto shrink-0 flex flex-col gap-2 max-h-[calc(100vh-80px)]">
          {!isNavigating && (
              <>
                <RoutePanel
                  viewMode={viewMode}
                  destination={destination}
                  origin={origin}
                  originQuery={originQuery}
                  destinationQuery={destinationQuery}
                  showSuggestions={showSuggestions}
                  suggestions={suggestions}
                  routeData={routeData}
                  avoidFlood={avoidFlood}
                  avoidCongestion={avoidCongestion}
                  routeAlertMessage={routeAlertMessage}
                  travelMode={travelMode}
                  isSharingRoute={isSharingRoute}
                  searchContainerRef={searchContainerRef}
                  countdown={countdown}
                  setDestinationQuery={setDestinationQuery}
                  setOriginQuery={setOriginQuery}
                  setActiveInputField={setActiveInputField}
                  setShowSuggestions={setShowSuggestions}
                  handleSwapLocations={handleSwapLocations}
                  handleSelectSuggestion={handleSelectSuggestion}
                  setAvoidFlood={setAvoidFlood}
                  setAvoidCongestion={setAvoidCongestion}
                  setTravelMode={setTravelMode}
                  setShowSaveRouteModal={setShowSaveRouteModal}
                  handleShareRoute={handleShareRoute}
                  setRouteData={setRouteData}
                  setDestination={setDestination}
                  setOrigin={setOrigin}
                  setRouteAlertMessage={setRouteAlertMessage}
                  setConfirmedFloodZoneIds={setConfirmedFloodZoneIds}
                  onStartNavigation={handleStartNavigation}
                  // TRUYỀN ĐẦY ĐỦ 2 PROPS NÀY VÀO TẤT CẢ CÁC NƠI GỌI ROUTEPANEL:
                  favoriteEventIds={favoriteEventIds}
                  onToggleEventFavorite={async (eventId: number) => {
                    const eventObj = events.find((e) => e.event_id === eventId);
                    if (eventObj) {
                      await handleFavoriteEventToggle(eventObj);
                      return !favoriteEventIds.has(eventId);
                    }
                    return false;
                  }}
                />
                {viewMode === "pois" ? (
                  <>
                    {selectedFilter !== null && (
                      <POIFeaturedSidebar
                        pois={pois}
                        selectedFilter={selectedFilter}
                        onPOIClick={handlePOIClick}
                        onDirectionsClick={(poi) => {
                          setDestination({
                            lng: poi.longitude,
                            lat: poi.latitude,
                            label: poi.name,
                            poi_id: poi.poi_id,
                          });
                          setDestinationQuery(poi.name);
                          if (userLocation) {
                            setOrigin({
                              lng: userLocation.lng,
                              lat: userLocation.lat,
                              label: "Vị trí của bạn",
                            });
                            setOriginQuery("Vị trí của bạn");
                          }
                        }}
                        hasRoute={!!routeData}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {!destination && showEventsSidebar && (
                      <EventsSidebar
                        events={events}
                        categories={eventCategories}
                        onEventClick={handleEventClick}
                        onClose={() => setShowEventsSidebar(false)}
                        hasRoute={!!routeData}
                      />
                    )}
                  </>
                )}
              </>
            )}
        </div>

        {/* Các nút Filters */}
        {!isNavigating && viewMode === "pois" ? (
          <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none pointer-events-auto max-w-[calc(100vw-540px)]">
            {filterCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleFilterClick(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                      : "bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 hover:text-blue-600"
                  }`}
                >
                  <Icon
                    size={13}
                    className={isSelected ? "text-white" : "text-slate-500"}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Thông báo & User */}
        {!isNavigating && (
          <div className="flex items-center gap-3 shrink-0 pointer-events-auto relative">
            <div className="relative">
              <button
                onClick={() => setShowNotificationModal(!showNotificationModal)}
                className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              <NotificationCenter
                isOpen={showNotificationModal}
                onClose={() => setShowNotificationModal(false)}
                onFlyToZone={(notif: AppNotification) => {
                  setShowNotificationModal(false);
                  if (!notif) return;

                  const match = notif.message?.match(/\[zone_id:(\d+)\]/);
                  if (match) {
                    const zoneId = parseInt(match[1]);
                    const zone = floodZones.find(
                      (z) => z.id === zoneId || z.zone_id === zoneId,
                    );
                    if (
                      zone &&
                      Array.isArray(zone.center) &&
                      zone.center.length === 2
                    ) {
                      setMapControls((prev) => ({ ...prev, flood: true }));
                      mapRef.current?.flyTo({
                        center: [zone.center[0], zone.center[1]],
                        zoom: 15,
                        duration: 1500,
                      });
                      setSelectedFloodZone({
                        lng: zone.center[0],
                        lat: zone.center[1],
                        properties: {
                          id: zone.id,
                          name: zone.name,
                          depthCm: zone.depthCm,
                          risk_level: zone.risk_level,
                          description: zone.description,
                        },
                      });
                      return;
                    }
                  }

                  if (notif.alert_id) {
                    const alert = trafficAlerts.find(
                      (a) =>
                        a.id === notif.alert_id ||
                        a.alert_id === notif.alert_id,
                    );
                    if (alert) {
                      setMapControls((prev) => ({ ...prev, traffic: true }));
                      mapRef.current?.flyTo({
                        center: [alert.longitude, alert.latitude],
                        zoom: 16,
                        duration: 1500,
                      });
                      setSelectedTrafficAlert(alert);
                      setSelectedPOI(null);
                      setSelectedEvent(null);
                      setSelectedRoadPopup(null);
                    }
                  }
                }}
                onOpenEvent={(eventId) => {
                  setViewMode("events");
                  setShowEventsSidebar(true);
                  const found = events.find((e) => e.event_id === eventId);
                  if (found) handleEventClick(found);
                  setShowNotificationModal(false);
                }}
              />
            </div>

            {userRole === "admin" ? (
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="w-[42px] h-[42px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all"
              >
                <Settings size={18} />
              </button>
            ) : (
              <button
                onClick={() => navigate("?tab=profile")}
                className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 overflow-hidden text-slate-600 hover:text-blue-600 transition-all"
              >
                {userProfile?.avatar_url ? (
                  <img
                    src={
                      userProfile.avatar_url.startsWith("http")
                        ? userProfile.avatar_url
                        : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${userProfile.avatar_url}`
                    }
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={18} />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* MAP TOOLBAR DƯỚI GÓC PHẢI */}
      {!isNavigating && (
        <MapToolbar
          mapControls={mapControls}
          userRole={userRole}
          showSavedRoutesSidebar={showSavedRoutesSidebar}
          viewMode={viewMode}
          handleGetCurrentLocation={handleGetCurrentLocation}
          toggleMapControl={toggleMapControl}
          setShowSavedRoutesSidebar={setShowSavedRoutesSidebar}
          setSelectedPOI={setSelectedPOI}
          setSelectedFilter={setSelectedFilter}
          setShowEventsSidebar={setShowEventsSidebar}
          setSelectedEvent={setSelectedEvent}
          setViewMode={setViewMode}
          navigate={navigate}
          isWeatherExpanded={isWeatherExpanded}
          onToggleWeather={handleToggleWeather}
          isLowBandwidth={isLowBandwidth}
          isOffline={isOffline}
          onToggleLowBandwidth={() => {
            const val = !isLowBandwidth;
            setIsLowBandwidth(val);
            localStorage.setItem('low_bandwidth_mode', val.toString());
          }}
        />
      )}

      {/* EVENT DETAIL SIDEBAR */}
      {!isNavigating && selectedEvent && (
        <div className="absolute right-20 top-24 z-20 pointer-events-none">
          <EventDetailSidebar
            event={selectedEvent}
            isFavorite={favoriteEventIds.has(selectedEvent.event_id)}
            onFavoriteToggle={() => handleFavoriteEventToggle(selectedEvent)}
            onDirectionsClick={() => {
              // 1. Thêm event_id vào destination để RoutePanel nhận diện được đây là sự kiện
              setDestination({
                lng: selectedEvent.longitude,
                lat: selectedEvent.latitude,
                label: selectedEvent.title,
                event_id: selectedEvent.event_id, // <--- THÊM DÒNG NÀY
              } as any);

              setDestinationQuery(selectedEvent.title);

              if (userLocation) {
                setOrigin({
                  lng: userLocation.lng,
                  lat: userLocation.lat,
                  label: "Vị trí của bạn",
                });
                setOriginQuery("Vị trí của bạn");
              }

              // 2. Giữ nguyên viewMode là events để khi tắt dẫn đường sẽ tự động hiển thị lại danh sách sự kiện
              // 3. Đóng Event Detail Sidebar
              setSelectedEvent(null);
            }}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      )}

      {/* SAVED ROUTES SIDEBAR */}
      {!isNavigating && showSavedRoutesSidebar && (
        <div className="absolute right-20 top-24 z-20 pointer-events-none">
          <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 font-sans text-left flex flex-col max-h-[380px] shrink-0 animate-fade-in pointer-events-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Bookmark className="w-5 h-5 text-rose-500 fill-current" /> Lộ
                trình đã lưu
              </h3>
              <button
                onClick={() => setShowSavedRoutesSidebar(false)}
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-none space-y-2.5">
              {savedRoutes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Bookmark size={32} className="text-slate-200 stroke-1" />
                  <p className="text-[11px] font-semibold">
                    Chưa có lộ trình nào được lưu
                  </p>
                </div>
              ) : (
                savedRoutes.map((route) => {
                  const isFloodRoute = route.is_emergency;
                  return (
                    <div
                      key={route.route_id}
                      onClick={() => handleSelectSavedRoute(route)}
                      className="p-3 bg-slate-50 hover:bg-rose-50/20 border border-slate-100 hover:border-rose-100 rounded-xl cursor-pointer transition-all flex flex-col gap-2 relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-bold text-xs text-slate-800 line-clamp-1 pr-6 hover:text-rose-600 transition-colors">
                          {route.route_name || "Lộ trình không tên"}
                        </div>
                        <button
                          onClick={(e) =>
                            handleDeleteSavedRoute(route.route_id, e)
                          }
                          className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 w-5 h-5 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                          <span className="line-clamp-1">
                            <b>Đi từ:</b>{" "}
                            {route.origin_name || "Vị trí xuất phát"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                          <span className="line-clamp-1">
                            <b>Đến:</b> {route.destination_name || "Điểm đến"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 mt-1 text-[9px] font-bold text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                            {route.profile === "driving"
                              ? "Ô tô/Xe máy"
                              : route.profile === "walking"
                                ? "Đi bộ"
                                : "Xe đạp"}
                          </span>
                          {isFloodRoute && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 flex items-center gap-0.5">
                              <CloudRain size={8} /> Tránh ngập
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600">
                          {(route.distance_meters / 1000).toFixed(1)} km ·{" "}
                          {Math.round(route.duration_seconds / 60)} phút
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* BUTTON DỪNG DẪN ĐƯỜNG */}
      {isNavigating && (
        <button
          onClick={handleStopNavigation}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-7 py-3 rounded-full font-bold shadow-xl z-50 hover:bg-red-700 hover:scale-105 transition-all"
        >
          🛑 Dừng dẫn đường
        </button>
      )}

      {/* MODALS */}
      <AlertBanner
        isOpen={showAlertPopup}
        countdown={countdown}
        alerts={mockAlerts}
        onClose={() => setShowAlertPopup(false)}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
      />

      {showReportModal && (
        <div
          style={{ animation: "fadeIn 250ms ease-out forwards" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
        >
          <div
            style={{
              animation:
                "scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden mx-4"
          >
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-extrabold text-sm flex items-center gap-2 tracking-wide uppercase">
                <AlertTriangle className="w-5 h-5 animate-pulse" /> Báo cáo sự
                cố
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={handleSubmitTrafficReport}
              className="p-6 space-y-4 font-sans text-left"
            >
              <input
                required
                type="text"
                placeholder="Mô tả sự cố..."
                value={reportFormData.title}
                onChange={(e) =>
                  setReportFormData({
                    ...reportFormData,
                    title: e.target.value,
                  })
                }
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
              />
              <textarea
                rows={2}
                placeholder="Chi tiết..."
                value={reportFormData.description}
                onChange={(e) =>
                  setReportFormData({
                    ...reportFormData,
                    description: e.target.value,
                  })
                }
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 resize-none"
              />
              <input
                required
                type="text"
                value={reportFormData.location}
                onChange={(e) =>
                  setReportFormData({
                    ...reportFormData,
                    location: e.target.value,
                  })
                }
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20"
              />
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl"
                >
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSaveRouteModal && (
        <div
          style={{ backgroundColor: "rgba(15, 23, 42, 0.4)" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto"
        >
          <div
            style={{
              animation:
                "scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mx-4 text-left"
          >
            {/* Đổi màu Gradient Header và icon Bookmark */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4 flex justify-between text-white">
              <h3 className="font-extrabold text-sm flex gap-2">
                <Bookmark className="w-5 h-5 fill-current animate-pulse" /> Lưu
                lộ trình
              </h3>
              <button
                onClick={() => setShowSaveRouteModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex justify-center items-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Đổi màu viền focus của input sang màu vàng */}
              <input
                required
                type="text"
                placeholder="Tên lộ trình"
                value={saveRouteName}
                onChange={(e) => setSaveRouteName(e.target.value)}
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
              />
              <div className="flex justify-end gap-3 pt-3 border-t">
                {/* Đổi màu gradient của nút Lưu lại */}
                <button
                  onClick={handleSaveRoute}
                  disabled={isSavingRoute}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 rounded-xl transition-all disabled:opacity-50"
                >
                  {isSavingRoute ? "Đang lưu..." : "Lưu lại"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showShareModal && (
        <div
          style={{ backgroundColor: "rgba(15, 23, 42, 0.4)" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto"
        >
          <div
            style={{
              animation:
                "scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mx-4 text-left"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 flex justify-between text-white">
              <h3 className="font-extrabold text-sm flex gap-2">
                <Share2 className="w-5 h-5 animate-pulse" /> Chia sẻ lộ trình
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex justify-center items-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  readOnly
                  type="text"
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-[10px] bg-slate-50 rounded-xl border outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    showPremiumToast("Đã sao chép!", "success");
                  }}
                  className="px-3 bg-slate-100 rounded-xl flex items-center justify-center"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* WEATHER WIDGET */}
      <WeatherWidget
        isCollapsed={!isWeatherExpanded}
        onToggleCollapse={(collapsed) => {
          setIsWeatherExpanded(!collapsed);
          localStorage.setItem('weather_widget_collapsed', collapsed.toString());
        }}
        isLowBandwidth={isLowBandwidth}
        isOffline={isOffline}
      />

      {/* Offline / Low-Bandwidth status banner */}
      {isOffline ? (
        <div style={{
          position: 'absolute', top: '84px', left: '50%', transform: 'translateX(-50%)', zIndex: 999,
          backgroundColor: 'rgba(254, 243, 199, 0.95)', border: '1px solid #f59e0b', color: '#d97706',
          padding: '8px 24px', borderRadius: '30px', fontSize: '12px', fontWeight: 'bold',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(4px)'
        }}>
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          ⚠️ Mất mạng — Đang ở chế độ Ngoại tuyến khẩn cấp
        </div>
      ) : isLowBandwidth ? (
        <div style={{
          position: 'absolute', top: '84px', left: '50%', transform: 'translateX(-50%)', zIndex: 999,
          backgroundColor: 'rgba(239, 246, 255, 0.95)', border: '1px solid #3b82f6', color: '#1d4ed8',
          padding: '8px 24px', borderRadius: '30px', fontSize: '12px', fontWeight: 'bold',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(4px)'
        }}>
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
          ⚡ Đang kích hoạt chế độ Tiết kiệm băng thông (Low-Bandwidth)
        </div>
      ) : null}

      {/* AI Assistant Chatbot */}
      <AIChatbot
        origin={origin}
        setOrigin={setOrigin}
        setOriginQuery={setOriginQuery}
        destination={destination}
        setDestination={setDestination}
        setDestinationQuery={setDestinationQuery}
        travelMode={travelMode}
        setTravelMode={setTravelMode}
        avoidFlood={avoidFlood}
        setAvoidFlood={setAvoidFlood}
        avoidCongestion={avoidCongestion}
        setAvoidCongestion={setAvoidCongestion}
        mapRef={mapRef}
        userLocation={userLocation}
      />

      {tab === "profile" && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <ProfilePage
            isOverlay={true}
            onClose={() => {
              navigate("/dashboard");
              fetchUserProfile();
              fetchUserFavoriteEventIds();
              fetchFavoriteIds();
            }}
            isSharingLocation={isSharingLocation}
            liveShareToken={liveShareToken}
            onToggleShareLocation={handleToggleShareLocation}
          />
        </div>
      )}
    </div>
  );
}
