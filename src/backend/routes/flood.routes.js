const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');

// GET /api/flood-zones - Lấy danh sách vùng ngập lụt đang hoạt động
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                zone_id,
                zone_name,
                district,
                risk_level,
                polygon_coordinates,
                description,
                typical_flood_months,
                is_active,
                last_updated,
                updated_by,
                depth_cm
            FROM FloodZones
            WHERE is_active = 1
            ORDER BY zone_id ASC
        `);

        const data = result.recordset.map((zone) => {
            let coordinates = null;

            try {
                coordinates = zone.polygon_coordinates
                    ? JSON.parse(zone.polygon_coordinates)
                    : null;
            } catch (error) {
                console.error("Lỗi parse polygon_coordinates:", zone.zone_name);
            }

            // [TASK 2.5] Sử dụng cột depth_cm từ DB nếu có, ngược lại fallback theo logic cũ
            let depthCm = (zone.depth_cm !== null && zone.depth_cm !== undefined)
                ? zone.depth_cm
                : (zone.risk_level === "High" ? (zone.zone_name.includes("Nguyễn Văn Linh") ? 80 : 55)
                  : (zone.risk_level === "Medium" ? (zone.zone_name.includes("Tiên Sơn") ? 15 : 25) : 8));

            let level = "low";
            let color = "yellow";
            let radius = 150;

            if (zone.risk_level === "High") {
                level = "high";
                color = "red";
                radius = 280;
            } else if (zone.risk_level === "Medium") {
                level = "medium";
                color = "orange";
                radius = 220;
            }

            return {
                id: String(zone.zone_id),
                zone_id: zone.zone_id,
                name: zone.zone_name,
                district: zone.district,
                risk_level: zone.risk_level,
                polygon_coordinates: zone.polygon_coordinates,
                description: zone.description,
                typical_flood_months: zone.typical_flood_months,
                center: Array.isArray(coordinates) && typeof coordinates[0] === "number"
                    ? coordinates
                    : null,
                radius,
                depthCm,
                level,
                color,
                depthValue: depthCm / 100,
                depthLevel: level,
                bypassPosition: null,
                bypassOptions: []
            };
        });

        res.json({
            success: true,
            message: "Lấy dữ liệu vùng ngập lụt thành công",
            data
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu FloodZones:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
});

module.exports = router;
