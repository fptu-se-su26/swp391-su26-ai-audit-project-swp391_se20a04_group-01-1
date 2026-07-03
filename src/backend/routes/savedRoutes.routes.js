const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/saved-routes - Lưu lộ trình mới (Yêu cầu đăng nhập)
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            origin_name,
            origin_lat,
            origin_lng,
            destination_name,
            destination_lat,
            destination_lng,
            route_name,
            route_data,
            distance_meters,
            duration_seconds,
            profile,
            is_emergency
        } = req.body;

        if (origin_lat === undefined || origin_lng === undefined || destination_lat === undefined || destination_lng === undefined || !route_data) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin tọa độ hoặc dữ liệu lộ trình!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("origin_name", sql.NVarChar(255), origin_name || null)
            .input("origin_lat", sql.Decimal(9, 6), origin_lat)
            .input("origin_lng", sql.Decimal(9, 6), origin_lng)
            .input("destination_name", sql.NVarChar(255), destination_name || null)
            .input("destination_lat", sql.Decimal(9, 6), destination_lat)
            .input("destination_lng", sql.Decimal(9, 6), destination_lng)
            .input("route_name", sql.NVarChar(150), route_name || null)
            .input("route_data", sql.NVarChar(sql.MAX), route_data)
            .input("distance_meters", sql.Int, distance_meters || 0)
            .input("duration_seconds", sql.Int, duration_seconds || 0)
            .input("profile", sql.NVarChar(20), profile || 'driving')
            .input("is_emergency", sql.Bit, is_emergency ? 1 : 0)
            .query(`
                INSERT INTO SavedRoutes (
                    user_id, origin_name, origin_lat, origin_lng, 
                    destination_name, destination_lat, destination_lng, 
                    route_name, route_data, distance_meters, duration_seconds, 
                    profile, is_shared, is_emergency, created_at
                ) 
                OUTPUT INSERTED.*
                VALUES (
                    @user_id, @origin_name, @origin_lat, @origin_lng, 
                    @destination_name, @destination_lat, @destination_lng, 
                    @route_name, @route_data, @distance_meters, @duration_seconds, 
                    @profile, 0, @is_emergency, GETDATE()
                );
            `);

        res.status(201).json({ success: true, message: "Lưu lộ trình thành công!", route: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lưu lộ trình:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/saved-routes - Lấy danh sách lộ trình đã lưu của người dùng hiện tại (Yêu cầu đăng nhập)
router.get("/", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query(`
                SELECT * FROM SavedRoutes 
                WHERE user_id = @user_id 
                ORDER BY created_at DESC
            `);

        res.json({ success: true, routes: result.recordset });
    } catch (error) {
        console.error("Lỗi lấy danh sách lộ trình đã lưu:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/saved-routes/:id - Lấy chi tiết một lộ trình đã lưu (Yêu cầu đăng nhập)
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("route_id", sql.Int, parseInt(id))
            .input("user_id", sql.Int, req.user.id)
            .query(`
                SELECT * FROM SavedRoutes 
                WHERE route_id = @route_id AND user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền xem!" });
        }

        res.json({ success: true, route: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lấy chi tiết lộ trình:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/saved-routes/:id - Xóa một lộ trình đã lưu (Yêu cầu đăng nhập)
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("route_id", sql.Int, parseInt(id))
            .input("user_id", sql.Int, req.user.id)
            .query(`
                DELETE FROM SavedRoutes 
                WHERE route_id = @route_id AND user_id = @user_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền xóa!" });
        }

        res.json({ success: true, message: "Xóa lộ trình thành công!" });
    } catch (error) {
        console.error("Lỗi xóa lộ trình:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/saved-routes/:id/share - Tạo share token cho lộ trình đã lưu (Yêu cầu đăng nhập)
router.post("/:id/share", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const token = crypto.randomBytes(16).toString("hex");

        const pool = await poolPromise;
        const result = await pool.request()
            .input("route_id", sql.Int, parseInt(id))
            .input("user_id", sql.Int, req.user.id)
            .input("share_token", sql.NVarChar(100), token)
            .query(`
                UPDATE SavedRoutes
                SET is_shared = 1, share_token = @share_token
                OUTPUT INSERTED.share_token
                WHERE route_id = @route_id AND user_id = @user_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền chia sẻ!" });
        }

        res.json({ success: true, share_token: result.recordset[0].share_token });
    } catch (error) {
        console.error("Lỗi chia sẻ lộ trình đã lưu:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/saved-routes/share-direct - Chia sẻ trực tiếp lộ trình chưa lưu (Yêu cầu đăng nhập)
router.post("/share-direct", authenticateToken, async (req, res) => {
    try {
        const {
            origin_name,
            origin_lat,
            origin_lng,
            destination_name,
            destination_lat,
            destination_lng,
            route_name,
            route_data,
            distance_meters,
            duration_seconds,
            profile,
            is_emergency
        } = req.body;

        if (origin_lat === undefined || origin_lng === undefined || destination_lat === undefined || destination_lng === undefined || !route_data) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin tọa độ hoặc dữ liệu lộ trình!" });
        }

        const token = crypto.randomBytes(16).toString("hex");

        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("origin_name", sql.NVarChar(255), origin_name || null)
            .input("origin_lat", sql.Decimal(9, 6), origin_lat)
            .input("origin_lng", sql.Decimal(9, 6), origin_lng)
            .input("destination_name", sql.NVarChar(255), destination_name || null)
            .input("destination_lat", sql.Decimal(9, 6), destination_lat)
            .input("destination_lng", sql.Decimal(9, 6), destination_lng)
            .input("route_name", sql.NVarChar(150), route_name || "Lộ trình chia sẻ")
            .input("route_data", sql.NVarChar(sql.MAX), route_data)
            .input("distance_meters", sql.Int, distance_meters || 0)
            .input("duration_seconds", sql.Int, duration_seconds || 0)
            .input("profile", sql.NVarChar(20), profile || 'driving')
            .input("is_emergency", sql.Bit, is_emergency ? 1 : 0)
            .input("share_token", sql.NVarChar(100), token)
            .query(`
                INSERT INTO SavedRoutes (
                    user_id, origin_name, origin_lat, origin_lng, 
                    destination_name, destination_lat, destination_lng, 
                    route_name, route_data, distance_meters, duration_seconds, 
                    profile, is_shared, share_token, is_emergency, created_at
                ) 
                OUTPUT INSERTED.share_token
                VALUES (
                    @user_id, @origin_name, @origin_lat, @origin_lng, 
                    @destination_name, @destination_lat, @destination_lng, 
                    @route_name, @route_data, @distance_meters, @duration_seconds, 
                    @profile, 1, @share_token, @is_emergency, GETDATE()
                );
            `);

        res.status(201).json({ success: true, share_token: result.recordset[0].share_token });
    } catch (error) {
        console.error("Lỗi chia sẻ lộ trình trực tiếp:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
