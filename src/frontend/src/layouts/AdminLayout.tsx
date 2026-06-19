import React from 'react';
import {
    LayoutDashboard,
    Car,
    CalendarDays,
    Waves,
    RouteOff,
    Settings,
    LogOut,
    AlertTriangle,
    Home,
    Users // 1. ĐÃ THÊM IMPORT ICON USERS TẠI ĐÂY
} from 'lucide-react';

// 2. ĐÃ THÊM MỤC 'users' VÀO DANH SÁCH MENU
const MENU_ITEMS = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'traffic', label: 'Giao thông', icon: Car },
    { id: 'events', label: 'Sự kiện', icon: CalendarDays, count: 12 },
    { id: 'flood', label: 'Ngập lụt', icon: Waves, count: 2 },
    { id: 'closure', label: 'Cấm đường', icon: RouteOff, count: 5 },
    { id: 'users', label: 'Quản lý tài khoản', icon: Users }, // <--- MỤC MỚI
    { id: 'settings', label: 'Cài đặt', icon: Settings },
];

interface AdminLayoutProps {
    activeMenu: string;
    setActiveMenu: (menu: string) => void;
    children?: React.ReactNode;
    counts?: {
        events?: number;
        flood?: number;
        closure?: number;
        traffic?: number;
    };
}

export default function AdminLayout({ activeMenu, setActiveMenu, children, counts }: AdminLayoutProps) {
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        window.location.href = `${import.meta.env.BASE_URL}login`;
    };

    const handleBackToApp = () => {
        window.location.href = `${import.meta.env.BASE_URL}dashboard`;
    };

    return (
        <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">

            {/* ================= SIDEBAR TRÁI ================= */}
            <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0">

                {/* PHẦN 1: HEADER (Logo & Tên hệ thống) */}
                <div className="flex items-center gap-3 p-5 border-b border-slate-800">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-white font-black text-xl tracking-tighter">DS</span>
                    </div>

                    <div className="flex flex-col justify-center">
                        <h1 className="text-white font-bold text-lg leading-tight tracking-wide">
                            Danang Smart
                        </h1>
                        <p className="text-emerald-400 text-xs font-medium mt-0.5 uppercase tracking-widest">
                            Admin Control
                        </p>
                    </div>
                </div>

                {/* PHẦN 2: DANH SÁCH MENU OPTIONS */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeMenu === item.id;
                        
                        const displayCount = counts && item.id in counts
                            ? counts[item.id as keyof typeof counts]
                            : item.count;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMenu(item.id)}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-blue-500/10 text-blue-400 font-semibold'
                                        : 'hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={20} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                                    <span className="text-sm">{item.label}</span>
                                </div>

                                {/* Badge số lượng */}
                                {displayCount !== undefined && displayCount > 0 && (
                                    <span className="bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {displayCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* PHẦN 3: BOTTOM (Cảnh báo, Cài đặt, Đăng xuất) */}
                <div className="p-4 border-t border-slate-800 flex flex-col gap-3">

                    {/* Box Cảnh báo giao thông */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">
                                Cảnh báo hệ thống
                            </span>
                            <p className="text-red-400/80 text-[11px] leading-relaxed">
                                Cần phê duyệt 3 cảnh báo ngập lụt mới tại khu vực Cẩm Lệ.
                            </p>
                        </div>
                    </div>

                    {/* Nút Quay lại App */}
                    <button 
                        onClick={handleBackToApp}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-all text-slate-400"
                    >
                        <Home size={20} />
                        <span className="font-medium text-sm">Quay lại ứng dụng</span>
                    </button>

                    {/* Nút Thoát Admin */}
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400 mt-1"
                    >
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Đăng xuất</span>
                    </button>

                </div>
            </aside>

            {/* ================= KHU VỰC NỘI DUNG CHÍNH (BÊN PHẢI) ================= */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                <header className="bg-white h-16 border-b border-slate-200 flex items-center px-8 shadow-sm justify-between shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 capitalize">
                        {MENU_ITEMS.find(m => m.id === activeMenu)?.label || 'Quản trị'}
                    </h2>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs font-medium">Phiên đăng nhập Admin</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-8">
                    {children}
                </div>
            </main>

        </div>
    );
}