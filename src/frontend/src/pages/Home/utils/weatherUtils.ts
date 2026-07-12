import { WeatherData } from "../types/weather";

/**
 * Làm tròn nhiệt độ hiển thị (°C). Tách từ components/panels/WeatherPanel.tsx.
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°`;
}

/**
 * Tìm dữ liệu thời tiết của 1 quận/huyện trong danh sách theo tên.
 * Tách từ logic "activeWeather = weatherList.find(...)" trong WeatherPanel.tsx.
 */
export function findWeatherByDistrict(
  weatherList: WeatherData[],
  district: string
): WeatherData | undefined {
  return weatherList.find((w) => w.district === district);
}
