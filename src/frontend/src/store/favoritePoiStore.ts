import { create } from 'zustand';
import { toggleFavoritePOI, getFavoritePOIIds, getFavoritePOIsDetails } from '../services/favoritePoiService';
import { POIData } from '../pages/Home/components/POIPopup';

interface FavoritePoiState {
  favoriteIds: Set<number>;
  favoriteDetails: POIData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFavoriteIds: () => Promise<void>;
  fetchFavoriteDetails: () => Promise<void>;
  toggleFavorite: (poiId: number) => Promise<boolean>;
  resetFavorites: () => void;
}

export const useFavoritePoiStore = create<FavoritePoiState>((set, get) => ({
  favoriteIds: new Set<number>(),
  favoriteDetails: [],
  isLoading: false,
  error: null,

  fetchFavoriteIds: async () => {
    set({ error: null });
    try {
      const ids = await getFavoritePOIIds();
      set({ favoriteIds: new Set(ids) });
    } catch (err: any) {
      console.error('Error fetching favorite POI IDs:', err);
    }
  },

  fetchFavoriteDetails: async () => {
    set({ isLoading: true, error: null });
    try {
      const details = await getFavoritePOIsDetails();
      set({ favoriteDetails: details, isLoading: false });
    } catch (err: any) {
      console.error('Error fetching favorite POIs details:', err);
      set({ error: err.message || 'Không thể tải địa điểm yêu thích', isLoading: false });
    }
  },

  toggleFavorite: async (poiId) => {
    const currentIds = new Set(get().favoriteIds);
    const isCurrentlyFavorited = currentIds.has(poiId);

    // Optimistically update local IDs
    if (isCurrentlyFavorited) {
      currentIds.delete(poiId);
    } else {
      currentIds.add(poiId);
    }
    set({ favoriteIds: currentIds });

    try {
      const res = await toggleFavoritePOI(poiId);
      const updatedIds = new Set(get().favoriteIds);
      if (res.isFavorite) {
        updatedIds.add(poiId);
      } else {
        updatedIds.delete(poiId);
      }
      set({ favoriteIds: updatedIds });
      
      // If we are currently showing details, refresh it
      if (get().favoriteDetails.length > 0) {
        get().fetchFavoriteDetails();
      }
      
      return res.isFavorite;
    } catch (err: any) {
      console.error('Error toggling favorite POI:', err);
      // Rollback
      const rollbackIds = new Set(get().favoriteIds);
      if (isCurrentlyFavorited) {
        rollbackIds.add(poiId);
      } else {
        rollbackIds.delete(poiId);
      }
      set({ favoriteIds: rollbackIds, error: err.message || 'Lỗi lưu địa điểm' });
      throw err;
    }
  },

  resetFavorites: () => {
    set({ favoriteIds: new Set(), favoriteDetails: [], error: null, isLoading: false });
  }
}));
