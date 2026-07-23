const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');

// GET /api/poi-categories - Lấy danh sách tất cả POI categories
router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(
            "SELECT id, name, icon, color_code, description FROM POIsCategories ORDER BY id"
        );

        res.json({
            message: "Lấy danh sách POI categories thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu POIsCategories:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
