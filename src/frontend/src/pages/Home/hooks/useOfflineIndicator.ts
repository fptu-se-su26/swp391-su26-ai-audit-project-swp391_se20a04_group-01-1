import { useEffect, useState } from 'react';

interface OfflineData {
    isOffline: boolean;
    endpoint: string;
    lastUpdate: string | null;
    lastUpdateFormatted?: string;
}

/**
 * Hook để lắng nghe messages từ service worker về offline data
 */
export function useOfflineIndicator() {
    const [offlineData, setOfflineData] = useState<OfflineData | null>(null);

    useEffect(() => {
        // Kiểm tra service worker support
        if (!navigator.serviceWorker) {
            console.warn('[Offline Indicator] Service Workers not supported');
            return;
        }

        // Lắng nghe messages từ service worker
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'API_OFFLINE_DATA') {
                const timestamp = event.data.lastUpdate 
                    ? new Date(event.data.lastUpdate)
                    : null;
                
                const formatted = timestamp 
                    ? formatTimeAgo(timestamp)
                    : null;

                const data: OfflineData = {
                    isOffline: event.data.isOffline,
                    endpoint: event.data.endpoint,
                    lastUpdate: event.data.lastUpdate,
                    lastUpdateFormatted: formatted
                };

                console.log('[Offline Indicator] Received:', data);
                setOfflineData(data);

                // Auto hide badge sau 5 giây nếu online
                if (!event.data.isOffline) {
                    const timeout = setTimeout(() => {
                        setOfflineData(null);
                    }, 5000);

                    return () => clearTimeout(timeout);
                }
            }
        };

        // Đăng ký event listener
        navigator.serviceWorker.addEventListener('message', handleMessage);

        console.log('[Offline Indicator] Event listener registered');

        // Cleanup
        return () => {
            navigator.serviceWorker.removeEventListener('message', handleMessage);
        };
    }, []);

    return offlineData;
}

/**
 * Format thời gian tương tự như trong Service Worker
 */
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa rồi';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;

    // Format: dd/MM/yyyy HH:mm
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export { formatTimeAgo };