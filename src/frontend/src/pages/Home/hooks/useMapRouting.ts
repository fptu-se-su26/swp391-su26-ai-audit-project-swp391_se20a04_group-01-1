import { useState, useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { EventRoad } from "../../../services/eventRoadService";
import { findSafeRoute as findSafeRouteZone } from "../../../utils/floodZoneRouteUtils";
import { findSafeTrafficRoute } from "../../../utils/trafficRouteUtils";
import {
  findSafeEventRoute,
  getBlockedRoadsForRoute,
} from "../../../utils/eventRouteUtils";
import { showPremiumToast } from "../../../utils/toastUtils";
import { decodePolyline } from "../../../utils/polylineHelper";
import { parseRouteData } from "../../../utils/utlis";

export interface RouteStep {
  maneuver: {
    type: string;
    modifier?: string;
    instruction?: string;
    location: [number, number]; // [lng, lat]
  };
  name: string;
  distance: number; // meters
  duration: number; // seconds
}

export interface RouteInfo {
  id: number;
  totalDistanceKm: number;
  totalTimeMin: number;
  coordinates: [number, number][];
  steps: RouteStep[];
}

export interface RouteData {
  totalDistanceKm: number;
  totalTimeMin: number;
  coordinates: [number, number][];
  steps?: RouteStep[];
  routes?: RouteInfo[]; // all candidate routes
}

export interface LocationPoint {
  lng: number;
  lat: number;
  label: string;
  poi_id?: number;
  event_id?: number;
}

// Hàm tính khoảng cách đường chim bay khẩn cấp khi ngoại tuyến
function getHaversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number },
) {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Khoảng cách dạng km
}

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
    onCrossedRestrictedRoad?: (
      blockedRoads: EventRoad[],
      onAvoid: () => void,
      onCancel: () => void,
    ) => void;
  },
) {
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [waypoints, setWaypoints] = useState<LocationPoint[]>([]);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [waypointQueries, setWaypointQueries] = useState<string[]>([]);
  const [travelMode, setTravelMode] = useState<
    "driving" | "walking" | "cycling"
  >("driving");
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeAlertMessage, setRouteAlertMessage] = useState<string | null>(
    null,
  );
  const isLoadedRouteRef = useRef(false);

  const [avoidEventRoadsMode, setAvoidEventRoadsMode] = useState<
    "avoid" | "none" | null
  >(null);

  // Stable refs to avoid stale closures in the routing effect
  const onCrossedRestrictedRoadRef = useRef(options.onCrossedRestrictedRoad);
  useEffect(() => {
    onCrossedRestrictedRoadRef.current = options.onCrossedRestrictedRoad;
  });

  const activeEventRoadsRef = useRef<EventRoad[]>(options.activeEventRoads);
  useEffect(() => {
    activeEventRoadsRef.current = options.activeEventRoads;
  });

  const avoidEventRoadsModeRef = useRef(avoidEventRoadsMode);
  useEffect(() => {
    avoidEventRoadsModeRef.current = avoidEventRoadsMode;
  });

  // Reset avoidEventRoadsMode when origin, destination or travelMode changes
  useEffect(() => {
    setAvoidEventRoadsMode(null);
  }, [origin, destination, travelMode]);

  // Clear waypoints when destination is cleared
  useEffect(() => {
    if (!destination) {
      setWaypoints([]);
      setWaypointQueries([]);
    }
  }, [destination]);

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
        const validWaypoints = waypoints.filter(
          (wp) => wp && wp.lat !== undefined && wp.lng !== undefined,
        );
        const coordsList = [origin, ...validWaypoints, destination];
        const coordsString = coordsList
          .map((c) => `${c.lng},${c.lat}`)
          .join(";");

        // 1. XỬ LÝ NGOẠI TUYẾN (OFFLINE FALLBACK)
        if (options.isOffline) {
          let distKm = 0;
          for (let i = 0; i < coordsList.length - 1; i++) {
            distKm += getHaversineDistance(coordsList[i], coordsList[i + 1]);
          }
          const speed =
            travelMode === "walking" ? 5 : travelMode === "cycling" ? 15 : 30; // km/h
          const durationMin = Math.round((distKm / speed) * 60);

          setRouteAlertMessage(
            "⚠️ Chế độ Ngoại tuyến: Đang hiển thị hướng đường chim bay khẩn cấp tới đích.",
          );
          setRouteData({
            totalDistanceKm: parseFloat(distKm.toFixed(2)),
            totalTimeMin: Math.max(1, durationMin),
            coordinates: coordsList.map(
              (c) => [c.lng, c.lat] as [number, number],
            ),
          });

          // Fit camera bounds
          const bounds = coordsList.map(
            (c) => [c.lng, c.lat] as [number, number],
          );
          if (bounds.length > 0) {
            let minLng = bounds[0][0],
              maxLng = bounds[0][0];
            let minLat = bounds[0][1],
              maxLat = bounds[0][1];
            for (const b of bounds) {
              if (b[0] < minLng) minLng = b[0];
              if (b[0] > maxLng) maxLng = b[0];
              if (b[1] < minLat) minLat = b[1];
              if (b[1] > maxLat) maxLat = b[1];
            }
            mapRef.current?.fitBounds(
              [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              { padding: 80, duration: 1200 },
            );
          }
          setLoadingRoute(false);
          return;
        }

        // 2. XỬ LÝ TIẾT KIỆM BĂNG THÔNG QUA BACKEND PROXY (LOW BANDWIDTH)
        if (options.isLowBandwidth) {
          const apiUrl =
            import.meta.env.VITE_API_URL || "http://localhost:5001";
          const response = await fetch(
            `${apiUrl}/api/routes/calculate?coords=${coordsString}&mode=${travelMode}&access_token=${mapboxToken}`,
          );
          const data = await response.json();

          if (response.ok && data.success && data.polyline) {
            const coords = decodePolyline(data.polyline);
            setRouteAlertMessage(
              "⚡ Tiết kiệm băng thông: Tuyến đường đã được nén tối ưu truyền tải.",
            );
            setRouteData({
              totalDistanceKm: parseFloat((data.distance / 1000).toFixed(2)),
              totalTimeMin: Math.round(data.duration / 60),
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
                { padding: 80, duration: 1200 },
              );
            }
            setLoadingRoute(false);
            return;
          }
        }

        // 3. XỬ LÝ TRỰC TUYẾN BÌNH THƯỜNG
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${coordsString}?geometries=geojson&overview=full&alternatives=true&steps=true&language=vi&access_token=${mapboxToken}`,
        );
        const data = await response.json();

        if (response.ok && data.routes && data.routes.length > 0) {
          let selectedRoute = data.routes[0];
          let alertMsg: string | null = null;

          // Chuẩn bị sẵn danh sách vùng ngập (kể cả khi avoidCongestion cần dùng lại
          // để không "quên" ràng buộc tránh ngập khi xử lý bước tránh kẹt xe bên dưới).
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

          if (options.avoidFlood) {
            const result = await findSafeRouteZone(
              data.routes,
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
                ...data.routes.filter((r: any) => r !== selectedRoute),
              ],
              options.trafficAlerts,
              origin,
              destination,
              travelMode,
              mapboxToken,
              150,
              // Chỉ áp ràng buộc tránh ngập khi avoidFlood đang bật, để bước tránh
              // kẹt xe không bao giờ chọn nhầm route băng qua vùng ngập bị chặn.
              options.avoidFlood ? combinedFloodZones : [],
              options.avoidFlood ? combinedConfirmedIds : [],
            );
            selectedRoute = result.selectedRoute;
            if (result.alertMsg) {
              alertMsg = alertMsg
                ? `${alertMsg}\n${result.alertMsg}`
                : result.alertMsg;
            }
          }

          if (activeEventRoadsRef.current.length > 0 && selectedRoute) {
            const currentEventRoads = activeEventRoadsRef.current;
            const originalBlockedRoads = getBlockedRoadsForRoute(
              selectedRoute.geometry.coordinates,
              currentEventRoads,
              origin,
              destination,
            );

            if (originalBlockedRoads.length > 0) {
              const currentMode = avoidEventRoadsModeRef.current;
              if (currentMode === null) {
                if (onCrossedRestrictedRoadRef.current) {
                  setLoadingRoute(false);
                  onCrossedRestrictedRoadRef.current(
                    originalBlockedRoads,
                    () => setAvoidEventRoadsMode("avoid"),
                    () => {
                      setDestination(null);
                      setDestinationQuery("");
                      setRouteData(null);
                      setAvoidEventRoadsMode(null);
                      setLoadingRoute(false);
                    },
                  );
                  return;
                }
              } else if (currentMode === "avoid") {
                const result = await findSafeEventRoute(
                  [
                    selectedRoute,
                    ...data.routes.filter((r: any) => r !== selectedRoute),
                  ],
                  currentEventRoads,
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
            }
          }

          setRouteAlertMessage(alertMsg);

          if (selectedRoute) {
            // Parse all routes
            const allRoutesParsed: RouteInfo[] = data.routes.map(
              (r: any, idx: number) => ({
                id: idx,
                totalDistanceKm: parseFloat((r.distance / 1000).toFixed(2)),
                totalTimeMin: Math.round(r.duration / 60),
                coordinates: r.geometry.coordinates,
                steps:
                  (r.legs || []).flatMap((leg: any) =>
                    (leg.steps || []).map((s: any) => ({
                      maneuver: {
                        type: s.maneuver?.type || "",
                        modifier: s.maneuver?.modifier || "",
                        instruction: s.maneuver?.instruction || "",
                        location: s.maneuver?.location || [0, 0],
                      },
                      name: s.name || "",
                      distance: s.distance || 0,
                      duration: s.duration || 0,
                    })),
                  ) || [],
              }),
            );

            const activeIndex = data.routes.findIndex(
              (r: any) =>
                JSON.stringify(r.geometry.coordinates) ===
                JSON.stringify(selectedRoute.geometry.coordinates),
            );
            setSelectedRouteIndex(activeIndex >= 0 ? activeIndex : 0);

            setRouteData({
              totalDistanceKm: parseFloat(
                (selectedRoute.distance / 1000).toFixed(2),
              ),
              totalTimeMin: Math.round(selectedRoute.duration / 60),
              coordinates: selectedRoute.geometry.coordinates,
              steps:
                (selectedRoute.legs || []).flatMap((leg: any) =>
                  (leg.steps || []).map((s: any) => ({
                    maneuver: {
                      type: s.maneuver?.type || "",
                      modifier: s.maneuver?.modifier || "",
                      instruction: s.maneuver?.instruction || "",
                      location: s.maneuver?.location || [0, 0],
                    },
                    name: s.name || "",
                    distance: s.distance || 0,
                    duration: s.duration || 0,
                  })),
                ) || [],
              routes: allRoutesParsed,
            });

            // Căn chỉnh camera hiển thị đầy đủ tuyến đường đi
            const coords = selectedRoute.geometry.coordinates;
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
    waypoints,
    travelMode,
    options.avoidFlood,
    options.avoidCongestion,
    options.confirmedFloodZoneIds,
    options.floodZones,
    options.trafficAlerts,
    options.isOffline,
    options.isLowBandwidth,
    avoidEventRoadsMode,
    mapRef,
  ]);

  const applyRouteToState = (route: any) => {
    if (!route) return;
    const parsed = parseRouteData(route.route_data);
    const coords = route.geometry?.coordinates || parsed.coordinates;
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

    // Restore waypoints if loaded
    if (parsed.waypoints && parsed.waypoints.length > 0) {
      setWaypoints(parsed.waypoints);
      setWaypointQueries(parsed.waypoints.map((w: any) => w.label || ""));
    }
  };

  const selectRoute = (index: number) => {
    if (!routeData?.routes || !routeData.routes[index]) return;
    const targetRoute = routeData.routes[index];
    setSelectedRouteIndex(index);
    setRouteData({
      ...routeData,
      totalDistanceKm: targetRoute.totalDistanceKm,
      totalTimeMin: targetRoute.totalTimeMin,
      coordinates: targetRoute.coordinates,
      steps: targetRoute.steps,
    });
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
    setSelectedRouteIndex,
    selectRoute,
  };
}
