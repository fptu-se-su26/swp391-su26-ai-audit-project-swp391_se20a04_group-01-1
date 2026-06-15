import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { NavigationControl, Marker, Source, Layer, MapRef, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import {
    Search, Navigation, Bell, User, Settings, X,
    ShieldAlert, Ban, CloudRain, Compass, Utensils, Hotel,
    Gamepad2, Landmark, DollarSign,
    Layers, TrendingUp,
    Car, Footprints, Bike, ArrowUpDown, Calendar
} from 'lucide-react';

import POIsLayer from './components/POIsLayer';
import { poiAPI, eventAPI } from '../../services/api'; // ✅ ĐÃ SỬA LỖI IMPORT TẠI ĐÂY
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

    // CÁC STATE CỦA MAPBOX VÀ CHỈ ĐƯỜNG
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
    const [destination, setDestination] = useState<{ lng: number; lat: number; label: string } | null>(null);
    const [routeData, setRouteData] = useState<{
        totalDistanceKm: number;
        totalTimeMin: number;
        coordinates: [number, number][];
    } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);

    const mapRef = useRef<MapRef>(null);
    const [origin, setOrigin] = useState<{ lng: number; lat: number; label: string } | null>(null);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [activeInputField, setActiveInputField] = useState<'origin' | 'destination' | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [pendingDestination, setPendingDestination] = useState<{ lng: number; lat: number } | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');

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
                (error) => {
                    if (showErrorAlert) {
                        alert("Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập GPS.");
                    }
                    console.error("Lỗi lấy vị trí GPS:", error);
                }
            );
        }
    };

    // ✅ HÀM: Chọn điểm đến khi click lên bản đồ (đóng POI và hiển thị banner xác nhận)
    const handleMapClick = (event: any) => {
        if (selectedPOI) {
            setSelectedPOI(null);
        }
        if (selectedEvent) {
            setSelectedEvent(null);
        }

        if (mapRef.current) {
            const features = mapRef.current.queryRenderedFeatures(event.point, {
                layers: ['flood-zones-circle', 'flood-zones-fill']
            });
            if (features && features.length > 0) {
                const zone = features[0];
                setSelectedFloodZone({
                    lng: event.lngLat.lng,
                    lat: event.lngLat.lat,
                    properties: zone.properties
                });
                return; 
            }
        }
        const { lng, lat } = event.lngLat;
        setPendingDestination({ lng, lat });
    };

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
        if (activeInputField === 'origin') {
            setOrigin({ lng, lat, label: fullName });
            setOriginQuery(fullName);
        } else {
            setDestination({ lng, lat, label: fullName });
            setDestinationQuery(fullName);
        }

        setShowSuggestions(false);
        mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1200
        });
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

    useEffect(() => {
        if (!origin || !destination) return;
        const getShortestRoute = async () => {
            setLoadingRoute(true);
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                const response = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
                );
                const data = await response.json();
                if (response.ok && data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    setRouteData({
                        totalDistanceKm: parseFloat((route.distance / 1000).toFixed(2)),
                        totalTimeMin: Math.round(route.duration / 60),
                        coordinates: route.geometry.coordinates
                    });
                    
                    const coords = route.geometry.coordinates;
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
                    alert('Không tìm thấy đường đi thích hợp cho phương tiện này!');
                    setRouteData(null);
                }
            } catch (err) {
                console.error("Lỗi kết nối API đường đi Mapbox:", err);
                setRouteData(null);
            } finally {
                setLoadingRoute(false);
            }
        };
        getShortestRoute();
    }, [origin, destination, travelMode]);

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
        setMapControls(prev => ({ ...prev, [controlName]: !prev[controlName] }));
    };

    useEffect(() => {
        const fetchFloodZones = async () => {
            try {
                const response = await fetch("http://localhost:5001/api/flood-zones");
                const data = await response.json();
                if (data.data) {
                    setFloodZones(data.data);
                }
            } catch (error) {
                console.error("Lỗi tải vùng ngập lụt:", error);
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

    const floodGeoJSON: any = useMemo(() => {
        if (!floodZones || floodZones.length === 0) return null;
        return {
            type: 'FeatureCollection',
            features: floodZones.map((zone) => {
                let coords = [];
                let isPoint = false;
                try {
                    coords = JSON.parse(zone.polygon_coordinates);
                    isPoint = typeof coords[0] === 'number';
                } catch (e) {
                    console.error("Lỗi parse JSON tọa độ vùng:", zone.zone_name);
                }
                return {
                    type: 'Feature',
                    properties: {
                        id: zone.zone_id,
                        name: zone.zone_name,
                        district: zone.district,
                        risk_level: zone.risk_level,
                        description: zone.description,
                        typical_flood_months: zone.typical_flood_months,
                        color: zone.risk_level === 'High' ? '#ef4444' : zone.risk_level === 'Medium' ? '#f97316' : '#eab308'
                    },
                    geometry: {
                        type: isPoint ? 'Point' : 'Polygon',
                        coordinates: coords
                    }
                };
            })
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
                    onMouseMove={(event) => {
                        if (!mapControls.flood) return;
                        const features = mapRef.current?.queryRenderedFeatures(event.point, {
                            layers: ['flood-zones-circle', 'flood-zones-fill']
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
                    interactiveLayerIds={['flood-zones-fill', 'flood-zones-circle']}
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

                    {/* Marker & Popup: Điểm đến tạm thời và Banner xác nhận khi click trên map */}
                    {pendingDestination && (
                        <>
                            <Marker longitude={pendingDestination.lng} latitude={pendingDestination.lat} anchor="bottom">
                                <div className="relative w-[36px] h-[42px] flex flex-col items-center justify-end cursor-pointer animate-bounce">
                                    <svg width="36" height="42" viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
                                        {/* Bóng của ghim */}
                                        <ellipse cx="18" cy="38" rx="8" ry="2.5" fill="#64748b" opacity="0.4" />
                                        {/* Phần thân ghim màu xanh dương */}
                                        <path
                                            d="M18 0C8.06 0 0 8.06 0 18C0 27.5 18 40 18 40C18 40 36 27.5 36 18C36 8.06 27.94 0 18 0Z"
                                            fill="#3B82F6"
                                        />
                                        {/* Vòng tròn ở giữa màu xanh dương sậm */}
                                        <circle cx="18" cy="16" r="5" fill="#1D4ED8" />
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
                                            className="w-5 h-5 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                        >
                                            <X size={12} />
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
                                                setDestination({ lng, lat, label: `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}` });
                                                setDestinationQuery(`Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`);
                                                if (userLocation && !origin) {
                                                    setOrigin({
                                                        lng: userLocation.lng,
                                                        lat: userLocation.lat,
                                                        label: 'Vị trí của bạn'
                                                    });
                                                    setOriginQuery('Vị trí của bạn');
                                                }
                                                setPendingDestination(null);
                                            }}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black py-2 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                                        >
                                            Chỉ đường
                                        </button>
                                        <button
                                            onClick={() => setPendingDestination(null)}
                                            className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] font-bold py-2 px-3 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95"
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
        </div>
    );
}