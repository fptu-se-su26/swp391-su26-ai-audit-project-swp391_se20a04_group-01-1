const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 1. POST /api/location/share - Khởi tạo phiên chia sẻ vị trí trực tiếp (Yêu cầu đăng nhập)
router.post("/share", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const shareToken = crypto.randomBytes(16).toString('hex');
        
        // Mặc định hết hạn sau 2 giờ chia sẻ liên tục
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2);

        const pool = await poolPromise;
        await pool.request()
            .input("user_id", sql.Int, userId)
            .input("share_token", sql.NVarChar(100), shareToken)
            .input("expires_at", sql.DateTime, expiresAt)
            .query(`
                INSERT INTO LiveLocationShares (user_id, share_token, is_active, expires_at, created_at, updated_at)
                VALUES (@user_id, @share_token, 1, @expires_at, GETDATE(), GETDATE())
            `);

        res.json({
            success: true,
            share_token: shareToken,
            expires_at: expiresAt,
            message: "Đã kích hoạt chia sẻ vị trí trực tiếp!"
        });
    } catch (error) {
        console.error("Lỗi khởi tạo chia sẻ vị trí:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// 2. POST /api/location/stop - Dừng phiên chia sẻ vị trí trực tiếp (Yêu cầu đăng nhập)
router.post("/stop", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { share_token } = req.body;

        if (!share_token) {
            return res.status(400).json({ success: false, message: "Thiếu share_token!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, userId)
            .input("share_token", sql.NVarChar(100), share_token)
            .query(`
                UPDATE LiveLocationShares
                SET is_active = 0, updated_at = GETDATE()
                WHERE share_token = @share_token AND user_id = @user_id AND is_active = 1
            `);

        if (result.rowsAffected[0] > 0) {
            // Phát tín hiệu dừng phiên tới người theo dõi qua Socket.io
            if (req.io) {
                req.io.to(share_token).emit("session-ended", { shareToken: share_token });
            }
            res.json({ success: true, message: "Đã dừng chia sẻ vị trí." });
        } else {
            res.status(404).json({ success: false, message: "Không tìm thấy phiên chia sẻ đang hoạt động." });
        }
    } catch (error) {
        console.error("Lỗi dừng chia sẻ vị trí:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// 3. GET /api/location/status/:token - Lấy trạng thái vị trí mới nhất của phiên chia sẻ (Không cần đăng nhập)
router.get("/status/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("share_token", sql.NVarChar(100), token)
            .query(`
                SELECT TOP 1 l.*, u.username, u.avatar_url
                FROM LiveLocationShares l
                INNER JOIN Users u ON l.user_id = u.user_id
                WHERE l.share_token = @share_token AND l.is_active = 1 AND l.expires_at > GETDATE()
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Liên kết chia sẻ vị trí không tồn tại, đã dừng hoặc đã hết hạn!"
            });
        }

        const session = result.recordset[0];
        res.json({
            success: true,
            session: {
                share_id: session.share_id,
                share_token: session.share_token,
                current_lat: session.current_lat,
                current_lng: session.current_lng,
                expires_at: session.expires_at,
                username: session.username,
                avatar_url: session.avatar_url,
                updated_at: session.updated_at
            }
        });
    } catch (error) {
        console.error("Lỗi lấy vị trí chia sẻ:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
