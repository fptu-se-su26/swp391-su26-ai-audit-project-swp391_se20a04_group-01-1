import { WeatherData } from "../types/weather";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * Gọi API lấy dữ liệu thời tiết theo các quận/huyện.
 * Tách từ hooks/useWeatherController.ts (trước đó nằm trong components/panels/WeatherPanel.tsx).
 */
export async function fetchWeatherList(): Promise<WeatherData[]> {
  const res = await fetch(`${API_BASE}/api/weather/current`);
  const data = await res.json();
  if (data.success && data.data) {
    return data.data as WeatherData[];
  }
  throw new Error("Không lấy được dữ liệu thời tiết.");
}