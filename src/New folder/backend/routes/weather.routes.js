const express = require('express');
const router = express.Router();
const weatherClient = require('../utils/weatherClient');
const { runWeatherAlertJob } = require('../schedulerService');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET /api/weather/current - Lấy thời tiết hiện tại của tất cả các quận tại Đà Nẵng
router.get('/current', async (req, res) => {
    try {
        const districts = weatherClient.getSupportedDistricts();
        const data = [];

        for (const district of districts) {
            const weather = await weatherClient.getWeatherForDistrict(district);
            data.push(weather);
        }

        res.json({
            success: true,
            message: "Lấy thời tiết hiện tại thành công",
            data
        });
    } catch (error) {
        console.error("Lỗi lấy thời tiết hiện tại:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin thời tiết",
            error: error.message
        });
    }
});

// POST /api/admin/weather/simulate - Giả lập thời tiết cho một quận (Admin/Dev)
// Hỗ trợ kiểm thử mà không cần đăng nhập token (hoặc có thể dùng authenticateToken nếu cần, nhưng để tiện kiểm thử nhanh thì cho phép gọi hoặc check Admin)
router.post('/simulate', authenticateToken, authorizeRole('admin'), async (req, res) => {
    if (process.env.ENABLE_WEATHER_SIMULATOR !== 'true') {
        return res.status(403).json({ success: false, message: "Tính năng giả lập đã bị tắt!" });
    }
    try {
        const { district, temp, status, description, rain1h } = req.body;

        if (!district) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tên quận/huyện cần giả lập!"
            });
        }

        const districts = weatherClient.getSupportedDistricts();
        if (!districts.includes(district)) {
            return res.status(400).json({
                success: false,
                message: `Quận/huyện '${district}' không hợp lệ. Các quận hỗ trợ: ${districts.join(', ')}`
            });
        }

        // Cập nhật dữ liệu thời tiết giả lập vào cache
        const updateData = {};
        if (temp !== undefined) updateData.temp = parseFloat(temp);
        if (status !== undefined) updateData.status = status;
        if (description !== undefined) updateData.description = description;
        if (rain1h !== undefined) updateData.rain1h = parseFloat(rain1h);

        const updatedWeather = weatherClient.updateMockWeather(district, updateData);

        console.log(`[Simulator] Simulated weather for ${district}:`, updatedWeather);

        // Kích hoạt đồng bộ kiểm tra cảnh báo ngập lụt sớm ngay lập tức
        await runWeatherAlertJob();

        res.json({
            success: true,
            message: `Giả lập thời tiết quận ${district} thành công và đã kích hoạt quét cảnh báo sớm!`,
            data: updatedWeather
        });
    } catch (error) {
        console.error("Lỗi giả lập thời tiết:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi giả lập thời tiết",
            error: error.message
        });
    }
});

// GET /api/weather/forecast - Lấy thông tin dự báo thời tiết 5 ngày / 3 giờ của một quận
router.get('/forecast', async (req, res) => {
    try {
        const { district } = req.query;
        if (!district) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tham số quận/huyện (district)!"
            });
        }

        const districts = weatherClient.getSupportedDistricts();
        if (!districts.includes(district)) {
            return res.status(400).json({
                success: false,
                message: `Quận/huyện '${district}' không hợp lệ.`
            });
        }

        const coords = weatherClient.DISTRICTS[district];
        const apiKey = process.env.OPENWEATHER_API_KEY;

        // Nếu không có API Key, trả về dữ liệu dự báo giả lập chất lượng cao
        if (!apiKey || apiKey === "your_openweathermap_api_key_here") {
            const currentHour = new Date().getHours();
            const forecastData = [];
            const weather = await weatherClient.getWeatherForDistrict(district);

            // Tạo 8 điểm dữ liệu dự báo cách nhau mỗi 3 giờ (tổng cộng 24 giờ tiếp theo)
            for (let i = 1; i <= 8; i++) {
                const forecastHour = (currentHour + i * 3) % 24;
                const timeStr = `${forecastHour.toString().padStart(2, '0')}:00`;
                
                // Giả lập nhiệt độ thay đổi nhẹ theo thời gian trong ngày
                let tempOffset = 0;
                if (forecastHour >= 11 && forecastHour <= 15) tempOffset = 2; // Buổi trưa nóng hơn
                else if (forecastHour >= 23 || forecastHour <= 5) tempOffset = -4; // Ban đêm mát hơn
                else tempOffset = -1;

                // Nếu quận hiện tại đang giả lập có mưa lớn, dự báo cũng sẽ có mưa
                const forecastStatus = weather.rain1h > 10 ? 'Rain' : (i % 3 === 0 ? 'Rain' : (i % 2 === 0 ? 'Clouds' : 'Clear'));
                const forecastDesc = forecastStatus === 'Rain' ? 'Mưa vừa' : (forecastStatus === 'Clouds' ? 'Nhiều mây' : 'Trời quang');
                const forecastRain = forecastStatus === 'Rain' ? (weather.rain1h > 10 ? weather.rain1h * 0.8 : 3.2) : 0;

                forecastData.push({
                    time: timeStr,
                    temp: Math.round(weather.temp + tempOffset),
                    status: forecastStatus,
                    description: forecastDesc,
                    rain: parseFloat(forecastRain.toFixed(1)),
                    humidity: forecastStatus === 'Rain' ? 88 : 70
                });
            }

            return res.json({
                success: true,
                message: "Lấy dự báo thời tiết giả lập thành công",
                data: forecastData
            });
        }

        // Gọi API thật của OpenWeatherMap
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&lang=vi&appid=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenWeatherMap Forecast API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Chỉ lấy 8 mốc đầu tiên (24 giờ tới)
        const forecastData = data.list.slice(0, 8).map(item => {
            const time = new Date(item.dt * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            let rainValue = 0;
            if (item.rain) {
                const rawRain = item.rain['3h'] || 0;
                rainValue = parseFloat((rawRain / 3).toFixed(1)); // Chia 3 để tính mm/h và làm tròn 1 chữ số thập phân
            }

            return {
                time,
                temp: Math.round(item.main.temp),
                status: item.weather && item.weather[0] ? item.weather[0].main : 'Clouds',
                description: item.weather && item.weather[0] ? item.weather[0].description : 'nhiều mây',
                rain: rainValue,
                humidity: item.main.humidity
            };
        });

        res.json({
            success: true,
            message: "Lấy dự báo thời tiết từ OpenWeatherMap thành công",
            data: forecastData
        });

    } catch (error) {
        console.error("Lỗi lấy dự báo thời tiết:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy dự báo thời tiết",
            error: error.message
        });
    }
});

module.exports = router;
