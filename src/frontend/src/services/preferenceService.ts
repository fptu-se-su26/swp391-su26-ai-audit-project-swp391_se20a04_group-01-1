import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

export interface UserPreferences {
  avoid_floods: boolean;
  avoid_congestion: boolean;
  show_traffic_layer: boolean;
  show_restricted_roads: boolean;
  enable_buffer_alerts: boolean;
  default_travel_mode: 'driving' | 'walking' | 'cycling';
}

/**
 * Get user preferences
 */
export const getPreferences = async (): Promise<UserPreferences> => {
  const response = await api.get(API_ENDPOINTS.GET_PREFERENCES);
  return response.data.data;
};

/**
 * Update user preferences
 */
export const updatePreferences = async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
  const response = await api.put(API_ENDPOINTS.UPDATE_PREFERENCES, data);
  return response.data.data;
};
