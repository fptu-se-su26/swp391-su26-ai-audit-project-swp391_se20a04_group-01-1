const { sql, poolPromise } = require("../db");
const { formatDateTime } = require("../utils/helpers");

// GET /api/user/profile
const getProfile = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT user_id, username, email, role, created_at, last_login_at, password_hash FROM Users WHERE user_id = @user_id");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        const user = result.recordset[0];
        const formattedUser = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: formatDateTime(user.created_at),
            last_login_at: user.last_login_at ? formatDateTime(user.last_login_at) : "Chưa đăng nhập",
            has_password: user.password_hash ? true : false
        };

        res.json({ message: "Lấy dữ liệu thành công!", data: formattedUser });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// ============ CẬP NHẬT HỒ SƠ (v1 - dòng 531 file gốc) ============
const updateProfile = async (req, res) => {
    try {
        const body = req.body || {};
        const username = body.username;

        if (!username || username.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Tên hiển thị không được để trống!"
            });
        }

        const pool = await poolPromise;
        const trimmedUsername = username.trim();

        // Cập nhật tên thẳng vào Database (Không cần kiểm tra trùng lặp nữa)
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("username", sql.NVarChar, trimmedUsername)
            .query(`
                UPDATE Users 
                SET username = @username 
                WHERE user_id = @user_id
            `);

        res.json({ success: true, message: "Cập nhật hồ sơ thành công!" });
    } catch (error) {
        console.error("❌ Lỗi cập nhật hồ sơ:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật", error: error.message });
    }
};

// ============ CẬP NHẬT PROFILE (v2 - dòng 743 file gốc, route trùng) ============
const updateProfileV2 = async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username) return res.status(400).json({ message: "Vui lòng nhập username!" });
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) return res.status(400).json({ message: "Username phải có ít nhất 3 ký tự!" });

        const pool = await poolPromise;
        await pool
            .request()
            .input("user_id", sql.Int, userId)
            .input("username", sql.NVarChar, trimmedUsername)
            .query("UPDATE Users SET username = @username WHERE user_id = @user_id");

        console.log(`[USER] Profile updated for user: ${userId}`);
        res.json({ message: "Cập nhật profile thành công!" });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// GET /api/user/favorites/events
const getFavoriteEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, userId)
            .query("SELECT event_id FROM UserFavoriteEvents WHERE user_id = @user_id");

        const favoriteIds = result.recordset.map(item => item.event_id);
        res.json({
            message: "Lấy danh sách sự kiện yêu thích thành công!",
            data: favoriteIds
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách yêu thích sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// ============ SAVED ROUTES & SHARING ============

// POST /api/saved-routes
const createSavedRoute = async (req, res) => {
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
};

// GET /api/saved-routes
const getSavedRoutes = async (req, res) => {
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
};

// GET /api/saved-routes/:id
const getSavedRouteById = async (req, res) => {
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
};

// DELETE /api/saved-routes/:id
const deleteSavedRoute = async (req, res) => {
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
};

// POST /api/saved-routes/:id/share
const shareSavedRoute = async (req, res) => {
    try {
        const { id } = req.params;
        const crypto = require("crypto");
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
};

// POST /api/saved-routes/share-direct
const shareDirectRoute = async (req, res) => {
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

        const crypto = require("crypto");
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
};

// GET /api/routes/share/:token (public, không cần token)
const getSharedRoute = async (req, res) => {
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
};

module.exports = {
    getProfile,
    updateProfile,
    updateProfileV2,
    getFavoriteEvents,
    createSavedRoute,
    getSavedRoutes,
    getSavedRouteById,
    deleteSavedRoute,
    shareSavedRoute,
    shareDirectRoute,
    getSharedRoute
};