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

module.exports = router;
