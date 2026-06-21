/**
 * Cấu hình danh mục POI dùng chung.
 * Trước đây FILTER_TO_CATEGORY bị khai báo trùng lặp ở cả
 * POIsLayer.tsx và POIFeaturedSidebar.tsx — gộp về một nguồn duy nhất.
 */

export interface POIFilterConfig {
    /** Tên category tương ứng trong database */
    categoryName: string;
    /** Emoji hiển thị khi không có ảnh */
    emoji: string;
}

export const POI_FILTERS: Record<string, POIFilterConfig> = {
    attractions: { categoryName: 'Điểm tham quan', emoji: '🗺️' },
    restaurants: { categoryName: 'Nhà hàng', emoji: '🍜' },
    hotels: { categoryName: 'Khách sạn', emoji: '🏨' },
    entertainment: { categoryName: 'Giải trí', emoji: '🎡' },
    museums: { categoryName: 'Bảo tàng', emoji: '🏛️' },
    atm: { categoryName: 'ATM', emoji: '💳' },
};

/** Lấy tên category DB từ filter id, trả về '' nếu không tìm thấy */
export const getCategoryNameByFilter = (filterId: string | null): string => {
    if (!filterId) return '';
    return POI_FILTERS[filterId]?.categoryName ?? '';
};

/** Lấy emoji hiển thị từ filter id, có fallback mặc định */
export const getFilterEmoji = (filterId: string | null): string => {
    if (!filterId) return '📍';
    return POI_FILTERS[filterId]?.emoji ?? '📍';
};