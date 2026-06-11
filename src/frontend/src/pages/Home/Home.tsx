import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { NavigationControl, Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import {
    Search, Navigation, Bell, User, LogOut, ArrowLeft, Settings,
    ShieldAlert, Ban, CloudRain, Compass, Utensils, Hotel,
    Gamepad2, Calendar, Landmark, DollarSign, ChevronRight,
    Layers, TrendingUp,
    Car, Footprints, Bike, ArrowUpDown
} from 'lucide-react';

const filterCategories = [
    { id: 'attractions', label: 'Điểm tham quan', icon: Compass },
    { id: 'restaurants', label: 'Nhà hàng', icon: Utensils },
    { id: 'hotels', label: 'Khách sạn', icon: Hotel },
    { id: 'entertainment', label: 'Giải trí', icon: Gamepad2 },
    { id: 'events', label: 'Sự kiện', icon: Calendar },
    { id: 'museums', label: 'Bảo tàng', icon: Landmark },
    { id: 'atm', label: 'ATM', icon: DollarSign },
];

const mockAlerts = [
    { id: 1, type: 'flood', title: 'Ngập lụt', content: 'Đường Nguyễn Văn Linh đang có nguy cơ ngập cao, mức nước dự báo 20–30cm. Tránh di chuyển qua khu vực này.', location: 'Nguyễn Văn Linh, Hải Châu', time: 'Vừa cập nhật' },
    { id: 2, type: 'block', title: 'Cấm đường', content: 'Đường Trần Hưng Đạo bị cấm từ 18:00–23:00 do sự kiện DIFF 2026. Lưu ý lộ trình thay thế qua Hùng Vương.', location: 'Trần Hưng Đạo, Hải Châu', time: 'Có hiệu lực từ 18:00' },
    { id: 3, type: 'flood', title: 'Ngập lụt', content: 'Khu vực chân cầu Tuyên Sơn nước dâng nhanh do triều cường.', location: 'Chân cầu Tuyên Sơn', time: '10 phút trước' }
];

const mockEvents = [
    { id: 1, title: 'Cầu Rồng Phun Lửa & Phun Nước', time: '21:00', location: 'Cầu Rồng', status: 'LIVE', isLive: true },
    { id: 2, title: 'Lễ hội Ẩm thực Đà Nẵng 2026', time: '09:00', location: 'Quảng trường 29/3', status: 'LIVE', isLive: true },
    { id: 3, title: 'DIFF 2026 – Lễ hội Pháo hoa Quốc tế Đà Nẵng', time: '24/05 – 07/06/2026', location: 'Cầu Rồng & Bờ sông Hàn', status: 'Sắp diễn ra', isLive: false },
    { id: 4, title: 'Giải Chạy Biển Mỹ Khê 2026', time: 'Chủ Nhật 25/05/2026', location: 'Đường Võ Nguyên Giáp', status: 'Sắp diễn ra', isLive: false },
    { id: 5, title: 'Triển lãm Công nghệ FPT University', time: '15/06/2026', location: 'FPT Complex, Ngũ Hành Sơn', status: 'Sắp diễn ra', isLive: false }
];

export default function Home() {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('userRole');
    const [showAlertPopup, setShowAlertPopup] = useState(true);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(1);

    // TRẠNG THÁI CHO THANH CÔNG CỤ BẢN ĐỒ GÓC PHẢI (Right Sidebar)
    const [mapControls, setMapControls] = useState({
        layers: true,
        traffic: true,
        flood: false
    });

    // ✅ CÁC STATE CỦA MAPBOX VÀ CHỈ ĐƯỜNG
    const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
    const [destination, setDestination] = useState<{ lng: number; lat: number; label: string } | null>(null);
    const [routeData, setRouteData] = useState<{
        totalDistanceKm: number;
        totalTimeMin: number;
        coordinates: [number, number][];
    } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);

    // Thêm các biến state cho tìm kiếm 2 điểm, hoán đổi và đổi phương tiện di chuyển
    const mapRef = useRef<MapRef>(null);
    const [origin, setOrigin] = useState<{ lng: number; lat: number; label: string } | null>(null);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [activeInputField, setActiveInputField] = useState<'origin' | 'destination' | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');

    // ✅ HÀM: Lấy tọa độ GPS của người dùng hiện tại
    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lng: position.coords.longitude,
                        lat: position.coords.latitude
                    };
                    setUserLocation(loc);

                    // Mặc định thiết lập Điểm đi (origin) là Vị trí hiện tại của bạn
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
                (error) => {
                    alert("Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập GPS.");
                    console.error(error);
                }
            );
        }
    };

    // ✅ HÀM: Chọn điểm đến khi click lên bản đồ
    const handleMapClick = (event: any) => {
        const { lng, lat } = event.lngLat;
        setDestination({ lng, lat, label: `Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}` });
        setDestinationQuery(`Tọa độ: ${lng.toFixed(4)}, ${lat.toFixed(4)}`);
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

    // Xử lý khi click chọn một địa điểm gợi ý
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
        // Di chuyển camera bản đồ đến điểm vừa chọn
        mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1200
        });
    };

    // Hàm đảo ngược lộ trình (Hoán đổi Điểm xuất phát và Đích đến)
    const handleSwapLocations = () => {
        if (!origin && !destination) return;
        const tempOrigin = origin;
        const tempOriginQuery = originQuery;
        setOrigin(destination);
        setOriginQuery(destinationQuery);
        setDestination(tempOrigin);
        setDestinationQuery(tempOriginQuery);
    };

    // Cập nhật Effect chỉ đường để hỗ trợ đổi phương tiện di chuyển
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
                    
                    // Căn chỉnh camera hiển thị đầy đủ tuyến đường đi
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

    // ✅ Dựng cấu trúc GeoJSON cho đường đi
    const geojsonData: any = routeData ? {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: routeData.coordinates
        }
    } : null;

    // ✅ Định nghĩa CSS Line của bản đồ
    const routeLayerStyle: any = {
        id: 'route-line',
        type: 'line',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#2563eb', // Màu xanh lục chỉ đường
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
        }
    };

    const toggleMapControl = (controlName: keyof typeof mapControls) => {
        setMapControls(prev => ({ ...prev, [controlName]: !prev[controlName] }));
    };

    // ================= GIAO DIỆN MÀN HÌNH CHÍNH BẢN ĐỒ =================
    return (
        <div className="w-full h-screen relative bg-slate-100 overflow-hidden font-sans select-none">

            {/* ✅ BẢN ĐỒ MAPBOX ĐÃ ĐƯỢC TÍCH HỢP */}
            <div className="absolute inset-0 z-0">
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: 108.2022,
                        latitude: 16.0544,
                        zoom: 13
                    }}
                    onClick={handleMapClick}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                >
                    <NavigationControl position="bottom-right" showCompass={true} />

                    {/* Marker: Chấm định vị vị trí hiện tại GPS */}
                    {userLocation && (
                        <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                            <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse" />
                        </Marker>
                    )}
                    {/* Marker: Chấm xanh lá cây biểu diễn Điểm đi tùy chỉnh (nếu khác GPS) */}
                    {origin && userLocation && (origin.lng !== userLocation.lng || origin.lat !== userLocation.lat) && (
                        <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
                            <div className="w-4.5 h-4.5 bg-emerald-600 border-2 border-white rounded-full shadow-lg" />
                        </Marker>
                    )}

                    {/* Marker: Ghim đỏ Điểm đến */}
                    {destination && (
                        <Marker longitude={destination.lng} latitude={destination.lat} anchor="bottom">
                            <div className="text-red-600 text-2xl animate-bounce">📍</div>
                        </Marker>
                    )}

                    {/* Vẽ đường đi tìm được dạng GeoJSON */}
                    {geojsonData && (
                        <Source id="route-source" type="geojson" data={geojsonData}>
                            <Layer {...routeLayerStyle} />
                        </Source>
                    )}
                </Map>
            </div>

            {/* ================= BAR TRÊN CÙNG (HEADER) ================= */}
            <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between gap-4 pointer-events-none">

                <div className="relative pointer-events-auto">
                    {!destination ? (
                        // THANH TÌM KIẾM ĐƠN GIẢN
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
                        // PANEL CHỈ ĐƯỜNG 2 ĐIỂM
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

                    {/* Danh sách gợi ý */}
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

                {/* ============ CỤM NÚT TRÊN CÙNG BÊN PHẢI ============ */}
                <div className="flex items-center gap-3 shrink-0 pointer-events-auto relative">
                    
                    {/* 1. NÚT THÔNG BÁO (LUÔN HIỆN) */}
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

                    {/* 2. NÚT TRANG QUẢN TRỊ (CHỈ HIỆN VỚI ADMIN) */}
                    {userRole === 'admin' && (
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="w-[42px] h-[42px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-all"
                            title="Bảng điều khiển Admin"
                        >
                            <Settings size={18} />
                        </button>
                    )}

                    {/* 3. NÚT TRANG CÁ NHÂN (ẨN VỚI ADMIN, CHỈ HIỆN VỚI USER) */}
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

            {/* ================= CỤM CÔNG CỤ BẢN ĐỒ GÓC PHẢI (MAP CONTROLS) ================= */}
            <div className="absolute right-6 bottom-32 flex flex-col gap-3 z-10 pointer-events-none">

                {/* Nút Vị Trí Hiện Tại */}
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

                {/* Nút Layer Bản Đồ */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Lớp
                    </span>
                    <button
                        onClick={() => toggleMapControl('layers')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.layers ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                            }`}
                    >
                        <Layers size={18} />
                    </button>
                </div>

                {/* Nút Tuyến Đường Giao Thông */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Giao thông
                    </span>
                    <button
                        onClick={() => toggleMapControl('traffic')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.traffic ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                            }`}
                    >
                        <TrendingUp size={18} />
                    </button>
                </div>

                {/* Nút Hiển Thị Vùng Ngập Lụt */}
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Ngập lụt
                    </span>
                    <button
                        onClick={() => toggleMapControl('flood')}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${mapControls.flood ? 'bg-blue-50 text-blue-500 border-blue-200' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                            }`}
                    >
                        <CloudRain size={18} />
                    </button>
                </div>
            </div>

            {/* ================= POPUP GIỮA MÀN HÌNH ================= */}
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

            {/* PANEL HIỂN THỊ CHI TIẾT ĐƯỜNG ĐI */}
            {routeData && (
                <div className="absolute bottom-10 left-6 z-10 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Chi tiết lộ trình di chuyển</h3>

                    <div className="flex gap-2 mb-3 bg-slate-50 p-1 rounded-xl">
                        <button
                            onClick={() => setTravelMode('driving')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'driving' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <Car size={13} /> Lái xe
                        </button>
                        <button
                            onClick={() => setTravelMode('walking')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'walking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            <Footprints size={13} /> Đi bộ
                        </button>
                        <button
                            onClick={() => setTravelMode('cycling')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${travelMode === 'cycling' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                                }`}
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
        </div>
    );
}