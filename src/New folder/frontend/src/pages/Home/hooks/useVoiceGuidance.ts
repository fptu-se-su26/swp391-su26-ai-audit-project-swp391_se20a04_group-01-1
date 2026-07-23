import { useCallback, useEffect, useRef, useState } from 'react';

export function useVoiceGuidance() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const synth = useRef<SpeechSynthesis | null>(null);

  // Khởi tạo và kiểm tra hỗ trợ của trình duyệt
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synth.current = window.speechSynthesis;
      setIsSupported(true);
      
      // Kích hoạt load giọng nói sớm (tránh lỗi lấy giọng nói bị delay trên Chrome)
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synth.current) {
      console.warn("Trình duyệt của bạn không hỗ trợ tính năng đọc giọng nói (Web Speech API).");
      return;
    }

    // Hủy bỏ câu đang đọc dở (nếu có) để ưu tiên đọc cảnh báo mới nhất
    synth.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Cấu hình ngôn ngữ và tốc độ đọc
    utterance.lang = 'vi-VN'; // Ép kiểu đọc tiếng Việt
    utterance.rate = 1.0;     // Tốc độ bình thường (0.1 đến 10)
    utterance.pitch = 1.0;    // Cao độ bình thường (0 đến 2)

    // Cố gắng tìm giọng nam/nữ tiếng Việt chuẩn nếu trình duyệt có hỗ trợ nhiều giọng
    const voices = synth.current.getVoices();
    const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.includes('vi'));
    
    if (viVoice) {
      utterance.voice = viVoice;
    }

    // Bắt đầu đọc
    synth.current.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (synth.current) {
      synth.current.cancel();
    }
  }, []);

  return { speak, stop, isSupported };
}