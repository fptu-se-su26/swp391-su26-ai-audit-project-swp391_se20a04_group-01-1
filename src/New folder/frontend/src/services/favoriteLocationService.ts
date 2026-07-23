import api from "../utils/api";
import { API_ENDPOINTS } from "../config/api";

export const saveFavoriteLocation = async (
  label: string,
  lat: number,
  lng: number,
  sourcePlaceId?: string
) => {
  const res = await api.post(API_ENDPOINTS.FAVORITE_LOCATIONS, {
    label,
    latitude: lat,
    longitude: lng,
    source_place_id: sourcePlaceId,
  });
  return res.data;
};

export const getFavoriteLocations = async () => {
  const res = await api.get(API_ENDPOINTS.FAVORITE_LOCATIONS);
  return res.data.data;
};

export const deleteFavoriteLocation = async (id: number) => {
  const res = await api.delete(`${API_ENDPOINTS.FAVORITE_LOCATIONS}/${id}`);
  return res.data;
};