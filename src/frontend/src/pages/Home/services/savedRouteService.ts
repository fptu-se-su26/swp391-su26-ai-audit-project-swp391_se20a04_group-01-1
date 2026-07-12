const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export interface SaveRouteData {
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  route_name: string;
  route_data: string;
  distance_meters: number;
  duration_seconds: number;
  profile: string;
}

export async function saveRoute(data: SaveRouteData): Promise<any> {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  
  const response = await fetch(`${API_BASE}/api/saved-routes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error("Không thể lưu tuyến đường.");
  return await response.json();
}

export async function fetchSavedRoutes(): Promise<any[]> {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  if (!token) return [];

  const response = await fetch(`${API_BASE}/api/saved-routes`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

export async function deleteSavedRoute(routeId: number): Promise<void> {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  
  const response = await fetch(`${API_BASE}/api/saved-routes/${routeId}`, {
    method: "DELETE",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (!response.ok) throw new Error("Không thể xóa tuyến đường.");
}