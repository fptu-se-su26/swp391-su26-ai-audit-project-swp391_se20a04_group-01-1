// NEW CODE: Flood route avoidance feature - Tiện ích kiểm tra giao lộ đường đi và đường ngập lụt
import { FloodedRoad } from '../data/floodData';

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

// FIX: Prevent suggested route from passing flooded roads - Tính khoảng cách từ điểm P đến phân đoạn đường thẳng AB (mét)
// Giải quyết triệt để lỗi bỏ sót điểm ngập nằm giữa 2 đỉnh quá xa nhau của tuyến đường đi Mapbox
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

// FIX: Prevent suggested route from passing flooded roads - Kiểm tra giao cắt giữa đường đi và đường ngập
// Bổ sung tham số originCoords và destCoords để bỏ qua các điểm ngập gần vị trí xuất phát/đích đến (tránh kẹt đường vòng)
export function checkRouteFlooded(
  routeCoords: [number, number][],
  floodedRoadsList: FloodedRoad[],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null,
  thresholdMeters = 30
): { isFlooded: boolean; blockedRoadName?: string; blockedRoadId?: string } {
  if (!routeCoords || routeCoords.length < 2 || !floodedRoadsList || floodedRoadsList.length === 0) {
    return { isFlooded: false };
  }

  for (const road of floodedRoadsList) {
    // Duyệt qua từng phân đoạn (segment) nối giữa hai điểm kế tiếp của tuyến đường đi
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const p1 = routeCoords[i];
      const p2 = routeCoords[i + 1];
      
      for (const fPt of road.coordinates) {
        // Bỏ qua các điểm ngập quá gần điểm xuất phát hoặc điểm đến (trong phạm vi 30m)
        if (originCoords) {
          const distToStart = getDistance(fPt[0], fPt[1], originCoords.lng, originCoords.lat);
          if (distToStart < 30) {
            continue;
          }
        }
        if (destCoords) {
          const distToEnd = getDistance(fPt[0], fPt[1], destCoords.lng, destCoords.lat);
          if (distToEnd < 30) {
            continue;
          }
        }

        // Tính khoảng cách từ điểm ngập fPt đến phân đoạn p1-p2
        const dist = getDistanceToSegment(fPt[0], fPt[1], p1[0], p1[1], p2[0], p2[1]);
        if (dist < thresholdMeters) {
          console.log(`[FloodCheck] Phát hiện giao cắt tại đường ngập: ${road.name}, Khoảng cách: ${dist.toFixed(1)}m`);
          return { isFlooded: true, blockedRoadName: road.name, blockedRoadId: road.id };
        }
      }
    }
  }

  return { isFlooded: false };
}

// NEW CODE: Lấy danh sách tất cả các đường ngập lụt mà tuyến đường đi qua
export function getBlockedRoadsForRoute(
  routeCoords: [number, number][],
  floodedRoadsList: FloodedRoad[],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null,
  thresholdMeters = 30
): FloodedRoad[] {
  if (!routeCoords || routeCoords.length < 2 || !floodedRoadsList || floodedRoadsList.length === 0) {
    return [];
  }

  const blocked: FloodedRoad[] = [];

  for (const road of floodedRoadsList) {
    let isBlocked = false;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const p1 = routeCoords[i];
      const p2 = routeCoords[i + 1];
      
      for (const fPt of road.coordinates) {
        if (originCoords) {
          const distToStart = getDistance(fPt[0], fPt[1], originCoords.lng, originCoords.lat);
          if (distToStart < 30) {
            continue;
          }
        }
        if (destCoords) {
          const distToEnd = getDistance(fPt[0], fPt[1], destCoords.lng, destCoords.lat);
          if (distToEnd < 30) {
            continue;
          }
        }

        const dist = getDistanceToSegment(fPt[0], fPt[1], p1[0], p1[1], p2[0], p2[1]);
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

// NEW CODE: Flood route avoidance
export function isRouteNearFloodedRoad(
  routeCoordinates: [number, number][],
  floodedRoads: FloodedRoad[],
  toleranceMeters = 30,
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null
): boolean {
  if (!routeCoordinates || routeCoordinates.length < 2 || !floodedRoads || floodedRoads.length === 0) {
    return false;
  }
  for (const road of floodedRoads) {
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const p1 = routeCoordinates[i];
      const p2 = routeCoordinates[i + 1];
      for (const fPt of road.coordinates) {
        // Bỏ qua các điểm ngập quá gần điểm xuất phát hoặc điểm đến (trong phạm vi 30m)
        if (originCoords) {
          const distToStart = getDistance(fPt[0], fPt[1], originCoords.lng, originCoords.lat);
          if (distToStart < 30) {
            continue;
          }
        }
        if (destCoords) {
          const distToEnd = getDistance(fPt[0], fPt[1], destCoords.lng, destCoords.lat);
          if (distToEnd < 30) {
            continue;
          }
        }
        const dist = getDistanceToSegment(fPt[0], fPt[1], p1[0], p1[1], p2[0], p2[1]);
        if (dist < toleranceMeters) {
          return true;
        }
      }
    }
  }
  return false;
}

// NEW CODE: Flood route avoidance
export function isRouteCrossFloodedRoad(
  routeCoordinates: [number, number][],
  floodedRoads: FloodedRoad[],
  originCoords?: { lng: number; lat: number } | null,
  destCoords?: { lng: number; lat: number } | null
): boolean {
  return isRouteNearFloodedRoad(routeCoordinates, floodedRoads, 30, originCoords, destCoords);
}

// NEW CODE: Flood route avoidance
export async function findSafeRoute(
  initialRoutes: any[],
  floodedRoads: FloodedRoad[],
  origin: { lng: number; lat: number; label: string },
  destination: { lng: number; lat: number; label: string },
  travelMode: 'driving' | 'walking' | 'cycling',
  mapboxToken: string
): Promise<{
  selectedRoute: any;
  alertMsg: string | null;
}> {
  let selectedRoute = initialRoutes[0];
  let alertMsg: string | null = null;
  let foundSafeRoute = false;

  interface CandidateRoute {
    route: any;
    crossedCount: number;
    crossed: FloodedRoad[];
    name: string;
  }

  const candidates: CandidateRoute[] = [];

  // 1. Đánh giá tất cả các tuyến đường gốc từ Mapbox
  const originalBlockedList = getBlockedRoadsForRoute(initialRoutes[0].geometry.coordinates, floodedRoads, origin, destination);

  for (let i = 0; i < initialRoutes.length; i++) {
    const r = initialRoutes[i];
    const crossed = getBlockedRoadsForRoute(r.geometry.coordinates, floodedRoads, origin, destination);
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

  // 2. Tạo tuyến tránh ngập (detour) bằng cách chèn waypoint nếu tuyến gốc bị chặn
  if (!foundSafeRoute && originalBlockedList.length > 0) {
    const waypointSets: { name: string; waypoints: [number, number][]; optIdx: number }[] = [];

    // NEW CODE: Bridge detour options
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

    // Phương án A: Tránh đồng thời tất cả các đường ngập lụt
    for (let optIdx = 0; optIdx < 2; optIdx++) {
      const waypoints: [number, number][] = [];
      for (const road of originalBlockedList) {
        if (road.bypassOptions && road.bypassOptions[optIdx]) {
          waypoints.push(...road.bypassOptions[optIdx]);
        } else if (optIdx === 0 && road.bypassPosition) {
          if (Array.isArray(road.bypassPosition[0])) {
            waypoints.push(...(road.bypassPosition as [number, number][]));
          } else {
            waypoints.push(road.bypassPosition as [number, number]);
          }
        }
      }
      waypointSets.push({
        name: `Bypass tất cả các điểm ngập (Phương án ${optIdx + 1})`,
        waypoints,
        optIdx
      });
    }

    // Phương án B: Tránh từng đường ngập lụt riêng lẻ (chỉ áp dụng nếu N > 1)
    if (originalBlockedList.length > 1) {
      for (const road of originalBlockedList) {
        for (let optIdx = 0; optIdx < 2; optIdx++) {
          let waypoints: [number, number][] = [];
          if (road.bypassOptions && road.bypassOptions[optIdx]) {
            waypoints = road.bypassOptions[optIdx];
          } else if (optIdx === 0 && road.bypassPosition) {
            if (Array.isArray(road.bypassPosition[0])) {
              waypoints = road.bypassPosition as [number, number][];
            } else {
              waypoints = [road.bypassPosition as [number, number]];
            }
          }
          waypointSets.push({
            name: `Bypass tránh ngập tại ${road.name} (Phương án ${optIdx + 1})`,
            waypoints,
            optIdx
          });
        }
      }
    }

    // Phương án C: Tránh tất cả ngoại trừ một điểm (chỉ áp dụng nếu N > 2)
    if (originalBlockedList.length > 2) {
      for (const excludedRoad of originalBlockedList) {
        for (let optIdx = 0; optIdx < 2; optIdx++) {
          const waypoints: [number, number][] = [];
          for (const road of originalBlockedList) {
            if (road.id === excludedRoad.id) continue;
            if (road.bypassOptions && road.bypassOptions[optIdx]) {
              waypoints.push(...road.bypassOptions[optIdx]);
            } else if (optIdx === 0 && road.bypassPosition) {
              if (Array.isArray(road.bypassPosition[0])) {
                waypoints.push(...(road.bypassPosition as [number, number][]));
              } else {
                waypoints.push(road.bypassPosition as [number, number]);
              }
            }
          }
          waypointSets.push({
            name: `Bypass né ngập trừ ${excludedRoad.name} (Phương án ${optIdx + 1})`,
            waypoints,
            optIdx
          });
        }
      }
    }

    // Gửi yêu cầu truy vấn API Mapbox Directions cho mỗi bộ waypoint tránh ngập
    for (const set of waypointSets) {
      if (set.waypoints.length === 0) continue;

      // Loại bỏ các waypoint bị trùng lặp
      const uniqueWaypoints: [number, number][] = [];
      const seen = new Set<string>();
      for (const pt of set.waypoints) {
        const key = `${pt[0].toFixed(5)},${pt[1].toFixed(5)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueWaypoints.push(pt);
        }
      }

      // Sắp xếp các waypoint theo thứ tự gần đến xa để tránh di chuyển zig-zag
      uniqueWaypoints.sort((a, b) => {
        const distA = getDistance(a[0], a[1], origin.lng, origin.lat);
        const distB = getDistance(b[0], b[1], origin.lng, origin.lat);
        return distA - distB;
      });

      const waypointsStr = uniqueWaypoints.map(coord => `${coord[0]},${coord[1]}`).join(';');
      console.log(`[FloodAvoidance] Đang thử đường vòng: ${set.name} qua các điểm: ${waypointsStr}`);

      try {
        const detourResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${waypointsStr};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxToken}`
        );
        const detourData = await detourResponse.json();
        if (detourResponse.ok && detourData.routes && detourData.routes.length > 0) {
          for (let i = 0; i < detourData.routes.length; i++) {
            const detourRoute = detourData.routes[i];
            const crossed = getBlockedRoadsForRoute(detourRoute.geometry.coordinates, floodedRoads, origin, destination);

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

  // Sắp xếp các tuyến đường ứng viên:
  // 1. Ưu tiên tuyến đường cắt qua ít đường ngập nhất (crossedCount tối thiểu)
  // 2. Ưu tiên tuyến đường có thời gian di chuyển ngắn nhất (duration tối thiểu)
  candidates.sort((a, b) => {
    if (a.crossedCount !== b.crossedCount) {
      return a.crossedCount - b.crossedCount;
    }
    return a.route.duration - b.route.duration;
  });

  if (candidates.length > 0) {
    const bestCandidate = candidates[0];
    selectedRoute = bestCandidate.route;
    
    if (bestCandidate.crossedCount > 0) {
      alertMsg = "Không tìm thấy tuyến đường an toàn để né ngập.";
    } else {
      // Tuyến đường an toàn hoàn toàn (không đi qua khu vực ngập nào)
      if (originalBlockedList.length > 0) {
        alertMsg = "Tuyến đường ban đầu đi qua khu vực ngập lụt. Hệ thống đã gợi ý tuyến đường an toàn hơn.";
      } else {
        alertMsg = null;
      }
    }
    console.log(`[FloodAvoidance] Đã chọn tuyến đường tối ưu nhất: ${bestCandidate.name} với ${bestCandidate.crossedCount} điểm ngập.`);
  }

  return { selectedRoute, alertMsg };
}


