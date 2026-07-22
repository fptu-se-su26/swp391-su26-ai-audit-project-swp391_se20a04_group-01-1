import React, { useState, useEffect, useMemo } from 'react';
import { Marker, useMap } from 'react-map-gl/mapbox';
import Supercluster from 'supercluster';
import { Siren, Car, CloudRain, HardHat, Sparkles, Calendar, Layers } from 'lucide-react';

export interface EventData {
    event_id: number;
    category_id: number;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
    title: string;
    short_description?: string;
    description?: string;
    location_name: string;
    latitude: number;
    longitude: number;
    address?: string;
    district?: string;
    start_time: string;
    end_time?: string;
    banner_url?: string;
    thumbnail_url?: string;
    status: string;
    is_featured: boolean;
    is_free: boolean;
    ticket_price: number;
    view_count: number;
    favorite_count: number;
}

interface EventsLayerProps {
    events: EventData[];
    onSelectEvent: (event: EventData) => void;
}

export const getEventStatus = (startTime: string, endTime?: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'ongoing';
};

// Cấu hình Icon & Màu sắc đặc trưng cho từng phân loại Sự kiện / Cảnh báo giao thông
export const getEventCategoryConfig = (evt: EventData) => {
    const name = (evt.category_name || evt.title || '').toLowerCase();
    
    if (name.includes('tai nạn') || name.includes('accident') || name.includes('sự cố') || name.includes('nguy hiểm')) {
        return {
            color: '#EF4444',
            bgColor: 'bg-red-500',
            borderColor: 'border-red-600',
            icon: '🚨',
            LucideIcon: Siren,
            label: 'Tai nạn / Sự cố'
        };
    }
    if (name.includes('tắc đường') || name.includes('kẹt xe') || name.includes('traffic') || name.includes('ún tắc')) {
        return {
            color: '#F97316',
            bgColor: 'bg-orange-500',
            borderColor: 'border-orange-600',
            icon: '🚗',
            LucideIcon: Car,
            label: 'Tắc đường / Ún tắc'
        };
    }
    if (name.includes('ngập') || name.includes('flood') || name.includes('mưa')) {
        return {
            color: '#3B82F6',
            bgColor: 'bg-blue-500',
            borderColor: 'border-blue-600',
            icon: '🌧️',
            LucideIcon: CloudRain,
            label: 'Ngập lụt'
        };
    }
    if (name.includes('sửa đường') || name.includes('thi công') || name.includes('bảo trì') || name.includes('construction')) {
        return {
            color: '#F59E0B',
            bgColor: 'bg-amber-500',
            borderColor: 'border-amber-600',
            icon: '🚧',
            LucideIcon: HardHat,
            label: 'Sửa đường / Thi công'
        };
    }
    if (name.includes('văn hóa') || name.includes('thể thao') || name.includes('lễ hội') || name.includes('festival') || name.includes('event')) {
        return {
            color: '#8B5CF6',
            bgColor: 'bg-purple-500',
            borderColor: 'border-purple-600',
            icon: '🎆',
            LucideIcon: Sparkles,
            label: 'Sự kiện văn hóa'
        };
    }

    return {
        color: evt.category_color || '#6366F1',
        bgColor: 'bg-indigo-500',
        borderColor: 'border-indigo-600',
        icon: evt.category_icon || '📍',
        LucideIcon: Calendar,
        label: evt.category_name || 'Sự kiện / Cảnh báo'
    };
};

// Hàm sinh dữ liệu giả định 35 sự kiện gần nhau cho mục đích Kiểm thử Clustering (>30 sự kiện)
export const generateMockTestEvents = (centerLng: number, centerLat: number): EventData[] => {
    const categories = [
        { id: 1, name: 'Tai nạn giao thông', icon: '🚨', color: '#EF4444' },
        { id: 2, name: 'Tắc đường nặng', icon: '🚗', color: '#F97316' },
        { id: 3, name: 'Triều cường ngập lụt', icon: '🌧️', color: '#3B82F6' },
        { id: 4, name: 'Thi công sửa đường', icon: '🚧', color: '#F59E0B' },
        { id: 5, name: 'Sự kiện Âm nhạc đường phố', icon: '🎆', color: '#8B5CF6' },
    ];

    const mockList: EventData[] = [];
    const now = new Date().toISOString();

    for (let i = 1; i <= 35; i++) {
        const cat = categories[i % categories.length];
        const offsetLng = (Math.random() - 0.5) * 0.02;
        const offsetLat = (Math.random() - 0.5) * 0.02;

        mockList.push({
            event_id: 99000 + i,
            category_id: cat.id,
            category_name: cat.name,
            category_icon: cat.icon,
            category_color: cat.color,
            title: `${cat.name} #${i}`,
            short_description: `Cảnh báo giao thông khu vực thử nghiệm #${i}`,
            description: `Cảnh báo giao thông khu vực thử nghiệm #${i}`,
            location_name: `Địa điểm thử nghiệm #${i}`,
            latitude: centerLat + offsetLat,
            longitude: centerLng + offsetLng,
            address: `Đường số ${i}`,
            start_time: now,
            status: 'ongoing',
            is_featured: i % 5 === 0,
            is_free: true,
            ticket_price: 0,
            view_count: i * 12,
            favorite_count: i * 3,
        });
    }
    return mockList;
};

export default function EventsLayer({ events, onSelectEvent }: EventsLayerProps) {
    const { current: map } = useMap();
    const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
    const [zoom, setZoom] = useState<number>(12);
    const [enableTestCluster, setEnableTestCluster] = useState<boolean>(false);

    // Theo dõi tọa độ khung nhìn (bounds) và mức zoom của bản đồ
    useEffect(() => {
        if (!map) return;

        const updateState = () => {
            try {
                const b = map.getBounds();
                if (b) {
                    setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
                }
                setZoom(map.getZoom());
            } catch (e) {
                // Ignore if map bounds not ready
            }
        };

        updateState();

        map.on('move', updateState);
        map.on('zoom', updateState);
        map.on('moveend', updateState);

        return () => {
            map.off('move', updateState);
            map.off('zoom', updateState);
            map.off('moveend', updateState);
        };
    }, [map]);

    // Chuyển đổi dữ liệu thành các GeoJSON Feature điểm cho Supercluster
    const points = useMemo(() => {
        return events.map((evt) => ({
            type: 'Feature' as const,
            properties: {
                cluster: false,
                eventId: evt.event_id,
                event: evt,
            },
            geometry: {
                type: 'Point' as const,
                coordinates: [evt.longitude, evt.latitude],
            },
        }));
    }, [events]);

    // Khởi tạo Supercluster với bán kính gộp 60px và maxZoom 16
    const supercluster = useMemo(() => {
        const sc = new Supercluster({
            radius: 60,
            maxZoom: 16,
        });
        sc.load(points);
        return sc;
    }, [points]);

    // Lấy danh sách Cụm & Marker đơn lẻ theo viewport và zoom hiện tại
    const clusters = useMemo(() => {
        if (!bounds) return points;
        return supercluster.getClusters(bounds, Math.floor(zoom));
    }, [supercluster, bounds, zoom, points]);

    return (
        <>

            {clusters.map((cluster) => {
                const [longitude, latitude] = cluster.geometry.coordinates;
                const isCluster = cluster.properties?.cluster;

                if (isCluster) {
                    const pointCount = cluster.properties.point_count;
                    const clusterId = cluster.id as number;

                    let bgClass = "bg-gradient-to-tr from-indigo-600 to-blue-500";
                    let ringClass = "ring-4 ring-indigo-400/50";
                    let sizeClass = "w-10 h-10 text-xs font-bold";

                    if (pointCount >= 30) {
                        bgClass = "bg-gradient-to-tr from-red-600 via-rose-500 to-pink-500 shadow-rose-500/50";
                        ringClass = "ring-4 ring-rose-400/60 animate-pulse";
                        sizeClass = "w-14 h-14 text-base font-extrabold";
                    } else if (pointCount >= 10) {
                        bgClass = "bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 shadow-orange-500/50";
                        ringClass = "ring-4 ring-amber-400/50";
                        sizeClass = "w-12 h-12 text-sm font-bold";
                    } else {
                        bgClass = "bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/40";
                        ringClass = "ring-2 ring-emerald-300/40";
                        sizeClass = "w-10 h-10 text-xs font-semibold";
                    }

                    return (
                        <Marker
                            key={`cluster-${clusterId}-${longitude}-${latitude}`}
                            longitude={longitude}
                            latitude={latitude}
                            anchor="center"
                            onClick={(e) => {
                                e.originalEvent?.stopPropagation();
                                const expansionZoom = Math.min(
                                    supercluster.getClusterExpansionZoom(clusterId),
                                    18
                                );
                                if (map) {
                                    map.easeTo({
                                        center: [longitude, latitude],
                                        zoom: expansionZoom,
                                        duration: 600,
                                    });
                                }
                            }}
                        >
                            <div className={`relative flex items-center justify-center rounded-full text-white shadow-xl cursor-pointer transition-transform duration-300 hover:scale-115 group ${bgClass} ${sizeClass} ${ringClass}`}>
                                <span className="drop-shadow font-mono">{pointCount}</span>

                                {/* Tooltip khi hover vào cụm */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                                    <div className="bg-slate-900/95 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/60 backdrop-blur-md">
                                        Cụm <span className="font-bold text-amber-300">{pointCount}</span> Sự kiện / Cảnh báo (Click để thu phóng)
                                    </div>
                                    <div className="w-2 h-2 bg-slate-900/95 rotate-45 -mt-1 border-r border-b border-slate-700/60" />
                                </div>
                            </div>
                        </Marker>
                    );
                }

                // Render marker sự kiện đơn lẻ khi đã zoom gần hoặc tách cụm
                const evt: EventData = cluster.properties.event;
                const status = getEventStatus(evt.start_time, evt.end_time);
                const categoryConfig = getEventCategoryConfig(evt);

                let markerClass = "relative w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110";
                let containerClass = "relative flex flex-col items-center cursor-pointer group transition-transform";

                if (status === 'ended') {
                    containerClass += " opacity-50 grayscale hover:opacity-80 hover:grayscale-0";
                } else if (status === 'ongoing') {
                    markerClass += " ring-4 ring-emerald-500/50 animate-pulse";
                }

                return (
                    <Marker
                        key={`event-${evt.event_id}`}
                        longitude={evt.longitude}
                        latitude={evt.latitude}
                        anchor="bottom"
                        onClick={(e) => {
                            e.originalEvent?.stopPropagation();
                            onSelectEvent(evt);
                        }}
                    >
                        <div className={containerClass}>
                            {/* Bong bóng Marker theo màu đặc trưng danh mục */}
                            <div
                                className={markerClass}
                                style={{ backgroundColor: categoryConfig.color }}
                            >
                                {evt.thumbnail_url ? (
                                    <img
                                        src={evt.thumbnail_url}
                                        alt={evt.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="text-white text-base drop-shadow">
                                        {evt.category_icon || categoryConfig.icon}
                                    </span>
                                )}
                            </div>

                            {/* Mũi tên dưới chân marker */}
                            <div
                                className="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b border-white shadow-sm"
                                style={{
                                    backgroundColor: categoryConfig.color,
                                    borderColor: 'white',
                                }}
                            />

                            {/* Badge đang diễn ra nhấp nháy */}
                            {status === 'ongoing' && (
                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white"></span>
                                </span>
                            )}

                            {/* Tooltip khi hover lên marker lẻ */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                                <div className="bg-slate-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700/60 backdrop-blur-md flex flex-col items-center">
                                    <span className="font-semibold text-white">{evt.title}</span>
                                    <span className="text-[10px] text-amber-300 font-medium">{categoryConfig.label}</span>
                                </div>
                                <div className="w-2 h-2 bg-slate-900/95 rotate-45 -mt-1 border-r border-b border-slate-700/60" />
                            </div>
                        </div>
                    </Marker>
                );
            })}
        </>
    );
}
