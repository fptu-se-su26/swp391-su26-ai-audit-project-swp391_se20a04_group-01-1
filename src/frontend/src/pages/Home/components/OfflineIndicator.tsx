import React from 'react';
import { useOfflineIndicator } from '../hooks/useOfflineIndicator';
import '../styles/OfflineIndicator.css';

/**
 * Component hiển thị badge khi dữ liệu API được load từ cache (offline)
 */
export function OfflineIndicator() {
    const offlineData = useOfflineIndicator();

    // Không render nếu không có offline data hoặc đang online
    if (!offlineData || !offlineData.isOffline) {
        return null;
    }

    // Lấy tên endpoint để hiển thị cho user
    const endpointName = getEndpointLabel(offlineData.endpoint);

    return (
        <div className="offline-indicator">
            <div className="offline-badge">
                <span className="offline-icon">⚠️</span>
                <div className="offline-content">
                    <p className="offline-title">Dữ liệu offline</p>
                    <p className="offline-subtitle">
                        {endpointName} • Cập nhật: {offlineData.lastUpdateFormatted}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Map API endpoints thành tên hiển thị tiếng Việt
 */
function getEndpointLabel(endpoint: string): string {
    const labels: Record<string, string> = {
        '/api/flood-zones': '🌊 Vùng ngập',
        '/api/pois': '📍 Địa điểm',
        '/api/event-roads': '🚗 Sự kiện giao thông'
    };
    return labels[endpoint] || endpoint;
}

export default OfflineIndicator;