import { useState, useRef, useEffect } from "react";
import { showPremiumToast } from "../../../utils/toastUtils";

interface UseGPSNavigationProps {
  mapRef: React.RefObject<any>;
  routeData: any;
  userLocation: { lng: number; lat: number } | null;
  setUserLocation: (loc: { lng: number; lat: number } | null) => void;
  setOrigin: (point: { lng: number; lat: number; label: string } | null) => void;
  setOriginQuery: (query: string) => void;
}

export const useGPSNavigation = ({
  mapRef,
  routeData,
  userLocation,
  setUserLocation,
  setOrigin,
  setOriginQuery,
}: UseGPSNavigationProps) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedCoords, setSimulatedCoords] = useState<[number, number] | null>(null);
  const [simulatedHeading, setSimulatedHeading] = useState<number>(0);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);

  const watchPositionId = useRef<number | null>(null);
  const simulationIntervalRef = useRef<any>(null);
  const simulationIndexRef = useRef<number>(0);
  const lastSpokenStepIndexRef = useRef<number>(-1);
  const approachSpokenRef = useRef<number>(-1);

  // Helper tính khoảng cách Haversine (mét)
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper tính khoảng cách từ điểm đến đoạn thẳng (mét)
  const getDistanceToSegment = (p: [number, number], a: [number, number], b: [number, number]) => {
    const dy = (b[1] - a[1]) * 111320;
    const dx = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
    const p_y = (p[1] - a[1]) * 111320;
    const p_x = (p[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);

    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt(p_x * p_x + p_y * p_y);

    let t = (p_x * dx + p_y * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    const proj_x = t * dx;
    const proj_y = t * dy;

    const diff_x = p_x - proj_x;
    const diff_y = p_y - proj_y;
    return Math.sqrt(diff_x * diff_x + diff_y * diff_y);
  };

  const speakInstruction = (text: string) => {
    if (isVoiceMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  // Đọc TTS khi đổi bước đi
  useEffect(() => {
    if (!isNavigating || !routeData?.steps) return;
    const currentStep = routeData.steps[currentStepIndex];
    if (currentStep && currentStepIndex !== lastSpokenStepIndexRef.current) {
      speakInstruction(currentStep.maneuver.instruction || "Tiếp tục đi thẳng");
      lastSpokenStepIndexRef.current = currentStepIndex;
    }
  }, [currentStepIndex, isNavigating, routeData]);

  // Logic mô phỏng (Simulation loop)
  const startSimulation = (resume = false) => {
    if (!routeData || routeData.coordinates.length < 2) return;

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    setIsSimulating(true);
    if (!resume) {
      simulationIndexRef.current = 0;
      setCurrentStepIndex(0);
      lastSpokenStepIndexRef.current = -1;
      approachSpokenRef.current = -1;
    }

    const coords = routeData.coordinates;

    const runSimulationStep = () => {
      const index = simulationIndexRef.current;
      if (index >= coords.length - 1) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        setIsSimulating(false);
        speakInstruction("Bạn đã đến nơi. Chuyến đi kết thúc.");
        showPremiumToast("Mô phỏng kết thúc. Bạn đã đến nơi!", "success");
        handleStopNavigation();
        return;
      }

      const p1 = coords[index];
      const p2 = coords[index + 1];

      const dy = p2[1] - p1[1];
      const dx = (p2[0] - p1[0]) * Math.cos((p1[1] * Math.PI) / 180);
      const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
      setSimulatedHeading(angle);
      setSimulatedCoords(p2);

      mapRef.current?.easeTo({
        center: p2,
        bearing: angle,
        pitch: 60,
        zoom: 17.5,
        duration: 300,
      });

      if (routeData.steps && routeData.steps.length > 0) {
        const nextStepInfo = routeData.steps[currentStepIndex + 1];
        if (nextStepInfo) {
          const [nextLng, nextLat] = nextStepInfo.maneuver.location;
          const distToNext = getDistanceMeters(p2[1], p2[0], nextLat, nextLng);
          setDistanceToNextStep(distToNext);

          if (distToNext < 25) {
            setCurrentStepIndex((prev) => prev + 1);
          }

          if (
            distToNext < 100 &&
            distToNext > 45 &&
            approachSpokenRef.current !== currentStepIndex
          ) {
            speakInstruction(`Chuẩn bị ${nextStepInfo.maneuver.instruction}`);
            approachSpokenRef.current = currentStepIndex;
          }
        } else {
          const lastStep = routeData.steps[routeData.steps.length - 1];
          if (lastStep) {
            const [destLng, destLat] = lastStep.maneuver.location;
            const distToDest = getDistanceMeters(p2[1], p2[0], destLat, destLng);
            setDistanceToNextStep(distToDest);
            if (distToDest < 15) {
              speakInstruction("Bạn đã đến nơi. Chuyến đi kết thúc.");
              showPremiumToast("Mô phỏng kết thúc. Bạn đã đến nơi!", "success");
              handleStopNavigation();
            }
          }
        }
      }

      simulationIndexRef.current = index + 1;
    };

    simulationIntervalRef.current = setInterval(
      runSimulationStep,
      1000 / simulationSpeed
    );
  };

  const pauseSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  // Adjust simulation speed
  useEffect(() => {
    if (isSimulating && isSimulationMode) {
      startSimulation(true);
    }
  }, [simulationSpeed]);

  const handleStartRealNavigation = () => {
    setIsSimulationMode(false);
    setIsNavigating(true);
    setCurrentStepIndex(0);
    lastSpokenStepIndexRef.current = -1;
    approachSpokenRef.current = -1;

    if (!navigator.geolocation) {
      showPremiumToast("Thiết bị không hỗ trợ GPS.", "error");
      return;
    }

    if (watchPositionId.current !== null) return;

    if (routeData?.steps?.[0]) {
      speakInstruction(routeData.steps[0].maneuver.instruction);
    }

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;

        setUserLocation({ lng: longitude, lat: latitude });

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 18,
          pitch: 60,
          bearing: heading ?? 0,
          duration: 500,
        });

        // Tự động tìm lại đường khi lệch hướng
        if (routeData && routeData.coordinates.length > 1) {
          let minDist = Infinity;
          for (let i = 0; i < routeData.coordinates.length - 1; i++) {
            const dist = getDistanceToSegment(
              [longitude, latitude],
              routeData.coordinates[i],
              routeData.coordinates[i + 1]
            );
            if (dist < minDist) minDist = dist;
          }

          if (minDist > 60) {
            speakInstruction("Bạn đã đi chệch hướng. Đang tính toán lại lộ trình.");
            showPremiumToast("Đang tự động tính toán lại lộ trình...", "warning");
            setOrigin({
              lat: latitude,
              lng: longitude,
              label: "Vị trí của bạn (tính lại)",
            });
            return;
          }
        }

        if (routeData?.steps && routeData.steps.length > 0) {
          const nextStepInfo = routeData.steps[currentStepIndex + 1];
          if (nextStepInfo) {
            const [nextLng, nextLat] = nextStepInfo.maneuver.location;
            const distToNext = getDistanceMeters(
              latitude,
              longitude,
              nextLat,
              nextLng
            );
            setDistanceToNextStep(distToNext);

            if (distToNext < 25) {
              setCurrentStepIndex((prev) => prev + 1);
            }

            if (
              distToNext < 100 &&
              distToNext > 45 &&
              approachSpokenRef.current !== currentStepIndex
            ) {
              speakInstruction(`Chuẩn bị ${nextStepInfo.maneuver.instruction}`);
              approachSpokenRef.current = currentStepIndex;
            }
          } else {
            const lastStep = routeData.steps[routeData.steps.length - 1];
            if (lastStep) {
              const [destLng, destLat] = lastStep.maneuver.location;
              const distToDest = getDistanceMeters(
                latitude,
                longitude,
                destLat,
                destLng
              );
              setDistanceToNextStep(distToDest);
              if (distToDest < 15) {
                speakInstruction("Bạn đã đến nơi. Chuyến đi kết thúc.");
                showPremiumToast("Bạn đã đến nơi!", "success");
                handleStopNavigation();
              }
            }
          }
        }
      },
      (err) => {
        console.error(err);
        showPremiumToast("Không thể lấy GPS.", "error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  };

  const handleStartSimulationNavigation = () => {
    setIsSimulationMode(true);
    setIsNavigating(true);

    if (routeData?.steps?.[0]) {
      speakInstruction(routeData.steps[0].maneuver.instruction);
    }

    startSimulation(false);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setIsSimulationMode(false);
    setIsSimulating(false);
    setSimulatedCoords(null);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (watchPositionId.current !== null) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
    }
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, zoom: 14 });
    window.speechSynthesis.cancel();
  };

  // Cleanup simulation and GPS watchers on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      if (watchPositionId.current !== null) {
        navigator.geolocation.clearWatch(watchPositionId.current);
      }
    };
  }, []);

  return {
    isNavigating,
    setIsNavigating,
    isSimulationMode,
    setIsSimulationMode,
    isSimulating,
    setIsSimulating,
    simulatedCoords,
    setSimulatedCoords,
    simulatedHeading,
    setSimulatedHeading,
    simulationSpeed,
    setSimulationSpeed,
    isVoiceMuted,
    setIsVoiceMuted,
    currentStepIndex,
    setCurrentStepIndex,
    distanceToNextStep,
    setDistanceToNextStep,
    handleStartRealNavigation,
    handleStartSimulationNavigation,
    handleStopNavigation,
    speakInstruction,
    startSimulation,
    pauseSimulation,
  };
};
