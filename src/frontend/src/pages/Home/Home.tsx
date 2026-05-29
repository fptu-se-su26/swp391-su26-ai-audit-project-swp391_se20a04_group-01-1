import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Thêm import
import {
    Search, Navigation, Bell, User, LogOut, ArrowLeft, Settings,
    ShieldAlert, Ban, CloudRain, Compass, Utensils, Hotel,
    Gamepad2, Calendar, Landmark, DollarSign, ChevronRight,
    Layers, TrendingUp, Plus, Minus
} from 'lucide-react';

const filterCategories = [
    { id: 'attractions', label: 'Điểm tham quan', icon: Compass },
    { id: 'restaurants', label: 'Nhà hàng', icon: Utensils },
    { id: 'hotels', label: 'Khách sạn', icon: Hotel },
    { id: 'entertainment', label: 'Giải trí', icon: Gamepad2 },
    { id: 'events', label: 'Sự kiện', icon: Calendar },
    { id: 'museums', label: 'Bảo tàng', icon: Landmark },
    { id: 'atm', label: 'ATM', icon: DollarSign },
];

const mockAlerts = [
    { id: 1, type: 'flood', title: 'Ngập lụt', content: 'Đường Nguyễn Văn Linh đang có nguy cơ ngập cao, mức nước dự báo 20–30cm. Tránh di chuyển qua khu vực này.', location: 'Nguyễn Văn Linh, Hải Châu', time: 'Vừa cập nhật' },
    { id: 2, type: 'block', title: 'Cấm đường', content: 'Đường Trần Hưng Đạo bị cấm từ 18:00–23:00 do sự kiện DIFF 2026. Lưu ý lộ trình thay thế qua Hùng Vương.', location: 'Trần Hưng Đạo, Hải Châu', time: 'Có hiệu lực từ 18:00' },
    { id: 3, type: 'flood', title: 'Ngập lụt', content: 'Khu vực chân cầu Tuyên Sơn nước dâng nhanh do triều cường.', location: 'Chân cầu Tuyên Sơn', time: '10 phút trước' }
];

const mockEvents = [
    { id: 1, title: 'Cầu Rồng Phun Lửa & Phun Nước', time: '21:00', location: 'Cầu Rồng', status: 'LIVE', isLive: true },
    { id: 2, title: 'Lễ hội Ẩm thực Đà Nẵng 2026', time: '09:00', location: 'Quảng trường 29/3', status: 'LIVE', isLive: true },
    { id: 3, title: 'DIFF 2026 – Lễ hội Pháo hoa Quốc tế Đà Nẵng', time: '24/05 – 07/06/2026', location: 'Cầu Rồng & Bờ sông Hàn', status: 'Sắp diễn ra', isLive: false },
    { id: 4, title: 'Giải Chạy Biển Mỹ Khê 2026', time: 'Chủ Nhật 25/05/2026', location: 'Đường Võ Nguyên Giáp', status: 'Sắp diễn ra', isLive: false },
    { id: 5, title: 'Triển lãm Công nghệ FPT University', time: '15/06/2026', location: 'FPT Complex, Ngũ Hành Sơn', status: 'Sắp diễn ra', isLive: false }
];

export default function Home() {
    const navigate = useNavigate(); // ✅ Thêm
    const [showAlertPopup, setShowAlertPopup] = useState(true);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(1);

    // TRẠNG THÁI CHO THANH CÔNG CỤ BẢN ĐỒ GÓC PHẢI (Right Sidebar)
    const [mapControls, setMapControls] = useState({
        layers: true,
        traffic: true,
        flood: false
    });

    useEffect(() => {
        if (showAlertPopup) {
            const interval = setInterval(() => {
                setCountdown((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(interval);
                        setShowAlertPopup(false);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [showAlertPopup]);

    const handleFilterClick = (filterId: string) => {
        if (selectedFilter === filterId) {
            setSelectedFilter(null);
        } else {
            setSelectedFilter(filterId);
        }
    };

    const toggleMapControl = (controlName: keyof typeof mapControls) => {
        setMapControls(prev => ({ ...prev, [controlName]: !prev[controlName] }));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // ================= GIAO DIỆN MÀN HÌNH CHÍNH BẢN ĐỒ =================
    return (
        <div className="w-full h-screen relative bg-slate-100 overflow-hidden font-sans select-none">

            <div className="absolute inset-0 bg-[#e5e7eb] flex items-center justify-center z-0">
                <div className="text-slate-400 text-center">
                    <p className="text-xl font-bold">🗺️ LAYER BẢN ĐỒ MAPBOX</p>
                    <p className="text-sm mt-1">(Dữ liệu ngập lụt và sự kiện đô thị vẽ tại đây)</p>
                </div>
            </div>

            {/* ================= BAR TRÊN CÙNG ================= */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between gap-4 pointer-events-none">

                <div className="flex items-center gap-3 flex-1 max-w-[calc(100%-120px)] overflow-hidden pointer-events-auto">
                    <div className="w-72 h-[42px] bg-white rounded-full shadow-md border border-slate-200/60 flex items-center px-4 shrink-0">
                        <Search className="text-blue-500 mr-2 shrink-0" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-full bg-transparent outline-none text-xs font-medium text-slate-700 placeholder-slate-400"
                        />
                        <Navigation className="text-slate-400 ml-2 cursor-pointer hover:text-blue-500 shrink-0" size={16} />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
                        {filterCategories.map((cat) => {
                            const IconComponent = cat.icon;
                            const isSelected = selectedFilter === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleFilterClick(cat.id)}
                                    className={`flex items-center gap-1.5 px-4 h-[42px] rounded-full text-xs font-semibold shadow-md border transition-all whitespace-nowrap ${isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 scale-102'
                                        : 'bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50'
                                        }`}
                                >
                                    <IconComponent size={14} className={isSelected ? 'text-white' : 'text-slate-500'} />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pointer-events-auto relative">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotificationModal(!showNotificationModal)}
                            className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all"
                        >
                            <Bell size={18} />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        {showNotificationModal && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-30 animate-fade-up">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                                    <span>Cảnh báo thiên tai đô thị</span>
                                    <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black text-[9px] animate-pulse">LIVE</span>
                                </div>
                                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-none">
                                    {mockAlerts.map((alert) => (
                                        <div key={alert.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50/40 transition-colors">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                                {alert.type === 'flood' ? <CloudRain size={14} className="text-blue-500" /> : <Ban size={14} className="text-red-500" />}
                                                {alert.title}
                                            </div>
                                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">{alert.content}</p>
                                            <div className="text-[9px] text-slate-400 mt-1">{alert.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ✅ FIX: Nút User chuyển sang /profile */}
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all"
                    >
                        <User size={18} />
                    </button>
                </div>
            </div>

            {/* ================= SIDEBAR TRÁI: SỰ KIỆN ================= */}
            <div className="absolute top-[88px] left-6 z-10 w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col max-h-[calc(100vh-120px)]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-2">
                    Sự kiện
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto pr-1 scrollbar-none">
                    {mockEvents.map((event) => (
                        <div key={event.id} className="flex gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-extrabold text-[8px] relative shrink-0 shadow-sm">
                                <span>DN MAP</span>
                                <span className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded-[4px] text-[7px] font-black text-white ${event.isLive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                                    }`}>
                                    {event.status}
                                </span>
                            </div>
                            <div className="flex flex-col justify-center min-w-0 flex-1">
                                <h3 className="text-[11px] font-bold text-slate-900 line-clamp-2 leading-tight">{event.title}</h3>
                                <p className="text-[10px] text-slate-500 mt-1">🕒 {event.time}</p>
                                <p className="text-[10px] text-slate-400 truncate">📍 {event.location}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ================= CỤM CÔNG CỤ BẢN ĐỒ GÓC PHẢI (MAP CONTROLS) ================= */}
            <div className="absolute right-6 bottom-10 flex flex-col gap-3 z-10 pointer-events-none">

                {/* Nút Vị Trí Hiện Tại */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Vị trí
                    </span>
                    <button className="w-11 h-11 bg-white rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
                        <Navigation size={18} className="rotate-45 -ml-1 -mt-1" />
                    </button>
                </div>

                {/* Nút Layer Bản Đồ (Màu tím khi bật) */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Lớp
                    </span>
                    <button
                        onClick={() => toggleMapControl('layers')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.layers ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                            }`}
                    >
                        <Layers size={18} />
                    </button>
                </div>

                {/* Nút Tuyến Đường Giao Thông (Màu đỏ khi bật) */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Giao thông
                    </span>
                    <button
                        onClick={() => toggleMapControl('traffic')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.traffic ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                            }`}
                    >
                        <TrendingUp size={18} />
                    </button>
                </div>

                {/* Nút Hiển Thị Vùng Ngập Lụt (Màu xanh dương nhạt khi bật) */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Ngập lụt
                    </span>
                    <button
                        onClick={() => toggleMapControl('flood')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.flood ? 'bg-blue-50 text-blue-500 border-blue-200' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                            }`}
                    >
                        <CloudRain size={18} />
                    </button>
                </div>

                {/* Dải phân cách mỏng trước khi đến cụm Zoom */}
                <div className="h-1"></div>

                {/* Cụm Zoom Bản Đồ (+ / -) */}
                <div className="flex flex-col gap-2 pointer-events-auto items-end">
                    <button className="w-11 h-11 bg-white rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        <Plus size={20} />
                    </button>
                    <button className="w-11 h-11 bg-white rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        <Minus size={20} />
                    </button>
                </div>

            </div>

            {/* ================= POPUP GIỮA MÀN HÌNH ================= */}
            {showAlertPopup && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-[460px] bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden shadow-danger">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={18} className="animate-bounce" />
                            <div>
                                <div className="text-xs font-bold">Cảnh báo hôm nay</div>
                                <div className="text-[10px] opacity-90">Hệ thống ghi nhận thông báo cấm đường và ngập nước</div>
                            </div>
                        </div>
                        <button onClick={() => setShowAlertPopup(false)} className="text-white/80 hover:text-white bg-white/10 p-1 rounded-full text-xs">✕</button>
                    </div>

                    <div className="p-3 flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-none">
                        {mockAlerts.slice(0, 2).map((alert) => (
                            <div key={alert.id} className="flex gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="shrink-0 mt-0.5">
                                    {alert.type === 'flood' ? <CloudRain className="text-blue-500" size={16} /> : <Ban className="text-red-500" size={16} />}
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-900">{alert.title}</h4>
                                    <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{alert.content}</p>
                                    <span className="text-[9px] text-slate-400 mt-1 block">📍 {alert.location}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 text-center py-2 text-[10px] text-red-500 font-bold border-t border-slate-100 tracking-wide">
                        ⚠️ Cảnh báo sẽ tự động đóng sau {countdown}s
                    </div>
                </div>
            )}

        </div>
    );
}