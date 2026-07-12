/**
 * Sinh tọa độ đa giác hình tròn quanh 1 tâm điểm (dùng để vẽ vùng ảnh hưởng ngập lụt).
 * Tách từ components/map/FloodLayer.tsx.
 */
export function getCirclePolygon(
  center: [number, number],
  radiusInMeters: number,
  points = 64
): [number, number][] {
  const [lng, lat] = center;
  const R = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const dByR = radiusInMeters / R;
  const coordinates: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(dByR) + Math.cos(latRad) * Math.sin(dByR) * Math.cos(angle)
    );
    const newLngRad =
      lngRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(dByR) * Math.cos(latRad),
        Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
      );
    coordinates.push([(newLngRad * 180) / Math.PI, (newLatRad * 180) / Math.PI]);
  }
  coordinates.push(coordinates[0]);
  return coordinates;
}

/**
 * Tính bounding box [ [minLng, minLat], [maxLng, maxLat] ] từ 1 mảng tọa độ.
 * Tách từ phần lặp lại 3 lần trong hooks/useMapRouting.ts (dùng để mapRef.fitBounds).
 */
export function getBoundsFromCoordinates(
  coords: [number, number][]
): [[number, number], [number, number]] {
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

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
