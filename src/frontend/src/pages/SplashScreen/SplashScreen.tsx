import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Tuyển chọn 3 bức ảnh góc rộng lộng lẫy nhất của Đà Nẵng để tối ưu tốc độ tải
const DA_NANG_SLIDES = [
    'https://images.pexels.com/photos/2162723/pexels-photo-2162723.jpeg', // Cầu Rồng ban đêm
    // 'https://images.pexels.com/photos/6136132/pexels-photo-6136132.jpeg', // Cầu Vàng trong sương
    // 'https://images.pexels.com/photos/14438239/pexels-photo-14438239.jpeg', // Phong cảnh
    'https://images.pexels.com/photos/5037910/pexels-photo-5037910.jpeg', // Biển
    // 'https://images.pexels.com/photos/1064886/pexels-photo-1064886.jpeg', // Kiến trúc
    'https://images.pexels.com/photos/36947721/pexels-photo-36947721.jpeg', // Toàn cảnh
];

export default function SplashScreen() {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    // State quản lý dòng chữ đang loading (GIỮ NGUYÊN)
    const [loadingText, setLoadingText] = useState("Đang khởi tạo hệ thống...");

    useEffect(() => {
        // 1. Logic đổi ảnh nền (2s / ảnh)
        const slideInterval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % DA_NANG_SLIDES.length);
        }, 2000);

        // 2. Logic điều hướng (5s thì chuyển trang)
        const redirectTimeout = setTimeout(() => {
            navigate('/login');
        }, 5000);

        // 3. Chuỗi text loading chạy theo kịch bản thời gian thực (GIỮ NGUYÊN)
        const textTimer1 = setTimeout(() => setLoadingText("Cập nhật bản đồ điểm đến hôm nay..."), 1800);
        const textTimer2 = setTimeout(() => setLoadingText("Hệ thống sẵn sàng. Lên đường thôi!..."), 3600);

        // Dọn dẹp bộ nhớ
        return () => {
            clearInterval(slideInterval);
            clearTimeout(redirectTimeout);
            clearTimeout(textTimer1);
            clearTimeout(textTimer2);
        };
    }, [navigate]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex items-center justify-center font-sans">

            {/* KHU VỰC 1: Slider ảnh nền chuyển động mờ chồng (Ken Burns Effect) */}
            {DA_NANG_SLIDES.map((img, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-[1500ms] ease-in-out ${index === currentSlide ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                        }`}
                    style={{ backgroundImage: `url(${img})` }}
                />
            ))}

            {/* Lớp phủ điện ảnh (Cinematic Overlay) làm dịu hậu cảnh và tăng độ tương phản */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70 z-0"></div>

            {/* KHU VỰC 2: Khung kính mờ nguyên khối (Premium Glassmorphism Card) */}
            <div className="relative z-10 w-[90%] max-w-xl p-10 md:p-14 rounded-3xl bg-slate-900/30 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center transition-all duration-500">

                {/* Đèn nền Neon ẩn phía sau khung kính tạo hiệu ứng chiều sâu 3D */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 blur-2xl z-0 pointer-events-none"></div>

                <div className="relative z-10 w-full flex flex-col items-center">

                    {/* LOGO DESIGNER VERSION: Tinh tế, Tối giản và Cao cấp */}
                    <div className="relative w-28 h-28 mb-4 flex items-center justify-center transition-transform duration-700 hover:scale-105">

                        {/* Vầng hào quang (Glow) tỏa sáng nhẹ nhàng phía sau logo */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>

                        <svg viewBox="0 0 24 24" className="relative z-10 w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <defs>
                                {/* Gradient Xanh dương cho vỏ Bản Đồ */}
                                <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#60A5FA" />
                                    <stop offset="100%" stopColor="#2DD4BF" />
                                </linearGradient>

                                {/* Gradient Xanh ngọc cho lõi Nhịp Đập */}
                                <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#34D399" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                            </defs>

                            {/* LỚP 1: Vỏ ngoài - Biểu tượng Map Pin thanh thoát */}
                            <path
                                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                                stroke="url(#pinGrad)"
                                strokeWidth="1.2"
                            />

                            {/* LỚP 2: Lõi trong - Đường nhịp tim (Pulse) cân xứng tuyệt đối */}
                            <path
                                d="M7 10h2l1.5-4 3 8 1.5-4h2"
                                stroke="url(#pulseGrad)"
                                strokeWidth="1.5"
                                className="animate-pulse" /* Thêm nhịp đập nhẹ cho trái tim của logo */
                            />
                        </svg>
                    </div>
                    {/* TIÊU ĐỀ CHÍNH: Phông chữ cứng cáp, phối màu Gradient sang trọng */}
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-[0.2em] uppercase text-center mb-3 drop-shadow-lg">
                        DA NANG <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)] block mt-1 md:inline md:mt-0">- PULSE</span>
                    </h1>

                    {/* TIÊU ĐỀ PHỤ: Câu slogan đắt giá của bạn, căn chỉnh mật độ gọn gàng */}
                    <p className="text-slate-200 text-base md:text-lg font-medium tracking-wide text-center max-w-sm mb-10 drop-shadow-sm">
                        Theo nhịp đô thị, mở lối vi vu.
                    </p>

                    {/* THANH TIẾN TRÌNH CÔNG NGHỆ CAO */}
                    <div className="w-full max-w-sm h-4 bg-slate-950/80 rounded-full p-0.5 border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] overflow-hidden mb-5">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] relative animate-[loading_5s_linear_forwards]">
                            {/* Hiệu ứng tia sáng bóng loáng quét dọc thanh cuộn */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
                        </div>
                    </div>

                    {/* DÒNG CHỮ TRẠNG THÁI CHẠY ĐỘNG */}
                    <p className="text-emerald-400 font-semibold text-xs md:text-sm tracking-[0.15em] uppercase h-5 text-center transition-all duration-500 ease-out animate-pulse">
                        {loadingText}
                    </p>

                </div>
            </div>
        </div>
    );
}