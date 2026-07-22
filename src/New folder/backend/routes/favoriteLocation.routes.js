const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");
const { authenticateToken } = require("../middleware/auth");

// GET /api/favorite-locations - lấy danh sách địa điểm tự do đã lưu
router.get("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query(`SELECT favorite_id, name, address, latitude, longitude, note, created_at
                    FROM UserFavoritePlaces
                    WHERE user_id = @user_id AND favorite_type = 'custom'
                    ORDER BY created_at DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error("❌ Lỗi lấy địa điểm yêu thích:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
});

// POST /api/favorite-locations - lưu địa điểm mới
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { label, latitude, longitude, source_place_id } = req.body;
        if (!label || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin địa điểm." });
        }

        const pool = await poolPromise;
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("favorite_type", sql.NVarChar(50), "custom")
            .input("source", sql.NVarChar(100), source_place_id || "map_search")
            .input("latitude", sql.Decimal(9,6), latitude)
            .input("longitude", sql.Decimal(9,6), longitude)
            .input("name", sql.NVarChar(255), label)
            .query(`INSERT INTO UserFavoritePlaces (user_id, poi_id, favorite_type, source, latitude, longitude, name, created_at)
                    VALUES (@user_id, NULL, @favorite_type, @source, @latitude, @longitude, @name, GETDATE())`);

        res.status(201).json({ success: true, message: "Đã lưu địa điểm yêu thích!" });
    } catch (error) {
        console.error("❌ Lỗi lưu địa điểm yêu thích:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
});

// DELETE /api/favorite-locations/:id
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input("id", sql.Int, req.params.id)
            .input("user_id", sql.Int, req.user.id)
            .query(`DELETE FROM UserFavoritePlaces 
                    WHERE favorite_id = @id AND user_id = @user_id AND favorite_type = 'custom'`);
        res.json({ success: true, message: "Đã xoá địa điểm yêu thích." });
    } catch (error) {
        console.error("❌ Lỗi xoá địa điểm yêu thích:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
});

module.exports = router;