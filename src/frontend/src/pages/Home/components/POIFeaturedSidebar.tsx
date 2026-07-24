import React, { useState, useMemo } from 'react';
import { Star, MapPin, Navigation, X } from 'lucide-react';
import { POIData } from './POIPopup';
import { getDistanceInKm } from '../../../utils/utlis';

// Mapping filter ID → tên category trong database
const FILTER_TO_CATEGORY: Record<string, string> = {
    'attractions': 'Điểm tham quan',
    'restaurants': 'Nhà hàng',
    'hotels': 'Khách sạn',
    'entertainment': 'Giải trí',
    'museums': 'Bảo tàng',
    'atm': 'ATM',
    'cafe': 'Quán cà phê',
    'gas_station': 'Trạm xăng',
    'hospital': 'Bệnh viện',
    'pharmacy': 'Nhà thuốc',
    'shopping': 'Khu mua sắm',
};

// Mapping filter ID → icon emoji
const FILTER_EMOJI: Record<string, string> = {
    'attractions': '🗺️',
    'restaurants': '🍜',
    'hotels': '🏨',
    'entertainment': '🎡',
    'museums': '🏙️',
    'atm': '💳',
    'cafe': '☕',
    'gas_station': '⛽',
    'hospital': '🏥',
    'pharmacy': '💊',
    'shopping': '🛍️',
};

interface POIFeaturedSidebarProps {
    pois: POIData[];
    selectedFilter: string | null;
    onPOIClick: (poi: POIData) => void;
    onDirectionsClick: (poi: POIData) => void;
    hasRoute?: boolean;
    onClose?: () => void;
    userLocation?: { lat: number; lng: number } | null;
}

// Component sao đánh giá
const StarRating = ({ rating }: { rating: number | null }) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.3;
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0));
    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {Array.from({ length: fullStars }).map((_, i) => (
                    <Star key={`f${i}`} size={11} className="text-amber-400 fill-amber-400" />
                ))}
                {hasHalf && (
                    <div className="relative">
                        <Star size={11} className="text-slate-200" />
                        <div className="absolute inset-0 overflow-hidden w-[5px]">
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                        </div>
                    </div>
                )}
                {Array.from({ length: emptyStars }).map((_, i) => (
                    <Star key={`e${i}`} size={11} className="text-slate-200" />
                ))}
            </div>
            <span className="text-[10px] font-bold text-amber-600">{rating.toFixed(1)}</span>
        </div>
    );
};

export default function POIFeaturedSidebar({
    pois,
    selectedFilter,
    onPOIClick,
    onDirectionsClick,
    hasRoute = false,
    onClose,
    userLocation,
}: POIFeaturedSidebarProps) {
    const [isVisible, setIsVisible] = useState(true);

    // Reset visibility khi filter thay đổi
    React.useEffect(() => {
        setIsVisible(true);
    }, [selectedFilter]);

    // Lọc danh sách POIs theo filter được chọn, ưu tiên featured, lấy tối đa 8
    const filteredPois = useMemo(() => {
        if (!selectedFilter) return [];
        const categoryName = FILTER_TO_CATEGORY[selectedFilter];
        if (!categoryName) return [];

        const list = (pois || []).filter(poi => poi.category_name === categoryName);

        const listWithDistance = list.map((poi): POIData & { distance?: number } => {
            if (userLocation) {
                const dist = getDistanceInKm(userLocation.lat, userLocation.lng, poi.latitude, poi.longitude);
                return { ...poi, distance: dist };
            }
            return poi;
        });

        return listWithDistance
            .sort((a, b) => {
                // Sắp xếp theo khoảng cách gần nhất lên đầu tiên (nếu có userLocation)
                if (a.distance !== undefined && b.distance !== undefined) {
                    return a.distance - b.distance;
                }
                // Fallback nếu không có khoảng cách
                if (a.is_featured && !b.is_featured) return -1;
                if (!a.is_featured && b.is_featured) return 1;
                return (b.rating || 0) - (a.rating || 0);
            })
            .slice(0, 10);
    }, [pois, selectedFilter, userLocation]);

    if (!selectedFilter || !isVisible || filteredPois.length === 0) return null;

    const categoryName = FILTER_TO_CATEGORY[selectedFilter] || '';
    const emoji = FILTER_EMOJI[selectedFilter] || '📍';

    return (
        <div className="w-80 max-md:w-full max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-[45vh] max-md:max-h-[45vh] max-md:rounded-t-3xl max-md:rounded-b-none max-md:z-40 max-md:border-t max-md:border-slate-200/80 max-md:shadow-[0_-8px_30px_rgba(0,0,0,0.12)] max-md:animate-none max-md:overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <div>
                        <p className="text-white text-[11px] font-black leading-tight">{categoryName} nổi bật</p>
                        <p className="text-blue-200 text-[9px] font-semibold uppercase tracking-wider">
                            {filteredPois.length} địa điểm
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        if (onClose) onClose();
                    }}
                    className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                    <X size={12} />
                </button>
            </div>

            {/* Danh sách cuộn */}
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" style={{ maxHeight: '65vh' }}>
                {filteredPois.map((poi, idx) => (
                    <div
                        key={poi.poi_id}
                        onClick={() => onPOIClick(poi)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/60 border-b border-slate-50 last:border-b-0 cursor-pointer group transition-colors"
                    >
                        {/* Số thứ tự */}
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-[9px] font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                            {idx + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 relative">
                            <img
                                src={(() => {
                                    const base = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                                    const url = poi.image_url;
                                    if (!url) return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200';
                                    return url.startsWith('http') || url.startsWith('blob:') ? url : `${base}${url}`;
                                })()}
                                alt={poi.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200';
                                }}
                            />
                            {poi.is_featured && (
                                <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                                    <Star size={6} className="fill-white text-white" />
                                </span>
                            )}
                        </div>

                        {/* Thông tin */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {poi.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {poi.rating && (
                                    <StarRating rating={poi.rating} />
                                )}
                                {(poi as any).distance !== undefined && (
                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        Cách {(poi as any).distance < 1 ? `${Math.round((poi as any).distance * 1000)}m` : `${(poi as any).distance.toFixed(1)}km`}
                                    </span>
                                )}
                            </div>
                            {poi.address && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                    <MapPin size={9} className="text-slate-400 shrink-0" />
                                    <span className="text-[9px] text-slate-400 line-clamp-1">
                                        {poi.address.split(',').slice(-2).join(',').trim()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Nút chỉ đường */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDirectionsClick(poi);
                            }}
                            className="shrink-0 w-7 h-7 rounded-xl bg-blue-50 hover:bg-blue-600 flex items-center justify-center text-blue-500 hover:text-white transition-all duration-200"
                            title="Chỉ đường"
                        >
                            <Navigation size={12} className="rotate-45" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 text-center font-medium">
                    Click vào địa điểm để xem trên bản đồ
                </p>
            </div>
        </div>
    );
}
