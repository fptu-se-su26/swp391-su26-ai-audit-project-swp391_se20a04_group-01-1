const express = require('express');
const router = express.Router();

const { sql, poolPromise } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET /api/events - Lấy danh sách sự kiện (có thể lọc theo status)
router.get('/', async (req, res) => {
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
});

// POST /api/events - Tạo sự kiện mới (Yêu cầu đăng nhập)
router.post('/', authenticateToken, async (req, res) => {
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
});

// PUT /api/events/:id - Cập nhật sự kiện (Yêu cầu đăng nhập + Cần kiểm tra quyền admin)
router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// DELETE /api/events/:id - Xóa sự kiện (Yêu cầu đăng nhập + Cần quyền Admin)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
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

        console.log(`[EVENTS] Event deleted by admin ${req.user.id}: event_id=${id}`);
        res.json({ message: "Xóa sự kiện thành công!" });
    } catch (error) {
        console.error("Lỗi xóa sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/events/:id/favorite - Toggle favorite status
router.post('/:id/favorite', authenticateToken, async (req, res) => {
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
});

module.exports = router;
