import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import { MapPin, Phone, Navigation, X, Globe } from 'lucide-react';
import StarRating from './common/StarRating';
import { FALLBACK_IMAGE, handleImageError } from './utils/formatters';

export interface POIData {
    poi_id: number;
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
    description: string | null;
    image_url: string | null;
    website_url: string | null;
    phone_number: string | null;
    rating: number | null;
    is_featured: boolean;
    category_name: string;
    category_icon: string;
    category_color: string;
}

interface POIPopupProps {
    poi: POIData;
    onClose: () => void;
    onDirectionsClick: (poi: POIData) => void;
}

export default function POIPopup({ poi, onClose, onDirectionsClick }: POIPopupProps) {
    return (
        <Popup
            longitude={poi.longitude}
            latitude={poi.latitude}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            offset={[0, -12]}
            className="poi-popup-container z-50"
            maxWidth="280px"
        >
            <div className="w-[260px] bg-white rounded-xl overflow-hidden shadow-2xl font-sans relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all active:scale-95 z-20"
                    title="Đóng"
                >
                    <X size={16} />
                </button>

                {poi.image_url && (
                    <div className="relative h-[120px] overflow-hidden">
                        <img
                            src={poi.image_url}
                            alt={poi.name}
                            className="w-full h-full object-cover"
                            onError={handleImageError(FALLBACK_IMAGE.poi)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                        <span
                            className="absolute top-2 left-2 text-[9px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                            style={{ backgroundColor: poi.category_color || '#6366F1' }}
                        >
                            {poi.category_name}
                        </span>

                        {poi.is_featured && (
                            <span className="absolute top-2 right-12 text-[9px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full shadow-sm">
                                ⭐ Nổi bật
                            </span>
                        )}
                    </div>
                )}

                <div className="p-3">
                    <StarRating rating={poi.rating} size={12} />

                    <h3 className="text-[13px] font-bold text-slate-900 mt-1 leading-tight line-clamp-2">
                        {poi.name}
                    </h3>

                    {poi.description && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {poi.description}
                        </p>
                    )}

                    <div className="mt-2 space-y-1">
                        {poi.address && (
                            <div className="flex items-start gap-1.5">
                                <MapPin size={11} className="text-slate-400 mt-0.5 shrink-0" />
                                <span className="text-[10px] text-slate-600 line-clamp-2">{poi.address}</span>
                            </div>
                        )}
                        {poi.phone_number && (
                            <div className="flex items-center gap-1.5">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <a href={`tel:${poi.phone_number}`} className="text-[10px] text-blue-600 hover:underline">
                                    {poi.phone_number}
                                </a>
                            </div>
                        )}
                        {poi.website_url && (
    <div className="flex items-center gap-1.5">
        <Globe size={11} className="text-slate-400 shrink-0" />
        {/* ĐÃ THÊM THẺ <a BỊ THIẾU Ở ĐÂY */}
        <a 
            href={poi.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-600 hover:underline truncate"
        >
            Website
        </a>
    </div>
)}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDirectionsClick(poi);
                            onClose();
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-[11px] font-bold transition-colors shadow-sm"
                    >
                        <Navigation size={13} className="rotate-45" />
                        Chỉ đường tới đây
                    </button>
                </div>
            </div>
        </Popup>
    );
}