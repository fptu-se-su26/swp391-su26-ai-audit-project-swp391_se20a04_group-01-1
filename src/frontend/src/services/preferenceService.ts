import api from '../utils/api';

export interface UserPreferences {
  avoid_floods: boolean;
  avoid_congestion: boolean;
  show_traffic_layer: boolean;
  show_restricted_roads: boolean;
  enable_buffer_alerts: boolean;
  default_travel_mode: 'driving' | 'walking' | 'cycling';
}

// Dùng relative path vì `api` instance đã có baseURL = ".../api"
const PREFERENCES_PATH = '/user/preferences';

/**
 * Get user preferences
 */
export const getPreferences = async (): Promise<UserPreferences> => {
  const response = await api.get(PREFERENCES_PATH);
  return response.data.data;
};

/**
 * Update user preferences
 */
export const updatePreferences = async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
  const response = await api.put(PREFERENCES_PATH, data);
  return response.data.data;
};