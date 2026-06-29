import React, { useState, useEffect } from 'react';
import { 
    Cloud, CloudRain, CloudLightning, Sun, CloudDrizzle, 
    Compass, AlertTriangle, RefreshCw, X, Calendar, Droplets, Wind, CloudSun
} from 'lucide-react';

interface WeatherData {
    district: string;
    temp: number;
    status: string;
    description: string;
    rain1h: number;
    humidity: number;
    wind_speed: number;
    last_updated: string;
}

interface ForecastItem {
    time: string;
    temp: number;
    status: string;
    description: string;
    rain: number;
    humidity: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface WeatherWidgetProps {
    isCollapsed: boolean;
    onToggleCollapse: (collapsed: boolean) => void;
    isLowBandwidth?: boolean;
    isOffline?: boolean;
}

export function WeatherWidget({ isCollapsed, onToggleCollapse, isLowBandwidth = false, isOffline = false }: WeatherWidgetProps) {
    const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState<string>('Ngũ Hành Sơn');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Quản lý Modal dự báo chi tiết
    const [showForecastModal, setShowForecastModal] = useState<boolean>(false);
    const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
    const [loadingForecast, setLoadingForecast] = useState<boolean>(false);
    const [forecastError, setForecastError] = useState<string | null>(null);

    // Đồng hồ thời gian thực
    const [timeStr, setTimeStr] = useState<string>('');
    const [dateStr, setDateStr] = useState<string>('');

    // Fetch dữ liệu thời tiết
    const fetchWeather = async () => {
        if (isOffline) {
            const cached = localStorage.getItem('cached_weather_list');
            if (cached) {
                setWeatherList(JSON.parse(cached));
            }
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const response = await fetch(`${API_BASE}/api/weather/current`);
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setWeatherList(data.data);
                localStorage.setItem('cached_weather_list', JSON.stringify(data.data));
            } else {
                setError('Không thể tải dữ liệu thời tiết');
            }
        } catch (err) {
            console.error('[WeatherWidget] Fetch weather error:', err);
            const cached = localStorage.getItem('cached_weather_list');
            if (cached) {
                setWeatherList(JSON.parse(cached));
            } else {
                setError('Lỗi kết nối máy chủ thời tiết');
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch dữ liệu dự báo cho 4 mốc ở bottom bar
    const fetchForecast = async (districtName: string) => {
        if (isOffline) {
            const cached = localStorage.getItem(`cached_forecast_${districtName}`);
            if (cached) {
                setForecastData(JSON.parse(cached));
            }
            setLoadingForecast(false);
            return;
        }
        setLoadingForecast(true);
        setForecastError(null);
        try {
            const response = await fetch(`${API_BASE}/api/weather/forecast?district=${encodeURIComponent(districtName)}`);
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setForecastData(data.data);
                localStorage.setItem(`cached_forecast_${districtName}`, JSON.stringify(data.data));
            } else {
                setForecastError('Không thể tải dự báo thời tiết');
            }
        } catch (err) {
            console.error('[WeatherWidget] Fetch forecast error:', err);
            const cached = localStorage.getItem(`cached_forecast_${districtName}`);
            if (cached) {
                setForecastData(JSON.parse(cached));
            } else {
                setForecastError('Lỗi kết nối dự báo');
            }
        } finally {
            setLoadingForecast(false);
        }
    };

    useEffect(() => {
        fetchWeather();
        if (!isOffline) {
            const interval = setInterval(fetchWeather, 30000);
            return () => clearInterval(interval);
        }
    }, [isOffline]);

    // Fetch forecast tự động mỗi khi đổi quận để cập nhật dữ liệu bottom bar
    useEffect(() => {
        if (selectedDistrict) {
            fetchForecast(selectedDistrict);
        }
    }, [selectedDistrict, isOffline]);

    // Chạy đồng hồ thời gian thực
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setTimeStr(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
            
            // Format dạng "T2 23-08" (Thứ - Tháng - Ngày)
            const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const day = weekdays[now.getDay()];
            const date = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            setDateStr(`${day} ${date}-${month}`);
        };
        updateClock();
        const clockInterval = setInterval(updateClock, 1000);
        return () => clearInterval(clockInterval);
    }, []);

    const activeWeather = weatherList.find(w => w.district === selectedDistrict);
    
    // Các quận có mưa lớn
    const highRiskDistricts = weatherList.filter(w => w.rain1h > 50 && w.district !== selectedDistrict);

    const handleToggleCollapse = (collapsed: boolean) => {
        onToggleCollapse(collapsed);
    };

    const handleOpenForecastModal = () => {
        setShowForecastModal(true);
        fetchForecast(selectedDistrict);
    };

    // Trả về biểu tượng thời tiết tương ứng
    const getWeatherIcon = (status: string, temp = 25, sizeClass = "w-8 h-8", lightBg = false) => {
        const lowerStatus = status?.toLowerCase();

        // 1. Biểu tượng cho nền sáng (VD: nút thu nhỏ hoặc trong modal trắng) để có màu sắc rực rỡ, tương phản tốt
        if (lightBg) {
            if (lowerStatus === 'rain') {
                return <CloudRain className={`${sizeClass} text-blue-500`} />;
            }
            if (lowerStatus === 'thunderstorm') {
                return <CloudLightning className={`${sizeClass} text-amber-500 animate-pulse`} />;
            }
            if (lowerStatus === 'drizzle') {
                return <CloudDrizzle className={`${sizeClass} text-sky-400`} />;
            }
            if (lowerStatus === 'clear') {
                return <Sun className={`${sizeClass} text-amber-500 animate-spin-slow`} />;
            }
            if (lowerStatus === 'clouds') {
                if (temp >= 30) {
                    return <CloudSun className={`${sizeClass} text-amber-500`} />;
                }
                return <Cloud className={`${sizeClass} text-slate-400`} />;
            }
            return <Cloud className={`${sizeClass} text-slate-400`} />;
        }

        // 2. Biểu tượng gốc (màu nhạt) cho banner thời tiết nền gradient tối màu
        if (lowerStatus === 'rain') {
            return <CloudRain className={`${sizeClass} text-blue-100 animate-pulse`} />;
        }
        if (lowerStatus === 'thunderstorm') {
            return <CloudLightning className={`${sizeClass} text-amber-300`} />;
        }
        if (lowerStatus === 'drizzle') {
            return <CloudDrizzle className={`${sizeClass} text-sky-200`} />;
        }
        if (lowerStatus === 'clear') {
            return <Sun className={`${sizeClass} text-yellow-100 animate-spin-slow`} />;
        }
        if (lowerStatus === 'clouds') {
            if (temp >= 30) {
                return <CloudSun className={`${sizeClass} text-yellow-100`} />;
            }
            return <Cloud className={`${sizeClass} text-slate-200`} />;
        }
        return <Cloud className={`${sizeClass} text-slate-200`} />;
    };

    // Thiết lập gradient background động dựa trên thời tiết và nhiệt độ
    const getWidgetTheme = () => {
        if (!activeWeather) return 'from-orange-400 via-amber-500 to-rose-500 text-white';
        
        const status = activeWeather.status?.toLowerCase();
        const temp = activeWeather.temp;

        // 1. Kiểm tra ngưỡng nhiệt độ cực đoan trước tiên
        if (temp >= 35) {
            // Trời cực kỳ nắng nóng nóng (>= 35 độ) -> Đỏ lửa / Cam nhiệt đới gắt
            return 'from-red-600 via-orange-500 to-amber-500 text-white border-red-500/30';
        }
        if (temp <= 20) {
            // Trời lạnh (<= 20 độ) -> Xanh băng giá / Xanh ngọc lạnh
            return 'from-cyan-600 via-sky-500 to-blue-600 text-white border-cyan-500/30';
        }

        // 2. Các kiểu thời tiết thông thường ở dải nhiệt độ mát mẻ/ấm áp (21 - 34 độ)
        if (status === 'rain' || status === 'thunderstorm' || status === 'drizzle') {
            return 'from-slate-700 via-blue-800 to-indigo-900 text-white border-blue-900/30';
        }
        if (status === 'clouds' && temp < 30) {
            return 'from-sky-500 via-slate-400 to-slate-500 text-white border-slate-400/30';
        }
        // Sunny / Clear hoặc trời ấm áp bình thường
        return 'from-orange-400 via-amber-500 to-rose-500 text-white border-orange-500/20';
    };

    // Khi thu nhỏ thì không hiển thị widget nữa (nút toggle đã được đưa vào MapToolbar)
    if (isCollapsed) {
        return null;
    }

    if (loading && weatherList.length === 0) {
    return (
        <div className="absolute bottom-6 right-[80px] z-20 w-64 bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl p-4 shadow-xl flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin animate-spin-slow" />
            Đang tải thời tiết...
        </div>
    );
}

    // Các mốc dự báo ngắn cho Bottom Bar
    const miniForecasts = forecastData.slice(0, 4);

    return (
    <div className="absolute bottom-6 right-[80px] z-20 w-64 bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl p-4 shadow-xl flex items-center justify-center gap-2 text-xs text-slate-500">
        {/* Inject Animation CSS */}
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 16s linear infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.25; transform: scale(1); }
                    50% { opacity: 0.45; transform: scale(1.06); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 5s ease-in-out infinite;
                }
            `}</style>

            {/* Premium Weather Widget Card */}
            <div className={`relative overflow-hidden rounded-[2.5rem] shadow-2xl border bg-gradient-to-br transition-all duration-500 hover:-translate-y-1 hover:shadow-3xl ${getWidgetTheme()}`}>
                
                {/* 1. Concentric Glowing Sun Circles (Dành cho trời nắng/ấm) */}
                {!isLowBandwidth && (!activeWeather || activeWeather.temp >= 30) && (
                    <>
                        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-yellow-300/30 blur-2xl animate-pulse-slow pointer-events-none" />
                        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-yellow-100/10 border border-white/5 pointer-events-none" />
                        <div className="absolute 0 -right-2 w-24 h-24 rounded-full bg-yellow-100/10 border border-white/5 pointer-events-none" />
                    </>
                )}

                {/* 2. Top Controls & Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                    <button 
                        onClick={handleOpenForecastModal}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        title="Xem dự báo chi tiết"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={fetchWeather}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        title="Làm mới"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => handleToggleCollapse(true)}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        title="Đóng thời tiết"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* 3. Main Info Section */}
                {activeWeather && (
                    <div className="p-6 pb-4 flex justify-between items-start">
                        {/* Cột Trái: Thời Tiết Hiện Tại */}
                        <div className="flex flex-col text-left">
                            <div className="flex items-center gap-1 text-white/90">
                                {getWeatherIcon(activeWeather.status, activeWeather.temp, "w-4 h-4")}
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">{activeWeather.status}</span>
                            </div>
                            
                            <span className="text-[54px] font-light leading-none tracking-tight text-white mt-2 select-none relative">
                                {Math.round(activeWeather.temp)}
                                <span className="text-[20px] font-semibold absolute top-0.5 ml-1">°</span>
                            </span>
                            
                            <span className="text-[10px] font-bold text-white/80 mt-1 uppercase tracking-wider">
                                Thấp: {Math.round(activeWeather.temp - 4)}° • Cao: {Math.round(activeWeather.temp + 3)}°
                            </span>
                        </div>

                        {/* Cột Phải: Đồng Hồ & Địa Điểm */}
                        <div className="flex flex-col items-end text-right pr-6 mt-1">
                            <span className="text-[32px] font-light text-white leading-none tracking-tight">{timeStr}</span>
                            <span className="text-[10px] font-bold text-white/80 tracking-wider uppercase mt-1.5">{dateStr}</span>
                            
                            {/* Selector quận kiểu ẩn chữ bóng bẩy */}
                            <div className="mt-4 bg-white/10 hover:bg-white/15 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 transition-all">
                                <Compass className="w-3 h-3 text-white/90" />
                                <select 
                                    value={selectedDistrict} 
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    className="bg-transparent border-none text-[10px] font-black text-white focus:outline-none cursor-pointer pr-1 uppercase tracking-wider"
                                >
                                    {weatherList.map(w => (
                                        <option key={w.district} value={w.district} className="text-slate-800 bg-white">
                                            {w.district}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Cảnh báo khẩn cấp dạng banner chớp nháy (Nếu có) */}
                {activeWeather && activeWeather.rain1h > 50 && (
                    <div className="mx-4 mb-3 bg-red-600/30 border border-red-500/20 rounded-2xl p-2.5 flex items-start gap-2 backdrop-blur-md">
                        <AlertTriangle className="w-4 h-4 text-red-100 shrink-0 mt-0.5 animate-bounce" />
                        <div className="flex flex-col text-left">
                            <span className="text-[9px] font-extrabold uppercase tracking-wide text-red-100">Cảnh báo ngập sớm</span>
                            <span className="text-[9px] text-white/90 leading-tight mt-0.5">
                                Mưa rất lớn ({activeWeather.rain1h.toFixed(1)} mm/h). Các đường xung quanh có nguy cơ ngập cao.
                            </span>
                        </div>
                    </div>
                )}

                {/* 5. Bottom Forecast Bar */}
                <div className="bg-black/15 border-t border-white/5 py-3 px-4 grid grid-cols-4 items-center">
                    {loadingForecast ? (
                        <div className="col-span-4 text-center text-[9px] text-white/60 tracking-wider">Đang tải dự báo...</div>
                    ) : miniForecasts.length > 0 ? (
                        miniForecasts.map((item, idx) => (
                            <div key={idx} className={`flex flex-col items-center gap-1 ${
                                idx < 3 ? 'border-r border-white/5' : ''
                            }`}>
                                <span className="text-[8px] font-black text-white/70 tracking-wider">{item.time}</span>
                                {getWeatherIcon(item.status, item.temp, "w-4 h-4 my-0.5")}
                                <span className="text-[9px] font-black text-white">{item.temp}°</span>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-4 text-center text-[9px] text-white/60 tracking-wider">Không có dữ liệu dự báo</div>
                    )}
                </div>
            </div>

            {/* Cảnh báo ngoài vùng nếu quận khác mưa to */}
            {highRiskDistricts.length > 0 && (
                <div className="bg-red-500/90 backdrop-blur-md text-white rounded-2xl p-2.5 px-4 shadow-lg flex items-center gap-2 border border-white/10 transition-all hover:scale-102">
                    <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                    <div className="flex-1 text-[9px] text-left font-black tracking-wide leading-tight uppercase">
                        Mưa ngập tại Quận {highRiskDistricts.map(d => d.district).join(', ')}
                    </div>
                    <button 
                        onClick={() => setSelectedDistrict(highRiskDistricts[0].district)}
                        className="text-[8px] font-black uppercase tracking-wider bg-white text-red-600 px-2 py-1 rounded-full transition-all hover:bg-red-50 active:scale-95"
                    >
                        Xem
                    </button>
                </div>
            )}

            {/* MODAL DỰ BÁO THỜI TIẾT 24 GIỜ */}
            {showForecastModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowForecastModal(false)} />
                    
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative z-10 flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-extrabold text-sm tracking-wide flex items-center gap-1.5">
                                    <Calendar className="w-4.5 h-4.5" />
                                    DỰ BÁO CHI TIẾT 24H TIẾP THEO
                                </h3>
                                <p className="text-[10px] opacity-80 mt-0.5">Khu vực Quận {selectedDistrict}, Đà Nẵng</p>
                            </div>
                            <button 
                                onClick={() => setShowForecastModal(false)} 
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto flex-1 max-h-[60vh] space-y-4">
                            {loadingForecast ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                    Đang tải dữ liệu dự báo...
                                </div>
                            ) : forecastError ? (
                                <div className="py-8 text-center text-xs text-red-500 flex flex-col items-center justify-center gap-2">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                    {forecastError}
                                </div>
                            ) : (
                                <>
                                    {forecastData.some(f => f.rain > 50) && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2.5">
                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-bold text-red-800">Cảnh báo ngập lụt sớm!</h4>
                                                <p className="text-[10px] text-red-700 mt-0.5 leading-relaxed text-left">
                                                    Mô hình khí tượng dự báo quận {selectedDistrict} sẽ có mưa cực to (vượt ngưỡng 50 mm/h) trong vài giờ tới. Nguy cơ ngập đường cực cao, hãy chủ động chọn lộ trình thay thế trước khi bắt đầu hành trình.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-4 gap-2.5">
                                        {forecastData.map((item, idx) => (
                                            <div key={idx} className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                                                item.rain > 50 
                                                    ? 'bg-red-50 border-red-200 shadow-sm ring-1 ring-red-400/20' 
                                                    : item.status === 'Rain' 
                                                        ? 'bg-blue-50/50 border-blue-100' 
                                                        : 'bg-slate-50/60 border-slate-100'
                                            }`}>
                                                <span className="text-[10px] font-bold text-slate-400">{item.time}</span>
                                                <div className="my-2">{getWeatherIcon(item.status, item.temp, "w-6 h-6", true)}</div>
                                                <span className="text-xs font-black text-slate-800">{item.temp}°C</span>
                                                <span className="text-[9px] text-slate-500 capitalize mt-1 truncate w-full">{item.description}</span>
                                                
                                                {item.rain > 0 ? (
                                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full mt-1.5 ${
                                                        item.rain > 50 
                                                            ? 'bg-red-500 text-white animate-pulse' 
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        💧 {item.rain.toFixed(1)} mm/h
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] text-slate-400 mt-1.5">Không mưa</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-600"><Droplets className="w-4 h-4" /></div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-[10px] text-slate-400 font-medium">Độ ẩm trung bình</span>
                                                <span className="text-xs font-black text-slate-800">
                                                    {Math.round(forecastData.reduce((acc, f) => acc + f.humidity, 0) / forecastData.length)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100/50 flex items-center justify-center text-indigo-600"><Wind className="w-4 h-4" /></div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-[10px] text-slate-400 font-medium">Lượng mưa cao nhất</span>
                                                <span className="text-xs font-black text-slate-800">
                                                    {Math.max(...forecastData.map(f => f.rain)).toFixed(1)} mm/h
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
