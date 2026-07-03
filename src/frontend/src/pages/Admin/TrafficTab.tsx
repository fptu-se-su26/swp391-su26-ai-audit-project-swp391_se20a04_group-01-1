import React from 'react';
import { Plus, X, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { TrafficAlert } from './types';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
    trafficAlerts: TrafficAlert[];
    toggleTrafficStatus: (id: number) => void;
    deleteTrafficAlert: (id: number) => void;
    showTrafficModal: boolean;
    setShowTrafficModal: (v: boolean) => void;
    trafficFormData: {
        title: string;
        location: string;
        type: 'CONGESTION' | 'ACCIDENT' | 'CONSTRUCTION';
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
        latitude: number;
        longitude: number;
    };
    setTrafficFormData: (v: any) => void;
    handleCreateTrafficAlert: (e: React.FormEvent) => void;
}

export default function TrafficTab({
    trafficAlerts, toggleTrafficStatus, deleteTrafficAlert,
    showTrafficModal, setShowTrafficModal,
    trafficFormData, setTrafficFormData, handleCreateTrafficAlert
}: Props) {
    const mapRef = React.useRef<any>(null);

    const handleMiniMapClick = async (event: any) => {
        const { lng, lat } = event.lngLat;
        let placeName = trafficFormData.location;
        
        try {
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            if (mapboxToken) {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=vi`
                );
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    placeName = data.features[0].place_name_vi || data.features[0].place_name;
                }
            }
        } catch (err) {
            console.error("Lỗi giải mã tọa độ ngược khi click bản đồ:", err);
        }

        setTrafficFormData({
            ...trafficFormData,
            latitude: lat,
            longitude: lng,
            location: placeName
        });
    };

    const handleMarkerDragEnd = async (event: any) => {
        const { lng, lat } = event.lngLat;
        let placeName = trafficFormData.location;

        try {
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            if (mapboxToken) {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=vi`
                );
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    placeName = data.features[0].place_name_vi || data.features[0].place_name;
                }
            }
        } catch (err) {
            console.error("Lỗi giải mã tọa độ ngược khi drag marker:", err);
        }

        setTrafficFormData({
            ...trafficFormData,
            latitude: lat,
            longitude: lng,
            location: placeName
        });
    };

    React.useEffect(() => {
        if (showTrafficModal && mapRef.current) {
            mapRef.current.setCenter([trafficFormData.longitude || 108.2022, trafficFormData.latitude || 16.0544]);
        }
    }, [trafficFormData.latitude, trafficFormData.longitude, showTrafficModal]);

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <h3 className="text-base font-bold text-slate-800">Thông báo Sự cố giao thông thời gian thực</h3>
                    <button
                        onClick={() => setShowTrafficModal(true)}
                        className="bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-orange-700 transition flex items-center gap-2 text-sm shadow-md"
                    >
                        <Plus size={16} /> Báo cáo sự cố khẩn
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {trafficAlerts.map(alert => (
                        <div key={alert.id} className={`bg-white rounded-2xl border p-5 shadow-sm relative overflow-hidden transition ${alert.is_active ? 'border-orange-200' : 'border-slate-200 opacity-60'}`}>
                            <div className={`absolute top-0 left-0 w-full h-1 ${!alert.is_active ? 'bg-slate-300' :
                                alert.severity === 'HIGH' ? 'bg-red-500' :
                                alert.severity === 'MEDIUM' ? 'bg-orange-500' : 'bg-blue-500'
                            }`} />

                            <div className="flex items-start justify-between mt-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                    alert.type === 'CONGESTION' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                    alert.type === 'ACCIDENT' ? 'bg-red-50 border-red-200 text-red-600' :
                                    'bg-blue-50 border-blue-200 text-blue-600'
                                }`}>
                                    {alert.type === 'CONGESTION' ? 'Kẹt xe' : alert.type === 'ACCIDENT' ? 'Tai nạn' : 'Thi công'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">{alert.created_at}</span>
                            </div>

                            <h4 className="font-bold text-slate-800 text-sm mt-3 leading-snug">{alert.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">📍 {alert.location}</p>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                <span className={`text-xs font-bold ${
                                    alert.severity === 'HIGH' ? 'text-red-500' :
                                    alert.severity === 'MEDIUM' ? 'text-orange-500' : 'text-blue-500'
                                }`}>
                                    Cấp độ: {alert.severity}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => toggleTrafficStatus(alert.id)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${alert.is_active
                                            ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                        }`}
                                    >
                                        {alert.is_active ? 'Gỡ' : 'Bật lại'}
                                    </button>
                                    <button
                                        onClick={() => deleteTrafficAlert(alert.id)}
                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 transition"
                                        title="Xóa cảnh báo"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal: Báo cáo sự cố */}
            {showTrafficModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col border border-slate-200 animate-slide-up overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Báo Cáo Sự Cố Giao Thông Khẩn
                            </h3>
                            <button onClick={() => setShowTrafficModal(false)} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTrafficAlert} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
                                {/* Left Side: Form Fields (scrollable) */}
                                <div className="col-span-1 md:col-span-6 overflow-y-auto p-6 space-y-4 custom-scrollbar border-r border-slate-100 text-slate-700 text-left">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả sự cố (*)</label>
                                        <input
                                            required type="text"
                                            placeholder="VD: Kẹt xe kéo dài, có va chạm..."
                                            value={trafficFormData.title}
                                            onChange={(e) => setTrafficFormData({ ...trafficFormData, title: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm xảy ra (*)</label>
                                        <input
                                            required type="text"
                                            placeholder="VD: Nút giao Lê Duẩn - Bạch Đằng"
                                            value={trafficFormData.location}
                                            onChange={(e) => setTrafficFormData({ ...trafficFormData, location: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vĩ độ (Latitude) (*)</label>
                                            <input
                                                required type="number" step="any"
                                                placeholder="VD: 16.0544"
                                                value={trafficFormData.latitude || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTrafficFormData({ ...trafficFormData, latitude: val });
                                                }}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kinh độ (Longitude) (*)</label>
                                            <input
                                                required type="number" step="any"
                                                placeholder="VD: 108.2022"
                                                value={trafficFormData.longitude || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTrafficFormData({ ...trafficFormData, longitude: val });
                                                }}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                         <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phân loại sự cố</label>
                                             <div className="relative">
                                                 <select
                                                     value={trafficFormData.type}
                                                     onChange={(e) => setTrafficFormData({ ...trafficFormData, type: e.target.value as any })}
                                                     className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer bg-white appearance-none font-medium text-slate-700"
                                                 >
                                                     <option value="CONGESTION">Kẹt xe nghiêm trọng</option>
                                                     <option value="ACCIDENT">Tai nạn giao thông</option>
                                                     <option value="CONSTRUCTION">Đường đang thi công</option>
                                                 </select>
                                                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                     </svg>
                                                 </div>
                                             </div>
                                         </div>
                                         <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mức độ cảnh báo</label>
                                             <div className="relative">
                                                 <select
                                                     value={trafficFormData.severity}
                                                     onChange={(e) => setTrafficFormData({ ...trafficFormData, severity: e.target.value as any })}
                                                     className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer bg-white appearance-none font-medium text-slate-700"
                                                 >
                                                     <option value="LOW">Thấp (LOW)</option>
                                                     <option value="MEDIUM">Trung bình (MEDIUM)</option>
                                                     <option value="HIGH">Báo động Đỏ (HIGH)</option>
                                                 </select>
                                                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                     </svg>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                </div>

                                {/* Right Side: Interactive Mini Map */}
                                <div className="col-span-1 md:col-span-6 relative h-[300px] md:h-full min-h-[300px] bg-slate-100 flex flex-col">
                                    <div className="absolute inset-0">
                                        <Map
                                            ref={mapRef}
                                            initialViewState={{
                                                longitude: trafficFormData.longitude || 108.2022,
                                                latitude: trafficFormData.latitude || 16.0544,
                                                zoom: 14
                                            }}
                                            onClick={handleMiniMapClick}
                                            style={{ width: '100%', height: '100%' }}
                                            mapStyle="mapbox://styles/mapbox/streets-v12"
                                            mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                                        >
                                            <NavigationControl position="bottom-right" />
                                            
                                            <Marker
                                                longitude={trafficFormData.longitude || 108.2022}
                                                latitude={trafficFormData.latitude || 16.0544}
                                                anchor="bottom"
                                                draggable={true}
                                                onDragEnd={handleMarkerDragEnd}
                                            >
                                                <div className="relative w-[30px] h-[36px] flex flex-col items-center justify-end cursor-pointer">
                                                    <svg width="30" height="36" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
                                                        <ellipse cx="15" cy="32" rx="7" ry="2" fill="#64748b" opacity="0.4" />
                                                        <path
                                                            d="M15 0C6.72 0 0 6.72 0 15C0 22.92 15 33.33 15 33.33C15 33.33 30 22.92 30 15C30 6.72 23.28 0 15 0Z"
                                                            fill="#ea580c"
                                                        />
                                                        <circle cx="15" cy="13" r="4" fill="white" />
                                                    </svg>
                                                </div>
                                            </Marker>
                                        </Map>
                                    </div>
                                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-md pointer-events-none text-[10px] font-bold text-slate-700 flex flex-col gap-0.5 max-w-[80%]">
                                        <span className="text-orange-600">📍 Ghim Vị Trí Sự Cố</span>
                                        <span className="text-slate-400 font-semibold leading-normal">Nhấp chuột lên bản đồ hoặc Kéo thả ghim để định vị chính xác.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowTrafficModal(false)}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-1"
                                >
                                    <CheckCircle2 size={16} /> Kích hoạt Cảnh báo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
