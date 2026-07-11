import { create } from "zustand";
import {
  getPreferences,
  updatePreferences,
  UserPreferences,
} from "../services/preferenceService";

interface PreferenceState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;

  fetchPreferences: () => Promise<void>;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => Promise<void>;
  updateAllPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  avoid_floods: false,
  avoid_congestion: false,
  show_traffic_layer: true,
  show_restricted_roads: true,
  enable_buffer_alerts: true,
  default_travel_mode: "driving",
  enable_voice_guide: true,
};

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  preferences: null,
  isLoading: false,
  error: null,

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getPreferences();
      // Đảm bảo dữ liệu từ API luôn được trộn với default nếu thiếu trường
      set({
        preferences: { ...defaultPreferences, ...data },
        isLoading: false,
      });
    } catch (err: any) {
      set({
        preferences: defaultPreferences,
        error: err.message,
        isLoading: false,
      });
    }
  },

  updatePreference: async (key, value) => {
    const currentPrefs = get().preferences || defaultPreferences;
    const updatedPrefs = { ...currentPrefs, [key]: value };

    // Cập nhật ngay lập tức để UI render lại
    set({ preferences: updatedPrefs });

    try {
      await updatePreferences({ [key]: value });
    } catch (err: any) {
      // Rollback nếu API lỗi
      set({ preferences: currentPrefs });
      throw err; // Ném lỗi ra để component có thể show toast thông báo
    }
  },

  updateAllPreferences: async (prefs) => {
    const currentPrefs = get().preferences || defaultPreferences;
    const updatedPrefs = { ...currentPrefs, ...prefs };

    // Cập nhật ngay lập tức
    set({ preferences: updatedPrefs });

    try {
      await updatePreferences(prefs);
    } catch (err: any) {
      set({ preferences: currentPrefs });
      throw err;
    }
  },

  resetPreferences: () => {
    set({ preferences: null, error: null, isLoading: false });
  },
}));
