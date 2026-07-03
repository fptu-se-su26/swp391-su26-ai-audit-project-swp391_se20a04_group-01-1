import apiClient from './api';

export interface SavedRoute {
  route_id: number;
  user_id: number;
  origin_name?: string | null;
  origin_lat: number;
  origin_lng: number;
  destination_name?: string | null;
  destination_lat: number;
  destination_lng: number;
  route_name?: string | null;
  route_data: string; // stringified coordinates array e.g. "[[lng,lat],[lng,lat],...]"
  distance_meters: number;
  duration_seconds: number;
  profile: string;
  share_token?: string | null;
  is_shared: boolean;
  is_emergency: boolean;
  created_at: string;
}

export const savedRouteService = {
  saveRoute: async (data: {
    origin_name?: string | null;
    origin_lat: number;
    origin_lng: number;
    destination_name?: string | null;
    destination_lat: number;
    destination_lng: number;
    route_name?: string | null;
    route_data: string;
    distance_meters: number;
    duration_seconds: number;
    profile: string;
    is_emergency?: boolean;
  }) => {
    const response = await apiClient.post<{ success: boolean; message: string; route: SavedRoute }>('/saved-routes', data);
    return response.data;
  },

  getSavedRoutes: async (): Promise<SavedRoute[]> => {
    const response = await apiClient.get<{ success: boolean; routes: SavedRoute[] }>('/saved-routes');
    return response.data.routes || [];
},

  getRouteById: async (id: number): Promise<SavedRoute> => {
    const response = await apiClient.get<{ success: boolean; route: SavedRoute }>(`/saved-routes/${id}`);
    return response.data.route;
  },

  deleteRoute: async (id: number) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/saved-routes/${id}`);
    return response.data;
  },

  shareSavedRoute: async (id: number) => {
    const response = await apiClient.post<{ success: boolean; share_token: string }>(`/saved-routes/${id}/share`);
    return response.data;
  },

  shareDirectRoute: async (data: {
    origin_name?: string | null;
    origin_lat: number;
    origin_lng: number;
    destination_name?: string | null;
    destination_lat: number;
    destination_lng: number;
    route_name?: string | null;
    route_data: string;
    distance_meters: number;
    duration_seconds: number;
    profile: string;
    is_emergency?: boolean;
  }) => {
    const response = await apiClient.post<{ success: boolean; share_token: string }>('/saved-routes/share-direct', data);
    return response.data;
  },

  getSharedRoute: async (token: string): Promise<SavedRoute> => {
    const response = await apiClient.get<{ success: boolean; route: SavedRoute }>(`/routes/share/${token}`);
    return response.data.route;
  }
};
