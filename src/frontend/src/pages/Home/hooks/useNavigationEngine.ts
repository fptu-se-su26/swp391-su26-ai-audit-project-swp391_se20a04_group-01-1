// src/frontend/src/pages/Home/hooks/useNavigationEngine.ts
import { useEffect, useRef, useState } from "react";
import { useVoiceGuidance } from "./useVoiceGuidance";
import { calculateDistanceInMeters } from "../../../utils/polylineHelper";

interface Step {
  maneuver: {
    location: [number, number]; // [kinh độ, vĩ độ] từ Directions API
    instruction: string;
  };
}

interface Location {
  lat: number;
  lng: number;
}

export function useNavigationEngine(
  currentLocation: Location | null,
  routeSteps: Step[],
  isNearFloodZone: boolean, // Biến xác định có gần vùng ngập không (từ utils kiểm tra polyline)
  isNearRestrictedEvent: boolean, // Biến xác định có gần sự kiện hạn chế không
) {
  const { speak, cancel, isEnabled, supported } = useVoiceGuidance();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const previousRouteLength = useRef(0);

  // Sử dụng Set để lưu các mốc đã phát âm thanh, tránh việc GPS cập nhật liên tục làm lặp lại câu thoại
  const spokenAnnouncements = useRef<Set<string>>(new Set());
  const isInDangerZone = useRef(false);

  useEffect(() => {
    if (!isEnabled || !supported || !currentLocation || !routeSteps.length)
      return;
    if (previousRouteLength.current !== routeSteps.length) {
      previousRouteLength.current = routeSteps.length;

      spokenAnnouncements.current.clear();

      setCurrentStepIndex(0);

      cancel();
    }
    if (currentStepIndex >= routeSteps.length) return;

    const currentStep = routeSteps[currentStepIndex];
    const [stepLng, stepLat] = currentStep.maneuver.location;

    // Tính khoảng cách từ vị trí hiện tại đến điểm rẽ tiếp theo
    const distanceToNextTurn = calculateDistanceInMeters(
      currentLocation.lat,
      currentLocation.lng,
      stepLat,
      stepLng,
    );

    // Tạo key định danh duy nhất cho từng mốc khoảng cách của mỗi bước đường
    const stepKey200 = `step-${currentStepIndex}-200`;
    const stepKey100 = `step-${currentStepIndex}-100`;
    const stepKey50 = `step-${currentStepIndex}-50`;

    // Logic kiểm tra các mốc khoảng cách còn lại
    if (
      distanceToNextTurn <= 200 &&
      distanceToNextTurn > 100 &&
      !spokenAnnouncements.current.has(stepKey200)
    ) {
      speak(`Còn khoảng 200 mét nữa, ${currentStep.maneuver.instruction}`);
      spokenAnnouncements.current.add(stepKey200);
    } else if (
      distanceToNextTurn <= 100 &&
      distanceToNextTurn > 50 &&
      !spokenAnnouncements.current.has(stepKey100)
    ) {
      speak(`Sắp tới, ${currentStep.maneuver.instruction}`);
      spokenAnnouncements.current.add(stepKey100);
    } else if (
      distanceToNextTurn <= 50 &&
      distanceToNextTurn > 15 &&
      !spokenAnnouncements.current.has(stepKey50)
    ) {
      speak(`Chuẩn bị, ${currentStep.maneuver.instruction}`);
      spokenAnnouncements.current.add(stepKey50);
    }

    // Nếu khoảng cách nhỏ hơn 15m, xác nhận đã qua điểm rẽ và chuyển sang bước tiếp theo
    if (distanceToNextTurn <= 15 && currentStepIndex < routeSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      cancel();
    }

    // Logic cảnh báo thiên tai / sự kiện đột xuất
    if ((isNearFloodZone || isNearRestrictedEvent) && !isInDangerZone.current) {
      isInDangerZone.current = true;
      if (isNearFloodZone) {
        cancel();
        speak(
          "Cảnh báo: Lộ trình phía trước có vùng ngập lụt, vui lòng chú ý quan sát.",
        );
      } else if (isNearRestrictedEvent) {
        cancel();
        speak(
          "Cảnh báo: Đoạn đường tiếp theo đang hạn chế lưu thông do có sự kiện diễn ra.",
        );
      }
    } else if (
      !isNearFloodZone &&
      !isNearRestrictedEvent &&
      isInDangerZone.current
    ) {
      // Đã đi qua vùng nguy hiểm, đặt lại trạng thái cờ
      isInDangerZone.current = false;
    }
  }, [
    currentLocation,
    routeSteps,
    isNearFloodZone,
    isNearRestrictedEvent,
    isEnabled,
    supported,
    speak,
    currentStepIndex,
    cancel,
  ]);

  return { currentStepIndex, setCurrentStepIndex };
}
