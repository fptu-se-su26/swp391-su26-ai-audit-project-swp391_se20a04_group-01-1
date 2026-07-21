/**
 * Calculates the distance between two coordinate points in kilometers using the Haversine formula.
 */
import { decodePolyline } from "./polylineHelper";

export function getDistanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// SỬA THÀNH `routeDataRaw: any` ĐỂ TRÁNH LỖI KHI DỮ LIỆU ĐÃ LÀ OBJECT/ARRAY
export function parseRouteData(routeDataRaw: any): {
  coordinates: [number, number][];
  waypoints: any[];
} {
  if (!routeDataRaw) {
    return { coordinates: [], waypoints: [] };
  }

  // BỔ SUNG: Xử lý nếu data đã vô tình là Object hoặc Array từ trước
  if (typeof routeDataRaw === "object") {
    if (Array.isArray(routeDataRaw)) {
      return { coordinates: routeDataRaw, waypoints: [] };
    }
    if (routeDataRaw.coordinates && Array.isArray(routeDataRaw.coordinates)) {
      return {
        coordinates: routeDataRaw.coordinates,
        waypoints: routeDataRaw.waypoints || [],
      };
    }
  }

  // Ép kiểu an toàn sang string nếu nó là chuỗi
  const routeDataStr = String(routeDataRaw);

  // 1. Thử parse nếu là định dạng JSON (Khi lưu từ lịch sử có waypoints)
  try {
    if (
      routeDataStr.trim().startsWith("[") ||
      routeDataStr.trim().startsWith("{")
    ) {
      const parsed = JSON.parse(routeDataStr);
      if (Array.isArray(parsed)) {
        return { coordinates: parsed, waypoints: [] };
      }
      if (parsed && Array.isArray(parsed.coordinates)) {
        return {
          coordinates: parsed.coordinates,
          waypoints: parsed.waypoints || [],
        };
      }
    }
  } catch (e) {
    // Nếu lỗi JSON.parse, không log ra mà âm thầm nhảy xuống bước 2
  }

  // 2. Nếu không phải JSON, nó là chuỗi Polyline -> Tiến hành giải mã
  try {
    const decodedCoords = decodePolyline(routeDataStr);
    if (decodedCoords && decodedCoords.length > 0) {
      return { coordinates: decodedCoords, waypoints: [] };
    }
  } catch (e) {
    console.error("Lỗi parse và decode route_data:", e);
  }

  // Fallback an toàn
  return { coordinates: [], waypoints: [] };
}
