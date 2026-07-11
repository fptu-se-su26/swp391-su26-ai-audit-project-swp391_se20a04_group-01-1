import { useCallback, useEffect, useState } from "react";
import { usePreferenceStore } from "../../../store/preferenceStore";

export function useVoiceGuidance() {
  const [supported, setSupported] = useState(true);
  const { preferences } = usePreferenceStore();

  // Lấy trạng thái bật/tắt từ Cài đặt, mặc định là true
  const isEnabled = preferences?.enable_voice_guide ?? true;

  // Kiểm tra xem trình duyệt có hỗ trợ Web Speech API không
  useEffect(() => {
    if (typeof window === "undefined") {
      setSupported(false);
      return;
    }

    if (!("speechSynthesis" in window)) {
      setSupported(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !isEnabled) return;

      if (text.trim() === "") return;

      window.speechSynthesis.cancel(); // Xóa bộ đệm chống kẹt giọng

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.05;
      utterance.pitch = 1.15;

      // Tìm giọng AI tiếng Việt tốt nhất có thể
      const voices = window.speechSynthesis.getVoices();
      const viVoices = voices.filter((v) => v.lang.includes("vi"));

      if (viVoices.length > 0) {
        const googleVoice = viVoices.find((v) => v.name.includes("Google"));
        const premiumVoice = viVoices.find(
          (v) => v.name.includes("Premium") || v.name.includes("Enhanced"),
        );
        utterance.voice = googleVoice || premiumVoice || viVoices[0];
        console.log("[Voice] Đang dùng giọng:", utterance.voice?.name);
      }

      window.speechSynthesis.speak(utterance);
    },
    [supported, isEnabled],
  );
  const cancel = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
  };

  return { supported, isEnabled, speak, cancel };
}
