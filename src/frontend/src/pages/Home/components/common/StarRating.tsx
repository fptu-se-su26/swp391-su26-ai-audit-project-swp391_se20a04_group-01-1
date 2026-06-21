import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    rating: number | null;
    /** Kích thước icon sao. POIPopup dùng 12, POIFeaturedSidebar dùng 11 */
    size?: number;
}

/**
 * Hiển thị sao đánh giá (full/half/empty) + số điểm.
 * Trước đây bị define trùng lặp gần như y hệt ở POIPopup.tsx và
 * POIFeaturedSidebar.tsx, chỉ khác mỗi `size` icon.
 */
export default function StarRating({ rating, size = 12 }: StarRatingProps) {
    if (!rating) return null;

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.3;
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));
    const halfWidth = Math.round(size / 2);

    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {Array.from({ length: fullStars }).map((_, i) => (
                    <Star key={`full-${i}`} size={size} className="text-amber-400 fill-amber-400" />
                ))}
                {hasHalfStar && (
                    <div className="relative">
                        <Star size={size} className="text-slate-300" />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: halfWidth }}>
                            <Star size={size} className="text-amber-400 fill-amber-400" />
                        </div>
                    </div>
                )}
                {Array.from({ length: emptyStars }).map((_, i) => (
                    <Star key={`empty-${i}`} size={size} className="text-slate-300" />
                ))}
            </div>
            <span className="text-[11px] font-bold text-amber-600">{rating.toFixed(1)}</span>
        </div>
    );
}