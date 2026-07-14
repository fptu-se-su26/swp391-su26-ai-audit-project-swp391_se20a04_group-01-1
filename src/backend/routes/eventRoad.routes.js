const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const parseTimeToDate = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
};

// GET /api/event-roads - Lấy danh sách đường cấm/hạn chế do sự kiện
router.get("/", async (req, res) => {
    try {
        const { event_id, active_only, approved_only } = req.query;
        const pool = await poolPromise;
        let query = `
            SELECT 
                r.road_id,
                r.event_id,
                e.title AS event_title,
                e.status AS event_status,
                r.road_name,
                r.restriction_type,
                r.restriction_start,
                r.restriction_end,
                r.polyline_encoded,
                r.geojson_coords,
                r.description,
                r.created_at,
                r.bypass_coords,
                r.days_of_week,
                CONVERT(VARCHAR(8), r.start_time_of_day, 108) AS start_time_of_day,
                CONVERT(VARCHAR(8), r.end_time_of_day, 108) AS end_time_of_day
            FROM EventRoad r
            LEFT JOIN Events e ON r.event_id = e.event_id
            WHERE 1=1
        `;

        const request = pool.request();

        if (event_id) {
            query += " AND r.event_id = @event_id";
            request.input("event_id", sql.Int, parseInt(event_id));
        }

        if (approved_only === "true") {
            query += " AND e.status = 'approved'";
        }

        if (active_only === "true") {
            query += " AND r.restriction_start <= GETDATE() AND r.restriction_end >= GETDATE()";
        }

        query += " ORDER BY r.restriction_start ASC";

        const result = await request.query(query);

        // Parse JSON strings to objects/arrays for geojson fields
        let formattedData = result.recordset.map(item => {
            let geojson = null;
            let bypass = null;
            try {
                if (item.geojson_coords) {
                    geojson = JSON.parse(item.geojson_coords);
                }
            } catch (e) {
                console.error("Lỗi parse geojson_coords của road_id:", item.road_id, e.message);
            }
            try {
                if (item.bypass_coords) {
                    bypass = JSON.parse(item.bypass_coords);
                }
            } catch (e) {
                console.error("Lỗi parse bypass_coords của road_id:", item.road_id, e.message);
            }
            return {
                ...item,
                geojson_coords: geojson,
                bypass_coords: bypass
            };
        });

        // Nếu yêu cầu lọc các tuyến đường đang thực sự bị cấm tại thời điểm này
        if (active_only === "true") {
            const now = new Date();
            const currentDay = now.getDay(); // 0: CN, 1: T2, ..., 6: T7
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            formattedData = formattedData.filter(road => {
                if (road.days_of_week) {
                    const days = road.days_of_week.split(',').map(d => parseInt(d.trim()));
                    if (!days.includes(currentDay)) {
                        return false; // Không trùng ngày trong tuần
                    }
                }

                if (road.start_time_of_day && road.end_time_of_day) {
                    const parseTimeToMinutes = (timeStr) => {
                        const parts = timeStr.split(':');
                        return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
                    };
                    const startMin = parseTimeToMinutes(road.start_time_of_day);
                    const endMin = parseTimeToMinutes(road.end_time_of_day);

                    return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
                }

                return true;
            });
        }

        res.json({
            success: true,
            message: "Lấy danh sách đường hạn chế thành công!",
            data: formattedData
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/event-roads - Thêm mới một đoạn đường cấm/hạn chế
router.post("/", authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const {
            event_id,
            road_name,
            restriction_type,
            restriction_start,
            restriction_end,
            polyline_encoded,
            geojson_coords,
            description,
            bypass_coords,
            days_of_week,
            start_time_of_day,
            end_time_of_day
        } = req.body;

        if (!event_id || !road_name || !restriction_type || !restriction_start || !restriction_end) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc!" });
        }

        const geojsonStr = typeof geojson_coords === "object" ? JSON.stringify(geojson_coords) : geojson_coords || null;
        const bypassStr = typeof bypass_coords === "object" ? JSON.stringify(bypass_coords) : bypass_coords || null;

        const pool = await poolPromise;
        await pool.request()
            .input("event_id", sql.Int, event_id)
            .input("road_name", sql.NVarChar, road_name)
            .input("restriction_type", sql.NVarChar, restriction_type)
            .input("restriction_start", sql.DateTime, restriction_start)
            .input("restriction_end", sql.DateTime, restriction_end)
            .input("polyline_encoded", sql.NVarChar, polyline_encoded || null)
            .input("geojson_coords", sql.NVarChar, geojsonStr)
            .input("description", sql.NVarChar, description || null)
            .input("bypass_coords", sql.NVarChar, bypassStr)
            .input("days_of_week", sql.NVarChar, days_of_week || null)
            .input("start_time_of_day", sql.Time, parseTimeToDate(start_time_of_day))
            .input("end_time_of_day", sql.Time, parseTimeToDate(end_time_of_day))
            .query(`
                INSERT INTO EventRoad (
                    event_id, road_name, restriction_type, restriction_start, restriction_end,
                    polyline_encoded, geojson_coords, description, created_at, bypass_coords,
                    days_of_week, start_time_of_day, end_time_of_day
                )
                VALUES (
                    @event_id, @road_name, @restriction_type, @restriction_start, @restriction_end,
                    @polyline_encoded, @geojson_coords, @description, GETDATE(), @bypass_coords,
                    @days_of_week, @start_time_of_day, @end_time_of_day
                )
            `);

        res.status(201).json({ success: true, message: "Thêm đường hạn chế thành công!" });
    } catch (error) {
        console.error("Lỗi thêm đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// PUT /api/event-roads/:id - Cập nhật thông tin đường cấm/hạn chế
router.put("/:id", authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            event_id,
            road_name,
            restriction_type,
            restriction_start,
            restriction_end,
            polyline_encoded,
            geojson_coords,
            description,
            bypass_coords,
            days_of_week,
            start_time_of_day,
            end_time_of_day
        } = req.body;

        if (!event_id || !road_name || !restriction_type || !restriction_start || !restriction_end) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc!" });
        }

        const geojsonStr = typeof geojson_coords === "object" ? JSON.stringify(geojson_coords) : geojson_coords || null;
        const bypassStr = typeof bypass_coords === "object" ? JSON.stringify(bypass_coords) : bypass_coords || null;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("road_id", sql.Int, parseInt(id))
            .input("event_id", sql.Int, event_id)
            .input("road_name", sql.NVarChar, road_name)
            .input("restriction_type", sql.NVarChar, restriction_type)
            .input("restriction_start", sql.DateTime, restriction_start)
            .input("restriction_end", sql.DateTime, restriction_end)
            .input("polyline_encoded", sql.NVarChar, polyline_encoded || null)
            .input("geojson_coords", sql.NVarChar, geojsonStr)
            .input("description", sql.NVarChar, description || null)
            .input("bypass_coords", sql.NVarChar, bypassStr)
            .input("days_of_week", sql.NVarChar, days_of_week || null)
            .input("start_time_of_day", sql.Time, parseTimeToDate(start_time_of_day))
            .input("end_time_of_day", sql.Time, parseTimeToDate(end_time_of_day))
            .query(`
                UPDATE EventRoad
                SET 
                    event_id = @event_id,
                    road_name = @road_name,
                    restriction_type = @restriction_type,
                    restriction_start = @restriction_start,
                    restriction_end = @restriction_end,
                    polyline_encoded = @polyline_encoded,
                    geojson_coords = @geojson_coords,
                    description = @description,
                    bypass_coords = @bypass_coords,
                    days_of_week = @days_of_week,
                    start_time_of_day = @start_time_of_day,
                    end_time_of_day = @end_time_of_day
                WHERE road_id = @road_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đường hạn chế cần cập nhật!" });
        }

        res.json({ success: true, message: "Cập nhật đường hạn chế thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/event-roads/:id - Xóa đường cấm/hạn chế
router.delete("/:id", authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("road_id", sql.Int, parseInt(id))
            .query("DELETE FROM EventRoad WHERE road_id = @road_id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đường hạn chế cần xóa!" });
        }

        res.json({ success: true, message: "Xóa đường hạn chế thành công!" });
    } catch (error) {
        console.error("Lỗi xóa đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
