import React from 'react';
import { CloudRain, AlertTriangle, RefreshCw, X, Droplets, Wind, CloudSun } from 'lucide-react';
import { useUIStore } from '../../../../store/uiStore';
import { useWeatherController } from '../../hooks/useWeatherController';

export const WeatherPanel: React.FC = () => {
    const { isWeatherExpanded, setUIState } = useUIStore();
    const {
        weatherList,
        selectedDistrict,
        setSelectedDistrict,
        loading,
        error,
        isOffline,
        activeWeather,
        fetchWeather,
    } = useWeatherController();

    const handleToggleCollapse = (collapsed: boolean) => {
        setUIState({ isWeatherExpanded: !collapsed });
        localStorage.setItem("weather_widget_collapsed", collapsed.toString());
    };

    if (isOffline) return null;

    return (
        <div className={`absolute bottom-8 right-24 z-20 transition-all duration-500 ease-in-out pointer-events-auto origin-bottom-right ${!isWeatherExpanded ? 'scale-90 opacity-0 translate-y-4 pointer-events-none' : 'scale-100 opacity-100 translate-y-0'}`}>
            <div className="bg-white/80 backdrop-blur-xl rounded-[28px] shadow-2xl border border-white w-[320px] overflow-hidden p-1">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[24px] p-5 text-white relative overflow-hidden">

                    <div className="flex justify-between items-start relative z-10 mb-4">
                        <select
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-bold py-1.5 px-3 rounded-full outline-none cursor-pointer appearance-none border border-white/20"
                        >
                            {weatherList.map(w => (
                                <option key={w.district} value={w.district} className="text-slate-800">{w.district}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={fetchWeather} disabled={loading} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button onClick={() => handleToggleCollapse(true)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center text-white/70 text-sm flex flex-col items-center gap-2">
                            <RefreshCw size={24} className="animate-spin text-white/50" />
                            Đang cập nhật thời tiết...
                        </div>
                    ) : error ? (
                        <div className="py-6 text-center text-red-200 text-xs flex flex-col items-center gap-2">
                            <AlertTriangle size={24} className="text-red-300" />
                            {error}
                        </div>
                    ) : activeWeather ? (
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="text-5xl font-black tracking-tighter mb-1 drop-shadow-md">
                                    {Math.round(activeWeather.temp)}°
                                </div>
                                <div className="text-sm font-medium text-blue-100 flex items-center gap-1.5">
                                    {activeWeather.description}
                                </div>
                            </div>
                            <CloudSun size={56} className="text-yellow-300 drop-shadow-lg" />
                        </div>
                    ) : null}

                    {activeWeather && !loading && (
                        <div className="mt-5 grid grid-cols-3 gap-2 relative z-10">
                            <div className="bg-black/10 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 backdrop-blur-sm border border-white/10">
                                <CloudRain size={16} className="text-blue-200" />
                                <span className="text-[11px] font-bold">{activeWeather.rain1h}mm</span>
                            </div>
                            <div className="bg-black/10 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 backdrop-blur-sm border border-white/10">
                                <Droplets size={16} className="text-blue-200" />
                                <span className="text-[11px] font-bold">{activeWeather.humidity}%</span>
                            </div>
                            <div className="bg-black/10 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 backdrop-blur-sm border border-white/10">
                                <Wind size={16} className="text-blue-200" />
                                <span className="text-[11px] font-bold">{activeWeather.wind_speed}m/s</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
