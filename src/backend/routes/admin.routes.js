const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Apply admin role verification middleware to all routes in this router
router.use(authenticateToken);
router.use(authorizeRole('admin'));

// GET /api/admin/users - Lấy danh sách người dùng
router.get('/users', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT user_id, username, email, role, is_active, ban_reason, created_at, last_login_at
            FROM Users
            ORDER BY created_at DESC
        `);
        res.json({ message: "Lấy danh sách người dùng thành công!", data: result.recordset });
    } catch (error) {
        console.error("Admin get users error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// PUT /api/admin/users/:id/ban - Khóa tài khoản người dùng
router.put('/users/:id/ban', async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = parseInt(req.params.id, 10);
        
        if (isNaN(userId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
        }

        const result = await pool.request()
            .input('ban_reason', sql.NVarChar, req.body.ban_reason || 'Vi phạm chính sách')
            .input('user_id', sql.Int, userId)
            .query('UPDATE Users SET is_active = 0, ban_reason = @ban_reason WHERE user_id = @user_id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng này." });
        }

        res.json({ message: "Đã khóa tài khoản thành công" });
    } catch (error) {
        console.error("❌ LỖI SQL KHI KHÓA TÀI KHOẢN:", error);
        res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
});

// GET /api/admin/flood-zones - Lấy toàn bộ danh sách vùng ngập (Admin)
router.get('/flood-zones', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                zone_id,
                zone_name,
                district,
                risk_level,
                polygon_coordinates,
                description,
                typical_flood_months,
                is_active,
                last_updated,
                updated_by
            FROM FloodZones
            ORDER BY zone_id ASC
        `);

        const data = result.recordset.map((zone) => {
            let coordinates = null;
            try {
                coordinates = zone.polygon_coordinates
                    ? JSON.parse(zone.polygon_coordinates)
                    : null;
            } catch (error) {
                console.error("Lỗi parse polygon_coordinates:", zone.zone_name);
            }

            let depthCm = 8;
            let level = "low";
            let color = "yellow";
            let radius = 150;

            if (zone.risk_level === "High") {
                depthCm = zone.zone_name.includes("Nguyễn Văn Linh") ? 80 : 55;
                level = "high";
                color = "red";
                radius = 280;
            } else if (zone.risk_level === "Medium") {
                depthCm = zone.zone_name.includes("Tiên Sơn") ? 15 : 25;
                level = "medium";
                color = "orange";
                radius = 220;
            }

            return {
                id: zone.zone_id,
                zone_id: zone.zone_id,
                name: zone.zone_name,
                district: zone.district,
                risk_level: zone.risk_level,
                polygon_coordinates: zone.polygon_coordinates,
                description: zone.description,
                typical_flood_months: zone.typical_flood_months,
                is_active: zone.is_active,
                last_updated: zone.last_updated ? zone.last_updated.toISOString().split('T')[0] : '',
                updated_by: zone.updated_by,
                center: Array.isArray(coordinates) && typeof coordinates[0] === "number"
                    ? coordinates
                    : null,
                radius,
                depthCm,
                level,
                color,
                depthValue: depthCm / 100,
                depthLevel: level,
                bypassPosition: null,
                bypassOptions: []
            };
        });

        res.json({
            success: true,
            message: "Lấy tất cả vùng ngập lụt thành công",
            data
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu FloodZones cho admin:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// PUT /api/admin/flood-zones/:id - Cập nhật trạng thái vùng ngập (Admin)
router.put('/flood-zones/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const zoneId = parseInt(req.params.id, 10);
        if (isNaN(zoneId)) {
            return res.status(400).json({ success: false, message: "ID vùng ngập lụt không hợp lệ!" });
        }
        
        const { is_active } = req.body;
        if (is_active === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu trạng thái is_active!" });
        }

        const activeBit = is_active ? 1 : 0;
        const updatedBy = req.user.id;

        await pool.request()
            .input('is_active', sql.Bit, activeBit)
            .input('updated_by', sql.Int, updatedBy)
            .input('zone_id', sql.Int, zoneId)
            .query(`
                UPDATE FloodZones 
                SET is_active = @is_active, 
                    last_updated = GETDATE(), 
                    updated_by = @updated_by 
                WHERE zone_id = @zone_id
            `);

        res.json({
            success: true,
            message: "Cập nhật trạng thái vùng ngập lụt thành công!"
        });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái FloodZone:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/admin/traffic-alerts - Lấy toàn bộ danh sách cảnh báo giao thông (Admin)
router.get('/traffic-alerts', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ta.*, u.username as creator_name
            FROM TrafficAlerts ta
            LEFT JOIN Users u ON ta.created_by = u.user_id
            ORDER BY ta.created_at DESC
        `);

        const data = result.recordset.map(alert => ({
            id: alert.alert_id,
            title: alert.title,
            description: alert.description,
            location: alert.location_name,
            latitude: parseFloat(alert.latitude),
            longitude: parseFloat(alert.longitude),
            type: alert.alert_type,
            severity: alert.severity,
            is_active: alert.is_active === 1 || alert.is_active === true,
            created_by: alert.created_by,
            creator_name: alert.creator_name,
            created_at: alert.created_at
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi lấy toàn bộ danh sách cảnh báo giao thông (Admin):", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// PUT /api/admin/traffic-alerts/:id/toggle - Bật/tắt trạng thái cảnh báo giao thông (Admin)
router.put('/traffic-alerts/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (is_active === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin is_active!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("alert_id", sql.Int, parseInt(id))
            .input("is_active", sql.Bit, is_active ? 1 : 0)
            .query(`
                UPDATE TrafficAlerts
                SET is_active = @is_active, updated_at = GETDATE()
                WHERE alert_id = @alert_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy cảnh báo giao thông cần cập nhật!" });
        }

        res.json({ success: true, message: "Cập nhật trạng thái cảnh báo giao thông thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/admin/traffic-alerts/:id - Xóa cảnh báo giao thông (Admin)
router.delete('/traffic-alerts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("alert_id", sql.Int, parseInt(id))
            .query(`
                DELETE FROM TrafficAlerts
                WHERE alert_id = @alert_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy cảnh báo giao thông cần xóa!" });
        }

        res.json({ success: true, message: "Xóa cảnh báo giao thông thành công!" });
    } catch (error) {
        console.error("Lỗi xóa cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/admin/notifications/test-flood - Chạy flood alert job thủ công (Admin)
router.post('/notifications/test-flood', async (req, res) => {
    try {
        const { runFloodAlertJob } = require('../schedulerService');
        await runFloodAlertJob();
        res.json({ success: true, message: 'Đã kích hoạt flood alert job thủ công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi chạy job', error: error.message });
    }
});

module.exports = router;
