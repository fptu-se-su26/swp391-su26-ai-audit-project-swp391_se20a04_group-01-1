const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');

const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { isValidPassword, formatDateTime } = require('../utils/helpers');

// GET /api/user/profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT user_id, username, email, role, created_at, last_login_at, password_hash, avatar_url FROM Users WHERE user_id = @user_id");

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
            has_password: user.password_hash ? true : false,
            avatar_url: user.avatar_url
        };

        res.json({ message: "Lấy dữ liệu thành công!", data: formattedUser });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// PUT /api/user/profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const body = req.body || {};
        const username = body.username; 

        if (!username || username.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: "Tên hiển thị không được để trống!" 
            });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username phải có ít nhất 3 ký tự!"
            });
        }

        const userId = req.user.id;
        let avatarUrl = null;

        if (body.avatar) {
            const base64Data = body.avatar;
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            
            if (matches && matches.length === 3) {
                const imageType = matches[1]; 
                const base64Content = matches[2];
                
                // 1. KIỂM TRA BẢO MẬT: Chỉ cho phép định dạng an toàn (MIME type)
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(imageType)) {
                    return res.status(400).json({ success: false, message: "Chỉ cho phép tải lên ảnh định dạng JPG, PNG, hoặc WEBP!" });
                }

                const buffer = Buffer.from(base64Content, 'base64');
                
                // 2. KIỂM TRA DUNG LƯỢNG: Giới hạn tối đa 2MB (2 * 1024 * 1024 bytes)
                if (buffer.length > 2 * 1024 * 1024) {
                    return res.status(400).json({ success: false, message: "Dung lượng ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB." });
                }
                
                let ext = imageType.split('/')[1];
                if (ext === 'jpeg') ext = 'jpg';

                // 3. ĐỔI TÊN TỰ ĐỘNG: Định danh người dùng rõ ràng cho Admin dễ quản lý
                const filename = `user_${userId}_avatar_${Date.now()}.${ext}`;
                
                const fs = require('fs');
                // Lùi 1 cấp từ routes ra backend, vào thư mục uploads
                const uploadsDir = path.join(__dirname, '..', 'uploads'); 
                
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const filePath = path.join(uploadsDir, filename);
                fs.writeFileSync(filePath, buffer);
                
                // Đường dẫn này sẽ được lưu vào DB và trả về Frontend
                avatarUrl = `/uploads/${filename}`;
            } else {
                return res.status(400).json({ success: false, message: "Định dạng ảnh không hợp lệ!" });
            }
        }

        const pool = await poolPromise;
        const request = pool.request();
        request.input("user_id", sql.Int, userId);
        request.input("username", sql.NVarChar, trimmedUsername);

        let query = "UPDATE Users SET username = @username";
        if (avatarUrl) {
            query += ", avatar_url = @avatar_url";
            request.input("avatar_url", sql.NVarChar, avatarUrl);
        }
        query += " WHERE user_id = @user_id";

        await request.query(query);

        console.log(`[USER] Profile updated for user: ${userId}`);
        res.json({ success: true, message: "Cập nhật hồ sơ thành công!", avatar_url: avatarUrl });
    } catch (error) {
        console.error("❌ Lỗi cập nhật hồ sơ:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật", error: error.message });
    }
});

// PUT /api/user/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT password_hash FROM Users WHERE user_id = @user_id");

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        if (user.password_hash) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại!" });
            }
            if (currentPassword === newPassword) {
                return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại!" });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) {
                console.warn(`[AUTH SECURITY] Failed change-password attempt for user: ${req.user.id}`);
                return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác!" });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("password_hash", sql.NVarChar, hashedPassword)
            .query("UPDATE Users SET password_hash = @password_hash WHERE user_id = @user_id");

        console.log(`[AUTH] Password changed/created for user: ${req.user.id}`);
        res.json({ message: user.password_hash ? "Đổi mật khẩu thành công!" : "Tạo mật khẩu thành công!" });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// GET /api/user/preferences
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        let result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT avoid_floods, avoid_congestion, show_traffic_layer, show_restricted_roads, enable_buffer_alerts, default_travel_mode FROM UsersPreferences WHERE user_id = @user_id");

        if (result.recordset.length === 0) {
            await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .query(`
                    INSERT INTO UsersPreferences (user_id, avoid_floods, avoid_congestion, show_traffic_layer, show_restricted_roads, enable_buffer_alerts, default_travel_mode)
                    VALUES (@user_id, 0, 0, 0, 1, 1, 'driving')
                `);
            
            result = await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .query("SELECT avoid_floods, avoid_congestion, show_traffic_layer, show_restricted_roads, enable_buffer_alerts, default_travel_mode FROM UsersPreferences WHERE user_id = @user_id");
        }

        const prefs = result.recordset[0];
        const formattedPrefs = {
            avoid_floods: !!prefs.avoid_floods,
            avoid_congestion: !!prefs.avoid_congestion,
            show_traffic_layer: !!prefs.show_traffic_layer,
            show_restricted_roads: !!prefs.show_restricted_roads,
            enable_buffer_alerts: !!prefs.enable_buffer_alerts,
            default_travel_mode: prefs.default_travel_mode
        };

        res.json({ success: true, message: "Lấy cấu hình thành công!", data: formattedPrefs });
    } catch (error) {
        console.error("❌ Lỗi lấy cấu hình:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi lấy cấu hình", error: error.message });
    }
});

// PUT /api/user/preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const {
            avoid_floods,
            avoid_congestion,
            show_traffic_layer,
            show_restricted_roads,
            enable_buffer_alerts,
            default_travel_mode
        } = req.body;

        const pool = await poolPromise;

        // Dùng số nguyên 1/0 thay vì boolean để tránh bug sql.Bit với false
        const toBit = (val) => (val !== undefined && val !== null) ? (val ? 1 : 0) : null;

        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("avoid_floods", sql.Int, toBit(avoid_floods))
            .input("avoid_congestion", sql.Int, toBit(avoid_congestion))
            .input("show_traffic_layer", sql.Int, toBit(show_traffic_layer))
            .input("show_restricted_roads", sql.Int, toBit(show_restricted_roads))
            .input("enable_buffer_alerts", sql.Int, toBit(enable_buffer_alerts))
            .input("default_travel_mode", sql.NVarChar(20), default_travel_mode || null)
            .query(`
                MERGE INTO UsersPreferences AS target
                USING (SELECT @user_id AS user_id) AS source
                ON target.user_id = source.user_id
                WHEN MATCHED THEN
                    UPDATE SET 
                        avoid_floods = COALESCE(@avoid_floods, target.avoid_floods),
                        avoid_congestion = COALESCE(@avoid_congestion, target.avoid_congestion),
                        show_traffic_layer = COALESCE(@show_traffic_layer, target.show_traffic_layer),
                        show_restricted_roads = COALESCE(@show_restricted_roads, target.show_restricted_roads),
                        enable_buffer_alerts = COALESCE(@enable_buffer_alerts, target.enable_buffer_alerts),
                        default_travel_mode = COALESCE(@default_travel_mode, target.default_travel_mode),
                        updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (user_id, avoid_floods, avoid_congestion, show_traffic_layer, show_restricted_roads, enable_buffer_alerts, default_travel_mode, updated_at)
                    VALUES (
                        @user_id, 
                        COALESCE(@avoid_floods, 0), 
                        COALESCE(@avoid_congestion, 0), 
                        COALESCE(@show_traffic_layer, 0), 
                        COALESCE(@show_restricted_roads, 1), 
                        COALESCE(@enable_buffer_alerts, 1), 
                        COALESCE(@default_travel_mode, 'driving'),
                        GETDATE()
                    );
            `);

        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT avoid_floods, avoid_congestion, show_traffic_layer, show_restricted_roads, enable_buffer_alerts, default_travel_mode FROM UsersPreferences WHERE user_id = @user_id");

        const prefs = result.recordset[0];
        const formattedPrefs = {
            avoid_floods: !!prefs.avoid_floods,
            avoid_congestion: !!prefs.avoid_congestion,
            show_traffic_layer: !!prefs.show_traffic_layer,
            show_restricted_roads: !!prefs.show_restricted_roads,
            enable_buffer_alerts: !!prefs.enable_buffer_alerts,
            default_travel_mode: prefs.default_travel_mode
        };

        res.json({ success: true, message: "Cập nhật cấu hình thành công!", data: formattedPrefs });
    } catch (error) {
        console.error("❌ Lỗi cập nhật cấu hình:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật cấu hình", error: error.message });
    }
});

// GET /api/user/favorites/pois
router.get('/favorites/pois', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT poi_id FROM UserFavoritePOIs WHERE user_id = @user_id");

        const favoriteIds = result.recordset.map(item => item.poi_id);
        res.json({ success: true, message: "Lấy danh sách ID địa điểm yêu thích thành công!", data: favoriteIds });
    } catch (error) {
        console.error("❌ Lỗi lấy ID địa điểm yêu thích:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
});

// GET /api/user/favorites/pois/details
router.get('/favorites/pois/details', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query(`
                SELECT p.poi_id, p.name, p.latitude, p.longitude, p.address, p.description, 
                       p.image_url, p.website_url, p.phone_number, p.rating, p.is_featured,
                       c.name AS category_name, c.icon AS category_icon, c.color_code AS category_color
                FROM UserFavoritePOIs uf
                JOIN POIs p ON uf.poi_id = p.poi_id
                LEFT JOIN POIsCategories c ON p.category_id = c.id
                WHERE uf.user_id = @user_id AND p.is_active = 1
                ORDER BY uf.saved_at DESC
            `);

        res.json({ success: true, message: "Lấy chi tiết địa điểm yêu thích thành công!", data: result.recordset });
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách địa điểm yêu thích:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
});

// GET /api/user/favorites/events
router.get('/favorites/events', authenticateToken, async (req, res) => {
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
});

// GET /api/user/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const onlyUnread = req.query.unread === 'true';

        let query = `
            SELECT TOP ${limit + offset}
                n.notification_id, n.type, n.title, n.message,
                n.is_read, n.created_at, n.event_id, n.alert_id,
                e.title AS event_title, e.start_time AS event_start_time
            FROM Notifications n
            LEFT JOIN Events e ON n.event_id = e.event_id
            WHERE n.user_id = @user_id
        `;
        if (onlyUnread) query += ' AND n.is_read = 0';
        query += ' ORDER BY n.created_at DESC';

        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query(query);

        const paged = result.recordset.slice(offset, offset + limit);

        let countQuery = `SELECT COUNT(*) AS total FROM Notifications WHERE user_id = @user_id`;
        if (onlyUnread) countQuery += ' AND is_read = 0';
        const countResult = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query(countQuery);
        const total = countResult.recordset[0].total;

        res.json({
            success: true,
            data: paged,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Lỗi lấy notifications:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// GET /api/user/notifications/unread-count
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query(`SELECT COUNT(*) AS count FROM Notifications WHERE user_id = @user_id AND is_read = 0`);
        res.json({ success: true, count: result.recordset[0].count });
    } catch (error) {
        console.error('Lỗi đếm unread notifications:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// PUT /api/user/notifications/:id/read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('notification_id', sql.Int, parseInt(req.params.id))
            .input('user_id', sql.Int, req.user.id)
            .query(`UPDATE Notifications SET is_read = 1 WHERE notification_id = @notification_id AND user_id = @user_id`);
        res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        console.error('Lỗi đánh dấu đã đọc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// PUT /api/user/notifications/read-all
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query(`UPDATE Notifications SET is_read = 1 WHERE user_id = @user_id AND is_read = 0`);
        res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
    } catch (error) {
        console.error('Lỗi đánh dấu tất cả đã đọc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

// POST /api/user/notifications/test
router.post('/notifications/test', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('type', sql.NVarChar, 'system')
            .input('title', sql.NVarChar, '🔔 Thông báo kiểm tra')
            .input('message', sql.NVarChar, 'Hệ thống thông báo đang hoạt động bình thường. Bạn sẽ nhận được các cảnh báo ngập lụt và nhắc nhở sự kiện tại đây.')
            .query(`
                INSERT INTO Notifications (user_id, type, title, message, is_read, created_at)
                VALUES (@user_id, @type, @title, @message, 0, GETDATE())
            `);
        res.json({ success: true, message: 'Đã gửi thông báo kiểm tra!' });
    } catch (error) {
        console.error('Lỗi gửi thông báo kiểm tra:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;