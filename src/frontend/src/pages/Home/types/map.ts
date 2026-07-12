export interface LocationPoint {
  lng: number;
  lat: number;
  label: string;
  poi_id?: number;
  event_id?: number;
}

export interface PendingDestination {
  lng: number;
  lat: number;
}

export interface FloodZoneSelection {
  lng: number;
  lat: number;
  properties: {
    id: string | number;
    name: string;
    risk_level: "High" | "Medium" | "Low";
    description: string;
    depthCm?: number;
  };
}
