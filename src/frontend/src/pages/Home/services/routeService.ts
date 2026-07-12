import { decodePolyline } from "../utils/routeUtils";
import { RouteData } from "../types/route";
import { LocationPoint } from "../types/map";

/**
 * Gọi backend proxy để lấy tuyến đường (dùng cho chế độ tiết kiệm băng thông).
 */
export async function fetchLowBandwidthRoute(
  origin: LocationPoint,
  destination: LocationPoint,
  travelMode: "driving" | "walking" | "cycling",
  mapboxToken: string
): Promise<RouteData | null> {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
  const response = await fetch(
    `${apiUrl}/api/routes/calculate?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&mode=${travelMode}&access_token=${mapboxToken}`
  );
  const data = await response.json();

  if (response.ok && data.success && data.polyline) {
    const coords = decodePolyline(data.polyline);
    return {
      totalDistanceKm: parseFloat((data.distance / 1000).toFixed(2)),
      totalTimeMin: Math.round(data.duration / 60),
      coordinates: coords,
    };
  }
  return null;
}

/**
 * Gọi trực tiếp Mapbox Directions API để lấy các tuyến đường khả dụng.
 */
export async function fetchMapboxDirections(
  origin: LocationPoint,
  destination: LocationPoint,
  travelMode: "driving" | "walking" | "cycling",
  mapboxToken: string
): Promise<{ ok: boolean; routes: any[] }> {
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&steps=true&language=vi&access_token=${mapboxToken}`
  );
  const data = await response.json();
  return { ok: response.ok && data.routes && data.routes.length > 0, routes: data.routes || [] };
}

//  FIX: Đóng gói các hàm vào object routeService trước khi export default
const routeService = {
  fetchLowBandwidthRoute,
  fetchMapboxDirections
};

export default routeService;