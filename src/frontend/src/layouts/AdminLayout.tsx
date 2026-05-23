import React, { useState } from 'react';
import {
    LayoutDashboard,
    Car,
    CalendarDays,
    Waves,
    RouteOff,
    Settings,
    LogOut,
    AlertTriangle
} from 'lucide-react';

// Dữ liệu mẫu (Giả lập việc fetch từ API xem có bao nhiêu sự kiện, ngập lụt...)
const MENU_ITEMS = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'traffic', label: 'Giao thông', icon: Car },
    { id: 'events', label: 'Sự kiện', icon: CalendarDays, count: 12 },
    { id: 'flood', label: 'Ngập lụt', icon: Waves, count: 2 },
    { id: 'closure', label: 'Cấm đường', icon: RouteOff, count: 5 },
];

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
    const [activeMenu, setActiveMenu] = useState('overview');

    return (
        <div className="flex h-screen w-full bg-slate-100 font-sans">

            {/* ================= SIDEBAR TRÁI ================= */}
            <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">

                {/* PHẦN 1: HEADER (Logo & Tên hệ thống) */}
                <div className="flex items-center gap-3 p-5 border-b border-slate-800">
                    {/* Logo: Kích thước w-11 h-11 là tỷ lệ vàng để đi kèm 2 dòng text */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-white font-black text-xl tracking-tighter">DS</span>
                    </div>

                    {/* Text: Sử dụng flex-col để xếp chồng, leading-tight để khoảng cách 2 dòng khít lại */}
                    <div className="flex flex-col justify-center">
                        <h1 className="text-white font-bold text-lg leading-tight tracking-wide">
                            Danang Smart
                        </h1>
                        <p className="text-emerald-400 text-xs font-medium mt-0.5 uppercase tracking-widest">
                            Admin Dashboard
                        </p>
                    </div>
                </div>

                {/* PHẦN 2: DANH SÁCH MENU OPTIONS */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeMenu === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMenu(item.id)}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={20} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </div>

                                {/* Badge số lượng (Chỉ hiện khi có thuộc tính count và count > 0) */}
                                {item.count && item.count > 0 && (
                                    <span className="bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* PHẦN 3: BOTTOM (Cảnh báo, Cài đặt, Đăng xuất) */}
                <div className="p-4 border-t border-slate-800 flex flex-col gap-3">

                    {/* Box Cảnh báo khẩn cấp */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">
                                Cảnh báo giao thông
                            </span>
                            <p className="text-red-400/80 text-[11px] leading-relaxed">
                                Đang kẹt xe nghiêm trọng tại Cầu Rồng và khu vực trung tâm.
                            </p>
                        </div>
                    </div>

                    {/* Nút Cài đặt */}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-all text-slate-400">
                        <Settings size={20} />
                        <span className="font-medium text-sm">Cài đặt</span>
                    </button>

                    {/* Nút Thoát Admin */}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400 mt-1">
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Thoát Admin</span>
                    </button>

                </div>
            </aside>

            {/* ================= KHU VỰC NỘI DUNG CHÍNH (BÊN PHẢI) ================= */}
            <main className="flex-1 overflow-y-auto bg-slate-50">
                <header className="bg-white h-16 border-b border-slate-200 flex items-center px-8 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 capitalize">
                        {MENU_ITEMS.find(m => m.id === activeMenu)?.label}
                    </h2>
                </header>
                <div className="p-8">
                    {children || (
                        <div className="border-2 border-dashed border-slate-300 rounded-2xl h-96 flex items-center justify-center text-slate-400">
                            Khu vực hiển thị nội dung chức năng...
                        </div>
                    )}
                </div>
            </main>

        </div>
    );
}