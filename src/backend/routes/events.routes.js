const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const { sql, poolPromise } = require("../db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");

// GET /api/events - Lấy danh sách sự kiện (có thể lọc theo status)
router.get("/", async (req, res) => {
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
            WHERE 1=1
        `;

    const request = pool.request();
    // Nếu có truyền status cụ thể (ví dụ từ trang Admin), dùng giá trị đó
    // Nếu không truyền, mặc định chỉ lấy những sự kiện đã 'approved' cho người dùng xem
    if (status) {
      query += " AND e.status = @status";
      request.input("status", sql.NVarChar, status);
    } else {
      query += " AND e.status = 'approved'";
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
router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
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
        status,
        category_id,
        is_featured,
        is_free,
        ticket_price,
        organizer_name,
        contact_phone,
        website_url,
      } = req.body;

      if (!title || !start_time || !location_name) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
      }

      // Xử lý ảnh upload (nếu có)
      let banner_url = req.body.banner_url || null;
      let thumbnail_url = req.body.thumbnail_url || null;
      if (req.files) {
        if (req.files["banner"] && req.files["banner"][0]) {
          banner_url = `/uploads/${req.files["banner"][0].filename}`;
        }
        if (req.files["thumbnail"] && req.files["thumbnail"][0]) {
          thumbnail_url = `/uploads/${req.files["thumbnail"][0].filename}`;
        }
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
        .input("banner_url", sql.NVarChar, banner_url)
        .input("thumbnail_url", sql.NVarChar, thumbnail_url)
        .input("status", sql.NVarChar, status || "pending")
        .input("is_featured", sql.Bit, is_featured ? 1 : 0)
        .input("is_free", sql.Bit, is_free ? 1 : 0)
        .input("ticket_price", sql.Decimal, ticket_price || 0)
        .input("organizer_name", sql.NVarChar, organizer_name || null)
        .input("contact_phone", sql.NVarChar, contact_phone || null)
        .input("website_url", sql.NVarChar, website_url || null).query(`
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
  },
);

// PUT /api/events/:id - Cập nhật sự kiện (Yêu cầu đăng nhập + Cần kiểm tra quyền admin)
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
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
        status,
        category_id,
        is_featured,
        is_free,
        ticket_price,
        organizer_name,
        contact_phone,
        website_url,
      } = req.body;

      // Xử lý ảnh upload (nếu có)
      let banner_url = req.body.banner_url || null;
      let thumbnail_url = req.body.thumbnail_url || null;
      if (req.files) {
        if (req.files["banner"] && req.files["banner"][0]) {
          banner_url = `/uploads/${req.files["banner"][0].filename}`;
        }
        if (req.files["thumbnail"] && req.files["thumbnail"][0]) {
          thumbnail_url = `/uploads/${req.files["thumbnail"][0].filename}`;
        }
      }

      const pool = await poolPromise;

      // Check if event exists
      const checkResult = await pool
        .request()
        .input("id", sql.Int, id)
        .query(
          "SELECT event_id, banner_url, thumbnail_url FROM Events WHERE event_id = @id",
        );

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
      }

      // Giữ lại ảnh cũ nếu không có ảnh mới
      const existingEvent = checkResult.recordset[0];
      if (!banner_url) banner_url = existingEvent.banner_url;
      if (!thumbnail_url) thumbnail_url = existingEvent.thumbnail_url;

      await pool
        .request()
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
        .input("website_url", sql.NVarChar, website_url || null).query(`
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
  },
);

// DELETE /api/events/:id - Xóa sự kiện (Yêu cầu đăng nhập + Cần quyền Admin)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pool = await poolPromise;

      const checkResult = await pool
        .request()
        .input("id", sql.Int, id)
        .query("SELECT event_id FROM Events WHERE event_id = @id");

      if (checkResult.recordset.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
      }

      await pool
        .request()
        .input("id", sql.Int, id)
        .query("DELETE FROM Events WHERE event_id = @id");

      console.log(
        `[EVENTS] Event deleted by admin ${req.user.id}: event_id=${id}`,
      );
      res.json({ message: "Xóa sự kiện thành công!" });
    } catch (error) {
      console.error("Lỗi xóa sự kiện:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
);

// POST /api/events/:id/view
// Mỗi lần mở chi tiết sự kiện sẽ tăng 1 lượt xem
// POST /api/events/:id/view
// Mỗi lần người dùng mở chi tiết sự kiện thì tăng 1 lượt xem
router.post("/:id/view", async (req, res) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ!",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().input("event_id", sql.Int, eventId)
      .query(`
        UPDATE Events
        SET view_count = ISNULL(view_count, 0) + 1
        OUTPUT
          INSERTED.event_id,
          INSERTED.view_count
        WHERE event_id = @event_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện!",
      });
    }

    return res.json({
      success: true,
      message: "Đã tăng lượt xem sự kiện!",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Lỗi tăng lượt xem sự kiện:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tăng lượt xem!",
      error: error.message,
    });
  }
});
// POST /api/events/:id/favorite - Toggle favorite status
router.post("/:id/favorite", authenticateToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ message: "ID sự kiện không hợp lệ!" });
    }

    const pool = await poolPromise;

    // Check if event exists
    const eventCheck = await pool
      .request()
      .input("event_id", sql.Int, eventId)
      .query(
        "SELECT event_id, favorite_count FROM Events WHERE event_id = @event_id",
      );

    if (eventCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Sự kiện không tồn tại!" });
    }

    let currentFavoriteCount = eventCheck.recordset[0].favorite_count || 0;

    // Check if already favorited
    const favCheck = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("event_id", sql.Int, eventId)
      .query(
        "SELECT 1 FROM UserFavoriteEvents WHERE user_id = @user_id AND event_id = @event_id",
      );

    let isFavorite = false;
    let newFavoriteCount = currentFavoriteCount;

    if (favCheck.recordset.length > 0) {
      // Unfavorite
      await pool
        .request()
        .input("user_id", sql.Int, userId)
        .input("event_id", sql.Int, eventId)
        .query(
          "DELETE FROM UserFavoriteEvents WHERE user_id = @user_id AND event_id = @event_id",
        );

      newFavoriteCount = Math.max(0, currentFavoriteCount - 1);

      await pool
        .request()
        .input("event_id", sql.Int, eventId)
        .input("fav_count", sql.Int, newFavoriteCount)
        .query(
          "UPDATE Events SET favorite_count = @fav_count WHERE event_id = @event_id",
        );

      isFavorite = false;
    } else {
      // Favorite
      await pool
        .request()
        .input("user_id", sql.Int, userId)
        .input("event_id", sql.Int, eventId)
        .query(
          "INSERT INTO UserFavoriteEvents (user_id, event_id, saved_at) VALUES (@user_id, @event_id, GETDATE())",
        );

      newFavoriteCount = currentFavoriteCount + 1;

      await pool
        .request()
        .input("event_id", sql.Int, eventId)
        .input("fav_count", sql.Int, newFavoriteCount)
        .query(
          "UPDATE Events SET favorite_count = @fav_count WHERE event_id = @event_id",
        );

      isFavorite = true;
    }

    res.json({
      message: isFavorite
        ? "Lưu sự kiện thành công!"
        : "Bỏ lưu sự kiện thành công!",
      isFavorite,
      favoriteCount: newFavoriteCount,
    });
  } catch (error) {
    console.error("Lỗi toggle yêu thích sự kiện:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// GET /api/events/:eventId/images
// Chỉ trả về ảnh đã được Admin duyệt
router.get("/:eventId/images", async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request().input("event_id", sql.Int, eventId)
      .query(`
        SELECT
          image_id,
          event_id,
          image_url,
          caption,
          display_order,
          uploaded_at,
          approval_status
        FROM EventImages
        WHERE event_id = @event_id
          AND approval_status = 'approved'
        ORDER BY display_order ASC, uploaded_at DESC
      `);

    res.json({
      success: true,
      message: "Lấy danh sách ảnh thành công!",
      data: result.recordset,
    });
  } catch (error) {
    console.error("Lỗi lấy ảnh sự kiện:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
});

// POST /api/events/:eventId/images - Đóng góp ảnh cho sự kiện
router.post(
  "/:eventId/images",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { caption } = req.body;

      let imageUrl;
      const cloudUrl = await uploadToCloudinary(req.file, "dnpulse_events");
      if (cloudUrl) {
        imageUrl = cloudUrl;
      } else if (req.file) {
        const filename = `event-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname || ".jpg")}`;
        const localPath = path.join(__dirname, "..", "uploads", filename);
        if (req.file.buffer) {
          fs.writeFileSync(localPath, req.file.buffer);
        }
        imageUrl = `/uploads/${filename}`;
      }

      const pool = await poolPromise;

      const eventCheck = await pool
        .request()
        .input("event_id", sql.Int, eventId)
        .query("SELECT event_id FROM Events WHERE event_id = @event_id");

      if (eventCheck.recordset.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
      }

      const result = await pool
        .request()
        .input("event_id", sql.Int, eventId)
        .input("image_url", sql.NVarChar, imageUrl)
        .input("caption", sql.NVarChar, caption || "Người dùng đóng góp")
        .query(`
          INSERT INTO EventImages (
            event_id,
            image_url,
            caption,
            uploaded_at,
            approval_status
          )
          OUTPUT INSERTED.*
          VALUES (
            @event_id,
            @image_url,
            @caption,
            GETDATE(),
            'pending'
          )
        `);

      res.status(201).json({
        success: true,
        message: "Ảnh đã được gửi và đang chờ quản trị viên duyệt!",
        data: result.recordset[0],
      });
    } catch (error) {
      console.error("Lỗi upload ảnh sự kiện:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
    }
  },
);

// DELETE /api/events/images/:imageId
router.delete("/images/:imageId", authenticateToken, async (req, res) => {
  try {
    const { imageId } = req.params;
    const pool = await poolPromise;
    const checkResult = await pool
      .request()
      .input("image_id", sql.Int, imageId)
      .query(`SELECT * FROM EventImages WHERE image_id = @image_id`);
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy ảnh!" });
    }
    await pool
      .request()
      .input("image_id", sql.Int, imageId)
      .query(`DELETE FROM EventImages WHERE image_id = @image_id`);
    res.json({ success: true, message: "Xóa ảnh thành công!" });
  } catch (error) {
    console.error("Lỗi xóa ảnh sự kiện:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// POST /api/events/ai-scrape - Admin kích hoạt AI Cào tin tức DanangFantastiCity
const { runAiEventScraper } = require('../services/aiScraperService');
router.post('/ai-scrape', authenticateToken, authorizeRole(['admin', 'system_admin']), async (req, res) => {
    try {
        const result = await runAiEventScraper();
        res.json(result);
    } catch (error) {
        console.error("Lỗi kích hoạt AI Event Scraper:", error);
        res.status(500).json({ message: "Lỗi server khi chạy AI Event Scraper", error: error.message });
    }
});

// PUT /api/events/:id/status - Admin Phê duyệt (approved) hoặc Từ chối (rejected) sự kiện
router.put('/:id/status', authenticateToken, authorizeRole(['admin', 'system_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ! (chỉ chấp nhận approved, rejected, pending)" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("event_id", sql.Int, id)
            .input("status", sql.NVarChar, status)
            .query(`
                UPDATE Events 
                SET status = @status, updated_at = GETDATE()
                OUTPUT INSERTED.*
                WHERE event_id = @event_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện!" });
        }

        res.json({
            success: true,
            message: `Đã cập nhật trạng thái sự kiện thành '${status}' thành công!`,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

module.exports = router;
