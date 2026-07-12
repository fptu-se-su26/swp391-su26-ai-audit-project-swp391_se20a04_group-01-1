import { create } from "zustand";

export interface UIState {
  // Modals & Sidebars
  showSuggestions: boolean;
  showNotificationModal: boolean;
  showShareModal: boolean;
  showReportModal: boolean;
  showSaveRouteModal: boolean;
  showSavedRoutesSidebar: boolean;
  showEventsSidebar: boolean;
  showAlertPopup: boolean;

  // Selected Data on Map
  selectedPOI: any | null;
  selectedFloodZone: any | null;
  selectedRoadPopup: any | null;
  selectedTrafficAlert: any | null;
  pendingDestination: any | null;
  hoveredFloodZone: any | null;
  selectedEvent: any | null;
  selectedFilter: string | null;

  // App States
  loadingSearch: boolean;
  isWeatherExpanded: boolean;
  isLowBandwidth: boolean;
  activeInputField: "origin" | "destination" | null;
  viewMode: "pois" | "events";

  // Confirm Modal
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  };

  // Map Controls
  mapControls: {
    layers: boolean;
    traffic: boolean;
    flood: boolean;
  };

  // Actions
  setUIState: (state: Partial<UIState>) => void;
  
  setMapControls: (controls: Partial<UIState["mapControls"]>) => void;

  showCustomConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Modals & Sidebars
  showSuggestions: false,
  showNotificationModal: false,
  showShareModal: false,
  showReportModal: false,
  showSaveRouteModal: false,
  showSavedRoutesSidebar: false,
  showEventsSidebar: false,
  showAlertPopup: false,

  // Selected Data on Map
  selectedPOI: null,
  selectedFloodZone: null,
  selectedRoadPopup: null,
  selectedTrafficAlert: null,
  pendingDestination: null,
  hoveredFloodZone: null,
  selectedEvent: null,
  selectedFilter: null,

  // App States
  loadingSearch: false,
  isWeatherExpanded:
    typeof localStorage !== "undefined"
      ? localStorage.getItem("weather_widget_collapsed") !== "true"
      : true,
  activeInputField: null,
  viewMode: "pois",
  isLowBandwidth:
    typeof navigator !== "undefined" && typeof localStorage !== "undefined"
      ? (!navigator.onLine || localStorage.getItem("low_bandwidth_mode") === "true")
      : false,

  // Confirm Modal
  confirmModal: {
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  },

  // Map Controls
  mapControls: {
    layers: false,
    traffic: false,
    flood: false,
  },

  // Actions
  setUIState: (newState) =>
    set((state) => ({
      ...state,
      ...newState,
    })),

  setMapControls: (controls) =>
    set((state) => ({
      mapControls: {
        ...state.mapControls,
        ...controls,
      },
    })),

  showCustomConfirm: (title, message, onConfirm, onCancel) =>
    set((state) => ({
      confirmModal: {
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          set({
            confirmModal: {
              ...state.confirmModal,
              isOpen: false,
            },
          });
          onConfirm();
        },
        onCancel: () => {
          set({
            confirmModal: {
              ...state.confirmModal,
              isOpen: false,
            },
          });
          onCancel();
        },
      },
    })),
}));