/**
 * Giải mã chuỗi polyline thành mảng tọa độ [lng, lat] dùng cho Mapbox
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    // Mapbox sử dụng định dạng [longitude, latitude]
    points.push([lng / 1e5, lat / 1e5]);
  }

  return points;
}
export function getHaversineDistance(
  point1: { lat: number; lng: number }, 
  point2: { lat: number; lng: number }
): number {
  const { lat: lat1, lng: lng1 } = point1;
  const { lat: lat2, lng: lng2 } = point2;

  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
export function estimateOfflineDurationMin(
  distanceKm: number, 
  mode: "driving" | "walking" | "cycling"
): number {
  // Tốc độ trung bình (km/h)
  const speeds = {
    driving: 40,  // Tốc độ trung bình trong phố
    walking: 5,   // Đi bộ
    cycling: 15   // Xe đạp
  };

  const speed = speeds[mode] || 30;
  const timeHours = distanceKm / speed;
  return Math.round(timeHours * 60);
}