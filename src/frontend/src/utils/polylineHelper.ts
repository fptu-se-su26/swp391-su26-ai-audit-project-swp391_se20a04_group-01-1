/**
 * Decodes a Mapbox/Google polyline string into an array of [longitude, latitude] coordinates.
 * @param str The encoded polyline string
 * @param precision Coordinate precision (default 5 decimal places)
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000; // Bán kính trái đất tính bằng mét
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}
// Tính khoảng cách vuông góc ngắn nhất (mét) từ 1 điểm GPS tới toàn bộ polyline
export function getMinDistanceToPolylineMeters(
  lat: number,
  lng: number,
  coordinates: [number, number][], // [lng, lat][]
): number {
  if (!coordinates || coordinates.length < 2) return Infinity;

  const latFactor = 111111;
  const lngFactor = 111111 * Math.cos((lat * Math.PI) / 180);
  const pxM = lng * lngFactor;
  const pyM = lat * latFactor;

  let minDist = Infinity;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [ax, ay] = coordinates[i];
    const [bx, by] = coordinates[i + 1];
    const axM = ax * lngFactor,
      ayM = ay * latFactor;
    const bxM = bx * lngFactor,
      byM = by * latFactor;

    const dx = bxM - axM,
      dy = byM - ayM;
    let closestX = axM,
      closestY = ayM;

    if (dx !== 0 || dy !== 0) {
      let t = ((pxM - axM) * dx + (pyM - ayM) * dy) / (dx * dx + dy * dy);
      t = Math.max(0, Math.min(1, t));
      closestX = axM + t * dx;
      closestY = ayM + t * dy;
    }

    const dist = Math.hypot(pxM - closestX, pyM - closestY);
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}
export function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let byte;
    let shift = 0;
    let result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const changeLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += changeLat;

    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const changeLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += changeLng;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}
