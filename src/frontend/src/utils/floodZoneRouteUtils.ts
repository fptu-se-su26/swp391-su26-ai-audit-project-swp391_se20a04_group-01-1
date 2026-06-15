// NEW CODE: Flood zone route avoidance feature - Tiện ích kiểm tra định tuyến né tránh vùng ngập

export interface FloodZone {
  id: string;
  zone_id?: number;
  name: string;
  district?: string;
  risk_level?: string;
  center: [number, number];
  radius: number;
  depthCm: number;
  level: 'low' | 'medium' | 'high';
  color?: string;
  depthValue?: number;
  depthLevel?: 'low' | 'medium' | 'high';
  description?: string;
  typical_flood_months?: string;
  bypassPosition?: [number, number] | [number, number][];
  bypassOptions?: [number, number][][];
}
// NEW CODE: Flood depth threshold - Ngưỡng độ sâu ngập chặn đường (cm)
export const FLOOD_BLOCK_THRESHOLD_CM = 10;

// NEW CODE: Flood zone route avoidance - Hàm chuẩn hóa định dạng tọa độ về [lng, lat] để tránh sai lệch
export function getLngLat(coords: [number, number]): [number, number] {
  if (!coords) return [0, 0];
  // Ở Đà Nẵng: lng khoảng 108.2, lat khoảng 16.0
  if (coords[0] < coords[1]) {
    // Nếu phần tử 1 nhỏ hơn phần tử 2, nghĩa là định dạng là [lat, lng]. Ta hoán đổi thành [lng, lat]
    return [coords[1], coords[0]];
  }
  return coords;
}

// Tính khoảng cách giữa hai tọa độ địa lý (kinh độ, vĩ độ) bằng công thức Haversine (mét)
export function getDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000; // Bán kính Trái Đất tính bằng mét
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// FIX: Avoid flooded zones when calculating route - Tính khoảng cách ngắn nhất từ điểm P (tâm vùng ngập) đến đoạn thẳng AB (phần tử tuyến đường Mapbox)
export function getDistanceToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const latFactor = 111111; // 1 độ vĩ độ ~ 111.111 mét
  const lngFactor = 111111 * Math.cos((ay * Math.PI) / 180); // Quy đổi kinh độ theo vĩ độ tương ứng

  const pxM = px * lngFactor;
  const pyM = py * latFactor;
  const axM = ax * lngFactor;
  const ayM = ay * latFactor;
  const bxM = bx * lngFactor;
  const byM = by * latFactor;

  const dx = bxM - axM;
  const dy = byM - ayM;

  if (dx === 0 && dy === 0) {
    const diffX = pxM - axM;
    const diffY = pyM - ayM;
    return Math.sqrt(diffX * diffX + diffY * diffY);
  }

  // Tính tỷ lệ hình chiếu t của điểm P trên đoạn thẳng AB
  let t = ((pxM - axM) * dx + (pyM - ayM) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t)); // Giới hạn hình chiếu nằm trong đoạn AB

  // Tọa độ điểm gần nhất trên đoạn AB
  const closestX = axM + t * dx;
  const closestY = ayM + t * dy;

  const diffX = pxM - closestX;
  const diffY = pyM - closestY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

// NEW CODE: Flood zone route avoidance - Kiểm tra xem một điểm bất kỳ có nằm trong vùng ngập hay không
export function isPointInsideFloodZone(point: [number, number], zone: FloodZone): boolean {
  const normalizedPoint = getLngLat(point);
  const zoneCenter = getLngLat(zone.center);
  const dist = getDistance(normalizedPoint[0], normalizedPoint[1], zoneCenter[0], zoneCenter[1]);
  return dist <= zone.radius;
}

// NEW CODE: Flood zone route avoidance - Kiểm tra xem một đoạn đi có cắt qua polygon của vùng ngập không
export function isRouteIntersectFloodPolygon(routeCoords: [number, number][], zone: FloodZone): boolean {
  // Kiểm tra phân đoạn đường đi cắt qua vòng tròn
  return isRouteIntersectFloodZone(routeCoords, zone, null, null);
}

// NEW CODE: Flood zone route avoidance - Kiểm tra giao cắt giữa tuyến đường đi và một vùng ngập
export function isRouteIntersectFloodZone(
  routeCoords: [number, number][],
  zone: FloodZone,
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null
): boolean {
  if (!routeCoords || routeCoords.length < 2) {
    return false;
  }

  const zoneCenter = getLngLat(zone.center);

  // Cho phép bỏ qua vùng ngập ngay tại điểm xuất phát để người dùng có thể thoát ra khỏi vùng ngập
  if (originCoords) {
    const distToStart = getDistance(
      zoneCenter[0],
      zoneCenter[1],
      originCoords.lng,
      originCoords.lat
    );

    if (distToStart < zone.radius + 30) {
      return false;
    }
  }

  // Không tự động bỏ qua vùng ngập gần điểm đến ở đây.
  // Vùng nào được phép đi vào sẽ được loại trừ bằng confirmedFloodZoneIds trong getBlockedFloodZones().
  // Như vậy nếu trên đường còn vùng ngập >10cm khác chưa xác nhận, hệ thống vẫn phải né.

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const p1 = getLngLat(routeCoords[i]);
    const p2 = getLngLat(routeCoords[i + 1]);

    const dist = getDistanceToSegment(
      zoneCenter[0],
      zoneCenter[1],
      p1[0],
      p1[1],
      p2[0],
      p2[1]
    );

    if (dist < zone.radius) {
      return true;
    }
  }

  return false;
}

// NEW CODE: Flood zone route avoidance - Kiểm tra toàn bộ route xem có đi xuyên qua bất kỳ vùng ngập nào trong danh sách không
export function isRouteCrossFloodZone(
  routeCoordinates: [number, number][],
  floodZonesList: FloodZone[],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null
): boolean {
  if (!routeCoordinates || routeCoordinates.length < 2 || !floodZonesList || floodZonesList.length === 0) {
    return false;
  }
  return floodZonesList.some(zone => isRouteIntersectFloodZone(routeCoordinates, zone, originCoords, destCoords));
}

// NEW CODE: Lấy danh sách tất cả các vùng ngập mà tuyến đường đi qua
export function getBlockedZonesForRoute(
  routeCoords: [number, number][],
  floodZonesList: FloodZone[],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null
): FloodZone[] {
  if (!routeCoords || routeCoords.length < 2 || !floodZonesList || floodZonesList.length === 0) {
    return [];
  }
  return floodZonesList.filter(zone => isRouteIntersectFloodZone(routeCoords, zone, originCoords, destCoords));
}

// NEW CODE: Flood depth rule - Kiểm tra vùng ngập có bị cấm không (độ sâu > 10cm)
export function isBlockedFloodZone(zone: FloodZone): boolean {
  return zone.depthCm > FLOOD_BLOCK_THRESHOLD_CM;
}

// NEW CODE: Flood zone selection confirmation - Tìm vùng ngập chứa điểm tọa độ cho trước (nếu có)
export function findFloodZoneContainingPoint(point: [number, number], floodZonesList: FloodZone[]): FloodZone | undefined {
  return floodZonesList.find(zone => isPointInsideFloodZone(point, zone));
}

// NEW CODE: Flood zone selection confirmation - Kiểm tra xem một điểm có nằm trong vùng ngập bị cấm (> 10cm) hay không
export function isPointInsideBlockedFloodZone(point: [number, number], floodZonesList: FloodZone[]): boolean {
  const zone = findFloodZoneContainingPoint(point, floodZonesList);
  return zone ? isBlockedFloodZone(zone) : false;
}

// NEW CODE: Flood zone confirmation and route avoidance - Lấy danh sách vùng ngập bị cấm và loại trừ các vùng đã được xác nhận
export function getBlockedFloodZones(
  floodZonesList: FloodZone[],
  confirmedFloodZoneIds: string[] = []
): FloodZone[] {
  return floodZonesList.filter((zone) => {
    const zoneId = String(zone.id);
    const zoneDbId = zone.zone_id !== undefined ? String(zone.zone_id) : '';

    const isConfirmed =
      confirmedFloodZoneIds.includes(zoneId) ||
      confirmedFloodZoneIds.includes(zoneDbId);

    return isBlockedFloodZone(zone) && !isConfirmed;
  });
}

// NEW CODE: Flood zone confirmation and route avoidance - Kiểm tra route có đi qua vùng ngập bị chặn (không bao gồm vùng đã xác nhận)
export function isRouteCrossBlockedFloodZone(
  routeCoordinates: [number, number][],
  floodZonesList: FloodZone[],
  confirmedFloodZoneIds: string[] = [],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null
): boolean {
  const blockedZones = getBlockedFloodZones(floodZonesList, confirmedFloodZoneIds);
  return isRouteCrossFloodZone(routeCoordinates, blockedZones, originCoords, destCoords);
}

// NEW CODE: Flood warning for shallow zones - Lấy danh sách vùng ngập nông (<= 10cm) mà tuyến đường đi qua
export function getShallowFloodZonesOnRoute(routeCoords: [number, number][], floodZonesList: FloodZone[]): FloodZone[] {
  return floodZonesList.filter(
    zone => zone.depthCm <= FLOOD_BLOCK_THRESHOLD_CM && isRouteIntersectFloodPolygon(routeCoords, zone)
  );
}

// NEW CODE: Shortest safe flood route - Tính tổng quãng đường của tuyến đường (bằng mét)
export function getRouteDistance(route: any): number {
  if (!route) return 0;
  if (typeof route.distance === 'number') {
    return route.distance;
  }
  const coords = route.geometry?.coordinates || route.coordinates || [];
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = getLngLat(coords[i]);
    const p2 = getLngLat(coords[i + 1]);
    dist += getDistance(p1[0], p1[1], p2[0], p2[1]);
  }
  return dist;
}

export function getBypassPointsAroundZone(
  zone: FloodZone,
  marginMeters = 180
): [number, number][] {
  const center = getLngLat(zone.center);
  const radius = zone.radius + marginMeters;

  const lng = center[0];
  const lat = center[1];

  const latOffset = radius / 111111;
  const lngOffset = radius / (111111 * Math.cos((lat * Math.PI) / 180));

  return [
    [lng + lngOffset, lat], // Đông
    [lng - lngOffset, lat], // Tây
    [lng, lat + latOffset], // Bắc
    [lng, lat - latOffset], // Nam
    [lng + lngOffset, lat + latOffset], // Đông Bắc
    [lng - lngOffset, lat + latOffset], // Tây Bắc
    [lng + lngOffset, lat - latOffset], // Đông Nam
    [lng - lngOffset, lat - latOffset]  // Tây Nam
  ];
}
// NEW CODE: Shortest safe flood route - Lọc ra các tuyến đường an toàn (hợp lệ) theo luật ngập lụt
export function getSafeRoutes(
  routes: any[],
  floodZonesList: FloodZone[],
  confirmedFloodZoneIds: string[] = [],
  origin?: { lng: number; lat: number } | null,
  destination?: { lng: number; lat: number } | null
): any[] {
  if (!routes || routes.length === 0) return [];
  const blockedFloodZones = getBlockedFloodZones(floodZonesList, confirmedFloodZoneIds);
  
  return routes.filter(route => {
    const coords = route.geometry?.coordinates || route.coordinates || [];
    const crossed = getBlockedZonesForRoute(coords, blockedFloodZones, origin, destination);
    return crossed.length === 0;
  });
}

// NEW CODE: Shortest safe flood route - Tìm tuyến đường an toàn ngắn nhất
export function findShortestSafeRoute(
  routes: any[],
  floodZonesList: FloodZone[],
  confirmedFloodZoneIds: string[] = [],
  origin?: { lng: number; lat: number } | null,
  destination?: { lng: number; lat: number } | null
): any | null {
  const safeRoutes = getSafeRoutes(routes, floodZonesList, confirmedFloodZoneIds, origin, destination);
  if (safeRoutes.length === 0) return null;
  
  return safeRoutes.reduce((shortest, current) => {
    return getRouteDistance(current) < getRouteDistance(shortest) ? current : shortest;
  });
}

// NEW CODE: Flood zone confirmation and route avoidance - Thuật toán chỉ đường tránh vùng ngập sâu trên 10cm, loại trừ vùng đã xác nhận
// FIX: Only allow confirmed flood zone, avoid other zones deeper than 10cm
export async function findSafeRoute(
  initialRoutes: any[],
  floodZonesList: FloodZone[],
  origin: { lng: number; lat: number; label: string },
  destination: { lng: number; lat: number; label: string },
  travelMode: 'driving' | 'walking' | 'cycling',
  mapboxToken: string,
  confirmedFloodZoneIds: string[] = []
): Promise<{
  selectedRoute: any;
  alertMsg: string | null;
}> {
  let selectedRoute: any = null;
  let alertMsg: string | null = null;
  let foundSafeRoute = false;

  interface CandidateRoute {
    route: any;
    crossedCount: number;
    crossed: FloodZone[];
    name: string;
  }

  const candidates: CandidateRoute[] = [];

  // Lọc chỉ các vùng ngập bị cấm thực sự (sâu > 10cm và CHƯA được xác nhận)
  const blockedFloodZones = getBlockedFloodZones(floodZonesList, confirmedFloodZoneIds);

  // 1. Đánh giá các tuyến đường gốc trả về từ Mapbox dựa trên danh sách vùng ngập bị chặn thực sự
  const originalBlockedList = getBlockedZonesForRoute(initialRoutes[0].geometry.coordinates, blockedFloodZones, origin, destination);

  for (let i = 0; i < initialRoutes.length; i++) {
    const r = initialRoutes[i];
    const crossed = getBlockedZonesForRoute(r.geometry.coordinates, blockedFloodZones, origin, destination);
    candidates.push({
      route: r,
      crossedCount: crossed.length,
      crossed: crossed,
      name: `Tuyến đường mặc định ${i + 1}`
    });
    if (crossed.length === 0) {
      foundSafeRoute = true;
    }
  }

  // 2. Nếu tất cả tuyến đường gốc đều đi qua vùng ngập > 10cm bị chặn, tìm các tuyến đường tránh (detour)
  if (!foundSafeRoute && originalBlockedList.length > 0) {
    const waypointSets: { name: string; waypoints: [number, number][]; optIdx: number }[] = [];

    // Tạo các điểm né gần quanh từng vùng ngập bị chặn.
// Cách này giúp tìm đường ngắn hơn thay vì ép đi xa qua các cầu lớn.
for (const zone of originalBlockedList) {
  const bypassPoints = getBypassPointsAroundZone(zone, 180);

  for (let i = 0; i < bypassPoints.length; i++) {
    waypointSets.push({
      name: `Bypass gần quanh ${zone.name} - điểm ${i + 1}`,
      waypoints: [bypassPoints[i]],
      optIdx: i
    });
  }
}

// Nếu có nhiều vùng ngập bị chặn, thử tổ hợp 2 waypoint gần nhất:
// mỗi vùng lấy 4 hướng chính trước để giảm số request.
if (originalBlockedList.length > 1) {
  const mainBypassOptions = originalBlockedList.map((zone) =>
    getBypassPointsAroundZone(zone, 180).slice(0, 4)
  );

  for (const p1 of mainBypassOptions[0]) {
    for (const p2 of mainBypassOptions[1] || []) {
      waypointSets.push({
        name: `Bypass kết hợp 2 vùng ngập`,
        waypoints: [p1, p2],
        optIdx: 100
      });
    }
  }
}

    // Gửi yêu cầu truy vấn API Mapbox Directions cho mỗi bộ waypoint tránh ngập
    for (const set of waypointSets) {
      if (set.waypoints.length === 0) continue;

      // Loại bỏ trùng lặp waypoint
      const uniqueWaypoints: [number, number][] = [];
      const seen = new Set<string>();
      for (const pt of set.waypoints) {
        const key = `${pt[0].toFixed(5)},${pt[1].toFixed(5)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueWaypoints.push(pt);
        }
      }

      // Sắp xếp các waypoint theo khoảng cách tăng dần từ điểm bắt đầu để tránh di chuyển zig-zag
      uniqueWaypoints.sort((a, b) => {
  const scoreA =
    getDistance(origin.lng, origin.lat, a[0], a[1]) +
    getDistance(a[0], a[1], destination.lng, destination.lat);

  const scoreB =
    getDistance(origin.lng, origin.lat, b[0], b[1]) +
    getDistance(b[0], b[1], destination.lng, destination.lat);

  return scoreA - scoreB;
});

      const waypointsStr = uniqueWaypoints.map(coord => `${coord[0]},${coord[1]}`).join(';');
      console.log(`[FloodAvoidance] Đang tính toán đường vòng: ${set.name} qua: ${waypointsStr}`);

      try {
        const detourResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${waypointsStr};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxToken}`
        );
        const detourData = await detourResponse.json();
        if (detourResponse.ok && detourData.routes && detourData.routes.length > 0) {
          for (let i = 0; i < detourData.routes.length; i++) {
            const detourRoute = detourData.routes[i];
            const crossed = getBlockedZonesForRoute(detourRoute.geometry.coordinates, blockedFloodZones, origin, destination);

            candidates.push({
              route: detourRoute,
              crossedCount: crossed.length,
              crossed: crossed,
              name: `${set.name} (Lộ trình ${i + 1})`
            });
          }
        }
      } catch (detourErr) {
        console.error(`Lỗi khi tìm đường vòng tránh ngập (${set.name}):`, detourErr);
      }
    }
  }

  // FIX: Select shortest route among safe alternatives
  // 1. Lọc ra các tuyến đường hoàn toàn an toàn (crossedCount === 0)
  const safeCandidates = candidates.filter(c => c.crossedCount === 0);

  if (safeCandidates.length > 0) {
    // 2. Chọn tuyến an toàn có tổng chiều dài (distance) nhỏ nhất
    const bestCandidate = safeCandidates.reduce((shortest, current) => {
      return getRouteDistance(current.route) < getRouteDistance(shortest.route) ? current : shortest;
    });
    selectedRoute = bestCandidate.route;

    if (originalBlockedList.length > 0) {
      alertMsg = "Tuyến đường ban đầu đi qua vùng ngập sâu hơn 10cm. Hệ thống đã gợi ý tuyến đường an toàn hơn.";
    } else {
      alertMsg = null;
    }
  } else {
    // 3. Không có tuyến đường an toàn nào -> Trả về null và không tự động chọn tuyến bị chặn
    selectedRoute = null;
    alertMsg = "Không tìm thấy tuyến đường an toàn để né vùng ngập sâu hơn 10cm.";
  }

  // DEBUG: Flood routing
  console.log("--- DEBUG: Flood Routing ---");
  console.log("Total candidate routes fetched:", candidates.length);
  candidates.forEach((cand, idx) => {
    const isSafe = cand.crossedCount === 0;
    console.log(`Route ${idx + 1} (${cand.name}): distance = ${getRouteDistance(cand.route)}m, safe = ${isSafe}`);
    if (!isSafe) {
      console.log(`-> Route ${idx + 1} is BLOCKED by zones:`, cand.crossed.map(z => `${z.name} (${z.depthCm}cm)`).join(', '));
    } else {
      console.log(`-> Route ${idx + 1} is SAFE`);
    }
  });
  if (selectedRoute) {
    console.log("Selected shortest safe route distance:", getRouteDistance(selectedRoute), "meters");
  } else {
    console.log("No safe route selected (all options are blocked).");
  }
  console.log("----------------------------");

  // NEW CODE: Flood warning for shallow zones - Bổ sung cảnh báo khi tuyến đường đi qua các vùng ngập nhẹ <= 10cm
  if (selectedRoute) {
    const shallowZonesOnRoute = getShallowFloodZonesOnRoute(selectedRoute.geometry.coordinates, floodZonesList);
    if (shallowZonesOnRoute.length > 0) {
      let warningMsg = "";
      if (shallowZonesOnRoute.length === 1) {
        const zone = shallowZonesOnRoute[0];
        warningMsg = `Lưu ý: Tuyến đường có đi qua vùng ngập nhẹ khoảng ${zone.depthCm}cm tại ${zone.name}, vẫn có thể di chuyển.`;
      } else {
        const depths = shallowZonesOnRoute.map(z => z.depthCm);
        const minDepth = Math.min(...depths);
        const maxDepth = Math.max(...depths);
        warningMsg = `Lưu ý: Tuyến đường có đi qua ${shallowZonesOnRoute.length} vùng ngập nhẹ từ ${minDepth}cm đến ${maxDepth}cm, vẫn có thể di chuyển.`;
      }
      
      if (alertMsg) {
        alertMsg = `${alertMsg}\n${warningMsg}`;
      } else {
        alertMsg = warningMsg;
      }
    }
  }

  return { selectedRoute, alertMsg };
}
