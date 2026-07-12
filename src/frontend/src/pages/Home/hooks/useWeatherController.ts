import { useState, useEffect } from 'react';
import { WeatherData } from '../types/weather';
import { fetchWeatherList } from '../services/weatherService';
import { findWeatherByDistrict } from '../utils/weatherUtils';

/**
 * useWeatherController
 * Tách toàn bộ logic gọi API thời tiết ra khỏi WeatherPanel.tsx,
 * để component chỉ còn nhiệm vụ hiển thị.
 */
export function useWeatherController() {
    const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState<string>('Ngũ Hành Sơn');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const isOffline = !navigator.onLine;

    const fetchWeather = async () => {
        if (isOffline) {
            setError('Đang ngoại tuyến. Không thể tải dữ liệu thời tiết.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWeatherList();
            setWeatherList(data);
            const firstDistrict = data[0]?.district;
            if (firstDistrict && !selectedDistrict) {
                setSelectedDistrict(firstDistrict);
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ thời tiết.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWeather(); }, [isOffline]);

    const activeWeather = findWeatherByDistrict(weatherList, selectedDistrict);

    return {
        weatherList,
        selectedDistrict,
        setSelectedDistrict,
        loading,
        error,
        isOffline,
        activeWeather,
        fetchWeather,
    };
}
