const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');

// GET /api/event-categories - Lấy danh sách danh mục sự kiện
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(
            "SELECT category_id, name, icon, color_code, description FROM EventCategories ORDER BY category_id"
        );
        res.json({
            message: "Lấy danh sách danh mục sự kiện thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy danh mục sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
