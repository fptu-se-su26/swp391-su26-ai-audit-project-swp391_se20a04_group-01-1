import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferenceStore } from "../../../store/preferenceStore";

export function useVoiceGuidance() {
  const [supported, setSupported] = useState(true);
  const { preferences, fetchPreferences } = usePreferenceStore();
  //  FIX: cache danh sách giọng đọc. speechSynthesis.getVoices() tải bất
  // đồng bộ - lần gọi đầu tiên (ngay lúc app mở) thường trả về mảng RỖNG,
  // nên trước đây câu thông báo "Bắt đầu dẫn đường" (phát ra ngay khi bấm
  // Bắt đầu) không tìm thấy giọng tiếng Việt và bị phát bằng giọng mặc định
  // (thường là tiếng Anh). Phải lắng nghe sự kiện "voiceschanged" để lấy
  // đúng danh sách giọng đã tải xong.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  //  FIX: Fetch preferences khi component mount để đảm bảo enable_voice_guide được load
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

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
      return;
    }

    //  FIX: tải trước danh sách giọng đọc ngay khi hook được mount, và cập
    // nhật lại mỗi khi trình duyệt báo danh sách đã sẵn sàng.
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !isEnabled) {
        console.log("[Voice] Voice guidance disabled or not supported");
        return;
      }

      if (text.trim() === "") return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "vi-VN";
        utterance.rate = 1.05;
        utterance.pitch = 1.15;
        utterance.volume = 1; //  Đảm bảo âm lượng tối đa

        const voices = voicesRef.current;
        const viVoices = voices.filter((v) => v.lang.toLowerCase().includes("vi"));

        console.log(
          "[Voice] Tổng số giọng có sẵn:",
          voices.length,
          "| Giọng tiếng Việt tìm thấy:",
          viVoices.map((v) => `${v.name} (${v.lang})`),
        );

        if (viVoices.length > 0) {
          const googleVoice = viVoices.find((v) => v.name.includes("Google"));
          const premiumVoice = viVoices.find(
            (v) => v.name.includes("Premium") || v.name.includes("Enhanced"),
          );
          utterance.voice = googleVoice || premiumVoice || viVoices[0];
          console.log("[Voice] Sử dụng giọng:", utterance.voice?.name, "| Volume:", utterance.volume, "| Rate:", utterance.rate);
        } else {
          // ⚠️ Nếu dòng này xuất hiện, trình duyệt/thiết bị này KHÔNG cài sẵn
          // giọng đọc tiếng Việt nào (đây là giới hạn của hệ điều hành/trình
          // duyệt, không phải lỗi code) - utterance.lang vẫn để "vi-VN" nhưng
          // trình duyệt sẽ tự chọn giọng mặc định (thường là tiếng Anh) để đọc.
          console.log("[Voice] Không tìm thấy giọng Việt nào được cài trên thiết bị này, dùng giọng mặc định của trình duyệt");
        }

        // Thiết lập event listeners để debug
        utterance.onstart = () => {
          console.log("[Voice] Bắt đầu phát:", text);
        };
        utterance.onend = () => {
          console.log("[Voice] Kết thúc phát");
        };
        utterance.onerror = (event) => {
          console.error("[Voice] Lỗi phát âm thanh:", event.error);
        };

        window.speechSynthesis.speak(utterance);
      };

      //  FIX: nếu danh sách giọng đọc CHƯA tải xong (mảng rỗng) vào đúng lúc
      // gọi speak() lần đầu tiên, đợi tối đa 300ms cho sự kiện "voiceschanged"
      // thay vì phát ngay với giọng mặc định (tiếng Anh).
      if (voicesRef.current.length === 0) {
        const freshVoices = window.speechSynthesis.getVoices();
        if (freshVoices.length > 0) {
          voicesRef.current = freshVoices;
          doSpeak();
          return;
        }

        let done = false;
        const onVoicesReady = () => {
          if (done) return;
          done = true;
          voicesRef.current = window.speechSynthesis.getVoices();
          window.speechSynthesis.removeEventListener("voiceschanged", onVoicesReady);
          doSpeak();
        };
        window.speechSynthesis.addEventListener("voiceschanged", onVoicesReady);
        setTimeout(() => {
          if (done) return;
          done = true;
          window.speechSynthesis.removeEventListener("voiceschanged", onVoicesReady);
          doSpeak(); // Hết thời gian chờ - đành phát với giọng hiện có (có thể vẫn rỗng)
        }, 300);
        return;
      }

      doSpeak();
    },
    [supported, isEnabled],
  );

  const cancel = () => {
    if (!supported) return;
    console.log("[Voice] Hủy phát âm thanh");
    window.speechSynthesis.cancel();
  };

  return { supported, isEnabled, speak, cancel };
}