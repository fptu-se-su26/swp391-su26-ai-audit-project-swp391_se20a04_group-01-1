import { useEffect, useState } from 'react';
import { useMapRouting } from './useMapRouting';
import { useUserLocation } from './useUserLocation';
import { useEventRoads } from './useEventRoads';
import { useFloodZones } from './useFloodZones';
import { getHaversineDistance } from '../utils/routeUtils';
import { getBoundsFromCoordinates } from '../utils/mapUtils';

//  FIX: bán kính (km) coi vị trí GPS thật là "đang ở trên tuyến đường".
// Nếu GPS thật cách xa điểm xuất phát của tuyến hơn mức này (ví dụ đang test
// trong văn phòng, cách xa 2 điểm tìm kiếm trên tuyến đường), camera sẽ dùng
// điểm xuất phát của TUYẾN ĐƯỜNG để phóng to thay vì bay tới vị trí GPS thật
// không liên quan - nếu không sẽ bị phóng to vào chỗ không có đường đi.
const GPS_ON_ROUTE_THRESHOLD_KM = 1;

//  FIX: KHÔNG được tạo mảng rỗng `[]` trực tiếp trong object truyền vào
// useMapRouting bên dưới. Mỗi lần useRouteController render, `[]` sẽ tạo ra
// một tham chiếu mới, khiến effect fetch tuyến đường trong useMapRouting
// (phụ thuộc vào options.trafficAlerts) chạy lại liên tục -> gọi lại
// mapRef.current.fitBounds(...) liên tục -> bản đồ luôn bị kéo về góc nhìn
// toàn tuyến, đè lên hiệu ứng phóng to lúc bắt đầu dẫn đường. Việc này vốn
// đã tiềm ẩn, nhưng chỉ lộ rõ khi bật theo dõi GPS liên tục (re-render mỗi
// giây), nên bản đồ liên tục "nhảy" về view cũ trong lúc dẫn đường.
const EMPTY_TRAFFIC_ALERTS: any[] = [];

export function useRouteController(mapRef: any) {
    const [isNavigating, setIsNavigating] = useState(false);
    const [saveRouteName, setSaveRouteName] = useState("");
    const [isSavingRoute, setIsSavingRoute] = useState(false);
    const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
    
    const [avoidFlood, setAvoidFlood] = useState(true);
    const [avoidCongestion, setAvoidCongestion] = useState(true);

    // Kế thừa các Hooks chức năng chuyên biệt
    const { eventRoads, activeOrSelectedEventRoads, isRoadRestrictionActive } = useEventRoads(null);
    const { floodZones, confirmedFloodZoneIds, setConfirmedFloodZoneIds } = useFloodZones();
    
    const mapRouting = useMapRouting(mapRef, {
        floodZones,
        trafficAlerts: EMPTY_TRAFFIC_ALERTS, // Sẽ được cập nhật từ trafficController nếu cần
        activeEventRoads: activeOrSelectedEventRoads,
        avoidFlood,
        avoidCongestion,
        confirmedFloodZoneIds,
        isLowBandwidth: localStorage.getItem("low_bandwidth_mode") === "true",
        isOffline: !navigator.onLine,
        isNavigating
    });

    const validateLocation = (lng: number, lat: number, label: string, type: 'origin'|'destination', onApprove: ()=>void, onReject: ()=>void) => {
        // Có thể bổ sung logic kiểm tra xem vị trí có bị ngập không trước khi approve
        onApprove();
    };

    const userLocHook = useUserLocation(mapRef, validateLocation, mapRouting.setOrigin, mapRouting.setOriginQuery);

    //  FIX: chỉ tin vị trí GPS thật làm tâm camera nếu nó thực sự nằm gần
    // điểm xuất phát của tuyến đường đã tính. Nếu không (ví dụ test ở văn
    // phòng, cách xa 2 địa chỉ đã tìm kiếm), dùng điểm xuất phát của tuyến
    // đường để đảm bảo luôn phóng to vào đúng chỗ có đường đi hiển thị.
    const getNavigationCenter = () => {
        const gps = userLocHook.userLocation;
        const origin = mapRouting.origin;

        if (gps && origin) {
            const distanceKm = getHaversineDistance(gps, origin);
            if (distanceKm <= GPS_ON_ROUTE_THRESHOLD_KM) {
                return gps;
            }
            return origin;
        }

        return gps || origin;
    };

    //  FIX: Phóng to bản đồ khi bắt đầu dẫn đường
    const handleStartNavigation = () => {
        setIsNavigating(true);

        //  FIX: Bật theo dõi GPS liên tục để bản đồ tiếp tục bám theo người dùng
        // trong suốt chuyến đi, thay vì chỉ có 1 lần lấy vị trí lúc bấm nút.
        userLocHook.startWatchingLocation();

        const centerPoint = getNavigationCenter();

        if (centerPoint && mapRef?.current) {
            mapRef.current.flyTo({
                center: [centerPoint.lng, centerPoint.lat],
                zoom: 17, // Zoom level cao để nhìn chi tiết con đường
                pitch: 45, // Nghiêng camera để có cảm giác 3D khi dẫn đường
                bearing: 0,
                duration: 1000,
            });
        }
    };
    
    const handleStopNavigation = () => {
        setIsNavigating(false);
        //  FIX: Tắt theo dõi GPS liên tục khi kết thúc chuyến đi
        userLocHook.stopWatchingLocation();
        // Không xóa routeData ở đây nữa: giữ lại để quay về màn hình
        // "chi tiết lộ trình" (khoảng cách/thời gian/nút bắt đầu lại...)
        // thay vì mất hết và trông như thoát về màn hình home.
        // Nếu người dùng muốn xóa hẳn lộ trình, đã có nút "Xóa lộ trình"
        // (onClearRoute) riêng để làm việc đó.

        //  FIX: Đưa camera từ góc nhìn 3D lúc đang dẫn đường (zoom 17, pitch 45)
        // về lại góc nhìn toàn tuyến (top-down, vừa khít origin-destination),
        // giống lúc mới xem trước lộ trình.
        const coords = mapRouting.routeData?.coordinates;
        if (coords && coords.length > 1 && mapRef?.current) {
            const bounds = getBoundsFromCoordinates(coords);
            mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000, pitch: 0, bearing: 0 });
        }
    };

    //  FIX: Giữ bản đồ luôn phóng to & bám theo vị trí người dùng trong suốt
    // chuyến đi (không chỉ zoom đúng 1 lần lúc bấm "Bắt đầu"), nhờ vị trí GPS
    // liên tục lấy được từ startWatchingLocation() ở trên. Vẫn áp dụng kiểm
    // tra khoảng cách để không bị "nhảy" camera ra khỏi tuyến đường.
    useEffect(() => {
        if (!isNavigating || !mapRef?.current) return;

        const centerPoint = getNavigationCenter();
        if (!centerPoint) return;

        mapRef.current.easeTo({
            center: [centerPoint.lng, centerPoint.lat],
            zoom: 17,
            pitch: 45,
            duration: 800,
        });
    }, [isNavigating, userLocHook.userLocation, mapRouting.origin, mapRef]);

    const handleSaveRoute = async () => {
        setIsSavingRoute(true);
        // Giả lập lưu API
        setTimeout(() => {
            setIsSavingRoute(false);
            setSaveRouteName("");
        }, 1000);
    };

    return {
        isNavigating,
        saveRouteName,
        setSaveRouteName,
        isSavingRoute,
        savedRoutes,
        setSavedRoutes,
        avoidFlood,
        setAvoidFlood,
        avoidCongestion,
        setAvoidCongestion,
        activeOrSelectedEventRoads,
        isRoadRestrictionActive,
        floodZones,
        confirmedFloodZoneIds,
        setConfirmedFloodZoneIds,
        handleStartNavigation,
        handleStopNavigation,
        handleSaveRoute,
        validateLocation,
        ...mapRouting,
        ...userLocHook
    };
}