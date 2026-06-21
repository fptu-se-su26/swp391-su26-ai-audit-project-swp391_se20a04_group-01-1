import React, { useState, useMemo } from 'react';
import { Star, MapPin, Navigation, X } from 'lucide-react';
import { POIData } from './POIPopup';
import StarRating from './common/StarRating';
import { POI_FILTERS, getCategoryNameByFilter, getFilterEmoji } from './constants/poiCategories';
import { FALLBACK_IMAGE, handleImageError } from './utils/formatters';

interface POIFeaturedSidebarProps {
    pois: POIData[];
    selectedFilter: string | null;
    onPOIClick: (poi: POIData) => void;
    onDirectionsClick: (poi: POIData) => void;
    hasRoute?: boolean;
}

export default function POIFeaturedSidebar({
    pois,
    selectedFilter,
    onPOIClick,
    onDirectionsClick,
    hasRoute = false,
}: POIFeaturedSidebarProps) {
    const [isVisible, setIsVisible] = useState(true);

    React.useEffect(() => {
        setIsVisible(true);
    }, [selectedFilter]);

    // Lọc danh sách POIs theo filter được chọn, ưu tiên featured, lấy tối đa 10
    const filteredPois = useMemo(() => {
        if (!selectedFilter) return [];
        const categoryName = getCategoryNameByFilter(selectedFilter);
        if (!categoryName) return [];

        return pois
            .filter(poi => poi.category_name === categoryName)
            .sort((a, b) => {
                if (a.is_featured && !b.is_featured) return -1;
                if (!a.is_featured && b.is_featured) return 1;
                return (b.rating || 0) - (a.rating || 0);
            })
            .slice(0, 10);
    }, [pois, selectedFilter]);

    if (!selectedFilter || !isVisible || filteredPois.length === 0) return null;

    const categoryName = getCategoryNameByFilter(selectedFilter);
    const emoji = getFilterEmoji(selectedFilter);

    return (
        <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-up">
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
                    onClick={() => setIsVisible(false)}
                    className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                    <X size={12} />
                </button>
            </div>

            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" style={{ maxHeight: hasRoute ? '180px' : '480px' }}>
                {filteredPois.map((poi, idx) => (
                    <div
                        key={poi.poi_id}
                        onClick={() => onPOIClick(poi)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/60 border-b border-slate-50 last:border-b-0 cursor-pointer group transition-colors"
                    >
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-[9px] font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                            {idx + 1}
                        </span>

                        <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 relative">
                            <img
                                src={poi.image_url || FALLBACK_IMAGE.poi}
                                alt={poi.name}
                                className="w-full h-full object-cover"
                                onError={handleImageError(FALLBACK_IMAGE.poi)}
                            />
                            {poi.is_featured && (
                                <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                                    <Star size={6} className="fill-white text-white" />
                                </span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {poi.name}
                            </p>
                            {poi.rating && (
                                <div className="mt-0.5">
                                    <StarRating rating={poi.rating} size={11} />
                                </div>
                            )}
                            {poi.address && (
                                <div className="flex items-center gap-0.5 mt-0.5">
                                    <MapPin size={9} className="text-slate-400 shrink-0" />
                                    <span className="text-[9px] text-slate-400 line-clamp-1">
                                        {poi.address.split(',').slice(-2).join(',').trim()}
                                    </span>
                                </div>
                            )}
                        </div>

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

            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 text-center font-medium">
                    Click vào địa điểm để xem trên bản đồ
                </p>
            </div>
        </div>
    );
}