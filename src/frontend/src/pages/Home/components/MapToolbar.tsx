import React, { useState } from 'react';
import { Navigation, Layers, TrendingUp, Bookmark, CloudRain, Calendar, CloudSun, WifiOff, Menu, X, MapPin } from 'lucide-react';
import { showPremiumToast } from '../../../utils/toastUtils';

interface MapToolbarProps {
    mapControls: {
        layers: boolean;
        traffic: boolean;
        flood: boolean;
    };
    userRole: string | null;
    showSavedRoutesSidebar: boolean;
    viewMode: 'pois' | 'events';
    isWeatherExpanded: boolean;
    onToggleWeather: () => void;
    isLowBandwidth: boolean;
    isOffline: boolean;
    onToggleLowBandwidth: () => void;
    isAddingPOI?: boolean;
    setIsAddingPOI?: (value: boolean) => void;
    
    handleGetCurrentLocation: (showError: boolean) => void;
    toggleMapControl: (control: 'layers' | 'traffic' | 'flood') => void;
    setShowSavedRoutesSidebar: (val: boolean) => void;
    setSelectedPOI: (val: any) => void;
    setSelectedFilter: (val: any) => void;
    setShowEventsSidebar: (val: boolean) => void;
    setSelectedEvent: (val: any) => void;
    setViewMode: (val: 'pois' | 'events') => void;
    navigate: (path: string) => void;
}

export function MapToolbar({
    mapControls,
    userRole,
    showSavedRoutesSidebar,
    viewMode,
    isWeatherExpanded,
    onToggleWeather,
    isLowBandwidth,
    isOffline,
    onToggleLowBandwidth,
    isAddingPOI = false,
    setIsAddingPOI = () => {},
    
    handleGetCurrentLocation,
    toggleMapControl,
    setShowSavedRoutesSidebar,
    setSelectedPOI,
    setSelectedFilter,
    setShowEventsSidebar,
    setSelectedEvent,
    setViewMode,
    navigate
}: MapToolbarProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 items-end pointer-events-none">
            
            {/* Toggle Button cho Mobile */}
            <div className="pointer-events-auto md:hidden">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-11 h-11 bg-white rounded-2xl shadow-xl border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                    {isExpanded ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Danh sách các nút chức năng */}
            <div className={`flex flex-col gap-3 ${!isExpanded ? 'max-md:hidden' : ''}`}>
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

            {userRole === 'admin' && (
                <div className="group relative pointer-events-auto flex justify-end items-center">
                    <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        Lộ trình đã lưu
                    </span>
                    <button
                        onClick={() => {
                            const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
                            if (!token) {
                                showPremiumToast('Vui lòng đăng nhập để xem lộ trình đã lưu.', 'error');
                                setTimeout(() => navigate('/login'), 1500);
                                return;
                            }
                            const nextState = !showSavedRoutesSidebar;
                            setShowSavedRoutesSidebar(nextState);
                            if (nextState) {
                                setSelectedPOI(null);
                                setSelectedFilter(null);
                                setShowEventsSidebar(false);
                                setSelectedEvent(null);
                            }
                        }}
                        className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${showSavedRoutesSidebar ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                    >
                        <Bookmark size={18} />
                    </button>
                </div>
            )}

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
                    Đóng góp địa điểm
                </span>
                <button
                    onClick={() => {
                        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
                        if (!token) {
                            showPremiumToast('Vui lòng đăng nhập để đóng góp địa điểm.', 'error');
                            return;
                        }
                        setIsAddingPOI(!isAddingPOI);
                    }}
                    className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${isAddingPOI ? 'bg-orange-500 text-white border-orange-600 animate-pulse' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                >
                    <MapPin size={18} />
                </button>
            </div>

            <div className="group relative pointer-events-auto flex justify-end items-center">
                <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                    Thời tiết
                </span>
                <button
                    onClick={onToggleWeather}
                    className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${isWeatherExpanded ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                >
                    <CloudSun size={18} />
                </button>
            </div>

            {/* Nút Tiết kiệm băng thông / Ngoại tuyến */}
            <div className="group relative pointer-events-auto flex justify-end items-center">
                <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                    {isOffline ? 'Chế độ Ngoại tuyến (Đang hoạt động)' : 'Tiết kiệm băng thông'}
                </span>
                <button
                    onClick={() => {
                        if (isOffline) {
                            showPremiumToast('Đang ngoại tuyến hoàn toàn do mất kết nối mạng.', 'warning');
                        } else {
                            onToggleLowBandwidth();
                            showPremiumToast(
                                !isLowBandwidth 
                                    ? 'Đã bật chế độ Tiết kiệm băng thông (Đổi map tối giản, nén tuyến đường)' 
                                    : 'Đã tắt chế độ Tiết kiệm băng thông',
                                'success'
                            );
                        }
                    }}
                    className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all relative ${
                        isOffline 
                            ? 'bg-red-600 text-white border-red-700 animate-pulse' 
                            : isLowBandwidth 
                                ? 'bg-amber-600 text-white border-amber-700' 
                                : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                    }`}
                >
                    <WifiOff size={18} />
                    {isOffline && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                        </span>
                    )}
                </button>
            </div>

            <div className="group relative pointer-events-auto flex justify-end items-center">
                <span className="absolute right-[56px] bg-slate-600 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                    Xem Sự Kiện
                </span>
                <button
                    onClick={() => {
                        setViewMode(viewMode === 'pois' ? 'events' : 'pois');
                        if (viewMode === 'pois') {
                            setShowEventsSidebar(true);
                            setSelectedPOI(null);
                            setSelectedFilter(null);
                        } else {
                            setSelectedEvent(null);
                        }
                    }}
                    className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center transition-all ${viewMode === 'events' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'}`}
                >
                    <Calendar size={18} />
                </button>
            </div>
            </div>
        </div>
    );
}
