const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/pois - Lấy danh sách tất cả POIs (có thể lọc theo category)
router.get("/", async (req, res) => {
    try {
        const { category_id } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT 
                p.poi_id,
                p.name,
                p.latitude,
                p.longitude,
                p.address,
                p.description,
                p.image_url,
                p.website_url,
                p.phone_number,
                p.rating,
                p.is_featured,
                p.is_active,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color_code AS category_color
            FROM POIs p
            LEFT JOIN POIsCategories c ON p.category_id = c.id
            WHERE p.is_active = 1
        `;

        const request = pool.request();

        if (category_id) {
            query += ` AND p.category_id = @category_id`;
            request.input("category_id", sql.Int, parseInt(category_id));
        }

        query += ` ORDER BY p.is_featured DESC, p.rating DESC`;

        const result = await request.query(query);

        res.json({
            message: "Lấy danh sách POI thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu POIs:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/pois/:id/favorite - Toggle favorite status
router.post("/:id/favorite", authenticateToken, async (req, res) => {
    try {
        const poi_id = parseInt(req.params.id);
        if (isNaN(poi_id)) {
            return res.status(400).json({ success: false, message: "ID địa điểm không hợp lệ!" });
        }

        const pool = await poolPromise;
        
        // Check if POI exists
        const poiCheck = await pool.request()
            .input("poi_id", sql.Int, poi_id)
            .query("SELECT poi_id FROM POIs WHERE poi_id = @poi_id AND is_active = 1");
            
        if (poiCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Địa điểm không tồn tại hoặc không hoạt động!" });
        }

        // Check if already favorited
        const favCheck = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("poi_id", sql.Int, poi_id)
            .query("SELECT 1 FROM UserFavoritePOIs WHERE user_id = @user_id AND poi_id = @poi_id");

        let isFavorite = false;
        if (favCheck.recordset.length > 0) {
            // Unfavorite
            await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .input("poi_id", sql.Int, poi_id)
                .query("DELETE FROM UserFavoritePOIs WHERE user_id = @user_id AND poi_id = @poi_id");
            isFavorite = false;
        } else {
            // Favorite
            await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .input("poi_id", sql.Int, poi_id)
                .query("INSERT INTO UserFavoritePOIs (user_id, poi_id, saved_at) VALUES (@user_id, @poi_id, GETDATE())");
            isFavorite = true;
        }

        res.json({
            success: true,
            message: isFavorite ? "Lưu địa điểm thành công!" : "Bỏ lưu địa điểm thành công!",
            isFavorite
        });
    } catch (error) {
        console.error("❌ Lỗi toggle yêu thích địa điểm:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật yêu thích", error: error.message });
    }
});

module.exports = router;
