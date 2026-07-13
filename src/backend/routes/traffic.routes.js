const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/traffic-alerts - Lấy các cảnh báo giao thông đang hoạt động
router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ta.*, u.username as creator_name
            FROM TrafficAlerts ta
            LEFT JOIN Users u ON ta.created_by = u.user_id
            WHERE ta.is_active = 1
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
            affected_area_polygon: alert.affected_area_polygon,
            created_at: alert.created_at
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi lấy danh sách cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/traffic-alerts - Báo cáo cảnh báo giao thông mới (yêu cầu Token)
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            type,
            title,
            description,
            location,
            latitude,
            longitude,
            severity,
            event_id,
            affected_area_polygon
        } = req.body;

        if (!type || !title || latitude === undefined || longitude === undefined || !severity) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("created_by", sql.Int, req.user.id)
            .input("event_id", sql.Int, event_id || null)
            .input("alert_type", sql.NVarChar, type)
            .input("title", sql.NVarChar, title)
            .input("description", sql.NVarChar, description || null)
            .input("location_name", sql.NVarChar, location || null)
            .input("latitude", sql.Decimal(9, 6), parseFloat(latitude))
            .input("longitude", sql.Decimal(9, 6), parseFloat(longitude))
            .input("severity", sql.NVarChar, severity)
            .input("affected_area_polygon", sql.NVarChar, affected_area_polygon || null)
            .query(`
                INSERT INTO TrafficAlerts (
                    created_by, event_id, alert_type, title, description,
                    location_name, latitude, longitude, severity, affected_area_polygon, is_active, created_at, updated_at
                )
                OUTPUT INSERTED.alert_id
                VALUES (
                    @created_by, @event_id, @alert_type, @title, @description,
                    @location_name, @latitude, @longitude, @severity, @affected_area_polygon, 1, GETDATE(), GETDATE()
                )
            `);

        res.status(201).json({
            success: true,
            message: "Gửi báo cáo sự cố giao thông thành công!",
            alert_id: result.recordset[0].alert_id
        });
    } catch (error) {
        console.error("Lỗi gửi báo cáo sự cố giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
