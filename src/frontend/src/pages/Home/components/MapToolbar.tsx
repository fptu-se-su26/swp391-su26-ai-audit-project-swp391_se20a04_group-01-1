import React from 'react';
import { Navigation, Layers, TrendingUp, Bookmark, CloudRain, Calendar } from 'lucide-react';
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
    return (
        <div className="absolute right-6 top-[200px] z-10 flex flex-col gap-3">
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
    );
}
