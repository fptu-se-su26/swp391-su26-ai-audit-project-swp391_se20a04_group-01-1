import { useState, useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { EventRoad } from "../../../services/eventRoadService";
import { findSafeRoute as findSafeRouteZone } from "../../../utils/floodZoneRouteUtils";
import { findSafeTrafficRoute } from "../../../utils/trafficRouteUtils";
import { findSafeEventRoute } from "../../../utils/eventRouteUtils";
import { showPremiumToast } from "../../../utils/toastUtils";
import { RouteData } from "../types/route";
import { LocationPoint } from "../types/map";
import { fetchLowBandwidthRoute, fetchMapboxDirections } from "../services/routeService";
import { getHaversineDistance, estimateOfflineDurationMin } from "../utils/routeUtils";
import { getBoundsFromCoordinates } from "../utils/mapUtils";

export type { RouteData, LocationPoint };

export function useMapRouting(
  mapRef: React.RefObject<MapRef | null>,
  options: {
    floodZones: any[];
    trafficAlerts: any[];
    activeEventRoads: EventRoad[];
    avoidFlood: boolean;
    avoidCongestion: boolean;
    confirmedFloodZoneIds: string[];
    isLowBandwidth: boolean;
    isOffline: boolean;
    isNavigating?: boolean;
  },
) {
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [travelMode, setTravelMode] = useState<
    "driving" | "walking" | "cycling"
  >("driving");
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeAlertMessage, setRouteAlertMessage] = useState<string | null>(
    null,
  );
  const isLoadedRouteRef = useRef(false);
  //  FIX: dùng ref thay vì đưa options.isNavigating vào dependency của effect
  // fetch tuyến đường bên dưới - nếu đưa vào deps, mỗi lần bắt đầu/dừng dẫn
  // đường sẽ khiến effect chạy lại và gọi lại API Mapbox Directions không cần thiết.
  const isNavigatingRef = useRef(false);
  useEffect(() => {
    isNavigatingRef.current = !!options.isNavigating;
  }, [options.isNavigating]);

  // Fetch and process map route
  useEffect(() => {
    if (!origin || !destination) return;
    if (isLoadedRouteRef.current) {
      isLoadedRouteRef.current = false;
      return;
    }

    const getShortestRoute = async () => {
      setLoadingRoute(true);
      try {
        const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

        //  FIX: các lệnh fitBounds bên dưới luôn "kéo" camera về góc nhìn toàn
        // tuyến. Trong lúc đang dẫn đường (isNavigating), việc này sẽ đè lên
        // hiệu ứng phóng to bám theo người dùng, khiến bản đồ trông như chưa
        // từng zoom. Đã bọc guardFitBounds bên dưới để bỏ qua khi đang dẫn đường.
        const guardFitBounds = (bounds: any, opts: any) => {
          if (isNavigatingRef.current) return;
          mapRef.current?.fitBounds(bounds, opts);
        };

        // 1. XỬ LÝ NGOẠI TUYẾN (OFFLINE FALLBACK)
        if (options.isOffline) {
          const distKm = getHaversineDistance(origin, destination);
          const durationMin = estimateOfflineDurationMin(distKm, travelMode);

          setRouteAlertMessage(
            "⚠️ Chế độ Ngoại tuyến: Đang hiển thị hướng đường chim bay khẩn cấp tới đích.",
          );
          setRouteData({
            totalDistanceKm: parseFloat(distKm.toFixed(2)),
            totalTimeMin: durationMin,
            coordinates: [
              [origin.lng, origin.lat],
              [destination.lng, destination.lat],
            ],
          });

          guardFitBounds(
            [
              [origin.lng, origin.lat],
              [destination.lng, destination.lat],
            ],
            { padding: 80, duration: 1200 },
          );
          setLoadingRoute(false);
          return;
        }

        // 2. XỬ LÝ TIẾT KIỆM BĂNG THÔNG QUA BACKEND PROXY (LOW BANDWIDTH)
        if (options.isLowBandwidth) {
          const lowBandwidthRoute = await fetchLowBandwidthRoute(origin, destination, travelMode, mapboxToken);

          if (lowBandwidthRoute) {
            setRouteAlertMessage(
              "⚡ Tiết kiệm băng thông: Tuyến đường đã được nén tối ưu truyền tải.",
            );
            setRouteData(lowBandwidthRoute);

            if (lowBandwidthRoute.coordinates.length > 0) {
              guardFitBounds(
                getBoundsFromCoordinates(lowBandwidthRoute.coordinates),
                { padding: 80, duration: 1200 },
              );
            }
            setLoadingRoute(false);
            return;
          }
        }

        // 3. XỬ LÝ TRỰC TUYẾN BÌNH THƯỜNG
        const { ok, routes } = await fetchMapboxDirections(origin, destination, travelMode, mapboxToken);

        if (ok) {
          let selectedRoute = routes[0];
          let alertMsg: string | null = null;

          if (options.avoidFlood) {
            // Trích xuất các cảnh báo ngập lụt động từ danh sách TrafficAlerts
            const weatherFloodZones = (options.trafficAlerts || [])
              .filter(
                (alert: any) =>
                  alert.is_active &&
                  (alert.type === "FLOOD" || alert.type === "WEATHER"),
              )
              .map((alert: any) => ({
                id: `temp-weather-${alert.id}`,
                zone_id: alert.id,
                name: alert.title,
                district: alert.location || "Đà Nẵng",
                center: [alert.longitude, alert.latitude] as [number, number],
                radius: 800, // Bán kính ảnh hưởng ngập lụt dự báo (~800m)
                depthCm: 30, // Độ sâu ngập giả định (> 10cm để thuật toán né tránh)
                level: "high" as const,
                description: alert.description,
              }));

            const combinedFloodZones = [
              ...options.floodZones,
              ...weatherFloodZones,
            ];

            const combinedConfirmedIds = [
              ...options.confirmedFloodZoneIds,
              ...weatherFloodZones.map((w) => w.id),
            ];

            const result = await findSafeRouteZone(
              routes,
              combinedFloodZones,
              origin,
              destination,
              travelMode,
              mapboxToken,
              combinedConfirmedIds,
            );
            selectedRoute = result.selectedRoute;
            alertMsg = result.alertMsg;
          }

          if (options.avoidCongestion && selectedRoute) {
            const result = await findSafeTrafficRoute(
              [
                selectedRoute,
                ...routes.filter((r: any) => r !== selectedRoute),
              ],
              options.trafficAlerts,
              origin,
              destination,
              travelMode,
              mapboxToken,
            );
            selectedRoute = result.selectedRoute;
            if (result.alertMsg) {
              alertMsg = alertMsg
                ? `${alertMsg}\n${result.alertMsg}`
                : result.alertMsg;
            }
          }

          if (options.activeEventRoads.length > 0 && selectedRoute) {
            const result = await findSafeEventRoute(
              [
                selectedRoute,
                ...routes.filter((r: any) => r !== selectedRoute),
              ],
              options.activeEventRoads,
              origin,
              destination,
              travelMode,
              mapboxToken,
            );
            selectedRoute = result.selectedRoute;
            if (result.alertMsg) {
              alertMsg = alertMsg
                ? `${alertMsg}\n${result.alertMsg}`
                : result.alertMsg;
            }
          }

          setRouteAlertMessage(alertMsg);

          if (selectedRoute) {
            setRouteData({
              totalDistanceKm: parseFloat(
                (selectedRoute.distance / 1000).toFixed(2),
              ),
              totalTimeMin: Math.round(selectedRoute.duration / 60),
              coordinates: selectedRoute.geometry.coordinates,
              steps: selectedRoute.legs[0]?.steps || [],
            });

            // Căn chỉnh camera hiển thị đầy đủ tuyến đường đi
            const coords = selectedRoute.geometry.coordinates;
            if (coords.length > 0) {
              guardFitBounds(
                getBoundsFromCoordinates(coords),
                { padding: 80, duration: 1500 },
              );
            }
          } else {
            setRouteData(null);
          }
        } else {
          showPremiumToast(
            "Không tìm thấy đường đi thích hợp cho phương tiện này!",
            "error",
          );
          setRouteData(null);
          setRouteAlertMessage(null);
        }
      } catch (err) {
        console.error("Lỗi kết nối API đường đi Mapbox:", err);
        setRouteData(null);
        setRouteAlertMessage(null);
      } finally {
        setLoadingRoute(false);
      }
    };

    getShortestRoute();
  }, [
    origin,
    destination,
    travelMode,
    options.avoidFlood,
    options.avoidCongestion,
    options.confirmedFloodZoneIds,
    options.floodZones,
    options.activeEventRoads,
    options.trafficAlerts,
    options.isOffline,
    options.isLowBandwidth,
    mapRef,
  ]);

  const applyRouteToState = (route: any) => {
    if (!route) return;
    const coords =
      route.geometry?.coordinates || JSON.parse(route.route_data || "[]");
    setRouteData({
      totalDistanceKm: route.distance
        ? parseFloat((route.distance / 1000).toFixed(2))
        : parseFloat((route.distance_meters / 1000).toFixed(2)),
      totalTimeMin: route.duration
        ? Math.round(route.duration / 60)
        : Math.round(route.duration_seconds / 60),
      coordinates: coords,
    });
    isLoadedRouteRef.current = true;
  };

  return {
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
  };
}
