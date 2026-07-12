import { useState, useEffect } from 'react';
import { useUIStore } from '../../../store/uiStore';

export function useNotificationController() {
    const uiState = useUIStore();
    
    // Thêm các state để quản lý dữ liệu thông báo
    const [alerts, setAlerts] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch dữ liệu thông báo (từ API hoặc LocalStorage)
    useEffect(() => {
        // Có thể thay thế bằng fetch API thực tế
        setAlerts([]);
        setUnreadCount(0);
    }, []);

    const openNotifications = () => {
        uiState.setUIState({ showNotificationModal: true });
        setUnreadCount(0); // Xóa badge chưa đọc khi mở
    };

    const closeNotifications = () => {
        uiState.setUIState({ showNotificationModal: false });
    };

    const closeAlertBanner = () => {
        uiState.setUIState({ showAlertPopup: false });
    };

    return {
        isNotificationCenterOpen: uiState.showNotificationModal,
        isAlertBannerOpen: uiState.showAlertPopup,
        hasUnread: unreadCount > 0,
        alerts,         // Đã export để Home.tsx sử dụng
        unreadCount,    // Đã export để Home.tsx sử dụng
        openNotifications,
        closeNotifications,
        closeAlertBanner,
    };
}