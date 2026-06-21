import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { POIData } from '../pages/Home/components/POIPopup';

/**
 * Toggle favorite status of a POI
 */
export const toggleFavoritePOI = async (id: number): Promise<{ isFavorite: boolean }> => {
  const response = await api.post(API_ENDPOINTS.TOGGLE_FAVORITE_POI(id));
  return response.data;
};

/**
 * Get all favorited POI IDs
 */
export const getFavoritePOIIds = async (): Promise<number[]> => {
  const response = await api.get(API_ENDPOINTS.FAVORITE_POIS);
  return response.data.data;
};

/**
 * Get detailed information of all favorited POIs
 */
export const getFavoritePOIsDetails = async (): Promise<POIData[]> => {
  const response = await api.get(API_ENDPOINTS.FAVORITE_POIS_DETAILS);
  return response.data.data;
};
