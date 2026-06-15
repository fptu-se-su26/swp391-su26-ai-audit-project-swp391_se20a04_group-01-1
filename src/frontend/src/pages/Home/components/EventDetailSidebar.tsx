import React, { useState } from 'react';
import { X, Heart, Calendar, Clock, MapPin, Globe, Ticket, Navigation, Compass, Share2 } from 'lucide-react';
import { EventData, getEventStatus } from './EventsLayer';
import toast from 'react-hot-toast';

interface EventDetailSidebarProps {
    event: EventData;
    isFavorite: boolean;
    onFavoriteToggle: () => Promise<void>;
    onDirectionsClick: () => void;
    onClose: () => void;
}

export default function EventDetailSidebar({
    event,
    isFavorite,
    onFavoriteToggle,
    onDirectionsClick,
    onClose
}: EventDetailSidebarProps) {
    const [loadingFav, setLoadingFav] = useState(false);
    const status = getEventStatus(event.start_time, event.end_time);

    // Xử lý click nút yêu thích
    const handleFavClick = async () => {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (!token) {
            toast.error('Vui lòng đăng nhập để lưu sự kiện yêu thích!');
            return;
        }

        setLoadingFav(true);
        try {
            await onFavoriteToggle();
        } catch (error) {
            toast.error('Lỗi khi thực hiện lưu sự kiện.');
        } finally {
            setLoadingFav(false);
        }
    };

    // Chi tiết trạng thái hiển thị
    let statusText = 'Sắp diễn ra';
    let statusClass = 'bg-blue-50 text-blue-600 border-blue-200';
    if (status === 'ongoing') {
        statusText = 'Đang diễn ra';
        statusClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    } else if (status === 'ended') {
        statusText = 'Đã kết thúc';
        statusClass = 'bg-slate-100 text-slate-500 border-slate-200';
    }

    // Định dạng giá vé
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // Định dạng thời gian
    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const d = new Date(timeStr);
        return d.toLocaleDateString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-140px)] animate-fade-left pointer-events-auto">
            {/* Header: Banner Image */}
            <div className="relative h-40 shrink-0 bg-slate-100 border-b border-slate-100">
                <img
                    src={event.banner_url || event.thumbnail_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                {/* Nút đóng */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                    <X size={15} />
                </button>

                {/* Nút yêu thích */}
                <button
                    onClick={handleFavClick}
                    disabled={loadingFav}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-rose-500 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    title={isFavorite ? "Bỏ lưu sự kiện" : "Lưu sự kiện"}
                >
                    <Heart
                        size={16}
                        className={`transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
                    />
                </button>

                {/* Tiêu đề góc dưới đè lên banner */}
                <div className="absolute bottom-3 inset-x-3 text-left">
                    <span 
                        className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                        style={{ backgroundColor: event.category_color || '#6366F1' }}
                    >
                        {event.category_icon} {event.category_name}
                    </span>
                    <h3 className="font-extrabold text-white text-xs mt-1.5 leading-snug drop-shadow">
                        {event.title}
                    </h3>
                </div>
            </div>

            {/* Chi tiết nội dung */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left scrollbar-none">
                {/* Trạng thái thời gian & Số lượng yêu thích */}
                <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${statusClass}`}>
                        {statusText}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Heart size={11} className="fill-rose-500 text-rose-500" />
                        <span>{event.favorite_count} người thích</span>
                    </span>
                </div>

                {/* Thông tin nhanh */}
                <div className="space-y-3">
                    {/* Thời gian bắt đầu */}
                    <div className="flex gap-2.5 items-start">
                        <Clock className="text-slate-400 shrink-0 mt-0.5" size={14} />
                        <div className="text-[11px] text-slate-600 font-medium">
                            <div className="font-bold text-slate-800">Thời gian bắt đầu</div>
                            <div>{formatTime(event.start_time)}</div>
                        </div>
                    </div>

                    {/* Thời gian kết thúc */}
                    {event.end_time && (
                        <div className="flex gap-2.5 items-start">
                            <Clock className="text-slate-400 shrink-0 mt-0.5" size={14} />
                            <div className="text-[11px] text-slate-600 font-medium">
                                <div className="font-bold text-slate-800">Thời gian kết thúc</div>
                                <div>{formatTime(event.end_time)}</div>
                            </div>
                        </div>
                    )}

                    {/* Địa điểm */}
                    <div className="flex gap-2.5 items-start">
                        <MapPin className="text-slate-400 shrink-0 mt-0.5" size={14} />
                        <div className="text-[11px] text-slate-600 font-medium">
                            <div className="font-bold text-slate-800">Địa điểm tổ chức</div>
                            <div>{event.location_name}</div>
                            {event.address && <div className="text-[10px] text-slate-400 mt-0.5">{event.address}</div>}
                        </div>
                    </div>

                    {/* Thông tin vé */}
                    <div className="flex gap-2.5 items-start">
                        <Ticket className="text-slate-400 shrink-0 mt-0.5" size={14} />
                        <div className="text-[11px] text-slate-600 font-medium">
                            <div className="font-bold text-slate-800">Thông tin vé vào cửa</div>
                            <div className="text-indigo-600 font-extrabold mt-0.5">
                                {event.is_free ? 'Miễn phí vé' : formatPrice(event.ticket_price)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mô tả chi tiết */}
                <div className="border-t border-slate-50 pt-3 space-y-1.5">
                    <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Thông tin mô tả</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {event.description || event.short_description || 'Không có mô tả chi tiết cho sự kiện này.'}
                    </p>
                </div>
            </div>

            {/* Footer: Chỉ đường */}
            <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50 flex gap-2">
                <button
                    onClick={onDirectionsClick}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[11px] font-black py-2.5 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                >
                    <Navigation size={12} className="rotate-45" />
                    Chỉ đường đi tới đây
                </button>
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Đã sao chép liên kết sự kiện!');
                    }}
                    className="w-10 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    title="Chia sẻ"
                >
                    <Share2 size={13} />
                </button>
            </div>
        </div>
    );
}
