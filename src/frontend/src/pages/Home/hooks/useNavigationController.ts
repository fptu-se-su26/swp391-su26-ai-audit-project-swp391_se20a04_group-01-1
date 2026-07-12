import { useEffect } from "react";
import { useNavigationEngine } from "./useNavigationEngine";
import { usePreferenceStore } from "../../../store/preferenceStore";

/**
 * Hook quản lý voice guidance khi dẫn đường
 * Gọi useNavigationEngine khi isNavigating = true
 * để kích hoạt voice guidance
 */
export function useNavigationController(
  isNavigating: boolean,
  currentLocation: { lat: number; lng: number } | null,
  routeSteps: any[],
  isNearFloodZone: boolean = false,
  isNearRestrictedEvent: boolean = false,
) {
  const { fetchPreferences } = usePreferenceStore();

  //  FIX: Fetch preferences khi start navigation
  useEffect(() => {
    if (isNavigating) {
      fetchPreferences();
    }
  }, [isNavigating, fetchPreferences]);

  //  Gọi useNavigationEngine khi dẫn đường
  const { currentStepIndex, setCurrentStepIndex } = useNavigationEngine(
    currentLocation,
    routeSteps,
    isNearFloodZone,
    isNearRestrictedEvent,
  );

  return { currentStepIndex, setCurrentStepIndex };
}