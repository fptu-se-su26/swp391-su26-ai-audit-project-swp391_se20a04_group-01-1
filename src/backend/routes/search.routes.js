const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');

// GET /api/search/places?query=... - Tìm kiếm địa điểm (POI) theo tên hoặc địa chỉ
router.get("/places", async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json({ message: "Từ khóa quá ngắn", data: [] });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input("keyword", sql.NVarChar, `%${query.trim()}%`)
            .query(`
                SELECT TOP 10
                    p.poi_id,
                    p.name,
                    p.latitude,
                    p.longitude,
                    p.address,
                    c.name AS category_name
                FROM POIs p
                LEFT JOIN POIsCategories c ON p.category_id = c.id
                WHERE p.is_active = 1
                  AND (p.name LIKE @keyword OR p.address LIKE @keyword)
                ORDER BY p.is_featured DESC, p.rating DESC
            `);

        // Định dạng lại dữ liệu cho đúng cấu trúc mà frontend đang mong đợi
        // (SearchInputs / useSearchController: item.lng, item.lat, item.place_name)
        const data = result.recordset.map((poi) => ({
            poi_id: poi.poi_id,
            name: poi.name,
            place_name: poi.address ? `${poi.name} - ${poi.address}` : poi.name,
            lat: poi.latitude,
            lng: poi.longitude,
            category_name: poi.category_name,
        }));

        res.json({
            message: "Tìm kiếm địa điểm thành công!",
            data,
        });
    } catch (error) {
        console.error("Lỗi tìm kiếm địa điểm:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
