const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');

// GET /api/routes/share/:token - Lấy thông tin lộ trình chia sẻ công khai (Không cần đăng nhập)
router.get("/share/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("share_token", sql.NVarChar(100), token)
            .query(`
                SELECT * FROM SavedRoutes 
                WHERE share_token = @share_token AND is_shared = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình chia sẻ hoặc liên kết không hợp lệ!" });
        }

        res.json({ success: true, route: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lấy thông tin lộ trình chia sẻ:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

const { encodePolyline } = require('../utils/polylineHelper');

// GET /api/routes/calculate - Proxy để tính toán lộ trình và nén Polyline siêu nhẹ khi mạng yếu
router.get("/calculate", async (req, res) => {
    try {
        const { origin, destination, coords, mode, access_token } = req.query;

        if (!access_token || (!coords && (!origin || !destination))) {
            return res.status(400).json({ success: false, message: "Thiếu tham số coords (hoặc origin/destination) hoặc access_token!" });
        }

        const travelMode = mode || 'driving';
        const coordsString = coords || `${origin};${destination}`;
        const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${coordsString}?geometries=geojson&overview=full&access_token=${access_token}`;

        const response = await fetch(mapboxUrl);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            return res.status(400).json({ success: false, message: "Không thể tính toán lộ trình từ Mapbox", error: data });
        }

        const route = data.routes[0];
        const coordinates = route.geometry.coordinates; // Array of [lng, lat]
        
        // Nén coordinates thành chuỗi polyline
        const compressedPolyline = encodePolyline(coordinates);

        res.json({
            success: true,
            distance: route.distance, // meters
            duration: route.duration, // seconds
            polyline: compressedPolyline
        });
    } catch (error) {
        console.error("Lỗi tính toán lộ trình proxy:", error);
        res.status(500).json({ success: false, message: "Lỗi tính toán lộ trình", error: error.message });
    }
});

module.exports = router;
