/**
 * Các hàm định dạng dùng chung — gộp lại từ logic bị lặp ở
 * EventDetailSidebar.tsx và EventsSidebar.tsx (formatPrice, format ngày/giờ)
 * và logic onError ảnh bị lặp lại ở POIPopup, POIFeaturedSidebar, EventsLayer, EventDetailSidebar.
 */

/** Định dạng số tiền theo VNĐ. VD: 150000 -> "150.000 ₫" */
export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

/** Định dạng đầy đủ: Thứ, ngày/tháng/năm, giờ:phút — dùng cho chi tiết sự kiện */
export const formatFullDateTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

/** Định dạng ngắn gọn dd/mm — dùng cho danh sách/thẻ sự kiện */
export const formatShortDate = (timeStr?: string): string => {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

/** Ảnh mặc định khi POI/Event không có ảnh hoặc ảnh lỗi */
export const FALLBACK_IMAGE = {
    event: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600',
    poi: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
};

/**
 * Handler dùng chung cho thẻ <img onError>.
 * @param fallbackUrl URL ảnh thay thế khi load lỗi
 */
export const handleImageError = (fallbackUrl: string) =>
    (e: React.SyntheticEvent<HTMLImageElement>) => {
        (e.target as HTMLImageElement).src = fallbackUrl;
    };