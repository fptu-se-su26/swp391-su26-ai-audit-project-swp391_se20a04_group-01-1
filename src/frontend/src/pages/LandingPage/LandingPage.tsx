import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Map, ArrowRight, Calendar, AlertTriangle, Users, Sparkles, Navigation } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [eventCount, setEventCount] = useState(528);

    // Dynamic animation effect for changing event count slightly to feel alive
    useEffect(() => {
        const interval = setInterval(() => {
            setEventCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleExplore = () => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/home');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="relative min-h-screen w-full font-sans overflow-x-hidden flex flex-col justify-between selection:bg-blue-500 selection:text-white">
            
            {/* 1. Background image with deep modern dark overlay */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 z-0"
                style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1596422846543-75c6fc18a52b?auto=format&fit=crop&w=1920&q=80')",
                }}
            >
                {/* Modern gradient overlay for rich contrast & readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/90 z-10" />
                
                {/* Decorative glowing blobs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse duration-[8000ms] pointer-events-none z-10" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse duration-[6000ms] pointer-events-none z-10" />
            </div>

            {/* 2. Floating Glassmorphic Header */}
            <header className="relative w-full z-20 px-6 py-4 md:px-12 flex justify-between items-center backdrop-blur-md bg-black/20 border-b border-white/5">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_4px_15px_rgba(37,99,235,0.4)]">
                        <MapPin className="text-white w-5.5 h-5.5" />
                    </div>
                    <span className="text-xl font-extrabold text-white tracking-tight">
                        DaNang<span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent"> EventMap</span>
                    </span>
                </div>

                {/* Desktop Nav Links */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                    <a href="#features" className="hover:text-white transition-colors duration-200">Tính năng</a>
                    <a href="#about" className="hover:text-white transition-colors duration-200">Giới thiệu</a>
                    <a href="#contact" className="hover:text-white transition-colors duration-200">Liên hệ</a>
                </nav>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/login')}
                        className="text-sm font-semibold text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all duration-200 border border-white/10 backdrop-blur-sm"
                    >
                        Đăng nhập
                    </button>
                    <button 
                        onClick={() => navigate('/register')}
                        className="hidden sm:inline-block text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_4px_15px_rgba(37,99,235,0.35)] transition-all duration-200"
                    >
                        Đăng ký
                    </button>
                </div>
            </header>

            {/* 3. Hero Section (Centered Content) */}
            <main className="relative z-20 flex-grow flex flex-col justify-center items-center px-4 py-16 text-center max-w-6xl mx-auto w-full">
                
                {/* Glow Icon Container */}
                <div className="mb-6 p-4 rounded-full bg-blue-500/10 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.25)] backdrop-blur-sm animate-bounce duration-1000 inline-flex items-center justify-center">
                    <MapPin className="w-10 h-10 text-white animate-pulse" />
                </div>

                {/* Premium Main Heading */}
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 select-none leading-none">
                    DaNang 
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(56,189,248,0.2)]"> EventMap</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed mb-10 font-light px-2">
                    Bản đồ sự kiện thông minh &ndash; Khám phá nhịp sống thành phố theo cách của riêng bạn.
                </p>

                {/* Responsive Call to Action Button Group */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md sm:max-w-none">
                    
                    {/* Primary Button */}
                    <button
                        onClick={handleExplore}
                        className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white font-semibold text-base px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(37,99,235,0.45)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.6)] hover:scale-[1.03] transition-all duration-300"
                    >
                        <Map className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                        <span>Khám phá bản đồ ngay</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>

                    {/* Outline Button */}
                    <button
                        onClick={() => {
                            const featuresSection = document.getElementById('features');
                            if (featuresSection) {
                                featuresSection.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/30 hover:border-white/80 hover:bg-white/10 text-white font-semibold text-base px-8 py-4 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-[1.03]"
                    >
                        <span>Tìm hiểu thêm</span>
                    </button>
                </div>

                {/* Modern Glassmorphic Cards showcasing core capabilities (Under Hero) */}
                <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full px-4 text-left">
                    
                    {/* Card 1 */}
                    <div className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-6 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Bản đồ Sự kiện Real-time</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Cập nhật liên tục các lễ hội, triển lãm, show ca nhạc và sự kiện thể thao lớn nhỏ tại Đà Nẵng.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-6 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <AlertTriangle className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Cảnh báo kẹt xe & Ngập lụt</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Đảm bảo lộ trình di chuyển của bạn luôn thông suốt với dữ liệu cảnh báo an toàn từ cộng đồng và chính quyền.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-6 backdrop-blur-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Giao lưu & Kết nối cộng đồng</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Chia sẻ trải nghiệm của bạn, đánh giá sự kiện và tương tác trực tiếp với các bạn trẻ có cùng sở thích.
                        </p>
                    </div>

                </div>

            </main>

            {/* 4. Elegant Footer */}
            <footer className="relative z-20 w-full px-6 py-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 backdrop-blur-md bg-black/40 border-t border-white/5 mt-auto">
                
                {/* Blink/pulse event counter badge requested by the user */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-950/60 to-cyan-950/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] animate-pulse">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-spin duration-[4000ms]" />
                    <span className="text-xs sm:text-sm font-semibold tracking-wide text-cyan-200">
                        🎉 {eventCount}+ Sự kiện đang diễn ra hôm nay
                    </span>
                </div>

                <div className="text-xs text-gray-400 font-medium">
                    &copy; 2026 DaNang EventMap. All rights reserved.
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                    <span>Phát triển bởi</span>
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-bold">Group 01</span>
                </div>
            </footer>
        </div>
    );
}
