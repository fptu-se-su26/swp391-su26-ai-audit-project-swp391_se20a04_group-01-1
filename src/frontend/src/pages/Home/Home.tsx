import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { NavigationControl, Marker, Source, Layer, MapRef, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// NEW CODE: Chức năng hiển thị đường ngập lụt - Import component hiển thị lớp ngập lụt
// import FloodLayer from '../../components/FloodLayer';
// NEW CODE: Flood zone feature - Import component hiển thị lớp vùng ngập lụt mới
//import FloodZoneLayer from '../../components/FloodZoneLayer';

// NEW CODE: Flood route avoidance feature - Tiện ích kiểm tra né ngập
// import { findSafeRoute } from '../../utils/floodRouteUtils';
// import { floodedRoads } from '../../data/floodData';
// FIX: Avoid flooded zones when calculating route
import { findSafeRoute as findSafeRouteZone, findFloodZoneContainingPoint, isPointInsideFloodZone } from '../../utils/floodZoneRouteUtils';


import {
    Search, Navigation, Bell, User, Settings,
    ShieldAlert, Ban, CloudRain, Compass, Utensils, Hotel,
    Gamepad2, Landmark, DollarSign,
    Layers, TrendingUp,
    Car, Footprints, Bike, ArrowUpDown
} from 'lucide-react';

import POIsLayer from './components/POIsLayer';
import { poiAPI } from '../../services/api'; // ✅ ĐÃ SỬA LỖI IMPORT TẠI ĐÂY
import { POIData } from './components/POIPopup';
import POIFeaturedSidebar from './components/POIFeaturedSidebar';

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

    // Di chuyển map đến POI và mở popup
    const handlePOIClick = (poi: POIData) => {
        setSelectedPOI(poi);
        mapRef.current?.flyTo({
            center: [poi.longitude, poi.latitude],
            zoom: 16,
            duration: 1200
        });
    };

    // TRẠNG THÁI CHO THANH CÔNG CỤ BẢN ĐỒ GÓC PHẢI
    const [mapControls, setMapControls] = useState({
        layers: true,
        traffic: true,
        flood: false
    });

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
                const confirmed = window.confirm(
                    `Địa điểm bạn chọn đang nằm trong vùng ngập ${zone.depthCm}cm. Bạn có chắc chắn muốn đi vào khu vực ngập lụt này không?`
                );
                if (confirmed) {
                    setConfirmedFloodZoneIds((prev) => [...prev, zone.id]);
                    onApproved();
                } else {
                    alert("Bạn đã hủy chọn địa điểm trong vùng ngập. Vui lòng chọn địa điểm khác an toàn hơn.");
                    onRejected();
                }
            } else {
                onApproved();
            }
        } else if (zone && zone.depthCm <= 10) {
            // Hiển thị cảnh báo nhẹ trong console
            console.log(`[FloodCheck] Địa điểm này đang ngập khoảng ${zone.depthCm}cm nhưng vẫn có thể di chuyển.`);
            onApproved();
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
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');

    // ✅ HÀM: Lấy tọa độ GPS
    const handleGetCurrentLocation = () => {
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
                    alert("Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập GPS.");
                    console.error(error);
                }
            );
        }
    };

    // ✅ HÀM: Chọn điểm đến khi click lên bản đồ
  const handleMapClick = (event: any) => {
    if (selectedPOI) return;

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

            // Vùng ngập <= 10cm: cho chọn điểm đến bình thường
            if (depthCm <= 10) {
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

                return;
            }

            // Vùng ngập > 10cm: hỏi xác nhận
            const confirmed = window.confirm(
                `Khu vực này đang ngập ${depthCm}cm, có thể nguy hiểm.\n\nBạn có chắc chắn muốn đi vào vùng ngập này không?`
            );

            if (confirmed) {
                // Cho phép đi vào đúng vùng ngập user đã chọn
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
            } else {
                // Không chọn điểm đến, để user chọn lại
                setDestination(null);
                setDestinationQuery('');
                setRouteData(null);
                setRouteAlertMessage(null);
            }

            return;
        }
    }

    const label = `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;

    validateLocation(
        lng,
        lat,
        label,
        'destination',
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
        }
    );
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

                    if (mapControls.flood) {
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
}, [origin, destination, travelMode, mapControls.flood, confirmedFloodZoneIds, floodZones]);
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

    useEffect(() => {
        handleGetCurrentLocation();
    }, []);
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
            <div className="absolute inset-0 z-0">
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: 108.2022,
                        latitude: 16.0544,
                        zoom: 13
                    }}
                    onClick={handleMapClick}
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

                    {destination && (
                        <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
                            <div className="text-red-600 text-2xl animate-bounce">📍</div>
                        </Marker>
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
                            <div className="p-2 w-52 text-slate-800 font-sans">
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

                    {/* NEW CODE: Flood zone feature */}
               

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
                </Map>
            </div>

            {/* HEADER TRÊN CÙNG */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between gap-4 pointer-events-none">
                <div className="relative pointer-events-auto shrink-0 flex flex-col gap-2 max-h-[calc(100vh-80px)]">
                    <div className="relative">
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
                </div>

                {/* Giữa: Các nút Filters */}
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
                        onClick={handleGetCurrentLocation}
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
            </div>

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

            {/* CẬP NHẬT PANEL HIỂN THỊ CHI TIẾT ĐƯỜNG ĐI ĐỂ THÊM BỘ CHỌN CHẾ ĐỘ DI CHUYỂN */}
            {/* FIX: Select shortest route among safe alternatives - Show panel if either routeData or alert message exists */}
            {(routeData || routeAlertMessage) && (
                <div className="absolute bottom-10 left-6 z-10 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Chi tiết lộ trình di chuyển</h3>

                    {/* NEW CODE: Flood route avoidance feature - Cảnh báo né tránh ngập lụt */}
                    {routeAlertMessage && (
                        <div className={`text-[10px] font-bold px-3 py-2 rounded-xl mb-3 border whitespace-pre-line ${
                            routeAlertMessage.includes('an toàn') 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
                                : 'bg-amber-50 text-amber-700 border-amber-200/50'
                        }`}>
                            {routeAlertMessage}
                        </div>
                    )}

                    {/* Bộ chọn phương tiện di chuyển (Travel Mode Selector) */}
                    <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl">
                        <button
                            onClick={() => setTravelMode('driving')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'driving' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <Car size={13} />
                            Lái xe
                        </button>
                        <button
                            onClick={() => setTravelMode('walking')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'walking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <Footprints size={13} />
                            Đi bộ
                        </button>
                        <button
                            onClick={() => setTravelMode('cycling')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'cycling' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <Bike size={13} />
                            Xe đạp
                        </button>
                    </div>
                    {routeData && (
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
                    )}
                    <button
                        onClick={() => {
                            setRouteData(null);
                            setDestination(null);
                            setOrigin(null);
                            setOriginQuery('');
                            setDestinationQuery('');
                            setRouteAlertMessage(null); // NEW CODE: Reset cảnh báo lộ trình né ngập khi xóa đường đi
                            // NEW CODE: Flood zone selection confirmation - Reset confirmed flood zones
                            setConfirmedFloodZoneIds([]);
                        }}
                        className="mt-3 w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                        Xóa lộ trình
                    </button>
                </div>
            )}
        </div>
    );
}

