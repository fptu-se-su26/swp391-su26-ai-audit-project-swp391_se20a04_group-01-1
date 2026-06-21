const { sql, poolPromise } = require("../db");
const { parseTimeToDate } = require("../utils/helpers");

// GET /api/events
const getEvents = async (req, res) => {
    try {
        const { status } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT 
                e.event_id, 
                e.category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color_code AS category_color,
                e.title, 
                e.short_description,
                e.description, 
                e.location_name,
                e.latitude,
                e.longitude,
                e.address,
                e.district,
                e.start_time, 
                e.end_time,
                e.banner_url,
                e.thumbnail_url,
                e.status,
                e.is_featured,
                e.is_free,
                e.ticket_price,
                e.view_count,
                e.favorite_count,
                e.created_at,
                e.updated_at
            FROM Events e
            LEFT JOIN EventCategories c ON e.category_id = c.category_id
        `;

        const request = pool.request();
        if (status) {
            query += " WHERE e.status = @status";
            request.input("status", sql.NVarChar, status);
        }

        query += " ORDER BY e.start_time DESC";

        const result = await request.query(query);

        res.json({
            message: "Lấy danh sách sự kiện thành công!",
            data: result.recordset,
        });
    } catch (error) {
        console.error("Lỗi lấy sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// POST /api/events
const createEvent = async (req, res) => {
    try {
        const {
            title,
            short_description,
            description,
            location_name,
            latitude,
            longitude,
            address,
            district,
            start_time,
            end_time,
            banner_url,
            thumbnail_url,
            status,
            category_id,
            is_featured,
            is_free,
            ticket_price,
            organizer_name,
            contact_phone,
            website_url
        } = req.body;

        // ✅ Validate required fields
        if (!title || !start_time || !location_name) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
        }

        const pool = await poolPromise;
        await pool
            .request()
            .input("category_id", sql.Int, category_id || 1)
            .input("created_by", sql.Int, req.user?.id || 1)
            .input("title", sql.NVarChar, title)
            .input("short_description", sql.NVarChar, short_description || null)
            .input("description", sql.NVarChar, description || null)
            .input("location_name", sql.NVarChar, location_name)
            .input("latitude", sql.Decimal(9, 6), latitude || 0)
            .input("longitude", sql.Decimal(9, 6), longitude || 0)
            .input("address", sql.NVarChar, address || null)
            .input("district", sql.NVarChar, district || null)
            .input("start_time", sql.DateTime, start_time)
            .input("end_time", sql.DateTime, end_time || null)
            .input("banner_url", sql.NVarChar, banner_url || null)
            .input("thumbnail_url", sql.NVarChar, thumbnail_url || null)
            .input("status", sql.NVarChar, status || "pending")
            .input("is_featured", sql.Bit, is_featured ? 1 : 0)
            .input("is_free", sql.Bit, is_free ? 1 : 0)
            .input("ticket_price", sql.Decimal, ticket_price || 0)
            .input("organizer_name", sql.NVarChar, organizer_name || null)
            .input("contact_phone", sql.NVarChar, contact_phone || null)
            .input("website_url", sql.NVarChar, website_url || null)
            .query(`
                INSERT INTO Events (
                    category_id, created_by, title, short_description, description,
                    location_name, latitude, longitude, address, district,
                    start_time, end_time, banner_url, thumbnail_url, status,
                    is_featured, is_free, ticket_price, organizer_name, contact_phone,
                    website_url, created_at, updated_at
                )
                VALUES (
                    @category_id, @created_by, @title, @short_description, @description,
                    @location_name, @latitude, @longitude, @address, @district,
                    @start_time, @end_time, @banner_url, @thumbnail_url, @status,
                    @is_featured, @is_free, @ticket_price, @organizer_name, @contact_phone,
                    @website_url, GETDATE(), GETDATE()
                )
            `);

        console.log(`[EVENTS] New event created: ${title}`);
        res.status(201).json({ message: "Lưu sự kiện thành công!" });
    } catch (error) {
        console.error("Add event error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// GET /api/event-categories
const getEventCategories = async (req, res) => {
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
};

// PUT /api/events/:id
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            short_description,
            description,
            location_name,
            latitude,
            longitude,
            address,
            district,
            start_time,
            end_time,
            banner_url,
            thumbnail_url,
            status,
            category_id,
            is_featured,
            is_free,
            ticket_price,
            organizer_name,
            contact_phone,
            website_url
        } = req.body;

        const pool = await poolPromise;

        // Check if event exists
        const checkResult = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT event_id FROM Events WHERE event_id = @id");

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
        }

        await pool.request()
            .input("id", sql.Int, id)
            .input("category_id", sql.Int, category_id || 1)
            .input("title", sql.NVarChar, title)
            .input("short_description", sql.NVarChar, short_description || null)
            .input("description", sql.NVarChar, description || null)
            .input("location_name", sql.NVarChar, location_name)
            .input("latitude", sql.Decimal(9, 6), latitude || 0)
            .input("longitude", sql.Decimal(9, 6), longitude || 0)
            .input("address", sql.NVarChar, address || null)
            .input("district", sql.NVarChar, district || null)
            .input("start_time", sql.DateTime, start_time)
            .input("end_time", sql.DateTime, end_time || null)
            .input("banner_url", sql.NVarChar, banner_url || null)
            .input("thumbnail_url", sql.NVarChar, thumbnail_url || null)
            .input("status", sql.NVarChar, status || "pending")
            .input("is_featured", sql.Bit, is_featured ? 1 : 0)
            .input("is_free", sql.Bit, is_free ? 1 : 0)
            .input("ticket_price", sql.Decimal, ticket_price || 0)
            .input("organizer_name", sql.NVarChar, organizer_name || null)
            .input("contact_phone", sql.NVarChar, contact_phone || null)
            .input("website_url", sql.NVarChar, website_url || null)
            .query(`
                UPDATE Events SET
                    category_id = @category_id,
                    title = @title,
                    short_description = @short_description,
                    description = @description,
                    location_name = @location_name,
                    latitude = @latitude,
                    longitude = @longitude,
                    address = @address,
                    district = @district,
                    start_time = @start_time,
                    end_time = @end_time,
                    banner_url = @banner_url,
                    thumbnail_url = @thumbnail_url,
                    status = @status,
                    is_featured = @is_featured,
                    is_free = @is_free,
                    ticket_price = @ticket_price,
                    organizer_name = @organizer_name,
                    contact_phone = @contact_phone,
                    website_url = @website_url,
                    updated_at = GETDATE()
                WHERE event_id = @id
            `);

        res.json({ message: "Cập nhật sự kiện thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const checkResult = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT event_id FROM Events WHERE event_id = @id");

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
        }

        await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Events WHERE event_id = @id");

        res.json({ message: "Xóa sự kiện thành công!" });
    } catch (error) {
        console.error("Lỗi xóa sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// POST /api/events/:id/favorite - Toggle favorite status
const toggleFavoriteEvent = async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const userId = req.user.id;

        if (!eventId) {
            return res.status(400).json({ message: "ID sự kiện không hợp lệ!" });
        }

        const pool = await poolPromise;

        // Check if event exists
        const eventCheck = await pool.request()
            .input("event_id", sql.Int, eventId)
            .query("SELECT event_id, favorite_count FROM Events WHERE event_id = @event_id");

        if (eventCheck.recordset.length === 0) {
            return res.status(404).json({ message: "Sự kiện không tồn tại!" });
        }

        let currentFavoriteCount = eventCheck.recordset[0].favorite_count || 0;

        // Check if already favorited
        const favCheck = await pool.request()
            .input("user_id", sql.Int, userId)
            .input("event_id", sql.Int, eventId)
            .query("SELECT 1 FROM UserFavoriteEvents WHERE user_id = @user_id AND event_id = @event_id");

        let isFavorite = false;
        let newFavoriteCount = currentFavoriteCount;

        if (favCheck.recordset.length > 0) {
            // Unfavorite
            await pool.request()
                .input("user_id", sql.Int, userId)
                .input("event_id", sql.Int, eventId)
                .query("DELETE FROM UserFavoriteEvents WHERE user_id = @user_id AND event_id = @event_id");

            newFavoriteCount = Math.max(0, currentFavoriteCount - 1);

            await pool.request()
                .input("event_id", sql.Int, eventId)
                .input("fav_count", sql.Int, newFavoriteCount)
                .query("UPDATE Events SET favorite_count = @fav_count WHERE event_id = @event_id");

            isFavorite = false;
        } else {
            // Favorite
            await pool.request()
                .input("user_id", sql.Int, userId)
                .input("event_id", sql.Int, eventId)
                .query("INSERT INTO UserFavoriteEvents (user_id, event_id, saved_at) VALUES (@user_id, @event_id, GETDATE())");

            newFavoriteCount = currentFavoriteCount + 1;

            await pool.request()
                .input("event_id", sql.Int, eventId)
                .input("fav_count", sql.Int, newFavoriteCount)
                .query("UPDATE Events SET favorite_count = @fav_count WHERE event_id = @event_id");

            isFavorite = true;
        }

        res.json({
            message: isFavorite ? "Lưu sự kiện thành công!" : "Bỏ lưu sự kiện thành công!",
            isFavorite,
            favoriteCount: newFavoriteCount
        });
    } catch (error) {
        console.error("Lỗi toggle yêu thích sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// ============ EVENT ROADS (ROAD RESTRICTIONS) ============

// GET /api/event-roads
const getEventRoads = async (req, res) => {
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
};

// POST /api/event-roads
const createEventRoad = async (req, res) => {
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
};

// PUT /api/event-roads/:id
const updateEventRoad = async (req, res) => {
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
};

// DELETE /api/event-roads/:id
const deleteEventRoad = async (req, res) => {
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
};

// ============ TRAFFIC ALERTS (PUBLIC + USER) ============

// GET /api/traffic-alerts
const getTrafficAlerts = async (req, res) => {
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
            created_at: alert.created_at
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi lấy danh sách cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
};

// POST /api/traffic-alerts (yêu cầu Token)
const createTrafficAlert = async (req, res) => {
    try {
        const {
            type,
            title,
            description,
            location,
            latitude,
            longitude,
            severity,
            event_id
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
            .query(`
                INSERT INTO TrafficAlerts (
                    created_by, event_id, alert_type, title, description,
                    location_name, latitude, longitude, severity, is_active, created_at, updated_at
                )
                OUTPUT INSERTED.alert_id
                VALUES (
                    @created_by, @event_id, @alert_type, @title, @description,
                    @location_name, @latitude, @longitude, @severity, 1, GETDATE(), GETDATE()
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
};

module.exports = {
    getEvents,
    createEvent,
    getEventCategories,
    updateEvent,
    deleteEvent,
    toggleFavoriteEvent,
    getEventRoads,
    createEventRoad,
    updateEventRoad,
    deleteEventRoad,
    getTrafficAlerts,
    createTrafficAlert
};