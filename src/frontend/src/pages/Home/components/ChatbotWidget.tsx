import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Trash2, MapPin } from 'lucide-react';

// Tạo sessionId duy nhất cho tab/browser session này
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

interface UserCoords {
    lat: number;
    lng: number;
}

const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([
        { role: 'bot', text: 'Xin chào! 👋 Mình là trợ lý Smart Map Đà Nẵng.\nBạn có thể hỏi mình về:\n• Quán ăn, địa điểm du lịch\n• Sự kiện đang diễn ra\n• Tình trạng giao thông\n• Vùng ngập lụt' }
    ]);
    const [input, setInput]         = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Xin quyền vị trí khi mở chat
    useEffect(() => {
        if (isOpen && locationStatus === 'idle') {
            if (!navigator.geolocation) {
                setLocationStatus('denied');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocationStatus('granted');
                },
                () => {
                    setLocationStatus('denied');
                },
                { timeout: 5000, maximumAge: 60000 }
            );
        }
    }, [isOpen, locationStatus]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            const body: Record<string, unknown> = {
                message: userMsg,
                sessionId: SESSION_ID,
            };

            // Gửi tọa độ lên backend nếu đã có (cho tính năng "gần đây")
            if (userCoords) {
                body.userLat = userCoords.lat;
                body.userLng = userCoords.lng;
            }

            const response = await fetch('http://localhost:5001/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: 'Xin lỗi, hệ thống đang bận. Vui lòng thử lại.' }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: 'bot', text: 'Không thể kết nối với máy chủ. Vui lòng kiểm tra kết nối.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        try {
            await fetch('http://localhost:5001/api/chatbot/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: SESSION_ID }),
            });
        } catch (_) {}
        setMessages([{ role: 'bot', text: 'Đã xóa lịch sử. Mình có thể giúp gì cho bạn?' }]);
    };

    const requestLocation = () => {
        setLocationStatus('idle');
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
                >
                    <MessageSquare size={24} />
                </button>
            )}

            {isOpen && (
                <div className="w-80 h-[520px] bg-white shadow-2xl rounded-2xl flex flex-col border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">🗺️ Trợ lý Smart Map</span>
                            {locationStatus === 'granted' && (
                                <span title="Đang dùng vị trí của bạn" className="text-green-300">
                                    <MapPin size={13} />
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {locationStatus === 'denied' && (
                                <button
                                    onClick={requestLocation}
                                    title="Bật vị trí để tìm địa điểm gần bạn"
                                    className="hover:bg-blue-700 p-1 rounded opacity-70 hover:opacity-100 text-xs"
                                >
                                    <MapPin size={15} />
                                </button>
                            )}
                            <button
                                onClick={handleClearHistory}
                                title="Xóa lịch sử"
                                className="hover:bg-blue-700 p-1 rounded opacity-80 hover:opacity-100"
                            >
                                <Trash2 size={15} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Location denied banner */}
                    {locationStatus === 'denied' && (
                        <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-1.5 text-xs text-yellow-700 flex items-center gap-1">
                            <MapPin size={11} />
                            <span>Chưa có vị trí — không thể sắp xếp theo khoảng cách</span>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[88%] p-3 rounded-xl text-sm whitespace-pre-wrap leading-relaxed ${
                                    m.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white shadow-sm border border-gray-100 text-gray-800'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white shadow-sm border border-gray-100 p-3 rounded-xl">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-white flex items-center gap-2">
                        <input
                            className="flex-1 border border-gray-300 rounded-full px-4 py-2 outline-none focus:border-blue-500 text-sm"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Hỏi về địa điểm, sự kiện..."
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading}
                            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatbotWidget;