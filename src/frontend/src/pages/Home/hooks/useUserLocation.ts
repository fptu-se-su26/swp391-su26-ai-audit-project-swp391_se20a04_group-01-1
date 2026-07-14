import { useState } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import { showPremiumToast } from '../../../utils/toastUtils';

export function useUserLocation(
    mapRef: React.RefObject<MapRef | null>,
    validateLocation: (
        lng: number,
        lat: number,
        label: string,
        type: 'origin' | 'destination',
        onApproved: () => void,
        onRejected: () => void
    ) => void,
    setOrigin: (point: { lng: number; lat: number; label: string } | null) => void,
    setOriginQuery: (query: string) => void
) {
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);

    const handleGetCurrentLocation = (showErrorAlert = true, setAsOrigin = true) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lng: position.coords.longitude,
                        lat: position.coords.latitude
                    };
                    setUserLocation(loc);

                    if (!setAsOrigin) return;

                    validateLocation(
                        loc.lng, loc.lat, 'Vị trí của bạn', 'origin',
                        () => {
                            setOrigin({
                                lng: loc.lng,
                                lat: loc.lat,
                                label: 'Vị trí của bạn'
                            });
                            setOriginQuery('Vị trí của bạn');
                            mapRef.current?.flyTo({
                                center: [loc.lng, loc.lat],
                                zoom: 15,
                                duration: 1500
                            });
                        },
                        () => {
                            setOrigin(null);
                            setOriginQuery('');
                        }
                    );
                },
                (error) => {
                    if (showErrorAlert) {
                        showPremiumToast('Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập GPS.', 'error');
                    }
                    console.error("Lỗi lấy vị trí GPS:", error);
                }
            );
        }
    };

    return {
        userLocation,
        setUserLocation,
        handleGetCurrentLocation
    };
}
