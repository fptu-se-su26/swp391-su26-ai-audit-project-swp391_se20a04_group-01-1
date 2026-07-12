import { useState } from 'react';
import { toggleFavoriteEvent } from '../services/favoriteService';
import { showPremiumToast } from '../../../utils/toastUtils';

/**
 * useFavoriteController
 * Quản lý danh sách sự kiện yêu thích (favoriteEventIds - tách ra từ useHomeController cũ)
 * và trạng thái đóng/mở panel yêu thích dùng cho FavoriteButton.
 * Danh sách POI yêu thích được quản lý riêng bởi store/favoritePoiStore (đã có sẵn trong dự án).
 */
export function useFavoriteController() {
    const [favoriteEventIds, setFavoriteEventIds] = useState<Set<number>>(new Set());
    const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);

    const handleFavoriteEventToggle = async (eventId: number): Promise<boolean> => {
        const wasFavorite = favoriteEventIds.has(eventId);
        try {
            const isNowFavorite = await toggleFavoriteEvent(eventId, wasFavorite);
            const newSet = new Set(favoriteEventIds);
            if (isNowFavorite) {
                newSet.add(eventId);
            } else {
                newSet.delete(eventId);
            }
            setFavoriteEventIds(newSet);
            return isNowFavorite;
        } catch (error) {
            showPremiumToast("Không thể cập nhật trạng thái yêu thích.", "error");
            return wasFavorite;
        }
    };

    const toggleFavoritesPanel = () => setIsFavoritesPanelOpen((prev) => !prev);

    return {
        favoriteEventIds,
        handleFavoriteEventToggle,
        isFavoritesPanelOpen,
        toggleFavoritesPanel,
    };
}
