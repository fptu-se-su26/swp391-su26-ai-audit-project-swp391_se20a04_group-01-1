import {
  getDistanceToSegment,
  getLngLat,
  getBlockedFloodZones,
  getBlockedZonesForRoute,
  FloodZone,
} from "./floodZoneRouteUtils";

export interface TrafficAlert {
  id: number;
  alert_id?: number;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

// Check if a route intersects with a traffic alert (point) within a specific buffer radius (in meters)
export function isRouteIntersectTrafficAlert(
  routeCoords: [number, number][],
  alert: TrafficAlert,
  radiusMeters = 150,
): boolean {
  if (!routeCoords || routeCoords.length < 2) {
    return false;
  }

  const alertLng = alert.longitude;
  const alertLat = alert.latitude;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const p1 = getLngLat(routeCoords[i]);
    const p2 = getLngLat(routeCoords[i + 1]);

    const dist = getDistanceToSegment(
      alertLng,
      alertLat,
      p1[0],
      p1[1],
      p2[0],
      p2[1],
    );

    if (dist < radiusMeters) {
      return true;
    }
  }

  return false;
}

// Get all traffic congestion alerts that block a route
export function getBlockedTrafficAlertsForRoute(
  routeCoords: [number, number][],
  trafficAlertsList: TrafficAlert[],
  radiusMeters = 150,
): TrafficAlert[] {
  if (
    !routeCoords ||
    routeCoords.length < 2 ||
    !trafficAlertsList ||
    trafficAlertsList.length === 0
  ) {
    return [];
  }
  return trafficAlertsList.filter(
    (alert) =>
      alert.is_active &&
      alert.type === "CONGESTION" &&
      (alert.severity === "HIGH" || alert.severity === "MEDIUM") &&
      isRouteIntersectTrafficAlert(routeCoords, alert, radiusMeters),
  );
}

// Find a safe route avoiding congestion points
export async function findSafeTrafficRoute(
  initialRoutes: any[],
  trafficAlertsList: TrafficAlert[],
  origin: { lng: number; lat: number; label: string },
  destination: { lng: number; lat: number; label: string },
  travelMode: "driving" | "walking" | "cycling",
  mapboxToken: string,
  radiusMeters = 150,
  // NEW: cho phép bước tránh kẹt xe biết về vùng ngập lụt đang được né,
  // để không chọn nhầm một route "hết kẹt xe" nhưng lại đâm vào vùng ngập.
  floodZonesList: FloodZone[] = [],
  confirmedFloodZoneIds: string[] = [],
): Promise<{
  selectedRoute: any;
  alertMsg: string | null;
}> {
  if (!initialRoutes || initialRoutes.length === 0) {
    return { selectedRoute: null, alertMsg: null };
  }

  const blockedFloodZones = getBlockedFloodZones(
    floodZonesList,
    confirmedFloodZoneIds,
  );
  const isFloodSafe = (route: any): boolean => {
    if (blockedFloodZones.length === 0) return true; // avoidFlood đang tắt hoặc không có vùng ngập nào phải né
    return (
      getBlockedZonesForRoute(
        route.geometry.coordinates,
        blockedFloodZones,
        origin,
        destination,
      ).length === 0
    );
  };

  // Filter active congestion alerts (Severity HIGH or MEDIUM)
  const activeCongestions = trafficAlertsList.filter(
    (alert) =>
      alert.is_active &&
      alert.type === "CONGESTION" &&
      (alert.severity === "HIGH" || alert.severity === "MEDIUM"),
  );

  if (activeCongestions.length === 0) {
    // Không có kẹt xe cần né -> vẫn phải đảm bảo route đầu tiên còn an toàn với ngập lụt.
    // Nếu route[0] (vốn là selectedRoute từ bước tránh ngập) không an toàn ngập vì lý do nào đó,
    // ưu tiên tìm route khác trong danh sách đầu vào vẫn thỏa an toàn ngập.
    if (isFloodSafe(initialRoutes[0])) {
      return { selectedRoute: initialRoutes[0], alertMsg: null };
    }
    const floodSafeFallback = initialRoutes.find(isFloodSafe);
    return {
      selectedRoute: floodSafeFallback || initialRoutes[0],
      alertMsg: null,
    };
  }

  // Find if any of the initial Mapbox routes are safe (do not cross congestion AND do not cross blocked flood zones)
  for (const r of initialRoutes) {
    const blocked = getBlockedTrafficAlertsForRoute(
      r.geometry.coordinates,
      activeCongestions,
      radiusMeters,
    );
    if (blocked.length === 0 && isFloodSafe(r)) {
      return { selectedRoute: r, alertMsg: null };
    }
  }

  // If all routes are blocked, we'll try to find a detour around the first route's blockages.
  // Generate bypass waypoints around congestion points.
  const firstRouteBlocked = getBlockedTrafficAlertsForRoute(
    initialRoutes[0].geometry.coordinates,
    activeCongestions,
    radiusMeters,
  );

  const candidates: any[] = [...initialRoutes];

  // For each blocked point, we add a set of detour options (North, South, East, West coordinates at 200m offset)
  for (const alert of firstRouteBlocked) {
    const latOffset = 0.002; // ~220m
    const lngOffset = 0.002 / Math.cos((alert.latitude * Math.PI) / 180);

    const bypassPoints: [number, number][] = [
      [alert.longitude + lngOffset, alert.latitude],
      [alert.longitude - lngOffset, alert.latitude],
      [alert.longitude, alert.latitude + latOffset],
      [alert.longitude, alert.latitude - latOffset],
    ];

    for (const pt of bypassPoints) {
      try {
        const detourResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${pt[0]},${pt[1]};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxToken}`,
        );
        const detourData = await detourResponse.json();
        if (
          detourResponse.ok &&
          detourData.routes &&
          detourData.routes.length > 0
        ) {
          candidates.push(...detourData.routes);
        }
      } catch (err) {
        console.error("Error fetching traffic detour route:", err);
      }
    }
  }

  // Select the shortest route that is free of congestion AND free of blocked flood zones
  const safeRoutes = candidates.filter((r) => {
    const blocked = getBlockedTrafficAlertsForRoute(
      r.geometry.coordinates,
      activeCongestions,
      radiusMeters,
    );
    return blocked.length === 0 && isFloodSafe(r);
  });

  if (safeRoutes.length > 0) {
    // Return shortest safe route
    const bestRoute = safeRoutes.reduce((shortest, current) => {
      const distShortest = shortest.distance || 0;
      const distCurrent = current.distance || 0;
      return distCurrent < distShortest ? current : shortest;
    });

    return {
      selectedRoute: bestRoute,
      alertMsg:
        "Tuyến đường ban đầu đi qua khu vực kẹt xe. Hệ thống đã gợi ý tuyến đường tránh ùn tắc.",
    };
  }

  // Không tìm được route vừa tránh kẹt xe vừa tránh ngập.
  // Ưu tiên KHÔNG bao giờ rơi vào vùng ngập bị chặn (>10cm): nếu initialRoutes[0] (route đã
  // được xác nhận an toàn ngập từ bước trước) vẫn an toàn ngập, giữ nguyên nó và chỉ cảnh báo kẹt xe.
  if (isFloodSafe(initialRoutes[0])) {
    return {
      selectedRoute: initialRoutes[0],
      alertMsg:
        "Lưu ý: Tất cả các tuyến đường khả dụng đều đi qua khu vực ùn tắc giao thông.",
    };
  }

  // Trường hợp hiếm: ngay cả route mặc định cũng không an toàn ngập -> thử tìm bất kỳ candidate nào an toàn ngập
  const floodSafeAnyCandidate = candidates.find(isFloodSafe);
  if (floodSafeAnyCandidate) {
    return {
      selectedRoute: floodSafeAnyCandidate,
      alertMsg:
        "Lưu ý: Không tìm được tuyến vừa tránh ngập vừa tránh kẹt xe. Hệ thống ưu tiên tránh vùng ngập lụt.",
    };
  }

  return {
    selectedRoute: initialRoutes[0],
    alertMsg:
      "Lưu ý: Tất cả các tuyến đường khả dụng đều đi qua khu vực ùn tắc giao thông.",
  };
}
