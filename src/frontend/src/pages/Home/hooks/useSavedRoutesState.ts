import { useState, useEffect, useRef } from "react";
import { savedRouteService, SavedRoute } from "../../../services/savedRouteService";
import { showPremiumToast } from "../../../utils/toastUtils";

interface UseSavedRoutesStateProps {
  mapRef: React.RefObject<any>;
  origin: any;
  setOrigin: (point: any) => void;
  originQuery: string;
  setOriginQuery: (query: string) => void;
  destination: any;
  setDestination: (point: any) => void;
  destinationQuery: string;
  setDestinationQuery: (query: string) => void;
  travelMode: string;
  setTravelMode: (mode: any) => void;
  routeData: any;
  setRouteData: (data: any) => void;
  isEmergency: boolean;
  navigate: (path: string) => void;
  showCustomConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
  isLoadedRouteRef: React.MutableRefObject<boolean>;
}

export const useSavedRoutesState = ({
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
  isEmergency,
  navigate,
  showCustomConfirm,
  isLoadedRouteRef,
}: UseSavedRoutesStateProps) => {
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
          `Lộ trình từ ${origin.label || "Vị trí hiện tại"} đến ${
            destination.label || "Điểm đến"
          }`,
        route_data: JSON.stringify(routeData.coordinates),
        distance_meters: Math.round(routeData.totalDistanceKm * 1000),
        duration_seconds: routeData.totalTimeMin * 60,
        profile: travelMode,
        is_emergency: isEmergency,
      });
      showPremiumToast("Lưu lộ trình thành công!", "success");
      setShowSaveRouteModal(false);
      setSaveRouteName("");
      fetchSavedRoutes();
    } catch (error: any) {
      console.error("Lỗi khi lưu lộ trình:", error);
      showPremiumToast(
        error.response?.data?.message || "Không thể lưu lộ trình.",
        "error"
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
        is_emergency: isEmergency,
      });

      if (data.success && data.share_token) {
        const shareLink = `${window.location.origin}${
          import.meta.env.BASE_URL
        }dashboard?share=${data.share_token}`;
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
        "error"
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
      () => {}
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
        { padding: 80, duration: 1500 }
      );
    }

    setShowSavedRoutesSidebar(false);
    showPremiumToast("Đã tải lộ trình đã lưu!", "success");
  };

  // Load shared route or route by ID on mount if URL parameter exists
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const shareToken = queryParams.get("share");
    const routeId = queryParams.get("routeId");

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
                (route.distance_meters / 1000).toFixed(2)
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

              setTimeout(() => {
                mapRef.current?.fitBounds(
                  [
                    [minLng, minLat],
                    [maxLng, maxLat],
                  ],
                  { padding: 80, duration: 1500 }
                );
              }, 1000);
            }

            const newUrl =
              window.location.pathname +
              window.location.search.replace(/[\?&]share=[^&]+/, "");
            window.history.replaceState({}, "", newUrl || "/");
            showPremiumToast("Tải lộ trình chia sẻ thành công!", "success");
          }
        } catch (error) {
          console.error("Lỗi tải lộ trình chia sẻ:", error);
          showPremiumToast("Không thể tải lộ trình được chia sẻ.", "error");
        }
      };
      loadSharedRoute();
    } else if (routeId) {
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
                (route.distance_meters / 1000).toFixed(2)
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

              setTimeout(() => {
                mapRef.current?.fitBounds(
                  [
                    [minLng, minLat],
                    [maxLng, maxLat],
                  ],
                  { padding: 80, duration: 1500 }
                );
              }, 1000);
            }

            const newUrl =
              window.location.pathname +
              window.location.search.replace(/[\?&]routeId=[^&]+/, "");
            window.history.replaceState({}, "", newUrl || "/");
            showPremiumToast("Tải lộ trình thành công!", "success");
          }
        } catch (error) {
          console.error("Lỗi tải lộ trình đã lưu:", error);
          showPremiumToast("Không thể tải lộ trình đã lưu.", "error");
        }
      };
      loadSavedRouteById();
    }
  }, []);

  return {
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
    handleSaveRoute,
    handleShareRoute,
    handleDeleteSavedRoute,
    handleSelectSavedRoute,
    fetchSavedRoutes,
  };
};
