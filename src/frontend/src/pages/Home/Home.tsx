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
import { io } from "socket.io-client";

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
import { usePOIState } from "./hooks/usePOIState";
import { useTrafficAlertState } from "./hooks/useTrafficAlertState";
import { useEventsState } from "./hooks/useEventsState";
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
import EventsLayer, {
  EventData,
  getEventStatus,
} from "./components/EventsLayer";
import EventsSidebar from "./components/EventsSidebar";
import EventDetailSidebar from "./components/EventDetailSidebar";
import {
  useNotificationStore,
  AppNotification,
} from "../../store/notificationStore";
import { AIChatbot } from "./components/AIChatbot";
import { SavedRoutesSidebar } from "./components/SavedRoutesSidebar";
import { ModalsOrchestrator } from "./components/ModalsOrchestrator";
import { MapPopupsOrchestrator } from "./components/MapPopupsOrchestrator";
import { StatusBanner } from "./components/StatusBanner";
import { useGPSNavigation } from "./hooks/useGPSNavigation";
import { useLiveLocationSharing } from "./hooks/useLiveLocationSharing";
import { useSavedRoutesState } from "./hooks/useSavedRoutesState";
import { FilterChips } from "./components/FilterChips";
import { TrafficLegend } from "./components/TrafficLegend";
import { TopRightActions } from "./components/TopRightActions";
import { decodePolyline } from "../../utils/polylineHelper";
import { parseRouteData } from "../../utils/utlis";

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
  // States nâng cấp dẫn đường
  const [showNavModeSelector, setShowNavModeSelector] = useState(false);

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
    return localStorage.getItem("weather_widget_collapsed") !== "true";
  });

  const handleToggleWeather = () => {
    const nextState = !isWeatherExpanded;
    setIsWeatherExpanded(nextState);
    localStorage.setItem("weather_widget_collapsed", (!nextState).toString());
  };

  // States cho Chế độ Tiết kiệm băng thông & Ngoại tuyến
  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return true;
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("low_bandwidth_mode") === "true"
    );
  });
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      const savedMode =
        typeof localStorage !== "undefined" &&
        localStorage.getItem("low_bandwidth_mode") === "true";
      setIsLowBandwidth(savedMode);
      showPremiumToast("Đã khôi phục kết nối mạng internet.", "success");
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsLowBandwidth(true);
      showPremiumToast(
        "Mất kết nối mạng. Đã tự động kích hoạt chế độ Ngoại tuyến & Tiết kiệm băng thông.",
        "warning",
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  // Tách Logic POIs
  const {
    pois,
    setPois,
    selectedPOI,
    setSelectedPOI,
    selectedFilter,
    setSelectedFilter,
    isAddingPOI,
    setIsAddingPOI,
    pendingPOILocation,
    setPendingPOILocation,
    showAddPOIModal,
    setShowAddPOIModal,
    fetchPOIs,
  } = usePOIState();

  // Tách Logic Sự Kiện
  const [viewMode, setViewMode] = useState<"pois" | "events">("pois");
  const {
    events,
    setEvents,
    eventCategories,
    setEventCategories,
    selectedEvent,
    setSelectedEvent,
    favoriteEventIds,
    setFavoriteEventIds,
    showEventsSidebar,
    setShowEventsSidebar,
    handleFavoriteEventToggle,
    fetchEventsAndCategories,
    fetchUserFavoriteEventIds,
  } = useEventsState();

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

  // Tách Logic Cảnh báo giao thông (Traffic Alerts)
  const {
    trafficAlerts,
    setTrafficAlerts,
    selectedTrafficAlert,
    setSelectedTrafficAlert,
    showReportModal,
    setShowReportModal,
    reportFormData,
    setReportFormData,
    fetchTrafficAlerts,
    handleSubmitTrafficReport,
  } = useTrafficAlertState();

  const [mapControls, setMapControls] = useState({
    layers: true,
    traffic: false,
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
    "origin" | "destination" | string | null
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
    waypoints,
    setWaypoints,
    waypointQueries,
    setWaypointQueries,
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
    onCrossedRestrictedRoad: (blockedRoads, onAvoid, onCancel) => {
      showCustomConfirm(
        "Phát hiện đường cấm",
        `Tuyến đường dự kiến đi qua đoạn đường cấm: ${blockedRoads
          .map((r) => r.road_name)
          .join(", ")}. Bạn có muốn đổi tuyến đường khác để né tránh không?`,
        onAvoid,
        onCancel,
      );
    },
  });

  // CÁC HÀM XỬ LÝ DẪN ĐƯỜNG (NAVIGATION)
  const handleStartNavigation = () => {
    if (!routeData) {
      showPremiumToast("Chưa có thông tin lộ trình.", "error");
      return;
    }
    setShowNavModeSelector(true);
  };

  const handleNavigationCompleted = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) return; // Không đăng nhập thì không lưu lịch sử

    try {
      await savedRouteService.saveRoute({
        origin_name: originQuery || origin?.label || "Vị trí hiện tại",
        origin_lat: origin?.lat || 0,
        origin_lng: origin?.lng || 0,
        destination_name: destinationQuery || destination?.label || "Điểm đến",
        destination_lat: destination?.lat || 0,
        destination_lng: destination?.lng || 0,
        route_name: `Lịch sử: ${originQuery || "Điểm đi"} ➔ ${destinationQuery || "Điểm đến"}`,
        route_data: JSON.stringify(
          waypoints && waypoints.length > 0
            ? { coordinates: routeData?.coordinates || [], waypoints }
            : routeData?.coordinates || [],
        ),
        distance_meters: Math.round((routeData?.totalDistanceKm || 0) * 1000),
        duration_seconds: (routeData?.totalTimeMin || 0) * 60,
        profile: travelMode,
        save_type: "history",
      });
      showPremiumToast("Đã lưu lộ trình vào lịch sử di chuyển!", "success");
    } catch (error) {
      console.error("Lỗi khi tự động lưu lịch sử lộ trình:", error);
    }
  };

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
    type: "origin" | "destination" | string,
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

  const {
    isNavigating,
    isSimulationMode,
    isSimulating,
    simulatedCoords,
    simulatedHeading,
    simulationSpeed,
    setSimulationSpeed,
    isVoiceMuted,
    setIsVoiceMuted,
    currentStepIndex,
    setCurrentStepIndex,
    distanceToNextStep,
    handleStartRealNavigation,
    handleStartSimulationNavigation,
    handleStopNavigation,
    speakInstruction,
    startSimulation,
    pauseSimulation,
  } = useGPSNavigation({
    mapRef,
    routeData,
    userLocation,
    setUserLocation,
    setOrigin,
    setOriginQuery,
    onNavigationCompleted: handleNavigationCompleted,
  });

  const { isSharingLocation, liveShareToken, handleToggleShareLocation } =
    useLiveLocationSharing();

  const {
    savedRoutes,
    showSavedRoutesSidebar,
    setShowSavedRoutesSidebar,
    showSaveRouteModal,
    setShowSaveRouteModal,
    saveRouteName,
    setSaveRouteName,
    showShareModal,
    setShowShareModal,
    shareUrl,
    isSavingRoute,
    isSharingRoute,
    duplicateRouteId,
    openSaveRouteModal,
    handleSaveRoute,
    handleShareRoute,
    handleDeleteSavedRoute,
    handleSelectSavedRoute,
  } = useSavedRoutesState({
    mapRef,
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
    isEmergency: avoidFlood || activeOrSelectedEventRoads.length > 0,
    navigate,
    showCustomConfirm,
    isLoadedRouteRef,
    waypoints,
    setWaypoints,
    setWaypointQueries,
  });

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
    let query = "";
    if (activeInputField === "origin") {
      query = originQuery;
    } else if (activeInputField === "destination") {
      query = destinationQuery;
    } else if (activeInputField && activeInputField.startsWith("waypoint-")) {
      const idx = parseInt(activeInputField.split("-")[1], 10);
      query = waypointQueries[idx] || "";
    }

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
            place_name_vi:
              f.properties?.full_address || f.properties?.name || "",
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
  }, [originQuery, destinationQuery, waypointQueries, activeInputField]);

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
        } else if (
          activeInputField &&
          activeInputField.startsWith("waypoint-")
        ) {
          const idx = parseInt(activeInputField.split("-")[1], 10);
          setWaypoints((prev) => {
            const next = [...prev];
            next[idx] = { lng, lat, label: fullName };
            return next;
          });
          setWaypointQueries((prev) => {
            const next = [...prev];
            next[idx] = fullName;
            return next;
          });
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
        } else if (
          activeInputField &&
          activeInputField.startsWith("waypoint-")
        ) {
          const idx = parseInt(activeInputField.split("-")[1], 10);
          setWaypoints((prev) => prev.filter((_, i) => i !== idx));
          setWaypointQueries((prev) => prev.filter((_, i) => i !== idx));
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
    setSelectedPOI(null);
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
          mapStyle={
            isLowBandwidth
              ? "mapbox://styles/mapbox/light-v11"
              : "mapbox://styles/mapbox/streets-v12"
          }
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
        >
          <NavigationControl position="bottom-right" showCompass={true} />

          {/* DRAGGABLE POI MARKER */}
          {isAddingPOI && pendingPOILocation && (
            <Marker
              longitude={pendingPOILocation.lng}
              latitude={pendingPOILocation.lat}
              draggable
              onDragEnd={(e) =>
                setPendingPOILocation({ lng: e.lngLat.lng, lat: e.lngLat.lat })
              }
              anchor="bottom"
            >
              <div className="relative group cursor-pointer flex flex-col items-center z-50">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  <MapPin size={20} className="text-white" />
                </div>
                <div className="w-2 h-2 bg-orange-600 rounded-full mt-1 shadow-sm" />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-100 transition-opacity">
                  <span className="text-xs font-semibold text-slate-700">
                    Kéo để chọn vị trí
                  </span>
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
                <div className="w-5.5 h-5.5 bg-emerald-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-[10px] font-black text-white">
                  A
                </div>
              </Marker>
            )}

          {waypoints &&
            waypoints.map(
              (wp, idx) =>
                wp &&
                wp.lng !== undefined &&
                wp.lat !== undefined && (
                  <Marker
                    key={`wp-marker-${idx}`}
                    longitude={wp.lng}
                    latitude={wp.lat}
                    anchor="center"
                  >
                    <div className="w-5.5 h-5.5 bg-white border-2 border-slate-700 rounded-full shadow-lg flex items-center justify-center text-[10px] font-black text-slate-700">
                      {String.fromCharCode(66 + idx)}
                    </div>
                  </Marker>
                ),
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
          )}

          {/* VẼ CÁC TUYẾN ĐƯỜNG THAY THẾ (ALTERNATIVE ROUTES) */}
          {!isNavigating &&
            routeData?.routes &&
            routeData.routes.map((route) => {
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
                <Source
                  key={`route-alt-source-${route.id}`}
                  id={`route-alt-source-${route.id}`}
                  type="geojson"
                  data={routeGeoJSON}
                >
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
          {!isNavigating &&
            routeData?.routes &&
            routeData.routes.map((route) => {
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
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    [
                      "case",
                      ["get", "isSelected"],
                      14,
                      ["case", ["get", "isActive"], 10, 8],
                    ],
                    14,
                    [
                      "case",
                      ["get", "isSelected"],
                      24,
                      ["case", ["get", "isActive"], 20, 14],
                    ],
                    18,
                    [
                      "case",
                      ["get", "isSelected"],
                      40,
                      ["case", ["get", "isActive"], 32, 24],
                    ],
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
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    [
                      "case",
                      ["get", "isSelected"],
                      10,
                      ["case", ["get", "isActive"], 7, 5],
                    ],
                    14,
                    [
                      "case",
                      ["get", "isSelected"],
                      18,
                      ["case", ["get", "isActive"], 14, 10],
                    ],
                    18,
                    [
                      "case",
                      ["get", "isSelected"],
                      32,
                      ["case", ["get", "isActive"], 26, 20],
                    ],
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
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    [
                      "case",
                      ["get", "isSelected"],
                      8,
                      ["case", ["get", "isActive"], 6, 4],
                    ],
                    14,
                    [
                      "case",
                      ["get", "isSelected"],
                      14,
                      ["case", ["get", "isActive"], 10, 8],
                    ],
                    18,
                    [
                      "case",
                      ["get", "isSelected"],
                      26,
                      ["case", ["get", "isActive"], 20, 14],
                    ],
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
                  className={`flex items-center justify-center border-2 border-white w-6 h-6 md:w-6 md:h-6 rounded-full shadow-md cursor-pointer transform hover:scale-125 transition-all z-30 bg-[#dc2626] ${isSelected ? "ring-4 ring-red-500/35 scale-110" : "scale-100 opacity-95"}`}
                  title={road.road_name}
                >
                  <Ban size={12} strokeWidth={3.5} className="text-white" />
                </div>
              </Marker>
            );
          })}

          {mapControls.traffic &&
            trafficAlerts.map((alert) => {
              const getAlertColor = () => {
                if (alert.severity === "HIGH") return "bg-red-600";
                if (alert.severity === "MEDIUM") return "bg-orange-500";
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
            <Source
              id="mapbox-traffic"
              type="vector"
              url="mapbox://mapbox.mapbox-traffic-v1"
            >
              <Layer
                id="traffic"
                type="line"
                source="mapbox-traffic"
                source-layer="traffic"
                beforeId="road-label"
                paint={{
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    2,
                    16,
                    5,
                  ],
                  "line-color": [
                    "case",
                    ["==", "low", ["get", "congestion"]],
                    "#22c55e", // Nhanh (Xanh lá)
                    ["==", "moderate", ["get", "congestion"]],
                    "#f59e0b", // Vừa (Cam)
                    ["==", "heavy", ["get", "congestion"]],
                    "#ef4444", // Chậm (Đỏ)
                    ["==", "severe", ["get", "congestion"]],
                    "#7f1d1d", // Rất chậm (Đỏ sẫm)
                    "transparent",
                  ],
                }}
              />
            </Source>
          )}

          {mapControls.traffic &&
            trafficAlerts.map((alert) => {
              if (!alert.affected_area_polygon) return null;

              let geojsonData = null;
              try {
                geojsonData =
                  typeof alert.affected_area_polygon === "string"
                    ? JSON.parse(alert.affected_area_polygon)
                    : alert.affected_area_polygon;
              } catch (e) {
                return null;
              }

              if (!geojsonData || !geojsonData.type) return null;

              const fillColor =
                alert.severity === "HIGH"
                  ? "#dc2626"
                  : alert.severity === "MEDIUM"
                    ? "#f97316"
                    : "#3b82f6";

              return (
                <Source
                  key={`alert-poly-source-${alert.id}`}
                  id={`alert-poly-source-${alert.id}`}
                  type="geojson"
                  data={geojsonData}
                >
                  <Layer
                    id={`alert-poly-layer-${alert.id}`}
                    type="fill"
                    paint={{
                      "fill-color": fillColor,
                      "fill-opacity": 0.3,
                    }}
                  />
                  <Layer
                    id={`alert-poly-line-${alert.id}`}
                    type="line"
                    paint={{
                      "line-color": fillColor,
                      "line-width": 2,
                    }}
                  />
                </Source>
              );
            })}

          <MapPopupsOrchestrator
            pendingDestination={pendingDestination}
            setPendingDestination={setPendingDestination}
            userLocation={userLocation}
            setOrigin={setOrigin}
            setOriginQuery={setOriginQuery}
            setDestination={setDestination}
            setDestinationQuery={setDestinationQuery}
            origin={origin}
            validateLocation={validateLocation}
            handleOpenReportModal={handleOpenReportModal}
            selectedFloodZone={selectedFloodZone}
            setSelectedFloodZone={setSelectedFloodZone}
            mapControls={mapControls}
            selectedTrafficAlert={selectedTrafficAlert}
            setSelectedTrafficAlert={setSelectedTrafficAlert}
            selectedRoadPopup={selectedRoadPopup}
            setSelectedRoadPopup={setSelectedRoadPopup}
            isRoadRestrictionActive={isRoadRestrictionActive}
          />

          {viewMode === "pois" ? (
            <>
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
                userLocation={userLocation}
              />
              <EventsLayer
                events={events.filter(
                  (evt) =>
                    getEventStatus(evt.start_time, evt.end_time) === "ongoing",
                )}
                onSelectEvent={handleEventClick}
              />
            </>
          ) : (
            <EventsLayer events={events} onSelectEvent={handleEventClick} />
          )}
        </Map>
      </div>

      {/* HEADER TRÊN CÙNG & PANEL TÌM ĐƯỜNG */}
      <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-10 flex flex-col pointer-events-none gap-2">
        {/* Hàng trên: Search + Bell + Avatar */}
        <div className="flex items-start justify-between gap-2 w-full">
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
                  onOpenSaveRouteModal={openSaveRouteModal}
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
                  waypoints={waypoints}
                  setWaypoints={setWaypoints}
                  waypointQueries={waypointQueries}
                  setWaypointQueries={setWaypointQueries}
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
                        userLocation={userLocation}
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
            <FilterChips
              selectedFilter={selectedFilter}
              onFilterClick={handleFilterClick}
            />
          )}

          {/* Thông báo & User - cùng hàng với search */}
          {!isNavigating && (
            <TopRightActions
              userRole={userRole || "user"}
              userProfile={userProfile}
              unreadCount={unreadCount}
              showNotificationModal={showNotificationModal}
              setShowNotificationModal={setShowNotificationModal}
              navigate={navigate}
              floodZones={floodZones}
              trafficAlerts={trafficAlerts}
              events={events}
              setMapControls={setMapControls}
              mapRef={mapRef}
              setSelectedFloodZone={setSelectedFloodZone}
              setSelectedTrafficAlert={setSelectedTrafficAlert}
              setSelectedPOI={setSelectedPOI}
              setSelectedEvent={setSelectedEvent}
              setSelectedRoadPopup={setSelectedRoadPopup}
              setViewMode={setViewMode}
              setShowEventsSidebar={setShowEventsSidebar}
              handleEventClick={handleEventClick}
            />
          )}
        </div>

        {/* Filter chips — mobile only: hàng riêng bênn dưới search */}
        {!isNavigating && viewMode === "pois" && (
          <FilterChips
            selectedFilter={selectedFilter}
            onFilterClick={handleFilterClick}
            isMobile
          />
        )}
      </div>

      {/* TRAFFIC LEGEND */}
      <TrafficLegend show={mapControls.traffic && !isNavigating} />

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
            localStorage.setItem("low_bandwidth_mode", val.toString());
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
      {routeData &&
        !isNavigating &&
        viewMode === "pois" &&
        selectedFilter !== null && (
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
                userLocation={userLocation}
              />
            </div>
          </div>
        )}

      {/* SAVED ROUTES SIDEBAR */}
      <SavedRoutesSidebar
        isOpen={showSavedRoutesSidebar}
        onClose={() => setShowSavedRoutesSidebar(false)}
        savedRoutes={savedRoutes}
        onDeleteRoute={handleDeleteSavedRoute}
        onSelectRoute={(route) => {
          // 1. Set điểm đi, điểm đến
          setOrigin({
            lat: route.origin_lat,
            lng: route.origin_lng,
            label: route.origin_name || "Vị trí xuất phát",
          });
          setOriginQuery(route.origin_name || "Vị trí xuất phát");

          setDestination({
            lat: route.destination_lat,
            lng: route.destination_lng,
            label: route.destination_name || "Điểm đến",
          });
          setDestinationQuery(route.destination_name || "Điểm đến");

          setTravelMode(route.profile as "driving" | "walking" | "cycling");

          // 2. PARSE VÀ NẠP DỮ LIỆU ĐƯỜNG ĐI VÀO STATE
          const parsedData = parseRouteData(route.route_data);

          if (parsedData.coordinates && parsedData.coordinates.length > 0) {
            setRouteData({
              totalDistanceKm: route.distance_meters
                ? parseFloat((route.distance_meters / 1000).toFixed(2))
                : 0,
              totalTimeMin: route.duration_seconds
                ? Math.round(route.duration_seconds / 60)
                : 0,
              coordinates: parsedData.coordinates,
            });

            // 3. TỰ ĐỘNG ZOOM BẢN ĐỒ ÔM TRỌN TUYẾN ĐƯỜNG
            const coords = parsedData.coordinates;
            if (mapRef.current) {
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

              mapRef.current.fitBounds(
                [
                  [minLng, minLat],
                  [maxLng, maxLat],
                ],
                { padding: 80, duration: 1200 },
              );
            }
          } else {
            showPremiumToast(
              "Lộ trình này không có dữ liệu đường đi!",
              "error",
            );
          }

          // 4. Đóng sidebar lịch sử lại
          setShowSavedRoutesSidebar(false);
        }}
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
              if (
                routeData.steps &&
                currentStepIndex < routeData.steps.length - 1
              ) {
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
            <h3 className="text-lg font-black text-center mb-2 text-blue-400">
              CHỌN CHẾ ĐỘ DẪN ĐƯỜNG
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              Bạn có thể sử dụng định vị GPS thực tế trên thiết bị hoặc chạy mô
              phỏng di chuyển dọc theo tuyến đường để trải nghiệm.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  handleStartRealNavigation();
                  setShowNavModeSelector(false);
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all"
              >
                📡 BẮT ĐẦU VỚI GPS THỰC TẾ
              </button>
              <button
                onClick={() => {
                  handleStartSimulationNavigation();
                  setShowNavModeSelector(false);
                }}
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
      <ModalsOrchestrator
        confirmModal={confirmModal}
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        reportFormData={reportFormData}
        setReportFormData={setReportFormData}
        handleSubmitTrafficReport={handleSubmitTrafficReport}
        showSaveRouteModal={showSaveRouteModal}
        setShowSaveRouteModal={setShowSaveRouteModal}
        saveRouteName={saveRouteName}
        setSaveRouteName={setSaveRouteName}
        handleSaveRoute={handleSaveRoute}
        isSavingRoute={isSavingRoute}
        isDuplicateSavedRoute={!!duplicateRouteId}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        shareUrl={shareUrl}
        showAddPOIModal={showAddPOIModal}
        setShowAddPOIModal={setShowAddPOIModal}
        pendingPOILocation={pendingPOILocation}
        setPendingPOILocation={setPendingPOILocation}
        setIsAddingPOI={setIsAddingPOI}
      />
      {/* WEATHER WIDGET */}
      <WeatherWidget
        isCollapsed={!isWeatherExpanded}
        onToggleCollapse={(collapsed) => {
          setIsWeatherExpanded(!collapsed);
          localStorage.setItem(
            "weather_widget_collapsed",
            collapsed.toString(),
          );
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
