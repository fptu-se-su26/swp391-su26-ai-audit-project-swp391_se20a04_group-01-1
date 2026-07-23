const express = require("express");
const router = express.Router();

// Sử dụng chung đối tượng sql và poolPromise từ file db.js của project
const { sql, poolPromise } = require("../db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { scrapeAndExtractEvents } = require("../services/eventCrawlerService");
const {
  syncYearlyEventCatalog,
  upsertScrapedEvent,
} = require("../services/autoSyncEventsService");

// ==========================================
// BẢO MẬT: Áp dụng middleware Admin cho TOÀN BỘ các route phía dưới
// ==========================================
router.use(authenticateToken);
router.use(authorizeRole("admin"));

// 1. API Nhận URL từ Admin để cào sự kiện tự động bằng AI
router.post("/events/crawl", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu URL cần cào!" });
  }

  try {
    // A. Lấy ID của admin đang thao tác từ token
    const adminId =
      req.user && (req.user.userId || req.user.id)
        ? req.user.userId || req.user.id
        : 1;

    // B. Cào và trích xuất bằng AI & Cheerio (bao gồm banner + thư viện ảnh phụ)
    const eventData = await scrapeAndExtractEvents(url);
    if (!eventData || !eventData.title) {
      return res.status(422).json({
        success: false,
        message:
          "Không bóc tách được thông tin sự kiện hợp lệ từ URL này (có thể sự kiện đã diễn ra trong quá khứ hoặc AI không đọc được nội dung).",
      });
    }

    // C. Dùng logic dùng chung: geocode toạ độ, xác định category, kiểm tra trùng lặp
    //    (update nếu có nội dung mới hơn, thêm mới nếu chưa tồn tại), lưu ảnh vào EventImages,
    //    và đưa về status = 'pending' chờ Admin duyệt.
    const pool = await poolPromise;
    const result = await upsertScrapedEvent(pool, eventData, adminId);

    if (result.action === "skipped") {
      return res.status(409).json({
        success: false,
        message:
          "Sự kiện này đã tồn tại trong hệ thống và không có thông tin gì mới hơn (Trùng lặp dữ liệu)!",
        data: eventData,
      });
    }

    return res.json({
      success: true,
      message:
        result.action === "updated"
          ? "Sự kiện đã tồn tại nhưng có thông tin mới hơn — đã cập nhật và gửi lại vào hàng đợi chờ Admin phê duyệt!"
          : "Đã cào dữ liệu và gửi vào hàng đợi chờ Admin phê duyệt thành công!",
      action: result.action,
      eventId: result.eventId,
      data: eventData,
    });
  } catch (error) {
    console.error("Lỗi cào sự kiện:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi cào dữ liệu.",
      error: error.message,
    });
  }
});

// PUT /api/admin/events/:id/status - Cập nhật trạng thái duyệt sự kiện (approved / pending / cancelled)
router.put("/events/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Nhận 'approved', 'pending', hoặc 'cancelled'

    if (!["approved", "pending", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Trạng thái không hợp lệ!" });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("event_id", sql.Int, parseInt(id, 10))
      .input("status", sql.NVarChar, status).query(`
        UPDATE Events 
        SET status = @status, updated_at = GETDATE() 
        WHERE event_id = @event_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện cần cập nhật!",
      });
    }

    res.json({
      success: true,
      message: `Đã chuyển trạng thái sự kiện thành '${status}' thành công!`,
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái sự kiện:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 1B. POST /api/admin/events/sync-yearly-catalog
// Quét TOÀN BỘ trang "Danh mục sự kiện và lễ hội Đà Nẵng năm 2026", dùng AI bóc tách
// tất cả sự kiện/lễ hội liên quan đến du lịch Đà Nẵng, so sánh với dữ liệu hiện có trong DB
// (update nếu có thông tin mới hơn, thêm mới nếu chưa tồn tại), và đưa vào hàng đợi
// status = 'pending' để Admin duyệt. Có thể truyền { url } tuỳ chỉnh trong body,
// mặc định sẽ dùng đúng trang danh mục năm 2026.
router.post("/events/sync-yearly-catalog", async (req, res) => {
  try {
    const adminId =
      req.user && (req.user.userId || req.user.id)
        ? req.user.userId || req.user.id
        : 1;
    const { url } = req.body || {};

    const summary = url
      ? await syncYearlyEventCatalog(url, adminId)
      : await syncYearlyEventCatalog(undefined, adminId);

    return res.json({
      success: true,
      message:
        "Đã quét trang danh mục, bóc tách & đồng bộ dữ liệu sự kiện xong. Các sự kiện mới/cập nhật đang chờ Admin duyệt.",
      summary,
    });
  } catch (error) {
    console.error("Lỗi đồng bộ danh mục sự kiện năm:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đồng bộ danh mục sự kiện.",
      error: error.message,
    });
  }
});

// 2. GET /api/admin/users - Lấy danh sách người dùng
router.get("/users", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT user_id, username, email, role, is_active, ban_reason, created_at, last_login_at
      FROM Users
      ORDER BY created_at DESC
    `);
    res.json({
      message: "Lấy danh sách người dùng thành công!",
      data: result.recordset,
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
});

// 3. PUT /api/admin/users/:id/ban - Khóa tài khoản người dùng
router.put("/users/:id/ban", async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
    }

    const result = await pool
      .request()
      .input(
        "ban_reason",
        sql.NVarChar,
        req.body.ban_reason || "Vi phạm chính sách",
      )
      .input("user_id", sql.Int, userId)
      .query(
        "UPDATE Users SET is_active = 0, ban_reason = @ban_reason WHERE user_id = @user_id",
      );

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng này." });
    }

    res.json({ message: "Đã khóa tài khoản thành công" });
  } catch (error) {
    console.error("❌ LỖI SQL KHI KHÓA TÀI KHOẢN:", error);
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
});

// 4. GET /api/admin/flood-zones - Lấy toàn bộ danh sách vùng ngập (Admin)
router.get("/flood-zones", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        zone_id, zone_name, district, risk_level, polygon_coordinates, 
        description, typical_flood_months, is_active, last_updated, updated_by
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
        last_updated: zone.last_updated
          ? zone.last_updated.toISOString().split("T")[0]
          : "",
        updated_by: zone.updated_by,
        center:
          Array.isArray(coordinates) && typeof coordinates[0] === "number"
            ? coordinates
            : null,
        radius,
        depthCm,
        level,
        color,
        depthValue: depthCm / 100,
        depthLevel: level,
        bypassPosition: null,
        bypassOptions: [],
      };
    });

    res.json({
      success: true,
      message: "Lấy tất cả vùng ngập lụt thành công",
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu FloodZones cho admin:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 5. PUT /api/admin/flood-zones/:id - Cập nhật trạng thái vùng ngập (Admin)
router.put("/flood-zones/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const zoneId = parseInt(req.params.id, 10);
    if (isNaN(zoneId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID vùng ngập lụt không hợp lệ!" });
    }

    const { is_active } = req.body;
    if (is_active === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu trạng thái is_active!" });
    }

    const activeBit = is_active ? 1 : 0;
    const updatedBy = req.user.userId || req.user.id;

    await pool
      .request()
      .input("is_active", sql.Bit, activeBit)
      .input("updated_by", sql.Int, updatedBy)
      .input("zone_id", sql.Int, zoneId).query(`
        UPDATE FloodZones 
        SET is_active = @is_active, last_updated = GETDATE(), updated_by = @updated_by 
        WHERE zone_id = @zone_id
      `);

    res.json({
      success: true,
      message: "Cập nhật trạng thái vùng ngập lụt thành công!",
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái FloodZone:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 6. GET /api/admin/traffic-alerts - Lấy toàn bộ danh sách cảnh báo giao thông (Admin)
router.get("/traffic-alerts", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ta.*, u.username as creator_name
      FROM TrafficAlerts ta
      LEFT JOIN Users u ON ta.created_by = u.user_id
      ORDER BY ta.created_at DESC
    `);

    const data = result.recordset.map((alert) => ({
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
      created_at: alert.created_at,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error(
      "Lỗi lấy toàn bộ danh sách cảnh báo giao thông (Admin):",
      error,
    );
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 7. PUT /api/admin/traffic-alerts/:id/toggle - Bật/tắt trạng thái cảnh báo giao thông (Admin)
router.put("/traffic-alerts/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin is_active!" });
    }

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("alert_id", sql.Int, parseInt(id))
      .input("is_active", sql.Bit, is_active ? 1 : 0).query(`
        UPDATE TrafficAlerts
        SET is_active = @is_active, updated_at = GETDATE()
        WHERE alert_id = @alert_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo giao thông cần cập nhật!",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật trạng thái cảnh báo giao thông thành công!",
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái cảnh báo giao thông:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 8. DELETE /api/admin/traffic-alerts/:id - Xóa cảnh báo giao thông (Admin)
router.delete("/traffic-alerts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("alert_id", sql.Int, parseInt(id))
      .query(`DELETE FROM TrafficAlerts WHERE alert_id = @alert_id`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo giao thông cần xóa!",
      });
    }

    res.json({ success: true, message: "Xóa cảnh báo giao thông thành công!" });
  } catch (error) {
    console.error("Lỗi xóa cảnh báo giao thông:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 9. POST /api/admin/notifications/test-flood - Chạy flood alert job thủ công (Admin)
router.post("/notifications/test-flood", async (req, res) => {
  try {
    const { runFloodAlertJob } = require("../schedulerService");
    await runFloodAlertJob();
    res.json({
      success: true,
      message: "Đã kích hoạt flood alert job thủ công!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi chạy job",
      error: error.message,
    });
  }
});

// 10. GET /api/admin/pois/pending - Lấy danh sách POI đang chờ duyệt
router.get("/pois/pending", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.poi_id, p.name, p.latitude, p.longitude, p.address, 
        p.description, p.image_url, p.website_url, p.phone_number,
        p.created_at, p.status, p.is_active,
        c.name AS category_name, c.icon AS category_icon,
        u.full_name AS creator_name, u.email AS creator_email
      FROM POIs p
      LEFT JOIN POIsCategories c ON p.category_id = c.id
      LEFT JOIN Users u ON p.created_by = u.user_id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Lỗi lấy danh sách POI chờ duyệt:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 11. PUT /api/admin/pois/:id/approve - Duyệt POI
router.put("/pois/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("poi_id", sql.Int, parseInt(id))
      .query(
        `UPDATE POIs SET status = 'approved', is_active = 1 WHERE poi_id = @poi_id`,
      );

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy POI!" });
    }

    res.json({ success: true, message: "Đã duyệt địa điểm!" });
  } catch (error) {
    console.error("Lỗi duyệt POI:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// 12. PUT /api/admin/pois/:id/reject - Từ chối POI
router.put("/pois/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("poi_id", sql.Int, parseInt(id))
      .query(
        `UPDATE POIs SET status = 'rejected', is_active = 0 WHERE poi_id = @poi_id`,
      );

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Lỗi server không tìm thấy POI!" });
    }

    res.json({ success: true, message: "Đã từ chối địa điểm!" });
  } catch (error) {
    console.error("Lỗi từ chối POI:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});
// ======================================================
// QUẢN LÝ ẢNH SỰ KIỆN DO NGƯỜI DÙNG ĐÓNG GÓP
// ======================================================

// GET /api/admin/event-images?status=pending
// Lấy danh sách ảnh theo trạng thái: pending, approved, rejected
router.get("/event-images", async (req, res) => {
  try {
    const status = req.query.status || "pending";

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái ảnh không hợp lệ!",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().input("status", sql.NVarChar, status)
      .query(`
        SELECT
          ei.image_id,
          ei.event_id,
          ei.image_url,
          ei.caption,
          ei.display_order,
          ei.uploaded_at,
          ei.approval_status,
          ei.reviewed_by,
          ei.reviewed_at,
          ei.rejection_reason,
          e.title AS event_title
        FROM EventImages ei
        LEFT JOIN Events e
          ON ei.event_id = e.event_id
        WHERE ei.approval_status = @status
        ORDER BY ei.uploaded_at DESC
      `);

    return res.json({
      success: true,
      message: "Lấy danh sách ảnh sự kiện thành công!",
      data: result.recordset,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách ảnh sự kiện:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách ảnh sự kiện.",
      error: error.message,
    });
  }
});

// PUT /api/admin/event-images/:id/approve
// Admin duyệt ảnh
router.put("/event-images/:id/approve", async (req, res) => {
  try {
    const imageId = parseInt(req.params.id, 10);

    if (Number.isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        message: "ID ảnh không hợp lệ!",
      });
    }

    const adminId =
      req.user?.userId || req.user?.user_id || req.user?.id || null;

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("image_id", sql.Int, imageId)
      .input("admin_id", sql.Int, adminId).query(`
        UPDATE EventImages
        SET
          approval_status = 'approved',
          reviewed_by = @admin_id,
          reviewed_at = GETDATE(),
          rejection_reason = NULL
        WHERE image_id = @image_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh cần duyệt!",
      });
    }

    return res.json({
      success: true,
      message: "Đã duyệt ảnh thành công!",
    });
  } catch (error) {
    console.error("Lỗi duyệt ảnh sự kiện:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi duyệt ảnh.",
      error: error.message,
    });
  }
});

// PUT /api/admin/event-images/:id/reject
// Admin từ chối ảnh
router.put("/event-images/:id/reject", async (req, res) => {
  try {
    const imageId = parseInt(req.params.id, 10);
    const reason = req.body.reason?.trim();

    if (Number.isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        message: "ID ảnh không hợp lệ!",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do từ chối ảnh!",
      });
    }

    const adminId =
      req.user?.userId || req.user?.user_id || req.user?.id || null;

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("image_id", sql.Int, imageId)
      .input("admin_id", sql.Int, adminId)
      .input("reason", sql.NVarChar, reason).query(`
        UPDATE EventImages
        SET
          approval_status = 'rejected',
          reviewed_by = @admin_id,
          reviewed_at = GETDATE(),
          rejection_reason = @reason
        WHERE image_id = @image_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh cần từ chối!",
      });
    }

    return res.json({
      success: true,
      message: "Đã từ chối ảnh thành công!",
    });
  } catch (error) {
    console.error("Lỗi từ chối ảnh sự kiện:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi từ chối ảnh.",
      error: error.message,
    });
  }
});

module.exports = router;
