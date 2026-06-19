import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { NavigationControl, Marker, Source, Layer, MapRef, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// NEW CODE: Event route avoidance & visualization
import { eventRoadService, EventRoad } from '../../services/eventRoadService';
import { findSafeEventRoute } from '../../utils/eventRouteUtils';

// NEW CODE: Flood route avoidance feature - Import component hiển thị lớp ngập lụt
// import FloodLayer from '../../components/FloodLayer';
// NEW CODE: Flood zone feature - Import component hiển thị lớp vùng ngập lụt mới
//import FloodZoneLayer from '../../components/FloodZoneLayer';

// NEW CODE: Flood route avoidance feature - Tiện ích kiểm tra né ngập
// import { findSafeRoute } from '../../utils/floodRouteUtils';
// import { floodedRoads } from '../../data/floodData';
// FIX: Avoid flooded zones when calculating route
import { findSafeRoute as findSafeRouteZone, findFloodZoneContainingPoint, isPointInsideFloodZone } from '../../utils/floodZoneRouteUtils';


import {
    Search, Navigation, Bell, User, Settings, X,
    ShieldAlert, Ban, CloudRain, Compass, Utensils, Hotel,
    Gamepad2, Landmark, DollarSign,
    Layers, TrendingUp, RouteOff,
    Car, Footprints, Bike, ArrowUpDown, Calendar, AlertTriangle,
    Construction, CheckCircle2
} from 'lucide-react';
import { showPremiumToast } from '../../utils/toastUtils';

import POIsLayer from './components/POIsLayer';
import { poiAPI, eventAPI, trafficAlertAPI } from '../../services/api'; // ✅ ĐÃ SỬA LỖI IMPORT TẠI ĐÂY
import { POIData } from './components/POIPopup';
import POIFeaturedSidebar from './components/POIFeaturedSidebar';
import EventsLayer, { EventData } from './components/EventsLayer';
import EventsSidebar from './components/EventsSidebar';
import EventDetailSidebar from './components/EventDetailSidebar';

// ✅ ĐÃ SỬA LẠI LỖI FONT CHỮ BỊ HỎNG
const filterCategories = [
    { id: 'attractions', label: 'Điểm tham quan', icon: Compass },
    { id: 'restaurants', label: 'Nhà hàng', icon: Utensils },
    { id: 'hotels', label: 'Khách sạn', icon: Hotel },
    { id: 'entertainment', label: 'Giải trí', icon: Gamepad2 },
    { id: 'museums', label: 'Bảo tàng', icon: Landmark },
    { id: 'atm', label: 'ATM', icon: DollarSign },
];

const mockAlerts = [
    { id: 1, type: 'flood', title: 'Ngập lụt', content: 'Đường Nguyễn Văn Linh đang có nguy cơ ngập cao, mức nước dự báo 20–30cm. Tránh di chuyển qua khu vực này.', location: 'Nguyễn Văn Linh, Hải Châu', time: 'Vừa cập nhật' },
    { id: 2, type: 'block', title: 'Cấm đường', content: 'Đường Trần Hưng Đạo bị cấm từ 18:00–23:00 do sự kiện DIFF 2026. Lưu ý lộ trình thay thế qua Hùng Vương.', location: 'Trần Hưng Đạo, Hải Châu', time: 'Có hiệu lực từ 18:00' },
    { id: 3, type: 'flood', title: 'Ngập lụt', content: 'Khu vực chân cầu Tuyên Sơn nước dâng nhanh do triều cường.', location: 'Chân cầu Tuyên Sơn', time: '10 phút trước' }
];
function getCirclePolygon(
    center: [number, number],
    radiusInMeters: number,
    points = 64
): [number, number][] {
    const [lng, lat] = center;
    const R = 6371000;
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const dByR = radiusInMeters / R;

    const coordinates: [number, number][] = [];

    for (let i = 0; i < points; i++) {
        const angle = (i * 2 * Math.PI) / points;

        const newLatRad = Math.asin(
            Math.sin(latRad) * Math.cos(dByR) +
            Math.cos(latRad) * Math.sin(dByR) * Math.cos(angle)
        );

        const newLngRad =
            lngRad +
            Math.atan2(
                Math.sin(angle) * Math.sin(dByR) * Math.cos(latRad),
                Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
            );

        coordinates.push([
            (newLngRad * 180) / Math.PI,
            (newLatRad * 180) / Math.PI
        ]);
    }

    coordinates.push(coordinates[0]);
    return coordinates;
}

export default function Home() {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');
    const [showAlertPopup, setShowAlertPopup] = useState(true);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(1);

    // State lưu trữ dữ liệu ngập lụt
    const [floodZones, setFloodZones] = useState<any[]>([]);
    const [selectedFloodZone, setSelectedFloodZone] = useState<any | null>(null);
    const [hoveredFloodZone, setHoveredFloodZone] = useState<any | null>(null);

    // State lưu trữ POIs
    const [pois, setPois] = useState<POIData[]>([]);
    const [selectedPOI, setSelectedPOI] = useState<POIData | null>(null);

    // State cho Sự Kiện
    const [viewMode, setViewMode] = useState<'pois' | 'events'>('pois');
    const [events, setEvents] = useState<EventData[]>([]);
    const [eventCategories, setEventCategories] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [favoriteEventIds, setFavoriteEventIds] = useState<Set<number>>(new Set());
    const [showEventsSidebar, setShowEventsSidebar] = useState(true);
    
    // State cho Đường cấm sự kiện
    const [eventRoads, setEventRoads] = useState<EventRoad[]>([]);
    const [selectedRoadPopup, setSelectedRoadPopup] = useState<EventRoad | null>(null);

    // State cho Cảnh báo giao thông (Traffic Alerts)
    const [trafficAlerts, setTrafficAlerts] = useState<any[]>([]);
    const [selectedTrafficAlert, setSelectedTrafficAlert] = useState<any | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportFormData, setReportFormData] = useState({
        type: 'CONGESTION',
        title: '',
        description: '',
        location: '',
        latitude: 16.0544,
        longitude: 108.2022,
        severity: 'MEDIUM'
    });

    const handleOpenReportModal = (lat: number, lng: number) => {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (!token) {
            showPremiumToast('Vui lòng đăng nhập để gửi báo cáo sự cố giao thông.', 'error');
            return;
        }

        setReportFormData({
            type: 'CONGESTION',
            title: '',
            description: '',
            location: `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            latitude: lat,
            longitude: lng,
            severity: 'MEDIUM'
        });
        setShowReportModal(true);
        setPendingDestination(null);
    };

    const handleSubmitTrafficReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await trafficAlertAPI.createTrafficAlert(reportFormData);
            if (response.data && response.data.success) {
                showPremiumToast('Gửi báo cáo sự cố giao thông thành công! Đang chờ phê duyệt.', 'success');
                setShowReportModal(false);
                fetchTrafficAlerts();
            } else {
                showPremiumToast(response.data.message || 'Lỗi gửi báo cáo sự cố.', 'error');
            }
        } catch (error: any) {
            console.error("Lỗi gửi báo cáo sự cố:", error);
            showPremiumToast(error.response?.data?.message || 'Không thể gửi báo cáo lên hệ thống.', 'error');
        }
    };

    const handleEventClick = (evt: EventData) => {
        setSelectedEvent(evt);
        setSelectedPOI(null); // Đóng POI nếu đang mở
        mapRef.current?.flyTo({
            center: [evt.longitude, evt.latitude],
            zoom: 15,
            duration: 1200
        });
    };

    // Di chuyển map đến POI và mở popup
    const handlePOIClick = (poi: POIData) => {
        setSelectedPOI(poi);
        mapRef.current?.flyTo({
            center: [poi.longitude, poi.latitude],
            zoom: 16,
            duration: 1200
        });
    };

    const handleFavoriteEventToggle = async (eventObj: EventData) => {
        try {
            const res = await eventAPI.toggleFavorite(eventObj.event_id);
            const { isFavorite, favoriteCount } = res.data;

            // Cập nhật Set IDs yêu thích
            setFavoriteEventIds(prev => {
                const next = new Set(prev);
                if (isFavorite) {
                    next.add(eventObj.event_id);
                } else {
                    next.delete(eventObj.event_id);
                }
                return next;
            });

            // Cập nhật favorite_count trong list events
            setEvents(prev => prev.map(e => {
                if (e.event_id === eventObj.event_id) {
                    return { ...e, favorite_count: favoriteCount };
                }
                return e;
            }));

            // Cập nhật selectedEvent hiện tại
            if (selectedEvent && selectedEvent.event_id === eventObj.event_id) {
                setSelectedEvent(prev => prev ? { ...prev, favorite_count: favoriteCount } : null);
            }
        } catch (error) {
            console.error("Lỗi toggle yêu thích sự kiện:", error);
            throw error;
        }
    };

    // TRẠNG THÁI CHO THANH CÔNG CỤ BẢN ĐỒ GÓC PHẢI
    const [mapControls, setMapControls] = useState({
        layers: true,
        traffic: true,
        flood: false
    });

    // Tùy chọn định tuyến tránh vùng ngập lụt
    const [avoidFlood, setAvoidFlood] = useState<boolean>(true);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    const showCustomConfirm = (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel: () => void
    ) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onConfirm();
            },
            onCancel: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onCancel();
            }
        });
    };

    // CÁC STATE CỦA MAPBOX VÀ CHỈ ĐƯỜNG
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
    const [origin, setOrigin] = useState<{ lng: number; lat: number; label: string } | null>(null);
    const [destination, setDestination] = useState<{ lng: number; lat: number; label: string } | null>(null);
    const [routeData, setRouteData] = useState<{
        totalDistanceKm: number;
        totalTimeMin: number;
        coordinates: [number, number][];
    } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // NEW CODE: Flood route avoidance feature - Trạng thái cảnh báo khi tìm đường đi né ngập
    const [routeAlertMessage, setRouteAlertMessage] = useState<string | null>(null);

    // NEW CODE: Flood zone selection confirmation - State lưu danh sách ID vùng ngập đã được người dùng xác nhận đi vào
    const [confirmedFloodZoneIds, setConfirmedFloodZoneIds] = useState<string[]>([]);

    // NEW CODE: Flood zone confirmation and route avoidance - Dọn dẹp xác nhận không còn liên quan
    useEffect(() => {
        if (confirmedFloodZoneIds.length === 0) return;
        
        const newConfirmedIds = confirmedFloodZoneIds.filter(id => {
            const zone = floodZones.find(z => z.id === id);
            if (!zone) return false;
            
            const originInside = origin ? isPointInsideFloodZone([origin.lng, origin.lat], zone) : false;
            const destInside = destination ? isPointInsideFloodZone([destination.lng, destination.lat], zone) : false;
            
            return originInside || destInside;
        });

        if (newConfirmedIds.length !== confirmedFloodZoneIds.length) {
            setConfirmedFloodZoneIds(newConfirmedIds);
        }
    }, [origin, destination, confirmedFloodZoneIds]);

    // NEW CODE: Flood zone selection confirmation - Kiểm tra địa điểm người dùng chọn có nằm trong vùng ngập > 10cm không
    const validateLocation = (
        lng: number,
        lat: number,
        label: string,
        type: 'origin' | 'destination',
        onApproved: () => void,
        onRejected: () => void
    ) => {
        if (!mapControls.flood) {
            onApproved();
            return;
        }

        const zone = findFloodZoneContainingPoint([lng, lat], floodZones);
        if (zone && zone.depthCm > 10) {
            if (!confirmedFloodZoneIds.includes(zone.id)) {
                showCustomConfirm(
                    "Xác nhận đi vào vùng ngập sâu",
                    `Địa điểm bạn chọn đang nằm trong vùng ngập sâu ${zone.depthCm}cm. Bạn có chắc chắn muốn đi vào khu vực ngập lụt này không?`,
                    () => {
                        setConfirmedFloodZoneIds((prev) => [...prev, zone.id]);
                        onApproved();
                    },
                    () => {
                        showPremiumToast("Bạn đã hủy chọn địa điểm trong vùng ngập. Vui lòng chọn địa điểm khác an toàn hơn.", "error");
                        onRejected();
                    }
                );
            } else {
                onApproved();
            }
        } else if (zone && zone.depthCm <= 10) {
            showCustomConfirm(
                "Địa điểm ngập nhẹ",
                `Địa điểm bạn chọn đang ngập nhẹ khoảng ${zone.depthCm}cm. Bạn có muốn tiếp tục di chuyển tới đây không?`,
                () => {
                    onApproved();
                },
                () => {
                    onRejected();
                }
            );
        } else {
            onApproved();
        }
    };


    // Thêm các biến state cho tìm kiếm 2 điểm, hoán đổi và đổi phương tiện di chuyển
    const mapRef = useRef<MapRef>(null);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [activeInputField, setActiveInputField] = useState<'origin' | 'destination' | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [pendingDestination, setPendingDestination] = useState<{ lng: number; lat: number } | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');

    // Refs to keep track of latest popup states (to avoid React closure capture in Map events)
    const selectedRoadPopupRef = useRef(selectedRoadPopup);
    const selectedPOIRef = useRef(selectedPOI);
    const selectedFloodZoneRef = useRef(selectedFloodZone);
    const pendingDestinationRef = useRef(pendingDestination);

    useEffect(() => {
        selectedRoadPopupRef.current = selectedRoadPopup;
    }, [selectedRoadPopup]);

    useEffect(() => {
        selectedPOIRef.current = selectedPOI;
    }, [selectedPOI]);

    useEffect(() => {
        selectedFloodZoneRef.current = selectedFloodZone;
    }, [selectedFloodZone]);

    useEffect(() => {
        pendingDestinationRef.current = pendingDestination;
    }, [pendingDestination]);

    // ✅ HÀM: Lấy tọa độ GPS (hỗ trợ không hiển thị lỗi tự động khi load)
    const handleGetCurrentLocation = (showErrorAlert = true) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lng: position.coords.longitude,
                        lat: position.coords.latitude
                    };
                    setUserLocation(loc);

                    // NEW CODE: Flood zone selection confirmation
                    validateLocation(
                        loc.lng, loc.lat, 'Vị trí của bạn', 'origin',
                        () => {
                            setOrigin({
                                lng: loc.lng,
                                lat: loc.lat,
                                label: 'Vị trí của bạn'
                            });
                            setOriginQuery('Vị trí của bạn');
                            // Kéo camera bản đồ di chuyển mượt mà về tọa độ này
                            mapRef.current?.flyTo({
                                center: [loc.lng, loc.lat],
                                zoom: 15,
                                duration: 1500 // thời gian di chuyển (ms)
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
                        alert("Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập GPS.");
                    }
                    console.error("Lỗi lấy vị trí GPS:", error);
                }
            );
        }
    };

    // ✅ HÀM: Chọn điểm đến khi click lên bản đồ
  // ✅ HÀM: Chọn điểm đến khi click lên bản đồ
const handleMapClick = (event: any) => {
    // Không tự động đóng POI và Event khi nhấp ra ngoài bản đồ
    // Chỉ đóng khi người dùng nhấn nút đóng (X) trên banner/popup

    const { lng, lat } = event.lngLat;

    if (mapRef.current && mapControls.flood) {
        const features = mapRef.current.queryRenderedFeatures(event.point, {
            layers: ['flood-zones-fill']
        });

        if (features && features.length > 0) {
            const feature = features[0];
            const props = feature.properties || {};

            const zoneId = String(props.id);
            const zoneName = props.name || 'Vùng ngập';
            const depthCm = Number(props.depthCm || 0);
            const label = `${zoneName} - ngập ${depthCm}cm`;

            setSelectedFloodZone({
                lng,
                lat,
                properties: props
            });

            if (depthCm <= 10) {
                showCustomConfirm(
                    "Định tuyến tới vùng ngập nhẹ",
                    `Khu vực này đang ngập nhẹ khoảng ${depthCm}cm (Vẫn có thể di chuyển).\n\nBạn có muốn tìm đường đi tới đây không?`,
                    () => {
                        setDestination({ lng, lat, label });
                        setDestinationQuery(label);

                        if (userLocation) {
                            setOrigin({
                                lng: userLocation.lng,
                                lat: userLocation.lat,
                                label: 'Vị trí của bạn'
                            });
                            setOriginQuery('Vị trí của bạn');
                        }
                    },
                    () => {
                        setDestination(null);
                        setDestinationQuery('');
                        setRouteData(null);
                        setRouteAlertMessage(null);
                    }
                );
                return;
            }

            showCustomConfirm(
                "Định tuyến tới vùng ngập sâu",
                `Khu vực này đang ngập sâu ${depthCm}cm, có thể gây nguy hiểm cho phương tiện của bạn.\n\nBạn có chắc chắn muốn tiếp tục tìm đường tới đây không?`,
                () => {
                    setConfirmedFloodZoneIds((prev) => {
                        if (prev.includes(zoneId)) return prev;
                        return [...prev, zoneId];
                    });

                    setDestination({ lng, lat, label });
                    setDestinationQuery(label);

                    if (userLocation) {
                        setOrigin({
                            lng: userLocation.lng,
                            lat: userLocation.lat,
                            label: 'Vị trí của bạn'
                        });
                        setOriginQuery('Vị trí của bạn');
                    }
                },
                () => {
                    setDestination(null);
                    setDestinationQuery('');
                    setRouteData(null);
                    setRouteAlertMessage(null);
                }
            );

            return;
        }
    }

    // Đặt tọa độ tạm thời để hiển thị ghim xanh dương và banner xác nhận chỉ đường
    setPendingDestination({ lng, lat });
};

    // Xử lý tự động tìm gợi ý địa điểm (Auto-complete)
    useEffect(() => {
        const query = activeInputField === 'origin' ? originQuery : destinationQuery;

        if (!query.trim() || query === 'Vị trí của bạn') {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`
                );
                const data = await response.json();
                if (data.features) {
                    setSuggestions(data.features);
                    setShowSuggestions(true);
                }
            } catch (error) {
                console.error("Lỗi lấy gợi ý tìm kiếm:", error);
            } finally {
                setLoadingSearch(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [originQuery, destinationQuery, activeInputField]);

    const handleSelectSuggestion = (item: any) => {
        const [lng, lat] = item.center;
        const fullName = item.place_name_vi || item.place_name;
        // NEW CODE: Flood zone selection confirmation
        validateLocation(
            lng, lat, fullName, activeInputField || 'destination',
            () => {
                if (activeInputField === 'origin') {
                    setOrigin({ lng, lat, label: fullName });
                    setOriginQuery(fullName);
                } else {
                    setDestination({ lng, lat, label: fullName });
                    setDestinationQuery(fullName);
                }

                setShowSuggestions(false);
                // Di chuyển camera bản đồ đến điểm vừa chọn
                mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom: 15,
                    duration: 1200
                });
            },
            () => {
                if (activeInputField === 'origin') {
                    setOrigin(null);
                    setOriginQuery('');
                } else {
                    setDestination(null);
                    setDestinationQuery('');
                }
                setShowSuggestions(false);
            }
        );
    };

    const handleSwapLocations = () => {
        if (!origin && !destination) return;
        const tempOrigin = origin;
        const tempOriginQuery = originQuery;
        setOrigin(destination);
        setOriginQuery(destinationQuery);
        setDestination(tempOrigin);
        setDestinationQuery(tempOriginQuery);
    };


    // NEW CODE: Flood route avoidance feature - Tìm đường đi và tự động né tránh các đoạn đường ngập lụt
    useEffect(() => {
        if (!origin || !destination) return;
        const getShortestRoute = async () => {
            setLoadingRoute(true);
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                // Thêm alternatives=true để lấy các tuyến đường gợi ý thay thế
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxToken}`
                );
                const data = await response.json();
                if (response.ok && data.routes && data.routes.length > 0) {
                    let selectedRoute = data.routes[0];
                    let alertMsg: string | null = null;

                    if (avoidFlood) {
                        // FIX: Avoid flood zones deeper than 10cm when routing
                        const result = await findSafeRouteZone(
                            data.routes,
                            floodZones,
                            origin,
                            destination,
                            travelMode,
                            mapboxToken,
                            confirmedFloodZoneIds
                        );
                        selectedRoute = result.selectedRoute;
                        alertMsg = result.alertMsg;
                    }

                    // NEW CODE: Tránh đường cấm do sự kiện đang diễn ra
                    const now = new Date();
                    const activeRoadRestrictions = eventRoads.filter(road => isRoadRestrictionActive(road, now));

                    if (activeRoadRestrictions.length > 0 && selectedRoute) {
                        const result = await findSafeEventRoute(
                            [selectedRoute],
                            activeRoadRestrictions,
                            origin,
                            destination,
                            travelMode,
                            mapboxToken
                        );
                        selectedRoute = result.selectedRoute;
                        if (result.alertMsg) {
                            alertMsg = alertMsg ? `${alertMsg}\n${result.alertMsg}` : result.alertMsg;
                        }
                    }

                    setRouteAlertMessage(alertMsg);
                    if (selectedRoute) {
                        setRouteData({
                            totalDistanceKm: parseFloat((selectedRoute.distance / 1000).toFixed(2)),
                            totalTimeMin: Math.round(selectedRoute.duration / 60),
                            coordinates: selectedRoute.geometry.coordinates
                        });
                        // Căn chỉnh camera hiển thị đầy đủ tuyến đường đi
                        const coords = selectedRoute.geometry.coordinates;
                        if (coords.length > 0) {
                            let minLng = coords[0][0], maxLng = coords[0][0];
                            let minLat = coords[0][1], maxLat = coords[0][1];
                            for (const c of coords) {
                                if (c[0] < minLng) minLng = c[0];
                                if (c[0] > maxLng) maxLng = c[0];
                                if (c[1] < minLat) minLat = c[1];
                                if (c[1] > maxLat) maxLat = c[1];
                            }

                            mapRef.current?.fitBounds(
                                [[minLng, minLat], [maxLng, maxLat]],
                                { padding: 80, duration: 1500 }
                            );
                        }
                    } else {
                        // FIX: Select shortest route among safe alternatives - Clear route if no safe route found
                        setRouteData(null);
                    }
                } else {
                    alert('Không tìm thấy đường đi thích hợp cho phương tiện này!');
                    setRouteData(null);
                    setRouteAlertMessage(null);
                }
            } catch (err) {
                console.error("Lỗi kết nối API đường đi Mapbox:", err);
                setRouteData(null);
                setRouteAlertMessage(null);
            } finally {
                setLoadingRoute(false);
            }
        };
        getShortestRoute();
}, [origin, destination, travelMode, avoidFlood, confirmedFloodZoneIds, floodZones, eventRoads]);
    const geojsonData: any = routeData ? {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: routeData.coordinates
        }
    } : null;

    const routeLayerStyle: any = {
        id: 'route-line',
        type: 'line',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#2563eb',
            'line-width': 6,
            'line-opacity': 0.85
        }
    };

    useEffect(() => {
        if (showAlertPopup) {
            const interval = setInterval(() => {
                setCountdown((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(interval);
                        setShowAlertPopup(false);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [showAlertPopup]);

    const handleFilterClick = (filterId: string) => {
        if (selectedFilter === filterId) {
            setSelectedFilter(null);
        } else {
            setSelectedFilter(filterId);
            setDestination(null);
            setDestinationQuery('');
            setRouteData(null);
            setOrigin(null);
            setOriginQuery('');
        }
    };

    const toggleMapControl = (controlName: keyof typeof mapControls) => {
        setMapControls(prev => {
            const newValue = !prev[controlName];
            // NEW CODE: Flood zone selection confirmation - Reset confirmed flood zones when turning off flood layer
            if (controlName === 'flood' && !newValue) {
                setConfirmedFloodZoneIds([]);
            }
            return { ...prev, [controlName]: newValue };
        });
    };

   useEffect(() => {
    const fetchFloodZones = async () => {
        try {
            const response = await fetch("http://localhost:5001/api/flood-zones");
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                setFloodZones(result.data);
            }
        } catch (error) {
            console.error("Lỗi tải vùng ngập lụt từ database:", error);
        }
    };

    fetchFloodZones();
}, []);

    // ✅ ĐÃ SỬA LỖI ĐỂ TẢI ĐƯỢC DANH SÁCH POI
    useEffect(() => {
        const fetchPOIs = async () => {
            try {
                const response = await poiAPI.getAllPOIs();
                if (response.data && response.data.data) {
                    setPois(response.data.data);
                }
            } catch (error) {
                console.error("Lỗi tải POIs:", error);
            }
        };
        fetchPOIs();
    }, []);

    // Tải danh sách đường cấm sự kiện từ backend
    useEffect(() => {
        const fetchEventRoads = async () => {
            try {
                const data = await eventRoadService.getEventRoads({ approved_only: true });
                setEventRoads(data);
            } catch (error) {
                console.error("Lỗi tải danh sách đường cấm sự kiện:", error);
            }
        };
        fetchEventRoads();
    }, []);

    // Tải danh sách cảnh báo giao thông từ backend
    const fetchTrafficAlerts = async () => {
        try {
            const response = await trafficAlertAPI.getTrafficAlerts();
            if (response.data && response.data.success) {
                setTrafficAlerts(response.data.data);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách cảnh báo giao thông:", error);
        }
    };

    useEffect(() => {
        fetchTrafficAlerts();
    }, []);

    // Tải danh sách sự kiện, danh mục và yêu thích sự kiện
    useEffect(() => {
        const fetchEventsAndCategories = async () => {
            try {
                const eventsRes = await eventAPI.getAllEvents('approved');
                if (eventsRes.data && eventsRes.data.data) {
                    setEvents(eventsRes.data.data);
                }

                const catsRes = await eventAPI.getEventCategories();
                if (catsRes.data && catsRes.data.data) {
                    setEventCategories(catsRes.data.data);
                }
            } catch (error) {
                console.error("Lỗi tải sự kiện/danh mục:", error);
            }
        };

        const fetchUserFavoriteEventIds = async () => {
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
            if (!token) return;
            try {
                const favsRes = await eventAPI.getFavoriteEventIds();
                if (favsRes.data && favsRes.data.data) {
                    setFavoriteEventIds(new Set(favsRes.data.data));
                }
            } catch (error) {
                console.error("Lỗi tải danh sách sự kiện yêu thích:", error);
            }
        };

        fetchEventsAndCategories();
        fetchUserFavoriteEventIds();
    }, []);

    useEffect(() => {
        handleGetCurrentLocation(false);
    }, []);

    // Tự động đóng gợi ý tìm kiếm khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Tự động đóng popup khi marker di chuyển ra ngoài màn hình (như POIs)
    const handleMapMove = () => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        const floodZone = selectedFloodZoneRef.current;
        const dest = pendingDestinationRef.current;

        // 3. Kiểm tra selectedFloodZone
        if (floodZone) {
            if (floodZone.lng !== undefined && floodZone.lat !== undefined) {
                if (!bounds.contains([floodZone.lng, floodZone.lat])) {
                    setSelectedFloodZone(null);
                }
            }
        }

        // 4. Kiểm tra pendingDestination
        if (dest) {
            if (!bounds.contains([dest.lng, dest.lat])) {
                setPendingDestination(null);
            }
        }
    };
    // NEW CODE: Kiểm tra tuyến đường cấm có đang hoạt động ở thời điểm hiện tại không
    const isRoadRestrictionActive = (road: EventRoad, now: Date) => {
        const start = new Date(road.restriction_start);
        const end = new Date(road.restriction_end);
        
        if (now < start || now > end) {
            return false;
        }

        if (road.days_of_week) {
            const currentDay = now.getDay(); // 0: CN, 1: T2, ..., 6: T7
            const days = road.days_of_week.split(',').map(d => parseInt(d.trim()));
            if (!days.includes(currentDay)) {
                return false;
            }
        }

        if (road.start_time_of_day && road.end_time_of_day) {
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            const parseTimeToMinutes = (timeStr: string) => {
                const parts = timeStr.split(':');
                return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
            };

            const startMin = parseTimeToMinutes(road.start_time_of_day);
            const endMin = parseTimeToMinutes(road.end_time_of_day);

            return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
        }

        return true;
    };

    // NEW CODE: Lọc các đường cấm do sự kiện đang diễn ra hoặc thuộc sự kiện được chọn
    const activeOrSelectedEventRoads = useMemo(() => {
        const now = new Date();
        const futureTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 phút tiếp theo
        
        return eventRoads.filter(road => {
            // 1. Đường cấm đang hoạt động ở thời điểm hiện tại
            const isActiveNow = isRoadRestrictionActive(road, now);

            // 2. Đường cấm chuẩn bị hoạt động trong vòng 30 phút tới
            const isActiveSoon = isRoadRestrictionActive(road, futureTime);

            // 3. Sự kiện liên quan đang được người dùng chọn xem chi tiết
            const isSelectedEventRoad = selectedEvent && road.event_id === selectedEvent.event_id;

            return isActiveNow || isActiveSoon || isSelectedEventRoad;
        });
    }, [eventRoads, selectedEvent]);

    // Chuyển đổi dữ liệu đường cấm sang GeoJSON FeatureCollection
    const eventRoadsGeoJSON: any = useMemo(() => {
        if (activeOrSelectedEventRoads.length === 0) return null;
        
        const now = new Date();
        const features = activeOrSelectedEventRoads
            .filter(road => road.geojson_coords && road.geojson_coords.length > 0)
            .map(road => ({
                type: 'Feature',
                properties: {
                    road_id: road.road_id,
                    road_name: road.road_name,
                    restriction_type: road.restriction_type,
                    event_title: road.event_title || 'Sự kiện cấm đường',
                    description: road.description || '',
                    isActive: isRoadRestrictionActive(road, now),
                    isSelected: selectedRoadPopup && selectedRoadPopup.road_id === road.road_id
                },
                geometry: {
                    type: 'LineString',
                    coordinates: road.geojson_coords
                }
            }));
            
        return {
            type: 'FeatureCollection',
            features
        };
    }, [activeOrSelectedEventRoads, selectedRoadPopup]);

const floodGeoJSON: any = useMemo(() => {
    if (!floodZones || floodZones.length === 0) return null;

    return {
        type: 'FeatureCollection',
        features: floodZones
            .filter((zone) => Array.isArray(zone.center) && zone.center.length === 2 && zone.radius)
            .map((zone) => ({
                type: 'Feature',
                properties: {
                    id: zone.id,
                    zone_id: zone.zone_id,
                    name: zone.name,
                    district: zone.district,
                    risk_level: zone.risk_level,
                    depthCm: zone.depthCm,
                    level: zone.level,
                    description: zone.description,
                    typical_flood_months: zone.typical_flood_months,
                    color:
                        zone.level === 'high'
                            ? '#ef4444'
                            : zone.level === 'medium'
                                ? '#f97316'
                                : '#eab308'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [getCirclePolygon(zone.center, zone.radius)]
                }
            }))
    };
}, [floodZones]);

    return (
        <div className="w-full h-screen relative bg-slate-100 overflow-hidden font-sans select-none">
            {/* Custom Style Overrides for Mapbox Popups */}
            <style>{`
                .mapboxgl-popup-content {
                    padding: 0 !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
                    border-top-color: #ffffff !important;
                }
                .mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
                    border-bottom-color: #ffffff !important;
                }
                .mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
                    border-right-color: #ffffff !important;
                }
                .mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
                    border-left-color: #ffffff !important;
                }
                /* Phóng to nút đóng mặc định của Mapbox */
                .mapboxgl-popup-close-button {
                    font-size: 20px !important;
                    padding: 8px 12px !important;
                    color: #475569 !important; /* slate-600 */
                    font-weight: bold !important;
                    border-radius: 9999px !important;
                    line-height: 1 !important;
                    transition: all 0.2s !important;
                    z-index: 100 !important;
                    top: 6px !important;
                    right: 6px !important;
                }
                .mapboxgl-popup-close-button:hover {
                    background-color: #f1f5f9 !important; /* slate-100 */
                    color: #0f172a !important; /* slate-900 */
                }
            `}</style>

            <div className="absolute inset-0 z-0">
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: 108.2022,
                        latitude: 16.0544,
                        zoom: 13
                    }}
                    onClick={handleMapClick}
                    onMove={handleMapMove}
                    onMouseMove={(event) => {
                        if (!mapControls.flood) return;
                        const features = mapRef.current?.queryRenderedFeatures(event.point, {
                            layers: ['flood-zones-fill']
                        });
                        if (features && features.length > 0) {
                            const f = features[0];
                            setHoveredFloodZone({
                                lng: event.lngLat.lng,
                                lat: event.lngLat.lat,
                                properties: f.properties
                            });
                            if (mapRef.current) {
                                mapRef.current.getCanvas().style.cursor = 'pointer';
                            }
                        } else {
                            setHoveredFloodZone(null);
                            if (mapRef.current) {
                                mapRef.current.getCanvas().style.cursor = '';
                            }
                        }
                    }}
                    interactiveLayerIds={['flood-zones-fill']}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                >
                    <NavigationControl position="bottom-right" showCompass={true} />

                    {userLocation && (
                        <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                            <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse" />
                        </Marker>
                    )}
                    
                    {origin && userLocation && (origin.lng !== userLocation.lng || origin.lat !== userLocation.lat) && (
                        <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
                            <div className="w-4.5 h-4.5 bg-emerald-600 border-2 border-white rounded-full shadow-lg" />
                        </Marker>
                    )}

                    {/* Marker: Ghim đỏ Điểm đến (Custom SVG theo thiết kế Google Maps) */}
                    {destination && (
                        <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
                            <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer group">
                                <svg width="36" height="42" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md transition-transform duration-200 group-hover:scale-110">
                                    {/* Bóng của ghim */}
                                    <ellipse cx="18" cy="38" rx="8" ry="2.5" fill="#64748b" opacity="0.4" />
                                    {/* Phần thân ghim đỏ */}
                                    <path
                                        d="M18 0C8.06 0 0 8.06 0 18C0 27.5 18 40 18 40C18 40 36 27.5 36 18C36 8.06 27.94 0 18 0Z"
                                        fill="#EF4444"
                                    />
                                    {/* Vòng tròn ở giữa màu đỏ sậm */}
                                    <circle cx="18" cy="16" r="5" fill="#991B1B" />
                                </svg>
                            </div>
                        </Marker>
                    )}

         {mapControls.flood && floodGeoJSON && (
    <Source id="flood-zones-source" type="geojson" data={floodGeoJSON}>
        <Layer
            id="flood-zones-fill"
            type="fill"
            paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.45
            }}
        />
        <Layer
            id="flood-zones-outline"
            type="line"
            paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.9
            }}
        />
    </Source>
)}

{/* Marker & Popup: Điểm đến tạm thời và Banner xác nhận khi click trên map */}
{pendingDestination && (
    <>
        <Marker
            longitude={pendingDestination.lng}
            latitude={pendingDestination.lat}
            anchor="bottom"
        >
            <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer animate-bounce">
                <svg width="36" height="42" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
                    <ellipse cx="18" cy="38" rx="8" ry="2.5" fill="#64748b" opacity="0.4" />
                    <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 24 18 24s18-10.5 18-24C36 8.059 27.941 0 18 0z" fill="#ef4444" />
                    <circle cx="18" cy="18" r="8" fill="white" />
                </svg>
            </div>
        </Marker>

        <Popup
                                longitude={pendingDestination.lng}
                                latitude={pendingDestination.lat}
                                anchor="bottom"
                                onClose={() => setPendingDestination(null)}
                                closeOnClick={false}
                                closeButton={false}
                                offset={[0, -35]}
                                className="z-50"
                            >
                                <div className="p-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 font-sans relative overflow-hidden">
                                    {/* Header với icon bản đồ & nút đóng */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <Navigation size={13} className="rotate-45" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <h4 className="font-black text-[12px] text-slate-800 leading-tight">Chỉ đường tới đây?</h4>
                                            <p className="text-[9px] text-slate-400 font-semibold truncate">
                                                {pendingDestination.lng.toFixed(5)}, {pendingDestination.lat.toFixed(5)}
                                            </p>
                                        </div>
                                        
                                        <button
                                            onClick={() => setPendingDestination(null)}
                                            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-95 shrink-0"
                                            title="Đóng"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    
                                    <p className="text-[10px] text-slate-500 mb-3 text-left leading-normal">
                                        Hệ thống sẽ vẽ lộ trình tối ưu và cảnh báo tránh các vùng ngập lụt nếu có.
                                    </p>

                                    {/* Hộp nút bấm hành động */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const { lng, lat } = pendingDestination;
                                                const label = `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
                                                validateLocation(
                                                    lng,
                                                    lat,
                                                    label,
                                                    'destination',
                                                    () => {
                                                        setDestination({ lng, lat, label });
                                                        setDestinationQuery(label);
                                                        if (userLocation && !origin) {
                                                            setOrigin({
                                                                lng: userLocation.lng,
                                                                lat: userLocation.lat,
                                                                label: 'Vị trí của bạn'
                                                            });
                                                            setOriginQuery('Vị trí của bạn');
                                                        }
                                                        setPendingDestination(null);
                                                    },
                                                    () => {
                                                        setDestination(null);
                                                        setDestinationQuery('');
                                                        setPendingDestination(null);
                                                    }
                                                );
                                            }}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black py-2 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                                        >
                                            Chỉ đường
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (pendingDestination) {
                                                    handleOpenReportModal(pendingDestination.lat, pendingDestination.lng);
                                                }
                                            }}
                                            className="bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-bold py-2 px-3 rounded-xl hover:bg-orange-100 hover:text-orange-700 transition-all active:scale-95"
                                        >
                                            Báo cáo
                                        </button>
                                        <button
                                            onClick={() => setPendingDestination(null)}
                                            className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] font-bold py-2 px-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </>
                    )}

                    {mapControls.flood && floodGeoJSON && (
                        <Source id="flood-zones-source" type="geojson" data={floodGeoJSON}>
                            <Layer
                                id="flood-zones-fill"
                                type="fill"
                                filter={['==', ['geometry-type'], 'Polygon']}
                                paint={{
                                    'fill-color': ['get', 'color'],
                                    'fill-opacity': 0.45
                                }}
                            />
                            <Layer
                                id="flood-zones-circle"
                                type="circle"
                                filter={['==', ['geometry-type'], 'Point']}
                                paint={{
                                    'circle-color': ['get', 'color'],
                                    'circle-radius': 25,
                                    'circle-opacity': 0.55,
                                    'circle-stroke-width': 3,
                                    'circle-stroke-color': '#ffffff',
                                    'circle-stroke-opacity': 0.8,
                                    'circle-pitch-alignment': 'map'
                                }}
                            />
                        </Source>
                    )}

                    {selectedFloodZone && mapControls.flood && (
                        <Popup
                            longitude={selectedFloodZone.lng}
                            latitude={selectedFloodZone.lat}
                            anchor="bottom"
                            onClose={() => setSelectedFloodZone(null)}
                            closeOnClick={false}
                            offset={[0, -15]}
                            className="z-50"
                        >
                            <div className="p-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans">
                                <h3 className="font-bold text-[13px] mb-1.5 leading-tight">{selectedFloodZone.properties.name}</h3>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[11px] text-slate-500 font-semibold">Mức độ:</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        selectedFloodZone.properties.risk_level === 'High' ? 'bg-red-100 text-red-600' :
                                        selectedFloodZone.properties.risk_level === 'Medium' ? 'bg-orange-100 text-orange-600' :
                                        'bg-yellow-100 text-yellow-600'
                                    }`}>
                                        {selectedFloodZone.properties.risk_level === 'High' ? 'Cao' :
                                         selectedFloodZone.properties.risk_level === 'Medium' ? 'Trung bình' : 'Thấp'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5 pb-1.5">
                                    {selectedFloodZone.properties.description}
                                </p>
                            </div>
                        </Popup>
                    )}

                    {geojsonData && (
                        <Source id="route-source" type="geojson" data={geojsonData}>
                            <Layer {...routeLayerStyle} />
                        </Source>
                    )}

                    {/* NEW CODE: Lớp hiển thị đường cấm và hạn chế do sự kiện */}
                    {eventRoadsGeoJSON && (
                        <Source id="event-roads-source" type="geojson" data={eventRoadsGeoJSON}>
                            {/* Viền đen mờ bao quanh dải đường cấm */}
                            <Layer
                                id="event-roads-casing"
                                type="line"
                                paint={{
                                    'line-color': '#000000',
                                    'line-width': [
                                        'case',
                                        ['get', 'isSelected'],
                                        14.5,
                                        ['case', ['get', 'isActive'], 11.5, 7.5]
                                    ],
                                    'line-opacity': [
                                        'case',
                                        ['get', 'isSelected'],
                                        0.55,
                                        ['case', ['get', 'isActive'], 0.4, 0.25]
                                    ]
                                }}
                            />
                            {/* Layer nét đứt: dành cho đường cấm hoàn toàn (CLOSED) */}
                            <Layer
                                id="event-roads-line-dashed"
                                type="line"
                                filter={['==', ['get', 'restriction_type'], 'CLOSED']}
                                paint={{
                                    'line-color': '#EF4444', // Luôn màu đỏ nổi bật
                                    'line-width': [
                                        'case',
                                        ['get', 'isSelected'],
                                        10.5,
                                        ['case', ['get', 'isActive'], 8.0, 5.0]
                                    ],
                                    'line-opacity': [
                                        'case',
                                        ['get', 'isSelected'],
                                        1.0,
                                        ['case', ['get', 'isActive'], 0.95, 0.55] // 0.55 opacity khi chưa đến giờ cấm để nổi bật nhưng biểu thị Scheduled
                                    ],
                                    'line-dasharray': [3, 2]
                                }}
                            />
                            {/* Layer nét liền: dành cho đường một chiều (ONE_WAY) hoặc hạn chế (LIMITED) */}
                            <Layer
                                id="event-roads-line-solid"
                                type="line"
                                filter={['!=', ['get', 'restriction_type'], 'CLOSED']}
                                paint={{
                                    'line-color': [
                                        'match',
                                        ['get', 'restriction_type'],
                                        'LIMITED', '#F59E0B',
                                        'ONE_WAY', '#3B82F6',
                                        '#EF4444'
                                    ],
                                    'line-width': [
                                        'case',
                                        ['get', 'isSelected'],
                                        10.5,
                                        ['case', ['get', 'isActive'], 8.0, 5.0]
                                    ],
                                    'line-opacity': [
                                        'case',
                                        ['get', 'isSelected'],
                                        1.0,
                                        ['case', ['get', 'isActive'], 0.95, 0.55] // 0.55 opacity khi chưa đến giờ cấm
                                    ]
                                }}
                            />
                        </Source>
                    )}

                    {activeOrSelectedEventRoads.map((road) => {
                        if (!road.geojson_coords || road.geojson_coords.length === 0) return null;
                        const startCoord = road.geojson_coords[0];
                        const now = new Date();
                        const isActive = isRoadRestrictionActive(road, now);
                        const isSelected = selectedRoadPopup && selectedRoadPopup.road_id === road.road_id;
                        
                        // Tìm sự kiện tương ứng với road.event_id
                        const relatedEvent = events.find(e => e.event_id === road.event_id);

                        const getMarkerColor = () => {
                            if (isSelected) return 'bg-red-500 scale-110 ring-4 ring-red-500/30 z-30';
                            if (!isActive) return 'bg-slate-400';
                            if (road.restriction_type === 'LIMITED') return 'bg-amber-500';
                            if (road.restriction_type === 'ONE_WAY') return 'bg-blue-600';
                            return 'bg-red-600';
                        };

                        if (relatedEvent) {
                            const categoryColor = relatedEvent.category_color || '#ef4444';
                            return (
                                <Marker
                                    key={`marker-road-${road.road_id}`}
                                    longitude={startCoord[0]}
                                    latitude={startCoord[1]}
                                    anchor="bottom"
                                >
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewMode('events');
                                            handleEventClick(relatedEvent);
                                        }}
                                        className={`relative flex items-center justify-center border-2 border-white rounded-full shadow-2xl cursor-pointer transform hover:scale-115 transition-all z-20 w-9 h-9`}
                                        style={{ backgroundColor: categoryColor }}
                                    >
                                        {/* Logo sự kiện (Hình ảnh hoặc Emoji) */}
                                        {relatedEvent.thumbnail_url ? (
                                            <img 
                                                src={relatedEvent.thumbnail_url} 
                                                alt={relatedEvent.title} 
                                                className="w-full h-full object-cover rounded-full"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-white text-sm">{relatedEvent.category_icon || '🎆'}</span>
                                        )}

                                        {/* Huy hiệu cấm đường góc dưới bên phải */}
                                        <div className={`absolute -bottom-1 -right-1 border border-white text-white w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md ${getMarkerColor()} p-0.5`}>
                                            <RouteOff size={9} />
                                        </div>
                                    </div>
                                </Marker>
                            );
                        }

                        return (
                            <Marker
                                key={`marker-road-${road.road_id}`}
                                longitude={startCoord[0]}
                                latitude={startCoord[1]}
                                anchor="bottom"
                            >
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRoadPopup(road);
                                    }}
                                    className={`flex items-center justify-center border border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getMarkerColor()} ${isActive ? 'animate-pulse' : ''}`}
                                >
                                    <RouteOff size={13} />
                                </div>
                            </Marker>
                        );
                    })}

                    {/* Traffic Alert Markers & Popups */}
                    {mapControls.traffic && trafficAlerts.map(alert => {
                        const getAlertColor = () => {
                            if (alert.severity === 'HIGH') return 'bg-red-600 ring-red-500/30';
                            if (alert.severity === 'MEDIUM') return 'bg-orange-500 ring-orange-400/30';
                            return 'bg-blue-500 ring-blue-400/30';
                        };

                        const renderAlertIcon = () => {
                            if (alert.type === 'CONGESTION') return <Car size={13} />;
                            if (alert.type === 'ACCIDENT') return <AlertTriangle size={13} />;
                            if (alert.type === 'CONSTRUCTION') return <Construction size={13} />;
                            return <AlertTriangle size={13} />;
                        };

                        return (
                            <Marker
                                key={`traffic-alert-${alert.id}`}
                                longitude={alert.longitude}
                                latitude={alert.latitude}
                                anchor="bottom"
                            >
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTrafficAlert(alert);
                                        setSelectedPOI(null);
                                        setSelectedEvent(null);
                                        setSelectedRoadPopup(null);
                                    }}
                                    className={`flex items-center justify-center border border-white text-white w-7 h-7 rounded-full shadow-lg cursor-pointer transform hover:scale-115 transition-all z-20 ${getAlertColor()} ring-4`}
                                >
                                    {renderAlertIcon()}
                                </div>
                            </Marker>
                        );
                    })}

                    {mapControls.traffic && selectedTrafficAlert && (
                        <Popup
                            longitude={selectedTrafficAlert.longitude}
                            latitude={selectedTrafficAlert.latitude}
                            anchor="top"
                            onClose={() => setSelectedTrafficAlert(null)}
                            closeButton={true}
                            closeOnClick={false}
                            offset={[0, 10]}
                            className="z-50"
                        >
                            <div className="p-4 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                        selectedTrafficAlert.type === 'CONGESTION' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                        selectedTrafficAlert.type === 'ACCIDENT' ? 'bg-red-50 border-red-200 text-red-600' :
                                        'bg-blue-50 border-blue-200 text-blue-600'
                                    }`}>
                                        {selectedTrafficAlert.type === 'CONGESTION' ? 'Kẹt xe' : selectedTrafficAlert.type === 'ACCIDENT' ? 'Tai nạn' : 'Thi công'}
                                    </span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                        selectedTrafficAlert.severity === 'HIGH' ? 'bg-red-100 border-red-300 text-red-700' :
                                        selectedTrafficAlert.severity === 'MEDIUM' ? 'bg-orange-100 border-orange-300 text-orange-700' :
                                        'bg-blue-100 border-blue-300 text-blue-700'
                                    }`}>
                                        {selectedTrafficAlert.severity}
                                    </span>
                                </div>

                                <h4 className="font-extrabold text-sm text-slate-800 leading-snug mb-1">{selectedTrafficAlert.title}</h4>
                                {selectedTrafficAlert.description && (
                                    <p className="text-xs text-slate-600 mb-2 leading-relaxed">{selectedTrafficAlert.description}</p>
                                )}
                                <p className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1">📍 {selectedTrafficAlert.location}</p>
                                <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-2.5">
                                    <span className="text-[9px] text-slate-400 font-medium">
                                        Bởi: {selectedTrafficAlert.creator_name || 'Hệ thống'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">
                                        {new Date(selectedTrafficAlert.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    )}

                    {selectedRoadPopup && selectedRoadPopup.geojson_coords && selectedRoadPopup.geojson_coords.length > 0 && (
                        <Popup
                            longitude={selectedRoadPopup.geojson_coords[0][0]}
                            latitude={selectedRoadPopup.geojson_coords[0][1]}
                            anchor="top"
                            onClose={() => setSelectedRoadPopup(null)}
                            closeButton={true}
                            closeOnClick={false}
                            offset={[0, 10]}
                            className="z-50"
                        >
                            <div className="p-3 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 text-slate-800 font-sans">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <div className={`p-1 rounded-lg shrink-0 ${
                                        isRoadRestrictionActive(selectedRoadPopup, new Date())
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        <RouteOff size={14} />
                                    </div>
                                    <h4 className="font-bold text-[12px] leading-tight text-slate-800">
                                        {selectedRoadPopup.road_name}
                                    </h4>
                                </div>

                                {(() => {
                                    const active = isRoadRestrictionActive(selectedRoadPopup, new Date());
                                    return (
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold mb-1.5 border ${
                                            active
                                                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                                                : 'bg-slate-50 border-slate-200 text-slate-500'
                                        }`}>
                                            {active ? '🔴 ĐANG ÁP DỤNG CẤM ĐƯỜNG' : '⚪ ĐANG MỞ (CHƯA ĐẾN GIỜ CẤM)'}
                                        </div>
                                    );
                                })()}
                                
                                <p className="text-[10px] text-slate-500 mb-1.5 font-bold">
                                    {selectedRoadPopup.restriction_type === 'CLOSED' ? '🔴 Cấm hoàn toàn' :
                                     selectedRoadPopup.restriction_type === 'LIMITED' ? '🟡 Hạn chế lưu thông' :
                                     selectedRoadPopup.restriction_type === 'ONE_WAY' ? '🔵 Đường một chiều' : 'Hạn chế cấm đỗ'}
                                </p>
                                
                                <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 mb-1.5 leading-relaxed">
                                    {selectedRoadPopup.description || 'Hạn chế giao thông phục vụ sự kiện.'}
                                </p>
                                
                                <div className="text-[9px] font-semibold text-slate-500 flex flex-col gap-0.5 border-t border-slate-100 pt-1.5">
                                    <div><span className="font-bold text-slate-600">Sự kiện:</span> {selectedRoadPopup.event_title || 'Sự kiện'}</div>
                                    {selectedRoadPopup.days_of_week ? (
                                        <div className="text-red-600 font-bold mt-1 bg-red-50 p-1 rounded border border-red-100/60">
                                            ⏰ Lịch cấm: {
                                                selectedRoadPopup.days_of_week.split(',').map(d => {
                                                    const day = parseInt(d.trim());
                                                    return day === 0 ? 'Chủ Nhật' : `Thứ ${day + 1}`;
                                                }).join(', ')
                                            } ({selectedRoadPopup.start_time_of_day?.substring(0, 5)} - {selectedRoadPopup.end_time_of_day?.substring(0, 5)})
                                        </div>
                                    ) : (
                                        <>
                                            <div><span className="font-bold text-slate-600">Bắt đầu:</span> {new Date(selectedRoadPopup.restriction_start).toLocaleString('vi-VN')}</div>
                                            <div><span className="font-bold text-slate-600">Kết thúc:</span> {new Date(selectedRoadPopup.restriction_end).toLocaleString('vi-VN')}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    )}

                    {/* NEW CODE: Flood zone feature */}
               

                    {viewMode === 'pois' ? (
                        <POIsLayer
                            pois={pois}
                            selectedFilter={selectedFilter}
                            onDirectionsClick={(poi) => {
                                setDestination({ lng: poi.longitude, lat: poi.latitude, label: poi.name });
                                setDestinationQuery(poi.name);
                                if (userLocation) {
                                    setOrigin({
                                        lng: userLocation.lng,
                                        lat: userLocation.lat,
                                        label: 'Vị trí của bạn'
                                    });
                                    setOriginQuery('Vị trí của bạn');
                                }
                            }}
                            selectedPOI={selectedPOI}
                            onSelectPOI={setSelectedPOI}
                        />
                    ) : (
                        <EventsLayer
                            events={events}
                            onSelectEvent={handleEventClick}
                        />
                    )}
                </Map>
            </div>



            {/* HEADER TRÊN CÙNG */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between gap-4 pointer-events-none">
                <div className="relative pointer-events-auto shrink-0 flex flex-col gap-2 max-h-[calc(100vh-80px)]">
                    {viewMode === 'pois' ? (
                        <>
                            <div ref={searchContainerRef} className="relative">
                                {!destination ? (
                                    <div className="w-80 h-[42px] bg-white rounded-full shadow-md border border-slate-200/60 flex items-center px-4">
                                        <Search className="text-blue-500 mr-2 shrink-0" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm địa điểm tại Đà Nẵng..."
                                            value={destinationQuery}
                                            onChange={(e) => {
                                                setDestinationQuery(e.target.value);
                                                setActiveInputField('destination');
                                            }}
                                            onFocus={() => {
                                                setActiveInputField('destination');
                                                if (suggestions.length > 0) setShowSuggestions(true);
                                            }}
                                            className="w-full bg-transparent outline-none text-xs font-medium text-slate-700 placeholder-slate-400"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col gap-3 relative">
                                        <div className="absolute left-[26px] top-[34px] bottom-[34px] w-[2px] border-l-2 border-dashed border-slate-200"></div>
                                        <div className="flex items-center gap-3 relative">
                                            <span className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white z-10 flex items-center justify-center shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Chọn điểm đi (Mặc định: Vị trí của bạn)"
                                                value={originQuery}
                                                onChange={(e) => {
                                                    setOriginQuery(e.target.value);
                                                    setActiveInputField('origin');
                                                }}
                                                onFocus={() => {
                                                    setActiveInputField('origin');
                                                    if (suggestions.length > 0) setShowSuggestions(true);
                                                }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 relative">
                                            <span className="text-red-500 z-10 text-sm font-bold shrink-0">📍</span>
                                            <input
                                                type="text"
                                                placeholder="Chọn điểm đến..."
                                                value={destinationQuery}
                                                onChange={(e) => {
                                                    setDestinationQuery(e.target.value);
                                                    setActiveInputField('destination');
                                                }}
                                                onFocus={() => {
                                                    setActiveInputField('destination');
                                                    if (suggestions.length > 0) setShowSuggestions(true);
                                                }}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-300"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSwapLocations}
                                            className="absolute right-6 top-[40px] w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                                            title="Đảo ngược vị trí"
                                        >
                                            <ArrowUpDown size={14} />
                                        </button>
                                    </div>
                                )}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
                                        {suggestions.map((item: any) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelectSuggestion(item)}
                                                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-start gap-2 text-[11px] font-medium text-slate-700 border-b border-slate-50 last:border-b-0"
                                            >
                                                <span className="text-slate-400 mt-0.5">📍</span>
                                                <div>
                                                    <div className="font-bold text-slate-800 line-clamp-1">{item.text_vi || item.text}</div>
                                                    <div className="text-slate-400 text-[10px] line-clamp-1 mt-0.5">{item.place_name_vi || item.place_name}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {routeData && (
                                <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Chi tiết lộ trình di chuyển</h3>
                                    
                                    {/* Tùy chọn định tuyến: Tránh vùng ngập lụt */}
                                    <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-3 animate-fade-in">
                                        <div className="flex items-center gap-2">
                                            <CloudRain size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-bold text-slate-700">Tránh vùng ngập lụt</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAvoidFlood(!avoidFlood)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${avoidFlood ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span
                                                style={{ transform: avoidFlood ? 'translateX(18px)' : 'translateX(2px)' }}
                                                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                                            />
                                        </button>
                                    </div>
                                    
                                    {/* Hiển thị cảnh báo ngập lụt nếu có */}
                                    {routeAlertMessage && (
                                        <div className={`text-[10px] font-bold px-3 py-2 rounded-xl mb-3 border whitespace-pre-line ${
                                            routeAlertMessage.includes('an toàn') 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                                                : 'bg-amber-50 text-amber-700 border-amber-200/50'
                                        }`}>
                                            {routeAlertMessage}
                                        </div>
                                    )}

                                    <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTravelMode('driving')}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'driving' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Car size={13} /> Lái xe
                                        </button>
                                        <button
                                            onClick={() => setTravelMode('walking')}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'walking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Footprints size={13} /> Đi bộ
                                        </button>
                                        <button
                                            onClick={() => setTravelMode('cycling')}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'cycling' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Bike size={13} /> Xe đạp
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-semibold">KHOẢNG CÁCH</p>
                                            <p className="text-lg font-black text-slate-800">{routeData.totalDistanceKm} km</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-semibold">THỜI GIAN DỰ KIẾN</p>
                                            <p className="text-lg font-black text-blue-600">{routeData.totalTimeMin} phút</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setRouteData(null);
                                            setDestination(null);
                                            setOrigin(null);
                                            setOriginQuery('');
                                            setDestinationQuery('');
                                            setRouteAlertMessage(null);
                                            setConfirmedFloodZoneIds([]);
                                        }}
                                        className="mt-3 w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        Xóa lộ trình
                                    </button>
                                </div>
                            )}

                            {selectedFilter !== null && (
                                <POIFeaturedSidebar
                                    pois={pois}
                                    selectedFilter={selectedFilter}
                                    onPOIClick={handlePOIClick}
                                    onDirectionsClick={(poi) => {
                                        setDestination({ lng: poi.longitude, lat: poi.latitude, label: poi.name });
                                        setDestinationQuery(poi.name);
                                        if (userLocation) {
                                            setOrigin({
                                                lng: userLocation.lng,
                                                lat: userLocation.lat,
                                                label: 'Vị trí của bạn'
                                            });
                                            setOriginQuery('Vị trí của bạn');
                                        }
                                    }}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            {showEventsSidebar && (
                                <EventsSidebar
                                    events={events}
                                    categories={eventCategories}
                                    onEventClick={handleEventClick}
                                    onClose={() => setShowEventsSidebar(false)}
                                    hasRoute={!!routeData}
                                />
                            )}
                            {routeData && (
                                <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 pointer-events-auto animate-fade-up">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Chi tiết lộ trình di chuyển</h3>
                                    
                                    {/* Tùy chọn định tuyến: Tránh vùng ngập lụt */}
                                    <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-3 animate-fade-in">
                                        <div className="flex items-center gap-2">
                                            <CloudRain size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-bold text-slate-700">Tránh vùng ngập lụt</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAvoidFlood(!avoidFlood)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${avoidFlood ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span
                                                style={{ transform: avoidFlood ? 'translateX(18px)' : 'translateX(2px)' }}
                                                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                                            />
                                        </button>
                                    </div>
                                    
                                    {/* Hiển thị cảnh báo ngập lụt nếu có */}
                                    {routeAlertMessage && (
                                        <div className={`text-[10px] font-bold px-3 py-2 rounded-xl mb-3 border whitespace-pre-line ${
                                            routeAlertMessage.includes('an toàn') 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                                                : 'bg-amber-50 text-amber-700 border-amber-200/50'
                                        }`}>
                                            {routeAlertMessage}
                                        </div>
                                    )}

                                    <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTravelMode('driving')}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'driving' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Car size={13} /> Lái xe
                                        </button>
                                        <button
                                            onClick={() => setTravelMode('walking')}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'walking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Footprints size={13} /> Đi bộ
                                        </button>
                                        <button
                                            onClick={() => setTravelMode('cycling')}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'cycling' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            <Bike size={13} /> Xe đạp
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-semibold">KHOẢNG CÁCH</p>
                                            <p className="text-lg font-black text-slate-800">{routeData.totalDistanceKm} km</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-semibold">THỜI GIAN DỰ KIẾN</p>
                                            <p className="text-lg font-black text-blue-600">{routeData.totalTimeMin} phút</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setRouteData(null);
                                            setDestination(null);
                                            setOrigin(null);
                                            setOriginQuery('');
                                            setDestinationQuery('');
                                            setRouteAlertMessage(null);
                                            setConfirmedFloodZoneIds([]);
                                        }}
                                        className="mt-3 w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        Xóa lộ trình
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Giữa: Các nút Filters */}
                {viewMode === 'pois' ? (
                    <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none pointer-events-auto max-w-[calc(100vw-540px)]">
                        {filterCategories.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = selectedFilter === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleFilterClick(cat.id)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold shadow-md border transition-all shrink-0 ${
                                        isSelected
                                            ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                                            : 'bg-white text-slate-700 border-slate-200/60 hover:bg-slate-50 hover:text-blue-600'
                                    }`}
                                >
                                    <Icon size={13} className={isSelected ? 'text-white' : 'text-slate-500'} />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1" />
                )}

                {/* Phải: Thông báo & Nút User / Admin */}
                <div className="flex items-center gap-3 shrink-0 pointer-events-auto relative">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotificationModal(!showNotificationModal)}
                            className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all"
                        >
                            <Bell size={18} />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        {showNotificationModal && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-30 animate-fade-up">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                                    <span>Cảnh báo thiên tai đô thị</span>
                                    <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black text-[9px] animate-pulse">LIVE</span>
                                </div>
                                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-none">
                                    {mockAlerts.map((alert) => (
                                        <div key={alert.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50/40 transition-colors">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                                {alert.type === 'flood' ? <CloudRain size={14} className="text-blue-500" /> : <Ban size={14} className="text-red-500" />}
                                                {alert.title}
                                            </div>
                                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">{alert.content}</p>
                                            <div className="text-[9px] text-slate-400 mt-1">{alert.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {userRole === 'admin' && (
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="w-[42px] h-[42px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all"
                            title="Bảng điều khiển Admin"
                        >
                            <Settings size={18} />
                        </button>
                    )}

                    {userRole !== 'admin' && (
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-[42px] h-[42px] flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200/60 text-slate-600 hover:text-blue-600 transition-all"
                            title="Hồ sơ cá nhân"
                        >
                            <User size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* MAP CONTROLS DƯỚI GÓC PHẢI */}
            <div className="absolute right-6 bottom-32 flex flex-col gap-3 z-10 pointer-events-none">
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Vị trí
                    </span>
                    <button
                        onClick={() => handleGetCurrentLocation(true)}
                        className="w-11 h-11 bg-white rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        <Navigation size={18} className="rotate-45 -ml-1 -mt-1" />
                    </button>
                </div>

                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Lớp
                    </span>
                    <button
                        onClick={() => toggleMapControl('layers')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.layers ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                    >
                        <Layers size={18} />
                    </button>
                </div>

                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Giao thông
                    </span>
                    <button
                        onClick={() => toggleMapControl('traffic')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.traffic ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                    >
                        <TrendingUp size={18} />
                    </button>
                </div>

                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Ngập lụt
                    </span>
                    <button
                        onClick={() => toggleMapControl('flood')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.flood ? 'bg-blue-50 text-blue-500 border-blue-200' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                    >
                        <CloudRain size={18} />
                    </button>
                </div>

                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Xem Sự Kiện
                    </span>
                    <button
                        onClick={() => {
                            setViewMode(prev => {
                                const next = prev === 'pois' ? 'events' : 'pois';
                                if (next === 'events') {
                                    setShowEventsSidebar(true);
                                    setSelectedPOI(null);
                                    setSelectedFilter(null);
                                } else {
                                    setSelectedEvent(null);
                                }
                                return next;
                            });
                        }}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${viewMode === 'events' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                    >
                        <Calendar size={18} />
                    </button>
                </div>
            </div>

            {/* Event detail sidebar (Right side) */}
            {selectedEvent && (
                <div className="absolute right-6 top-24 z-20 pointer-events-none">
                    <EventDetailSidebar
                        event={selectedEvent}
                        isFavorite={favoriteEventIds.has(selectedEvent.event_id)}
                        onFavoriteToggle={() => handleFavoriteEventToggle(selectedEvent)}
                        onDirectionsClick={() => {
                            setDestination({
                                lng: selectedEvent.longitude,
                                lat: selectedEvent.latitude,
                                label: selectedEvent.title
                            });
                            setDestinationQuery(selectedEvent.title);
                            if (userLocation) {
                                setOrigin({
                                    lng: userLocation.lng,
                                    lat: userLocation.lat,
                                    label: 'Vị trí của bạn'
                                });
                                setOriginQuery('Vị trí của bạn');
                            }
                            setSelectedEvent(null);
                        }}
                        onClose={() => setSelectedEvent(null)}
                    />
                </div>
            )}

            {/* POPUP CẢNH BÁO */}
            {showAlertPopup && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-[460px] bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden shadow-danger">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={18} className="animate-bounce" />
                            <div>
                                <div className="text-xs font-bold">Cảnh báo hôm nay</div>
                                <div className="text-[10px] opacity-90">Hệ thống ghi nhận thông báo cấm đường và ngập nước</div>
                            </div>
                        </div>
                        <button onClick={() => setShowAlertPopup(false)} className="text-white/80 hover:text-white bg-white/10 p-1 rounded-full text-xs">✕</button>
                    </div>

                    <div className="p-3 flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-none">
                        {mockAlerts.slice(0, 2).map((alert) => (
                            <div key={alert.id} className="flex gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="shrink-0 mt-0.5">
                                    {alert.type === 'flood' ? <CloudRain className="text-blue-500" size={16} /> : <Ban className="text-red-500" size={16} />}
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-900">{alert.title}</h4>
                                    <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{alert.content}</p>
                                    <span className="text-[9px] text-slate-400 mt-1 block">📍 {alert.location}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 text-center py-2 text-[10px] text-red-500 font-bold border-t border-slate-100 tracking-wide">
                        ⚠️ Cảnh báo sẽ tự động đóng sau {countdown}s
                    </div>
                </div>
            )}

            {/* CUSTOM CONFIRM MODAL DIALOG */}
            {confirmModal.isOpen && (
                <div 
                    style={{
                        animation: 'fadeIn 250ms ease-out forwards'
                    }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                >
                    <div 
                        style={{
                            animation: 'scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                        }}
                        className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                confirmModal.title.includes('nguy hiểm') || confirmModal.title.includes('sâu')
                                    ? 'bg-red-50 text-red-500' 
                                    : 'bg-blue-50 text-blue-500'
                            }`}>
                                <AlertTriangle size={20} />
                            </span>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                {confirmModal.title}
                            </h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed whitespace-pre-line">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={confirmModal.onCancel}
                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                                    confirmModal.title.includes('nguy hiểm') || confirmModal.title.includes('sâu')
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-100'
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                                }`}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TRAFFIC ALERT REPORT MODAL */}
            {showReportModal && (
                <div 
                    style={{
                        animation: 'fadeIn 250ms ease-out forwards'
                    }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                >
                    <div 
                        style={{
                            animation: 'scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                        }}
                        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden mx-4"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between text-white">
                            <h3 className="font-extrabold text-sm flex items-center gap-2 tracking-wide uppercase">
                                <AlertTriangle className="w-5 h-5 animate-pulse" />
                                Báo cáo sự cố giao thông
                            </h3>
                            <button 
                                onClick={() => setShowReportModal(false)} 
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmitTrafficReport} className="p-6 space-y-4 font-sans text-left">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Mô tả ngắn sự cố (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="VD: Kẹt xe nghiêm trọng..."
                                    value={reportFormData.title}
                                    onChange={(e) => setReportFormData({ ...reportFormData, title: e.target.value })}
                                    className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Thông tin chi tiết (Tùy chọn)</label>
                                <textarea
                                    placeholder="VD: Các phương tiện di chuyển chậm..."
                                    rows={2}
                                    value={reportFormData.description}
                                    onChange={(e) => setReportFormData({ ...reportFormData, description: e.target.value })}
                                    className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Địa điểm xảy ra (*)</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="VD: Đường Bạch Đằng, Hải Châu"
                                    value={reportFormData.location}
                                    onChange={(e) => setReportFormData({ ...reportFormData, location: e.target.value })}
                                    className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Phân loại sự cố</label>
                                    <select
                                        value={reportFormData.type}
                                        onChange={(e) => setReportFormData({ ...reportFormData, type: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer bg-white"
                                    >
                                        <option value="CONGESTION">Kẹt xe</option>
                                        <option value="ACCIDENT">Tai nạn</option>
                                        <option value="CONSTRUCTION">Thi công</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Mức độ nghiêm trọng</label>
                                    <select
                                        value={reportFormData.severity}
                                        onChange={(e) => setReportFormData({ ...reportFormData, severity: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer bg-white"
                                    >
                                        <option value="LOW">Thấp (LOW)</option>
                                        <option value="MEDIUM">Trung bình (MEDIUM)</option>
                                        <option value="HIGH">Nghiêm trọng (HIGH)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all shadow-md shadow-orange-500/10 active:scale-95 flex items-center gap-1.5"
                                >
                                    <CheckCircle2 size={14} />
                                    Gửi báo cáo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

