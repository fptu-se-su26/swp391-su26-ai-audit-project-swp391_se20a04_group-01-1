import { useState, useEffect, useRef } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import { EventRoad } from '../../../services/eventRoadService';
import { findSafeRoute as findSafeRouteZone } from '../../../utils/floodZoneRouteUtils';
import { findSafeTrafficRoute } from '../../../utils/trafficRouteUtils';
import { findSafeEventRoute } from '../../../utils/eventRouteUtils';
import { showPremiumToast } from '../../../utils/toastUtils';
import { decodePolyline } from '../../../utils/polylineHelper';

export interface RouteStep {
  maneuver: {
    type: string;
    modifier?: string;
    instruction?: string;
  };
  name: string;
  distance: number; // meters
  duration: number; // seconds
}

export interface RouteData {
  totalDistanceKm: number;
  totalTimeMin: number;
  coordinates: [number, number][];
  steps?: RouteStep[];
}

export interface LocationPoint {
  lng: number;
  lat: number;
  label: string;
  poi_id?: number;
  event_id?: number;
}

// Hàm tính khoảng cách đường chim bay khẩn cấp khi ngoại tuyến
function getHaversineDistance(coords1: {lat: number, lng: number}, coords2: {lat: number, lng: number}) {
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
  },
) {
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

        // 1. XỬ LÝ NGOẠI TUYẾN (OFFLINE FALLBACK)
        if (options.isOffline) {
          const distKm = getHaversineDistance(origin, destination);
          const speed = travelMode === 'walking' ? 5 : travelMode === 'cycling' ? 15 : 30; // km/h
          const durationMin = Math.round((distKm / speed) * 60);

          setRouteAlertMessage("⚠️ Chế độ Ngoại tuyến: Đang hiển thị hướng đường chim bay khẩn cấp tới đích.");
          setRouteData({
            totalDistanceKm: parseFloat(distKm.toFixed(2)),
            totalTimeMin: Math.max(1, durationMin),
            coordinates: [
              [origin.lng, origin.lat],
              [destination.lng, destination.lat]
            ]
          });

          // Fit camera
          mapRef.current?.fitBounds(
            [[origin.lng, origin.lat], [destination.lng, destination.lat]],
            { padding: 80, duration: 1200 }
          );
          setLoadingRoute(false);
          return;
        }

        // 2. XỬ LÝ TIẾT KIỆM BĂNG THÔNG QUA BACKEND PROXY (LOW BANDWIDTH)
        if (options.isLowBandwidth) {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
          const response = await fetch(
            `${apiUrl}/api/routes/calculate?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&mode=${travelMode}&access_token=${mapboxToken}`
          );
          const data = await response.json();

          if (response.ok && data.success && data.polyline) {
            const coords = decodePolyline(data.polyline);
            setRouteAlertMessage("⚡ Tiết kiệm băng thông: Tuyến đường đã được nén tối ưu truyền tải.");
            setRouteData({
              totalDistanceKm: parseFloat((data.distance / 1000).toFixed(2)),
              totalTimeMin: Math.round(data.duration / 60),
              coordinates: coords
            });

            if (coords.length > 0) {
              let minLng = coords[0][0], maxLng = coords[0][0];
              let minLat = coords[0][1], maxLat = coords[0][1];
              for (const c of coords) {
                if (c[0] < minLng) minLng = c[0];
                if (c[0] > maxLng) maxLng = c[0];
                if (c[1] < minLat) minLat = c[1];
                if (c[1] > maxLat) maxLat = c[1];
              }
              mapRef.current?.fitBounds(
                [[minLng, minLat], [maxLng, maxLat]],
                { padding: 80, duration: 1200 }
              );
            }
            setLoadingRoute(false);
            return;
          }
        }

        // 3. XỬ LÝ TRỰC TUYẾN BÌNH THƯỜNG
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&steps=true&language=vi&access_token=${mapboxToken}`,
        );
        const data = await response.json();

        if (response.ok && data.routes && data.routes.length > 0) {
          let selectedRoute = data.routes[0];
          let alertMsg: string | null = null;

          if (options.avoidFlood) {
            // Trích xuất các cảnh báo ngập lụt động từ danh sách TrafficAlerts
            const weatherFloodZones = (options.trafficAlerts || [])
              .filter((alert: any) =>
                alert.is_active &&
                (alert.type === 'FLOOD' || alert.type === 'WEATHER')
              )
              .map((alert: any) => ({
                id: `temp-weather-${alert.id}`,
                zone_id: alert.id,
                name: alert.title,
                district: alert.location || 'Đà Nẵng',
                center: [alert.longitude, alert.latitude] as [number, number],
                radius: 800, // Bán kính ảnh hưởng ngập lụt dự báo (~800m)
                depthCm: 30, // Độ sâu ngập giả định (> 10cm để thuật toán né tránh)
                level: 'high' as const,
                description: alert.description
              }));

            const combinedFloodZones = [
              ...options.floodZones,
              ...weatherFloodZones
            ];

            const combinedConfirmedIds = [
              ...options.confirmedFloodZoneIds,
              ...weatherFloodZones.map(w => w.id)
            ];

            const result = await findSafeRouteZone(
              data.routes,
              combinedFloodZones,
              origin,
              destination,
              travelMode,
              mapboxToken,
              combinedConfirmedIds
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
                ...data.routes.filter((r: any) => r !== selectedRoute),
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
              steps: selectedRoute.legs?.[0]?.steps?.map((s: any) => ({
                maneuver: {
                  type: s.maneuver?.type || '',
                  modifier: s.maneuver?.modifier || '',
                  instruction: s.maneuver?.instruction || '',
                },
                name: s.name || '',
                distance: s.distance || 0,
                duration: s.duration || 0,
              })) || [],
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
