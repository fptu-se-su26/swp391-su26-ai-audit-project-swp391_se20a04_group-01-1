import { create } from 'zustand';

const API_BASE = 'http://localhost:5001';

export interface AppNotification {
    notification_id: number;
    type: 'event_reminder' | 'traffic_alert' | 'event_update' | 'system';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    event_id?: number | null;
    alert_id?: number | null;
    event_title?: string | null;
    event_start_time?: string | null;
}

interface NotificationStore {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    pollingInterval: ReturnType<typeof setInterval> | null;

    fetchNotifications: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    startPolling: () => void;
    stopPolling: () => void;
}

const getToken = () => localStorage.getItem('token') || '';

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    pollingInterval: null,

    fetchNotifications: async () => {
        const token = getToken();
        if (!token) return;
        set({ isLoading: true });
        try {
            const res = await fetch(`${API_BASE}/api/user/notifications?limit=30`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                set({ notifications: data.data });
            }
        } catch (err) {
            console.error('[NotificationStore] fetchNotifications error:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchUnreadCount: async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/user/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                set({ unreadCount: data.count });
            }
        } catch (err) {
            console.error('[NotificationStore] fetchUnreadCount error:', err);
        }
    },

    markAsRead: async (id: number) => {
        const token = getToken();
        if (!token) return;
        try {
            await fetch(`${API_BASE}/api/user/notifications/${id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            // Cập nhật local state
            set(state => ({
                notifications: state.notifications.map(n =>
                    n.notification_id === id ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
        } catch (err) {
            console.error('[NotificationStore] markAsRead error:', err);
        }
    },

    markAllAsRead: async () => {
        const token = getToken();
        if (!token) return;
        try {
            await fetch(`${API_BASE}/api/user/notifications/read-all`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, is_read: true })),
                unreadCount: 0
            }));
        } catch (err) {
            console.error('[NotificationStore] markAllAsRead error:', err);
        }
    },

    // Bắt đầu polling unread count + full list mỗi 15 giây
    startPolling: () => {
        const { pollingInterval, fetchUnreadCount, fetchNotifications } = get();
        if (pollingInterval) return; // Đã chạy rồi

        fetchUnreadCount(); // Fetch ngay lập tức
        fetchNotifications();
        const interval = setInterval(() => {
            fetchUnreadCount();
            fetchNotifications();
        }, 15000);

        set({ pollingInterval: interval });
    },

    stopPolling: () => {
        const { pollingInterval } = get();
        if (pollingInterval) {
            clearInterval(pollingInterval);
            set({ pollingInterval: null });
        }
    }
}));
