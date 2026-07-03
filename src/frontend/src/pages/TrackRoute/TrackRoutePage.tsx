import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { NavigationControl, Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { io } from 'socket.io-client';
import { Navigation, ShieldAlert, ArrowLeft, Radio, WifiOff, Star, MapPin, Eye } from 'lucide-react';
import { showPremiumToast } from '../../utils/toastUtils';

interface SharerSession {
    share_id: number;
    share_token: string;
    current_lat: number;
    current_lng: number;
    expires_at: string;
    username: string;
    avatar_url: string | null;
    updated_at: string;
}

export default function TrackRoutePage() {
    const { shareToken } = useParams<{ shareToken: string }>();
    const navigate = useNavigate();
    const mapRef = useRef<MapRef | null>(null);
    const socketRef = useRef<any>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const [session, setSession] = useState<SharerSession | null>(null);
    const [sharerCoords, setSharerCoords] = useState<{ lat: number; lng: number; heading: number } | null>(null);
    const [viewerLocation, setViewerLocation] = useState<{ lat: number; lng: number } | null>(null);
    
    const [isRoutingActive, setIsRoutingActive] = useState(false);
    const [routeData, setRouteData] = useState<{ coordinates: [number, number][]; distanceKm: number; durationMin: number } | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const lastRoutedDestRef = useRef<{ lat: number; lng: number } | null>(null);
    const [socketConnected, setSocketConnected] = useState(false);

    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    // 1. Tải trạng thái ban đầu của phiên chia sẻ từ Database
    useEffect(() => {
        const fetchSessionStatus = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`${apiBase}/api/location/status/${shareToken}`);
                const data = await res.json();
                
                if (data.success && data.session) {
                    setSession(data.session);
                    if (data.session.current_lat && data.session.current_lng) {
                        setSharerCoords({
                            lat: parseFloat(data.session.current_lat),
                            lng: parseFloat(data.session.current_lng),
                            heading: 0
                        });
                    }
                } else {
                    setErrorMsg(data.message || "Không thể tìm thấy thông tin chia sẻ vị trí.");
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin chia sẻ:", err);
                setErrorMsg("Lỗi kết nối máy chủ.");
            } finally {
                setIsLoading(false);
            }
        };

        if (shareToken) {
            fetchSessionStatus();
        }
    }, [shareToken, apiBase]);

    // 2. Kết nối WebSocket Socket.io lắng nghe vị trí động
    useEffect(() => {
        if (!shareToken || !session) return;

        socketRef.current = io(apiBase);
        
        socketRef.current.on("connect", () => {
            setSocketConnected(true);
            socketRef.current.emit("track-location", { shareToken });
        });

        socketRef.current.on("disconnect", () => {
            setSocketConnected(false);
        });

        // Nhận tọa độ cập nhật từ người chia sẻ
        socketRef.current.on("location-updated", (data: { lat: number; lng: number; heading: number }) => {
            setSharerCoords(data);
            
            // Tự động dịch camera nhẹ nhàng nếu người dùng đang theo dõi tĩnh
            if (mapRef.current && !isRoutingActive) {
                mapRef.current.easeTo({
                    center: [data.lng, data.lat],
                    duration: 1000
                });
            }
        });

        // Nhận thông báo kết thúc chia sẻ
        socketRef.current.on("session-ended", () => {
            showPremiumToast("Người chia sẻ đã dừng phiên phát vị trí.", "success");
            setErrorMsg("Phiên chia sẻ vị trí trực tiếp đã kết thúc.");
            setSocketConnected(false);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [shareToken, session, apiBase, isRoutingActive]);

    // 3. Tự động lấy vị trí hiện tại của Viewer làm Origin
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setViewerLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => console.warn("Không lấy được định vị người xem:", err)
            );
        }
    }, []);

    // 4. Tính toán dẫn đường đến Sharer
    const calculateRouteToSharer = async (force = false) => {
        if (!viewerLocation || !sharerCoords) {
            showPremiumToast("Đang xác định tọa độ... Vui lòng bật định vị GPS.", "error");
            return;
        }

        // Tránh gọi API Mapbox liên tục nếu Sharer di chuyển quá ít (< 100m)
        if (!force && lastRoutedDestRef.current) {
            const dist = getDistance(lastRoutedDestRef.current, sharerCoords);
            if (dist < 0.1) return; // Dưới 100 mét thì không vẽ lại
        }

        setLoadingRoute(true);
        try {
            const res = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${viewerLocation.lng},${viewerLocation.lat};${sharerCoords.lng},${sharerCoords.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
            );
            const data = await res.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                setRouteData({
                    coordinates: route.geometry.coordinates,
                    distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
                    durationMin: Math.round(route.duration / 60)
                });
                lastRoutedDestRef.current = sharerCoords;
                
                // Fit map
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
            }
        } catch (err) {
            console.error("Lỗi vẽ đường đi:", err);
            showPremiumToast("Lỗi tính toán tuyến đường dẫn đến người chia sẻ.", "error");
        } finally {
            setLoadingRoute(false);
        }
    };

    // Theo dõi tọa độ người chia sẻ thay đổi để tự động re-route
    useEffect(() => {
        if (isRoutingActive) {
            calculateRouteToSharer();
        }
    }, [sharerCoords, isRoutingActive]);

    const handleToggleRouting = () => {
        if (isRoutingActive) {
            setIsRoutingActive(false);
            setRouteData(null);
            lastRoutedDestRef.current = null;
        } else {
            setIsRoutingActive(true);
            calculateRouteToSharer(true);
        }
    };

    // Hàm toán học tính khoảng cách giữa 2 tọa độ (Haversine - km)
    const getDistance = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
        const R = 6371;
        const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
        const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((c1.lat * Math.PI) / 180) *
                Math.cos((c2.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const getAvatarUrl = (url: string | null | undefined) => {
        if (!url) return undefined;
        if (url.startsWith('http')) return url;
        const normalizedPath = url.startsWith('/') ? url : '/' + url;
        const finalPath = normalizedPath.startsWith('/uploads/') ? normalizedPath : '/uploads' + normalizedPath;
        return `${apiBase}${finalPath}`;
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold text-slate-600">Đang tải phòng chia sẻ vị trí...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 text-center">
                <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
                <h2 className="text-lg font-bold text-slate-800 mb-2">Hết hạn hoặc Lỗi liên kết</h2>
                <p className="text-xs text-slate-500 max-w-sm mb-6">{errorMsg}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
                >
                    <ArrowLeft size={14} /> Quay về Trang chủ
                </button>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen relative overflow-hidden font-sans">
            
            {/* Header Overlay Panel */}
            <div className="absolute top-4 left-4 z-10 max-w-xs bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    {session?.avatar_url ? (
                        <img 
                            src={getAvatarUrl(session.avatar_url)}
                            alt={session.username}
                            className="w-10 h-10 rounded-full border border-slate-200 object-cover" 
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                            {session?.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h3 className="text-xs font-bold text-slate-800">{session?.username}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {socketConnected ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                                    TRỰC TIẾP
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    <WifiOff size={10} />
                                    MẤT KẾT NỐI
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-2 flex flex-col gap-2">
                    <p className="text-[10px] text-slate-500 leading-normal">
                        Liên kết này cho phép xem vị trí chuyển động trực tuyến của người chia sẻ cứu nạn.
                    </p>
                    
                    <div className="flex gap-2 mt-1">
                        <button
                            onClick={() => navigate('/')}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <ArrowLeft size={12} /> Về Trang chủ
                        </button>
                        
                        {viewerLocation && (
                            <button
                                onClick={handleToggleRouting}
                                disabled={loadingRoute}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                    isRoutingActive 
                                        ? 'bg-red-50 text-red-600 border border-red-200' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                }`}
                            >
                                <Navigation size={12} className={isRoutingActive ? 'rotate-45' : ''} />
                                {isRoutingActive ? 'Tắt dẫn đường' : 'Dẫn đường tới'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Navigation Route Info Banner */}
            {routeData && (
                <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-100 text-right max-w-xxs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đường đi tới người cứu nạn</p>
                    <p className="text-sm font-black text-blue-600 mt-0.5">{routeData.distanceKm} km</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Thời gian: {routeData.durationMin} phút</p>
                    {loadingRoute && <p className="text-[9px] text-amber-500 font-bold animate-pulse mt-1">🔄 Tự động cập nhật tuyến đường...</p>}
                </div>
            )}

            {/* Map Canvas */}
            <Map
                ref={(r) => { mapRef.current = r; }}
                initialViewState={{
                    longitude: sharerCoords?.lng || 108.206230,
                    latitude: sharerCoords?.lat || 16.047079,
                    zoom: 15
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={mapboxToken}
            >
                <NavigationControl position="bottom-right" showCompass={true} />

                {/* Draw Route Line */}
                {routeData && (
                    <Source id="route-source" type="geojson" data={{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: routeData.coordinates
                        }
                    }}>
                        <Layer
                            id="route-layer"
                            type="line"
                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            paint={{
                                'line-color': '#3b82f6',
                                'line-width': 5,
                                'line-opacity': 0.85
                            }}
                        />
                    </Source>
                )}

                {/* 1. Viewer Location Marker */}
                {viewerLocation && (
                    <Marker longitude={viewerLocation.lng} latitude={viewerLocation.lat} anchor="center">
                        <div className="relative flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-30"></span>
                            <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg" />
                        </div>
                    </Marker>
                )}

                {/* 2. Sharer Live Moving Marker */}
                {sharerCoords && (
                    <Marker longitude={sharerCoords.lng} latitude={sharerCoords.lat} anchor="center">
                        <div className="flex flex-col items-center select-none cursor-pointer">
                            {/* Speech Bubble name tag */}
                            <div className="bg-slate-900/90 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-md mb-1.5 whitespace-nowrap flex items-center gap-1 border border-slate-800">
                                <Radio size={10} className="text-emerald-400 animate-pulse" />
                                {session?.username}
                            </div>
                            
                            {/* Avatar with pulsing green ring */}
                            <div className="relative w-10 h-10 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-lg overflow-hidden">
                                {session?.avatar_url ? (
                                    <img 
                                        src={getAvatarUrl(session.avatar_url)}
                                        alt="Sharer"
                                        className="w-full h-full object-cover" 
                                    />
                                ) : (
                                    <span>{session?.username.charAt(0).toUpperCase()}</span>
                                )}
                                
                                <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                        </div>
                    </Marker>
                )}
            </Map>
        </div>
    );
}
