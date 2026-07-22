import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Không có quyền truy cập Micro. Vui lòng bật Micro trong cài đặt trình duyệt.');
        } else if (event.error === 'no-speech') {
          setError('Không nhận diện được giọng nói. Vui lòng nói lại.');
        } else if (event.error === 'audio-capture') {
          setError('Không tìm thấy thiết bị thu âm (Microphone).');
        } else {
          setError('Lỗi nhận diện giọng nói: ' + event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors on cleanup
        }
      }
    };
  }, []);

  const startListening = useCallback((lang: string = 'vi-VN') => {
    if (!recognitionRef.current) {
      setError('Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói (Web Speech API).');
      return;
    }
    setTranscript('');
    setError(null);
    try {
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
    } catch (e: any) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 100);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop error
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
