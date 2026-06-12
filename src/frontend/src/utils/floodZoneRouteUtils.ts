// NEW CODE: Flood zone route avoidance feature - Tiện ích kiểm tra định tuyến né tránh vùng ngập
import { FloodZone, getCirclePolygon } from '../data/floodZones';

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

  // Bỏ qua vùng ngập này nếu điểm xuất phát hoặc điểm kết thúc nằm quá gần hoặc bên trong vùng ngập.
  // Điều này đảm bảo người dùng không bị kẹt khi đi từ một điểm nằm ngay trong vùng ngập.
  if (originCoords) {
    const distToStart = getDistance(zoneCenter[0], zoneCenter[1], originCoords.lng, originCoords.lat);
    if (distToStart < zone.radius + 30) {
      return false;
    }
  }
  if (destCoords) {
    const distToEnd = getDistance(zoneCenter[0], zoneCenter[1], destCoords.lng, destCoords.lat);
    if (distToEnd < zone.radius + 30) {
      return false;
    }
  }

  // Duyệt qua từng phân đoạn của tuyến đường
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const p1 = routeCoords[i];
    const p2 = routeCoords[i + 1];

    const dist = getDistanceToSegment(zoneCenter[0], zoneCenter[1], p1[0], p1[1], p2[0], p2[1]);
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
export function getBlockedFloodZones(floodZonesList: FloodZone[], confirmedFloodZoneIds: string[] = []): FloodZone[] {
  return floodZonesList.filter(
    zone => isBlockedFloodZone(zone) && !confirmedFloodZoneIds.includes(zone.id)
  );
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

    // Lấy tọa độ các cầu lớn tại Đà Nẵng làm điểm tránh ngập
    const DA_NANG_BRIDGES = [
      { name: "Cầu Trần Thị Lý", coordinates: [108.2315, 16.0503] },
      { name: "Cầu Rồng", coordinates: [108.2273, 16.0611] },
      { name: "Cầu Sông Hàn", coordinates: [108.2272, 16.0722] },
      { name: "Cầu Hòa Xuân", coordinates: [108.2235, 16.0152] },
      { name: "Cầu Nguyễn Tri Phương", coordinates: [108.2185, 16.0165] }
    ];

    for (const bridge of DA_NANG_BRIDGES) {
      waypointSets.push({
        name: `Bypass qua ${bridge.name}`,
        waypoints: [bridge.coordinates as [number, number]],
        optIdx: 99
      });
    }

    // Phương án A: Tránh đồng thời tất cả các vùng ngập bị chặn thực sự
    for (let optIdx = 0; optIdx < 2; optIdx++) {
      const waypoints: [number, number][] = [];
      for (const zone of originalBlockedList) {
        if (zone.bypassOptions && zone.bypassOptions[optIdx]) {
          waypoints.push(...zone.bypassOptions[optIdx]);
        } else if (optIdx === 0 && zone.bypassPosition) {
          if (Array.isArray(zone.bypassPosition[0])) {
            waypoints.push(...(zone.bypassPosition as [number, number][]));
          } else {
            waypoints.push(zone.bypassPosition as [number, number]);
          }
        }
      }
      waypointSets.push({
        name: `Bypass tất cả vùng ngập (Phương án ${optIdx + 1})`,
        waypoints,
        optIdx
      });
    }

    // Phương án B: Tránh từng vùng ngập bị chặn riêng lẻ
    if (originalBlockedList.length > 1) {
      for (const zone of originalBlockedList) {
        for (let optIdx = 0; optIdx < 2; optIdx++) {
          let waypoints: [number, number][] = [];
          if (zone.bypassOptions && zone.bypassOptions[optIdx]) {
            waypoints = zone.bypassOptions[optIdx];
          } else if (optIdx === 0 && zone.bypassPosition) {
            if (Array.isArray(zone.bypassPosition[0])) {
              waypoints = zone.bypassPosition as [number, number][];
            } else {
              waypoints = [zone.bypassPosition as [number, number]];
            }
          }
          waypointSets.push({
            name: `Bypass tránh vùng ngập tại ${zone.name} (Phương án ${optIdx + 1})`,
            waypoints,
            optIdx
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
        const distA = getDistance(a[0], a[1], origin.lng, origin.lat);
        const distB = getDistance(b[0], b[1], origin.lng, origin.lat);
        return distA - distB;
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
