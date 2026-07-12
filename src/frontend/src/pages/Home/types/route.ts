export interface RouteData {
  totalDistanceKm: number;
  totalTimeMin: number;
  coordinates: [number, number][];
  steps?: { maneuver: { location: [number, number]; instruction: string } }[];
}
