import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Mic, MicOff, X, Bot, Loader2, Navigation, Star, Compass, CloudRain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";

// Nhận diện giọng nói Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

let recognition: any = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "vi-VN";
  recognition.interimResults = false;
}

interface LocationPoint {
  lng: number;
  lat: number;
  label: string;
}

interface AIChatbotProps {
  origin: LocationPoint | null;
  setOrigin: (point: LocationPoint | null) => void;
  setOriginQuery: (query: string) => void;
  destination: LocationPoint | null;
  setDestination: (point: LocationPoint | null) => void;
  setDestinationQuery: (query: string) => void;
  travelMode: "driving" | "walking" | "cycling";
  setTravelMode: (mode: "driving" | "walking" | "cycling") => void;
  avoidFlood: boolean;
  setAvoidFlood: (avoid: boolean) => void;
  avoidCongestion: boolean;
  setAvoidCongestion: (avoid: boolean) => void;
  mapRef: React.RefObject<any>;
  userLocation: { lat: number; lng: number } | null;
}

interface Message {
  role: "user" | "model";
  text: string;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  origin,
  setOrigin,
  setOriginQuery,
  destination,
  setDestination,
  setDestinationQuery,
  travelMode,
  setTravelMode,
  avoidFlood,
  setAvoidFlood,
  avoidCongestion,
  setAvoidCongestion,
  mapRef,
  userLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Xin chào! Tôi là Trợ lý DNPulse Assistant. Tôi có thể chỉ đường thông minh, tránh ngập lụt, tìm kiếm các sự kiện lễ hội lớn hay đề xuất các địa điểm du lịch & ẩm thực tại Đà Nẵng. Bạn cần tôi giúp gì hôm nay?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Thiết lập sự kiện Nhận diện giọng nói
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInput(speechToText);
      toast.success("Đã ghi nhận giọng nói của bạn!");
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Lỗi nhận diện giọng nói:", event.error);
      toast.error("Không thể nhận diện được giọng nói. Vui lòng thử lại!");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      toast.error("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói tiếng Việt.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
      toast("Đang lắng nghe... Vui lòng nói.", { icon: "🎤" });
    }
  };

  // Gửi tin nhắn lên Backend AI
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    setInput("");

    // Thêm tin nhắn của user vào history
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

      // Chuyển đổi lịch sử chat cho API khớp với Backend format
      const history = messages.slice(1).map((msg) => ({
        role: msg.role,
        text: msg.text,
      }));

      // Đính kèm GPS của người dùng (nếu có) vào mỗi request
      const gpsContext = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : null;

      const response = await axios.post(`${apiUrl}/api/ai/chat`, {
        message: userMsg,
        history: history,
        userLocation: gpsContext,
      });

      const data = response.data;

      if (data.success) {
        // Thêm câu trả lời của AI
        setMessages((prev) => [...prev, { role: "model", text: data.text }]);

        // Thực thi các hành động (Actions) gửi từ Backend
        if (data.actions && data.actions.length > 0) {
          data.actions.forEach((action: any) => {
            if (action.type === "SET_ROUTE") {
              const {
                origin: actOrigin,
                destination: actDest,
                travelMode: actMode,
                avoidFlood: actAvoidFlood,
                avoidCongestion: actAvoidCongestion,
              } = action.payload;

              // Cập nhật điểm xuất phát
              if (actOrigin && actOrigin.label === "GPS_USER") {
                // AI yêu cầu dùng GPS của người dùng
                if (userLocation) {
                  setOrigin({ lat: userLocation.lat, lng: userLocation.lng, label: "Vị trí của bạn" });
                  setOriginQuery("Vị trí của bạn");
                } else {
                  toast.error("Chưa xác định được vị trí GPS của bạn. Hãy bật định vị!");
                }
              } else if (actOrigin) {
                setOrigin({
                  lat: parseFloat(actOrigin.lat),
                  lng: parseFloat(actOrigin.lng),
                  label: actOrigin.label,
                });
                setOriginQuery(actOrigin.label);
              } else if (userLocation) {
                // Fallback: nếu AI không chỉ định điểm đi, dùng GPS thực tế của người dùng
                setOrigin({ lat: userLocation.lat, lng: userLocation.lng, label: "Vị trí của bạn" });
                setOriginQuery("Vị trí của bạn");
              }

              // Cập nhật điểm đến
              if (actDest) {
                setDestination({
                  lat: parseFloat(actDest.lat),
                  lng: parseFloat(actDest.lng),
                  label: actDest.label,
                });
                setDestinationQuery(actDest.label);
              }

              // Cập nhật các bộ lọc tránh đường
              if (actMode) setTravelMode(actMode);
              if (actAvoidFlood !== undefined) setAvoidFlood(actAvoidFlood);
              if (actAvoidCongestion !== undefined) setAvoidCongestion(actAvoidCongestion);

              // Điều khiển camera di chuyển bản đồ đến điểm đến
              if (actDest && mapRef.current) {
                mapRef.current.flyTo({
                  center: [parseFloat(actDest.lng), parseFloat(actDest.lat)],
                  zoom: 14,
                  duration: 2000,
                });
              }

              toast.success("🗺️ Bản đồ đã cập nhật lộ trình thông minh!");
            }
          });
        }
      } else {
        toast.error("Có lỗi xảy ra khi liên hệ với trợ lý AI.");
      }
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn AI:", error);
      toast.error("Lỗi kết nối tới Server AI Agent.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <>
      {/* 1. NÚT CHAT BONG BÓNG LƠ LỬNG */}
      <div className="fixed bottom-6 right-6 md:right-12 z-40">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-[0_8px_30px_rgb(59,130,246,0.5)] border border-blue-400/30 overflow-hidden"
        >
          {/* Hiệu ứng phát sáng lấp lánh */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] animate-pulse" />
          {isOpen ? <X className="w-6 h-6 z-10" /> : <Bot className="w-7 h-7 z-10 animate-bounce" />}
        </motion.button>
      </div>

      {/* 2. KHUNG CHAT AI DRAW SIDEBAR */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-0 right-0 md:bottom-24 md:right-6 w-full h-full md:w-96 md:h-[520px] bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 md:rounded-2xl rounded-none shadow-2xl z-40 flex flex-col overflow-hidden text-slate-100 font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700/80 to-indigo-800/80 px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">DNPulse Assistant</h3>
                  <span className="text-[10px] text-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    Trợ lý dẫn đường AI
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {messages.map((msg, index) => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={index}
                    className={`flex ${isModel ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md leading-relaxed whitespace-pre-wrap ${isModel
                        ? "bg-slate-800/90 border border-slate-700/50 text-slate-200 rounded-tl-none"
                        : "bg-blue-600 text-white rounded-tr-none"
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/90 border border-slate-700/50 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm shadow-md flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span>DNPulse đang suy nghĩ...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Pills */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
              <button
                onClick={() => handleQuickPrompt("Thời tiết hôm nay ở các quận Đà Nẵng thế nào?")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-[11px] text-slate-300 font-medium shrink-0 transition-colors"
              >
                <CloudRain className="w-3 h-3 text-sky-400" />
                Thời tiết hôm nay
              </button>
              <button
                onClick={() => handleQuickPrompt("Gợi ý các địa điểm du lịch nổi bật tại Đà Nẵng")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-[11px] text-slate-300 font-medium shrink-0 transition-colors"
              >
                <Compass className="w-3 h-3 text-emerald-400" />
                Địa điểm nổi bật
              </button>
              <button
                onClick={() => handleQuickPrompt("Tìm các điểm ngập lụt hiện tại và chỉ đường tránh ngập từ Cầu Rồng đến Bách Khoa")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-[11px] text-slate-300 font-medium shrink-0 transition-colors"
              >
                <Navigation className="w-3 h-3 text-red-400" />
                Tránh đường ngập
              </button>
              <button
                onClick={() => handleQuickPrompt("Hôm nay Đà Nẵng có sự kiện lễ hội gì lớn không?")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-[11px] text-slate-300 font-medium shrink-0 transition-colors"
              >
                <Star className="w-3 h-3 text-yellow-400" />
                Sự kiện hôm nay
              </button>
            </div>

            {/* Input Form Footer */}
            <form
              onSubmit={handleFormSubmit}
              className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 shrink-0"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi DNPulse Assistant..."
                  disabled={isLoading}
                  className="w-full bg-slate-800/60 border border-slate-700/60 text-slate-100 rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />

                {/* Voice Record Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isListening ? "text-red-500 animate-pulse" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
