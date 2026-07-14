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
  Fuel,
  Coffee,
  Hospital,
  MapPin,
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
import { RoutePanel, TurnByTurnSteps } from "./components/RoutePanel";
import { MapToolbar } from "./components/MapToolbar";
import { NavigationPanel } from "./components/NavigationPanel";
import AddPOIModal from "./components/AddPOIModal";

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
import { SavedRoutesSidebar } from "./components/SavedRoutesSidebar";
import { ReportTrafficModal } from "./components/ReportTrafficModal";
import { SaveRouteModal } from "./components/SaveRouteModal";
import { ShareRouteModal } from "./components/ShareRouteModal";
import { StatusBanner } from "./components/StatusBanner";

const filterCategories = [
  { id: "attractions", label: "Điểm tham quan", icon: Compass },
  { id: "restaurants", label: "Nhà hàng", icon: Utensils },
  { id: "hotels", label: "Khách sạn", icon: Hotel },
  { id: "cafe", label: "Quán cà phê", icon: Coffee },
  { id: "gas_station", label: "Trạm xăng", icon: Fuel },
  { id: "hospital", label: "Bệnh viện", icon: Hospital },
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

  // States nâng cấp dẫn đường
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(2); // 2x
  const [simulatedCoords, setSimulatedCoords] = useState<[number, number] | null>(null);
  const [simulatedHeading, setSimulatedHeading] = useState(0);
  const [showNavModeSelector, setShowNavModeSelector] = useState(false);

  const simulationIntervalRef = useRef<number | null>(null);
  const lastSpokenStepIndexRef = useRef<number>(-1);
  const approachSpokenRef = useRef<number>(-1);
  const simulationIndexRef = useRef<number>(0);

  // States cho việc đóng góp POI
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [pendingPOILocation, setPendingPOILocation] = useState<{ lng: number; lat: number } | null>(null);
  const [showAddPOIModal, setShowAddPOIModal] = useState(false);

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
      const savedMode = typeof localStorage !== 'undefined' && localStorage.getItem('low_bandwidth_mode') === 'true';
      setIsLowBandwidth(savedMode);
      showPremiumToast('Đã khôi phục kết nối mạng internet.', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsLowBandwidth(true);
      showPremiumToast('Mất kết nối mạng. Đã tự động kích hoạt chế độ Ngoại tuyến & Tiết kiệm băng thông.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
    onConfirm: () => { },
    onCancel: () => { },
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
    selectedRouteIndex,
    selectRoute,
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
  // Helper tính khoảng cách Haversine (mét)
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper tính khoảng cách từ điểm đến đoạn thẳng (mét)
  const getDistanceToSegment = (p: [number, number], a: [number, number], b: [number, number]) => {
    const dy = (b[1] - a[1]) * 111320;
    const dx = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
    const p_y = (p[1] - a[1]) * 111320;
    const p_x = (p[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);

    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt(p_x * p_x + p_y * p_y);

    let t = (p_x * dx + p_y * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    const proj_x = t * dx;
    const proj_y = t * dy;

    const diff_x = p_x - proj_x;
    const diff_y = p_y - proj_y;
    return Math.sqrt(diff_x * diff_x + diff_y * diff_y);
  };

  const speakInstruction = (text: string) => {
    if (isVoiceMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  // Đọc TTS khi đổi bước đi
  useEffect(() => {
    if (!isNavigating || !routeData?.steps) return;
    const currentStep = routeData.steps[currentStepIndex];
    if (currentStep && currentStepIndex !== lastSpokenStepIndexRef.current) {
      speakInstruction(currentStep.maneuver.instruction || "Tiếp tục đi thẳng");
      lastSpokenStepIndexRef.current = currentStepIndex;
    }
  }, [currentStepIndex, isNavigating, routeData]);

  // Logic mô phỏng (Simulation loop)
  const startSimulation = (resume = false) => {
    if (!routeData || routeData.coordinates.length < 2) return;

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    setIsSimulating(true);
    if (!resume) {
      simulationIndexRef.current = 0;
      setCurrentStepIndex(0);
      lastSpokenStepIndexRef.current = -1;
      approachSpokenRef.current = -1;
    }

    const coords = routeData.coordinates;

    const runSimulationStep = () => {
      const index = simulationIndexRef.current;
      if (index >= coords.length - 1) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        setIsSimulating(false);
        speakInstruction("Bạn đã đến nơi. Chuyến đi kết thúc.");
        showPremiumToast("Mô phỏng kết thúc. Bạn đã đến nơi!", "success");
        handleStopNavigation();
        return;
      }

      const p1 = coords[index];
      const p2 = coords[index + 1];

      const dy = p2[1] - p1[1];
      const dx = (p2[0] - p1[0]) * Math.cos((p1[1] * Math.PI) / 180);
      const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
      setSimulatedHeading(angle);
      setSimulatedCoords(p2);

      mapRef.current?.easeTo({
        center: p2,
        bearing: angle,
        pitch: 60,
        zoom: 17.5,
        duration: 300,
      });

      if (routeData.steps && routeData.steps.length > 0) {
        const nextStepInfo = routeData.steps[currentStepIndex + 1];
        if (nextStepInfo) {
          const [nextLng, nextLat] = nextStepInfo.maneuver.location;
          const distToNext = getDistanceMeters(p2[1], p2[0], nextLat, nextLng);
          setDistanceToNextStep(distToNext);

          if (distToNext < 25) {
            setCurrentStepIndex((prev) => prev + 1);
          }

          if (distToNext < 100 && distToNext > 45 && approachSpokenRef.current !== currentStepIndex) {
            speakInstruction(`Chuẩn bị ${nextStepInfo.maneuver.instruction}`);
            approachSpokenRef.current = currentStepIndex;
          }
        } else {
          const lastStep = routeData.steps[routeData.steps.length - 1];
          if (lastStep) {
            const [destLng, destLat] = lastStep.maneuver.location;
            const distToDest = getDistanceMeters(p2[1], p2[0], destLat, destLng);
            setDistanceToNextStep(distToDest);
          }
        }
      }

      simulationIndexRef.current = index + 1;
    };

    const intervalTime = 600 / simulationSpeed;
    simulationIntervalRef.current = window.setInterval(runSimulationStep, intervalTime);
  };

  const pauseSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    if (isSimulating && isSimulationMode) {
      startSimulation(true);
    }
  }, [simulationSpeed]);

  const handleStartNavigation = () => {
    if (!routeData) {
      showPremiumToast("Chưa có thông tin lộ trình.", "error");
      return;
    }
    setShowNavModeSelector(true);
  };

  const handleStartRealNavigation = () => {
    setShowNavModeSelector(false);
    setIsSimulationMode(false);
    setIsNavigating(true);
    setCurrentStepIndex(0);
    lastSpokenStepIndexRef.current = -1;
    approachSpokenRef.current = -1;

    if (!navigator.geolocation) {
      showPremiumToast("Thiết bị không hỗ trợ GPS.", "error");
      return;
    }

    if (watchPositionId.current !== null) return;

    if (routeData?.steps?.[0]) {
      speakInstruction(routeData.steps[0].maneuver.instruction);
    }

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 18,
          pitch: 60,
          bearing: heading ?? 0,
          duration: 500,
        });

        // Tự động tìm lại đường khi lệch hướng
        if (routeData && routeData.coordinates.length > 1) {
          let minDist = Infinity;
          for (let i = 0; i < routeData.coordinates.length - 1; i++) {
            const dist = getDistanceToSegment(
              [longitude, latitude],
              routeData.coordinates[i],
              routeData.coordinates[i + 1]
            );
            if (dist < minDist) minDist = dist;
          }

          if (minDist > 60) {
            speakInstruction("Bạn đã đi chệch hướng. Đang tính toán lại lộ trình.");
            showPremiumToast("Đang tự động tính toán lại lộ trình...", "warning");
            setOrigin({
              lat: latitude,
              lng: longitude,
              label: "Vị trí của bạn (tính lại)"
            });
            return;
          }
        }

        if (routeData?.steps && routeData.steps.length > 0) {
          const nextStepInfo = routeData.steps[currentStepIndex + 1];
          if (nextStepInfo) {
            const [nextLng, nextLat] = nextStepInfo.maneuver.location;
            const distToNext = getDistanceMeters(latitude, longitude, nextLat, nextLng);
            setDistanceToNextStep(distToNext);

            if (distToNext < 25) {
              setCurrentStepIndex((prev) => prev + 1);
            }

            if (distToNext < 100 && distToNext > 45 && approachSpokenRef.current !== currentStepIndex) {
              speakInstruction(`Chuẩn bị ${nextStepInfo.maneuver.instruction}`);
              approachSpokenRef.current = currentStepIndex;
            }
          } else {
            const lastStep = routeData.steps[routeData.steps.length - 1];
            if (lastStep) {
              const [destLng, destLat] = lastStep.maneuver.location;
              const distToDest = getDistanceMeters(latitude, longitude, destLat, destLng);
              setDistanceToNextStep(distToDest);
              if (distToDest < 15) {
                speakInstruction("Bạn đã đến nơi. Chuyến đi kết thúc.");
                showPremiumToast("Bạn đã đến nơi!", "success");
                handleStopNavigation();
              }
            }
          }
        }
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

  const handleStartSimulationNavigation = () => {
    setShowNavModeSelector(false);
    setIsSimulationMode(true);
    setIsNavigating(true);

    if (routeData?.steps?.[0]) {
      speakInstruction(routeData.steps[0].maneuver.instruction);
    }

    startSimulation(false);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setIsSimulationMode(false);
    setIsSimulating(false);
    setSimulatedCoords(null);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (watchPositionId.current !== null) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
    }
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, zoom: 14 });
    window.speechSynthesis.cancel();
  };

  // Dọn dẹp simulation khi unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
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
      () => { },
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

    if (isAddingPOI) {
      setPendingPOILocation({ lng, lat });
      return;
    }

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
          `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(query)}&access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`,
        );
        const data = await response.json();
        if (data.features) {
          const normalizedFeatures = data.features.map((f: any) => ({
            id: f.properties?.mapbox_id || f.id,
            text: f.properties?.name || "",
            text_vi: f.properties?.name || "",
            place_name: f.properties?.full_address || f.properties?.name || "",
            place_name_vi: f.properties?.full_address || f.properties?.name || "",
            center: f.geometry?.coordinates || [0, 0],
          }));
          setSuggestions(normalizedFeatures);
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

          {/* DRAGGABLE POI MARKER */}
          {isAddingPOI && pendingPOILocation && (
            <Marker
              longitude={pendingPOILocation.lng}
              latitude={pendingPOILocation.lat}
              draggable
              onDragEnd={(e) => setPendingPOILocation({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
              anchor="bottom"
            >
              <div className="relative group cursor-pointer flex flex-col items-center z-50">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  <MapPin size={20} className="text-white" />
                </div>
                <div className="w-2 h-2 bg-orange-600 rounded-full mt-1 shadow-sm" />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-100 transition-opacity">
                  <span className="text-xs font-semibold text-slate-700">Kéo để chọn vị trí</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddPOIModal(true);
                    }}
                    className="block w-full mt-2 text-[10px] bg-orange-500 text-white font-bold py-1 px-2 rounded hover:bg-orange-600 transition-colors pointer-events-auto"
                  >
                    Tiếp tục
                  </button>
                </div>
              </div>
            </Marker>
          )}

          {/* USER LOCATION MARKER */}
          {isNavigating && isSimulationMode && simulatedCoords && (
            <Marker
              longitude={simulatedCoords[0]}
              latitude={simulatedCoords[1]}
              anchor="center"
            >
              <div 
                className="w-10 h-10 flex items-center justify-center -mt-2 transition-transform duration-100"
                style={{ transform: `rotate(${simulatedHeading}deg)` }}
              >
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] filter" />
              </div>
            </Marker>
          )}

          {isNavigating && !isSimulationMode && userLocation && (
            <Marker
              longitude={userLocation.lng}
              latitude={userLocation.lat}
              anchor="center"
            >
              <div className="w-10 h-10 flex items-center justify-center -mt-2">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.8)] filter" />
              </div>
            </Marker>
          )}

          {!isNavigating && userLocation && (
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
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedFloodZone.properties.risk_level === "High"
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

          {/* VẼ CÁC TUYẾN ĐƯỜNG THAY THẾ (ALTERNATIVE ROUTES) */}
          {!isNavigating && routeData?.routes && routeData.routes.map((route) => {
            if (route.id === selectedRouteIndex) return null;
            
            const routeGeoJSON: any = {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.coordinates,
              },
            };

            const alternativeStyle: any = {
              id: `route-alternative-${route.id}`,
              type: "line",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#60a5fa", // Màu xanh nhạt cho tuyến đường phụ
                "line-width": 5,
                "line-opacity": 0.6,
              },
            };

            return (
              <Source key={`route-alt-source-${route.id}`} id={`route-alt-source-${route.id}`} type="geojson" data={routeGeoJSON}>
                <Layer {...alternativeStyle} />
              </Source>
            );
          })}

          {/* VẼ TUYẾN ĐƯỜNG ĐƯỢC CHỌN (MAIN ROUTE) */}
          {geojsonData && (
            <Source id="route-source" type="geojson" data={geojsonData}>
              <Layer {...routeLayerStyle} />
            </Source>
          )}

          {/* HIỂN THỊ BONG BÓNG THỜI GIAN TRÊN CÁC TUYẾN ĐƯỜNG */}
          {!isNavigating && routeData?.routes && routeData.routes.map((route) => {
            const isSelected = route.id === selectedRouteIndex;
            const midIndex = Math.floor(route.coordinates.length / 2);
            const [lng, lat] = route.coordinates[midIndex];

            return (
              <Marker
                key={`route-duration-marker-${route.id}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
              >
                <button
                  onClick={() => selectRoute(route.id)}
                  className={`px-3 py-1.5 rounded-full shadow-lg border-2 text-xs font-black transition-all transform hover:scale-105 pointer-events-auto ${
                    isSelected
                      ? "bg-blue-600 border-white text-white z-30"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 z-20 opacity-90"
                  }`}
                >
                  {route.totalTimeMin} phút
                </button>
              </Marker>
            );
          })}

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
                beforeId="road-label"
                paint={{
                  "line-color": "#ffffff",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, ["case", ["get", "isSelected"], 12, ["case", ["get", "isActive"], 8, 6]],
                    14, ["case", ["get", "isSelected"], 22, ["case", ["get", "isActive"], 18, 12]],
                    18, ["case", ["get", "isSelected"], 36, ["case", ["get", "isActive"], 28, 20]]
                  ],
                  "line-opacity": 1.0,
                }}
              />
              <Layer
                id="event-roads-line-dashed"
                type="line"
                beforeId="road-label"
                filter={["==", ["get", "restriction_type"], "CLOSED"]}
                paint={{
                  "line-color": "#dc2626",
                  "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, ["case", ["get", "isSelected"], 8, ["case", ["get", "isActive"], 5, 3]],
                    14, ["case", ["get", "isSelected"], 14, ["case", ["get", "isActive"], 10, 6]],
                    18, ["case", ["get", "isSelected"], 24, ["case", ["get", "isActive"], 18, 12]]
                  ],
                  "line-opacity": 1.0,
                  "line-dasharray": [4, 4],
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
            // Tính toán toạ độ ở giữa đoạn đường để đặt icon cấm
            const midIndex = Math.floor(road.geojson_coords.length / 2);
            const midCoord = road.geojson_coords[midIndex];
            const now = new Date();
            const isActive = isRoadRestrictionActive(road, now);
            const isSelected =
              selectedRoadPopup && selectedRoadPopup.road_id === road.road_id;
            const relatedEvent = events.find(
              (e) => e.event_id === road.event_id,
            );

            // Chỉ hiển thị icon No Entry đối với đường cấm hoàn toàn
            if (road.restriction_type !== "CLOSED") return null;

            return (
              <Marker
                key={`marker-road-${road.road_id}`}
                longitude={midCoord[0]}
                latitude={midCoord[1]}
                anchor="center"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (relatedEvent) {
                      setViewMode("events");
                      handleEventClick(relatedEvent);
                    } else {
                      setSelectedRoadPopup(road);
                    }
                  }}
                  className={`flex items-center justify-center border-[2px] border-white w-5 h-5 md:w-5 md:h-5 rounded-full shadow-sm cursor-pointer transform hover:scale-125 transition-all z-30 bg-[#dc2626] ${isSelected ? "ring-2 ring-red-500/50 scale-110" : "scale-90 opacity-90"}`}
                  title={road.road_name}
                >
                  <div className="w-2.5 h-[2.5px] bg-white rounded-sm"></div>
                </div>
              </Marker>
            );
          })}

          {mapControls.traffic &&
            trafficAlerts.map((alert) => {
              const getAlertColor = () => {
                if (alert.severity === "HIGH")
                  return "bg-red-600";
                if (alert.severity === "MEDIUM")
                  return "bg-orange-500";
                return "bg-blue-500";
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
                    className={`flex items-center justify-center border-2 border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getAlertColor()}`}
                  >
                    {renderAlertIcon()}
                  </div>
                </Marker>
              );
            })}

          {/* MAPBOX REAL-TIME TRAFFIC LAYER */}
          {mapControls.traffic && (
            <Source id="mapbox-traffic" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
              <Layer
                id="traffic"
                type="line"
                source="mapbox-traffic"
                source-layer="traffic"
                beforeId="road-label"
                paint={{
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 16, 5],
                  "line-color": [
                    "case",
                    ["==", "low", ["get", "congestion"]],
                    "#22c55e",      // Nhanh (Xanh lá)
                    ["==", "moderate", ["get", "congestion"]],
                    "#f59e0b",      // Vừa (Cam)
                    ["==", "heavy", ["get", "congestion"]],
                    "#ef4444",      // Chậm (Đỏ)
                    ["==", "severe", ["get", "congestion"]],
                    "#7f1d1d",      // Rất chậm (Đỏ sẫm)
                    "transparent"
                  ]
                }}
              />
            </Source>
          )}

          {mapControls.traffic && trafficAlerts.map(alert => {
            if (!alert.affected_area_polygon) return null;

            let geojsonData = null;
            try {
              geojsonData = typeof alert.affected_area_polygon === 'string'
                ? JSON.parse(alert.affected_area_polygon)
                : alert.affected_area_polygon;
            } catch (e) {
              return null;
            }

            if (!geojsonData || !geojsonData.type) return null;

            const fillColor = alert.severity === "HIGH" ? "#dc2626"
              : alert.severity === "MEDIUM" ? "#f97316"
                : "#3b82f6";

            return (
              <Source key={`alert-poly-source-${alert.id}`} id={`alert-poly-source-${alert.id}`} type="geojson" data={geojsonData}>
                <Layer
                  id={`alert-poly-layer-${alert.id}`}
                  type="fill"
                  paint={{
                    'fill-color': fillColor,
                    'fill-opacity': 0.3
                  }}
                />
                <Layer
                  id={`alert-poly-line-${alert.id}`}
                  type="line"
                  paint={{
                    'line-color': fillColor,
                    'line-width': 2
                  }}
                />
              </Source>
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
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${selectedTrafficAlert.type === "CONGESTION"
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
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${selectedTrafficAlert.severity === "HIGH"
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
                      className={`p-1 rounded-lg shrink-0 ${isRoadRestrictionActive(selectedRoadPopup, new Date())
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
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold mb-1.5 border ${active
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
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-10 flex flex-col pointer-events-none gap-2">
        {/* Hàng trên: Search + Bell + Avatar */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Search + Route Panel: flex-1 trên mobile, max-w-sm trên desktop */}
          <div className="relative pointer-events-auto flex-1 md:flex-none md:w-80 min-w-0 flex flex-col gap-2 max-md:max-h-[calc(100vh-80px)] max-md:overflow-y-auto scrollbar-none">
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
                    {selectedFilter !== null && !routeData && !isNavigating && (
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
                        onClose={() => {
                          setSelectedFilter(null);
                          setSelectedPOI(null);
                          setRouteData(null);
                          setDestination(null);
                          setOrigin(null);
                          setOriginQuery("");
                          setDestinationQuery("");
                          setRouteAlertMessage(null);
                        }}
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
                        onClose={() => {
                          setShowEventsSidebar(false);
                          setSelectedEvent(null);
                          setViewMode("pois");
                        }}
                        hasRoute={!!routeData}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
          {/* Filter chips — desktop only: nằm cùng hàng giữa search và bell/avatar */}
          {!isNavigating && viewMode === "pois" && (
            <div className="hidden md:flex items-center justify-start gap-2 overflow-x-auto flex-nowrap flex-1 self-start pointer-events-auto scrollbar-none pb-2">
              {filterCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleFilterClick(cat.id)}
                    className={`flex items-center gap-1.5 px-3.5 h-[42px] rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${isSelected
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
          )}

          {/* Thông báo & User - cùng hàng với search */}
          {!isNavigating && (
            <div className="flex flex-row items-center gap-2 shrink-0 pointer-events-auto self-start">
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

        {/* Filter chips — mobile only: hàng riêng bênn dưới search */}
        {!isNavigating && viewMode === "pois" && (
          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none pointer-events-auto w-full">
            {filterCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleFilterClick(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${isSelected
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
        )}
      </div>

      {/* TRAFFIC LEGEND */}
      {mapControls.traffic && !isNavigating && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-slate-200 z-10 pointer-events-auto flex items-center gap-3 text-[11px] md:text-xs font-medium text-slate-600 hidden md:flex">
          <span className="font-bold text-slate-800">Giao thông thời gian thực</span>
          <div className="w-px h-4 bg-slate-300"></div>
          <span className="italic">Nhanh</span>
          <div className="flex items-center gap-0.5">
            <div className="w-5 h-2 bg-[#22c55e] rounded-sm"></div>
            <div className="w-5 h-2 bg-[#f59e0b] rounded-sm"></div>
            <div className="w-5 h-2 bg-[#ef4444] rounded-sm"></div>
            <div className="w-5 h-2 bg-[#7f1d1d] rounded-sm"></div>
          </div>
          <span className="italic">Chậm</span>
        </div>
      )}

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
          isAddingPOI={isAddingPOI}
          setIsAddingPOI={(v: boolean) => {
            setIsAddingPOI(v);
            if (!v) {
              setPendingPOILocation(null);
              setShowAddPOIModal(false);
            }
          }}
        />
      )}

      {/* MODAL THÊM POI */}
      {showAddPOIModal && pendingPOILocation && (
        <AddPOIModal
          location={pendingPOILocation}
          onClose={() => setShowAddPOIModal(false)}
          onSubmitSuccess={() => {
            setShowAddPOIModal(false);
            setIsAddingPOI(false);
            setPendingPOILocation(null);
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
            onClose={() => {
              setSelectedEvent(null);
              setRouteData(null);
              setDestination(null);
              setOrigin(null);
              setOriginQuery("");
              setDestinationQuery("");
              setRouteAlertMessage(null);
            }}
          />
        </div>
      )}

      {/* POI FEATURED SIDEBAR (RIGHT SIDE WHEN ROUTE IS ACTIVE) */}
      {(routeData || isNavigating) && viewMode === "pois" && selectedFilter !== null && (
        <div className="absolute right-20 top-24 z-20 pointer-events-none hidden md:block">
          <div className="pointer-events-auto">
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
              onClose={() => {
                setSelectedFilter(null);
                setSelectedPOI(null);
                setRouteData(null);
                setDestination(null);
                setOrigin(null);
                setOriginQuery("");
                setDestinationQuery("");
                setRouteAlertMessage(null);
              }}
            />
          </div>
        </div>
      )}

      {/* SAVED ROUTES SIDEBAR */}
      <SavedRoutesSidebar
        isOpen={!isNavigating && showSavedRoutesSidebar}
        onClose={() => setShowSavedRoutesSidebar(false)}
        savedRoutes={savedRoutes}
        onSelectRoute={handleSelectSavedRoute}
        onDeleteRoute={handleDeleteSavedRoute}
      />

      {/* NAVIGATION PANEL */}
      {isNavigating && routeData && (
        <div className="absolute top-6 left-6 md:left-6 md:top-6 z-40 w-[calc(100%-48px)] md:w-80 pointer-events-auto max-md:top-auto max-md:bottom-4 max-md:left-4 max-md:w-[calc(100%-32px)]">
          <NavigationPanel
            steps={routeData.steps || []}
            currentStepIndex={currentStepIndex}
            distanceToNextStep={distanceToNextStep}
            totalDistanceKm={routeData.totalDistanceKm}
            totalTimeMin={routeData.totalTimeMin}
            isVoiceMuted={isVoiceMuted}
            onToggleVoice={() => {
              const nextVal = !isVoiceMuted;
              setIsVoiceMuted(nextVal);
              if (nextVal) window.speechSynthesis.cancel();
            }}
            isSimulationMode={isSimulationMode}
            isSimulating={isSimulating}
            onToggleSimulation={() => {
              if (isSimulating) {
                pauseSimulation();
              } else {
                startSimulation(true);
              }
            }}
            simulationSpeed={simulationSpeed}
            onChangeSimulationSpeed={(speed) => setSimulationSpeed(speed)}
            onStopNavigation={handleStopNavigation}
            onNextStep={() => {
              if (routeData.steps && currentStepIndex < routeData.steps.length - 1) {
                setCurrentStepIndex((prev) => prev + 1);
              }
            }}
            onPrevStep={() => {
              if (currentStepIndex > 0) {
                setCurrentStepIndex((prev) => prev - 1);
              }
            }}
          />
        </div>
      )}

      {/* DIALOG CHỌN CHẾ ĐỘ DẪN ĐƯỜNG */}
      {showNavModeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-center mb-2 text-blue-400">CHỌN CHẾ ĐỘ DẪN ĐƯỜNG</h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              Bạn có thể sử dụng định vị GPS thực tế trên thiết bị hoặc chạy mô phỏng di chuyển dọc theo tuyến đường để trải nghiệm.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartRealNavigation}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all"
              >
                📡 BẮT ĐẦU VỚI GPS THỰC TẾ
              </button>
              <button
                onClick={handleStartSimulationNavigation}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                🚗 CHẠY MÔ PHỎNG LỘ TRÌNH
              </button>
              <button
                onClick={() => setShowNavModeSelector(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 text-center transition-colors mt-2"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
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

      <ReportTrafficModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={reportFormData.title}
        onChangeTitle={(val) => setReportFormData({ ...reportFormData, title: val })}
        description={reportFormData.description}
        onChangeDescription={(val) => setReportFormData({ ...reportFormData, description: val })}
        location={reportFormData.location}
        onChangeLocation={(val) => setReportFormData({ ...reportFormData, location: val })}
        onSubmit={handleSubmitTrafficReport}
      />

      <SaveRouteModal
        isOpen={showSaveRouteModal}
        onClose={() => setShowSaveRouteModal(false)}
        routeName={saveRouteName}
        onChangeRouteName={setSaveRouteName}
        onSubmit={handleSaveRoute}
        isLoading={isSavingRoute}
      />
      <ShareRouteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
      />
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
      <StatusBanner isOffline={isOffline} isLowBandwidth={isLowBandwidth} />

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
