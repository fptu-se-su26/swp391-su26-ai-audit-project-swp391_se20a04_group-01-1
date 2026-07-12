import { useRef, useState } from 'react';
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
    //  FIX: watchId để theo dõi vị trí liên tục (thay vì chỉ lấy 1 lần)
    // Nếu không có theo dõi liên tục, bản đồ & giọng nói dẫn đường sẽ không biết
    // người dùng đã di chuyển tới đâu trong lúc đang dẫn đường.
    const watchIdRef = useRef<number | null>(null);

    //  FIX: Bắt đầu theo dõi vị trí GPS liên tục, dùng khi bắt đầu chuyến đi
    const startWatchingLocation = () => {
        if (!navigator.geolocation) return;
        if (watchIdRef.current !== null) return; // Đã theo dõi rồi thì thôi

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setUserLocation({
                    lng: position.coords.longitude,
                    lat: position.coords.latitude,
                });
            },
            (error) => {
                console.error("Lỗi theo dõi vị trí GPS liên tục:", error);
            },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
        );
    };

    //  FIX: Dừng theo dõi vị trí khi kết thúc chuyến đi để tiết kiệm pin
    const stopWatchingLocation = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

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
        handleGetCurrentLocation,
        startWatchingLocation,
        stopWatchingLocation
    };
}
