import { EventRoad } from '../services/eventRoadService';

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

// Tính khoảng cách từ điểm P đến phân đoạn đường thẳng AB (mét)
export function getDistanceToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const latFactor = 111111; // 1 độ vĩ độ ~ 111.111 mét
  const lngFactor = 111111 * Math.cos((ay * Math.PI) / 180);

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

  let t = ((pxM - axM) * dx + (pyM - ayM) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const closestX = axM + t * dx;
  const closestY = ayM + t * dy;

  const diffX = pxM - closestX;
  const diffY = pyM - closestY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

// Kiểm tra danh sách đường cấm mà tuyến đường đi qua
export function getBlockedRoadsForRoute(
  routeCoords: [number, number][],
  eventRoadsList: EventRoad[],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null,
  thresholdMeters = 30
): EventRoad[] {
  if (!routeCoords || routeCoords.length < 2 || !eventRoadsList || eventRoadsList.length === 0) {
    return [];
  }

  const blocked: EventRoad[] = [];

  for (const road of eventRoadsList) {
    // Chỉ kiểm tra các đường cấm hoàn toàn hoặc hạn chế đi lại
    if (road.restriction_type !== 'CLOSED' && road.restriction_type !== 'LIMITED' && road.restriction_type !== 'ONE_WAY') {
      continue;
    }

    // Nếu không có tọa độ hình học thì bỏ qua
    if (!road.geojson_coords || road.geojson_coords.length === 0) {
      continue;
    }

    let isBlocked = false;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const p1 = routeCoords[i];
      const p2 = routeCoords[i + 1];
      
      for (const rPt of road.geojson_coords) {
        // Bỏ qua nếu điểm cấm quá gần điểm xuất phát hoặc điểm đến của người dùng (trong phạm vi 30m)
        if (originCoords) {
          const distToStart = getDistance(rPt[0], rPt[1], originCoords.lng, originCoords.lat);
          if (distToStart < 30) {
            continue;
          }
        }
        if (destCoords) {
          const distToEnd = getDistance(rPt[0], rPt[1], destCoords.lng, destCoords.lat);
          if (distToEnd < 30) {
            continue;
          }
        }

        const dist = getDistanceToSegment(rPt[0], rPt[1], p1[0], p1[1], p2[0], p2[1]);
        if (dist < thresholdMeters) {
          isBlocked = true;
          break;
        }
      }
      if (isBlocked) {
        break;
      }
    }
    if (isBlocked) {
      blocked.push(road);
    }
  }

  return blocked;
}

// Thuật toán tìm lộ trình an toàn tránh đường cấm do sự kiện
export async function findSafeEventRoute(
  initialRoutes: any[],
  eventRoads: EventRoad[],
  origin: { lng: number; lat: number; label: string },
  destination: { lng: number; lat: number; label: string },
  travelMode: 'driving' | 'walking' | 'cycling',
  mapboxToken: string
): Promise<{
  selectedRoute: any;
  alertMsg: string | null;
  blockedRoads: EventRoad[];
}> {
  let selectedRoute = initialRoutes[0];
  let alertMsg: string | null = null;
  let foundSafeRoute = false;

  interface CandidateRoute {
    route: any;
    crossedCount: number;
    crossedScore: number;
    crossed: EventRoad[];
    name: string;
  }

  const candidates: CandidateRoute[] = [];

  // 1. Đánh giá tất cả các lộ trình gốc trả về từ Mapbox
  const originalBlockedList = getBlockedRoadsForRoute(initialRoutes[0].geometry.coordinates, eventRoads, origin, destination);

  for (let i = 0; i < initialRoutes.length; i++) {
    const r = initialRoutes[i];
    const crossed = getBlockedRoadsForRoute(r.geometry.coordinates, eventRoads, origin, destination);
    // Điểm phạt: Cấm hoàn toàn (CLOSED) phạt nặng 1000 điểm, hạn chế (LIMITED/ONE_WAY) phạt nhẹ 1 điểm
    const crossedScore = crossed.reduce((sum, road) => sum + (road.restriction_type === 'CLOSED' ? 1000 : 1), 0);
    
    candidates.push({
      route: r,
      crossedCount: crossed.length,
      crossedScore: crossedScore,
      crossed: crossed,
      name: `Lộ trình mặc định ${i + 1}`
    });
    if (crossedScore === 0) {
      foundSafeRoute = true;
    }
  }

  // 2. Nếu lộ trình gốc đi qua đường cấm, thử chèn waypoint để vẽ đường vòng (detour)
  if (!foundSafeRoute && originalBlockedList.length > 0) {
    const waypointSets: { name: string; waypoints: [number, number][] }[] = [];

    // Lấy các điểm tránh (bypass_coords) được định nghĩa sẵn trong DB cho các cung đường bị chặn
    const databaseWaypoints: [number, number][] = [];
    for (const road of originalBlockedList) {
      if (road.bypass_coords && road.bypass_coords.length > 0) {
        databaseWaypoints.push(...road.bypass_coords);
      }
    }

    if (databaseWaypoints.length > 0) {
      waypointSets.push({
        name: "Đi vòng theo gợi ý của hệ thống",
        waypoints: databaseWaypoints
      });
    }

    // Các cầu Đà Nẵng dự phòng nếu cấm đường trên cầu hoặc ven sông
    const DA_NANG_BRIDGES = [
      { name: "Cầu Trần Thị Lý", coordinates: [108.2315, 16.0503] },
      { name: "Cầu Rồng", coordinates: [108.2273, 16.0611] },
      { name: "Cầu Sông Hàn", coordinates: [108.2272, 16.0722] },
      { name: "Cầu Thuận Phước", coordinates: [108.2223, 16.0964] }
    ];

    for (const bridge of DA_NANG_BRIDGES) {
      waypointSets.push({
        name: `Đi vòng qua ${bridge.name}`,
        waypoints: [bridge.coordinates as [number, number]]
      });
    }

    // Thử truy vấn Mapbox Directions API cho từng phương án tránh
    for (const set of waypointSets) {
      if (set.waypoints.length === 0) continue;

      // Loại bỏ trùng lặp waypoint gần nhau
      const uniqueWaypoints: [number, number][] = [];
      const seen = new Set<string>();
      for (const pt of set.waypoints) {
        const key = `${pt[0].toFixed(5)},${pt[1].toFixed(5)}`;
        if (!seen.has(key)) {
          seen.add(key);
          seen.add(key);
          uniqueWaypoints.push(pt);
        }
      }

      // Sắp xếp waypoint theo khoảng cách tăng dần từ điểm xuất phát để tránh vẽ zig-zag
      uniqueWaypoints.sort((a, b) => {
        const distA = getDistance(a[0], a[1], origin.lng, origin.lat);
        const distB = getDistance(b[0], b[1], origin.lng, origin.lat);
        return distA - distB;
      });

      const waypointsStr = uniqueWaypoints.map(coord => `${coord[0]},${coord[1]}`).join(';');

      try {
        const detourResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${waypointsStr};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxToken}`
        );
        const detourData = await detourResponse.json();
        if (detourResponse.ok && detourData.routes && detourData.routes.length > 0) {
          for (let i = 0; i < detourData.routes.length; i++) {
            const detourRoute = detourData.routes[i];
            const crossed = getBlockedRoadsForRoute(detourRoute.geometry.coordinates, eventRoads, origin, destination);
            const crossedScore = crossed.reduce((sum, road) => sum + (road.restriction_type === 'CLOSED' ? 1000 : 1), 0);

            candidates.push({
              route: detourRoute,
              crossedCount: crossed.length,
              crossedScore: crossedScore,
              crossed: crossed,
              name: `${set.name} (Lộ trình tránh ${i + 1})`
            });
          }
        }
      } catch (err) {
        console.error(`Lỗi khi tìm đường tránh cấm đường (${set.name}):`, err);
      }
    }
  }

  // Sắp xếp các phương án lộ trình ứng viên:
  // 1. Ưu tiên lộ trình có điểm phạt crossedScore thấp nhất (tránh đường cấm CLOSED trước, hạn chế LIMITED sau)
  // 2. Ưu tiên lộ trình có thời gian di chuyển ngắn nhất
  candidates.sort((a, b) => {
    if (a.crossedScore !== b.crossedScore) {
      return a.crossedScore - b.crossedScore;
    }
    return a.route.duration - b.route.duration;
  });

  let blockedRoads: EventRoad[] = [];
  if (candidates.length > 0) {
    const bestCandidate = candidates[0];
    selectedRoute = bestCandidate.route;
    blockedRoads = bestCandidate.crossed;

    const crossedClosed = bestCandidate.crossed.filter(r => r.restriction_type === 'CLOSED');
    const crossedRestricted = bestCandidate.crossed.filter(r => r.restriction_type !== 'CLOSED');

    if (crossedClosed.length > 0) {
      alertMsg = `⚠️ CẢNH BÁO NGUY HIỂM: Tuyến đi bắt buộc phải đi qua ĐƯỜNG CẤM HOÀN TOÀN: ${crossedClosed.map(r => r.road_name).join(', ')} do sự kiện "${crossedClosed[0].event_title || 'Sự kiện'}". Vui lòng chọn lộ trình khác!`;
      if (crossedRestricted.length > 0) {
        alertMsg += ` Tuyến đi cũng đi qua các đoạn hạn chế: ${crossedRestricted.map(r => r.road_name).join(', ')}.`;
      }
    } else if (crossedRestricted.length > 0) {
      alertMsg = `⚠️ Cảnh báo: Tuyến đường đi qua khu vực HẠN CHẾ DI CHUYỂN: ${crossedRestricted.map(r => r.road_name).join(', ')} do sự kiện "${crossedRestricted[0].event_title || 'Sự kiện'}". Vui lòng chú ý biển báo điều phối giao thông!`;
    } else if (originalBlockedList.length > 0) {
      const origClosed = originalBlockedList.filter(r => r.restriction_type === 'CLOSED');
      const origRestricted = originalBlockedList.filter(r => r.restriction_type !== 'CLOSED');
      if (origClosed.length > 0) {
        alertMsg = `✅ Hệ thống đã tự động điều hướng đi vòng để tránh đoạn ĐƯỜNG CẤM: ${origClosed.map(r => r.road_name).join(', ')}.`;
      } else {
        alertMsg = `✅ Hệ thống đã tự động tìm lộ trình tối ưu tránh đoạn đường HẠN CHẾ DI CHUYỂN: ${origRestricted.map(r => r.road_name).join(', ')}.`;
      }
    }
  }

  return { selectedRoute, alertMsg, blockedRoads };
}
