// Tọa độ trung tâm của các quận tại Đà Nẵng
const DISTRICTS = {
    "Liên Chiểu": { lat: 16.0601, lon: 108.1481 },
    "Hải Châu": { lat: 16.0469, lon: 108.2204 },
    "Thanh Khê": { lat: 16.0622, lon: 108.1824 },
    "Sơn Trà": { lat: 16.0827, lon: 108.2435 },
    "Ngũ Hành Sơn": { lat: 16.0232, lon: 108.2562 },
    "Cẩm Lệ": { lat: 16.0156, lon: 108.2045 },
    "Hòa Vang": { lat: 15.9904, lon: 108.0674 }
};

// Lưu trữ dữ liệu thời tiết giả lập trong bộ nhớ để làm fallback hoặc test
const weatherCache = {};
Object.keys(DISTRICTS).forEach(name => {
    weatherCache[name] = {
        district: name,
        temp: 29.5,
        status: "Clouds",
        description: "nhiều mây",
        rain1h: 0, // lượng mưa (mm/h)
        humidity: 78,
        wind_speed: 3.5,
        last_updated: new Date()
    };
});

/**
 * Cập nhật thời tiết giả lập cho mục đích test/simulator
 */
function updateMockWeather(district, data) {
    if (!weatherCache[district]) {
        return false;
    }
    weatherCache[district] = {
        ...weatherCache[district],
        ...data,
        last_updated: new Date()
    };
    return weatherCache[district];
}

/**
 * Lấy dữ liệu thời tiết của một quận (gọi API thật hoặc dùng mock)
 */
async function getWeatherForDistrict(districtName) {
    const coords = DISTRICTS[districtName];
    if (!coords) {
        throw new Error(`Quận/huyện '${districtName}' không được hỗ trợ.`);
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    // Nếu không có API Key, sử dụng dữ liệu giả lập ngay lập tức
    if (!apiKey || apiKey === "your_openweathermap_api_key_here") {
        console.log(`[WeatherClient] No API Key. Returning mock weather for ${districtName}`);
        return weatherCache[districtName];
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&lang=vi&appid=${apiKey}`;
        
        // Sử dụng native fetch của Node.js (hỗ trợ từ Node v18)
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenWeatherMap API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse dữ liệu lượng mưa
        let rain1h = 0;
        if (data.rain) {
            rain1h = data.rain['1h'] || 0;
        }

        const weatherInfo = {
            district: districtName,
            temp: data.main ? data.main.temp : weatherCache[districtName].temp,
            status: data.weather && data.weather[0] ? data.weather[0].main : weatherCache[districtName].status,
            description: data.weather && data.weather[0] ? data.weather[0].description : weatherCache[districtName].description,
            rain1h: rain1h,
            humidity: data.main ? data.main.humidity : weatherCache[districtName].humidity,
            wind_speed: data.wind ? data.wind.speed : weatherCache[districtName].wind_speed,
            last_updated: new Date()
        };

        // Đồng bộ vào cache
        weatherCache[districtName] = weatherInfo;
        return weatherInfo;
    } catch (error) {
        console.error(`[WeatherClient] Error fetching weather for ${districtName}:`, error.message);
        // Fallback về cache
        return weatherCache[districtName];
    }
}

/**
 * Lấy danh sách toàn bộ các quận/huyện được cấu hình
 */
function getSupportedDistricts() {
    return Object.keys(DISTRICTS);
}

module.exports = {
    getWeatherForDistrict,
    updateMockWeather,
    getSupportedDistricts,
    DISTRICTS
};
