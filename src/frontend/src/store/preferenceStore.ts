import { create } from 'zustand';
import { getPreferences, updatePreferences, UserPreferences } from '../services/preferenceService';

interface PreferenceState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPreferences: () => Promise<void>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updateAllPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  avoid_floods: false,
  avoid_congestion: false,
  show_traffic_layer: true,
  show_restricted_roads: true,
  enable_buffer_alerts: true,
  default_travel_mode: 'driving'
};

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  preferences: null,
  isLoading: false,
  error: null,

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getPreferences();
      set({ preferences: data, isLoading: false });
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
      // Fallback to default preferences if error (e.g. guest or network error)
      set({ 
        preferences: get().preferences || defaultPreferences, 
        error: err.message || 'Không thể lấy cấu hình', 
        isLoading: false 
      });
    }
  },

  updatePreference: async (key, value) => {
    const currentPrefs = get().preferences || defaultPreferences;
    const updatedPrefs = { ...currentPrefs, [key]: value };
    
    // Optimistic UI update
    set({ preferences: updatedPrefs });

    try {
      await updatePreferences({ [key]: value });
    } catch (err: any) {
      console.error('Error updating preference:', err);
      // Rollback on error
      set({ preferences: currentPrefs, error: err.message || 'Lỗi đồng bộ cấu hình' });
    }
  },

  updateAllPreferences: async (prefs) => {
    const currentPrefs = get().preferences || defaultPreferences;
    const updatedPrefs = { ...currentPrefs, ...prefs };
    
    // Optimistic UI update
    set({ preferences: updatedPrefs });

    try {
      await updatePreferences(prefs);
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      // Rollback on error
      set({ preferences: currentPrefs, error: err.message || 'Lỗi đồng bộ cấu hình' });
    }
  },

  resetPreferences: () => {
    set({ preferences: null, error: null, isLoading: false });
  }
}));
