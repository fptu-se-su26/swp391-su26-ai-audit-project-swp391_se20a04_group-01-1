import React, { useState } from 'react';
import { Volume2, VolumeX, Navigation } from 'lucide-react';

import { showPremiumToast } from '../../../../../utils/toastUtils';
import { usePreferenceStore } from '../../../../../store/preferenceStore';
import { useVoiceGuidance } from '../../../hooks/useVoiceGuidance';
import { saveRoute } from '../../../services/savedRouteService';

interface NavigationControlProps {
  origin: any;
  destination: any;
  originQuery: string;
  destinationQuery: string;
  routeData: any;
  travelMode: "driving" | "walking" | "cycling";
  onStartNavigation: () => void;
}

export const NavigationControl: React.FC<NavigationControlProps> = ({
  origin,
  destination,
  originQuery,
  destinationQuery,
  routeData,
  travelMode,
  onStartNavigation,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const { preferences, updatePreference } = usePreferenceStore();
  const { supported } = useVoiceGuidance();
  const isVoiceEnabled = preferences?.enable_voice_guide ?? true;

  const handleStartTrip = async () => {
    if (!origin || !destination || !routeData) return;
    setIsStarting(true);
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    
    try {
      if (token) {
        // Gọi thẳng hàm saveRoute
        await saveRoute({
          origin_name: originQuery || origin.label || "Vị trí hiện tại",
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_name: destinationQuery || destination.label || "Điểm đến",
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          route_name: `Lịch sử: ${originQuery || "Điểm đi"} ➔ ${destinationQuery || "Điểm đến"}`,
          route_data: JSON.stringify(routeData.coordinates),
          distance_meters: routeData.totalDistanceKm * 1000,
          duration_seconds: routeData.totalTimeMin * 60,
          profile: travelMode,
        });
      }
      onStartNavigation();
      showPremiumToast(token ? "Đã bắt đầu chuyến đi và lưu vào lịch sử!" : "Đã bắt đầu chuyến đi!", "success");
    } catch (error) {
      showPremiumToast("Đã bắt đầu chuyến đi nhưng không thể lưu lịch sử do lỗi mạng.", "warning");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-4">
      {supported && (
        <button onClick={() => updatePreference("enable_voice_guide", !isVoiceEnabled)} className={`p-3 rounded-xl border flex items-center justify-center transition-all ${isVoiceEnabled ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"}`}>
          {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      )}
      <button onClick={handleStartTrip} disabled={isStarting} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
        <Navigation size={18} /> {isStarting ? "ĐANG TẢI..." : "BẮT ĐẦU CHUYẾN ĐI"}
      </button>
    </div>
  );
};