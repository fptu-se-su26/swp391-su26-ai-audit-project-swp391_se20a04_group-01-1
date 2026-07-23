const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const { sql, poolPromise } = require("../db");
const { authenticateToken } = require("../middleware/auth");

// Bán kính (mét) để coi 2 điểm là "cùng vị trí" khi chống trùng lộ trình đã lưu thủ công.
// Không so is_emergency / tránh ngập / tránh kẹt xe — các cờ này được phép khác nhau mà vẫn tính là trùng.
const DUPLICATE_RADIUS_METERS = 30;

// Tìm lộ trình "manual" đã tồn tại của user, trùng origin/destination (trong bán kính) + cùng profile.
async function findDuplicateManualRoute(
  pool,
  {
    user_id,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng,
    profile,
  },
) {
  const result = await pool
    .request()
    .input("user_id", sql.Int, user_id)
    .input("origin_lat", sql.Decimal(9, 6), origin_lat)
    .input("origin_lng", sql.Decimal(9, 6), origin_lng)
    .input("destination_lat", sql.Decimal(9, 6), destination_lat)
    .input("destination_lng", sql.Decimal(9, 6), destination_lng)
    .input("profile", sql.NVarChar(20), profile || "driving")
    .input("radius", sql.Float, DUPLICATE_RADIUS_METERS).query(`
            SELECT TOP 1 *
            FROM SavedRoutes
            WHERE user_id = @user_id
              AND save_type = 'manual'
              AND profile = @profile
              AND geography::Point(origin_lat, origin_lng, 4326).STDistance(geography::Point(@origin_lat, @origin_lng, 4326)) <= @radius
              AND geography::Point(destination_lat, destination_lng, 4326).STDistance(geography::Point(@destination_lat, @destination_lng, 4326)) <= @radius
            ORDER BY created_at DESC
        `);
  return result.recordset[0] || null;
}

// POST /api/saved-routes - Lưu lộ trình mới (Yêu cầu đăng nhập)
// save_type: 'manual' (nút "Lưu lộ trình", có chống trùng + update) | 'history' (tự động ghi log "Bắt đầu chuyến đi", luôn tạo dòng mới)
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
      is_emergency,
      save_type,
    } = req.body;

    if (
      origin_lat === undefined ||
      origin_lng === undefined ||
      destination_lat === undefined ||
      destination_lng === undefined ||
      !route_data
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu thông tin tọa độ hoặc dữ liệu lộ trình!",
        });
    }

    const resolvedSaveType = save_type === "history" ? "history" : "manual";

    const pool = await poolPromise;

    // Chỉ chống trùng / update cho lộ trình lưu thủ công. Lịch sử di chuyển luôn tạo dòng mới.
    if (resolvedSaveType === "manual") {
      const existing = await findDuplicateManualRoute(pool, {
        user_id: req.user.id,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        profile,
      });

      if (existing) {
        const updateResult = await pool
          .request()
          .input("route_id", sql.Int, existing.route_id)
          .input("user_id", sql.Int, req.user.id)
          .input("origin_name", sql.NVarChar(255), origin_name || null)
          .input("origin_lat", sql.Decimal(9, 6), origin_lat)
          .input("origin_lng", sql.Decimal(9, 6), origin_lng)
          .input(
            "destination_name",
            sql.NVarChar(255),
            destination_name || null,
          )
          .input("destination_lat", sql.Decimal(9, 6), destination_lat)
          .input("destination_lng", sql.Decimal(9, 6), destination_lng)
          .input(
            "route_name",
            sql.NVarChar(150),
            route_name || existing.route_name,
          )
          .input("route_data", sql.NVarChar(sql.MAX), route_data)
          .input("distance_meters", sql.Int, distance_meters || 0)
          .input("duration_seconds", sql.Int, duration_seconds || 0)
          .input("profile", sql.NVarChar(20), profile || "driving")
          .input("is_emergency", sql.Bit, is_emergency ? 1 : 0).query(`
                        UPDATE SavedRoutes
                        SET origin_name = @origin_name,
                            origin_lat = @origin_lat,
                            origin_lng = @origin_lng,
                            destination_name = @destination_name,
                            destination_lat = @destination_lat,
                            destination_lng = @destination_lng,
                            route_name = @route_name,
                            route_data = @route_data,
                            distance_meters = @distance_meters,
                            duration_seconds = @duration_seconds,
                            profile = @profile,
                            is_emergency = @is_emergency,
                            created_at = GETDATE()
                        OUTPUT INSERTED.*
                        WHERE route_id = @route_id AND user_id = @user_id;
                    `);

        return res
          .status(200)
          .json({
            success: true,
            message: "Đã cập nhật lộ trình đã lưu trước đó!",
            route: updateResult.recordset[0],
            updated: true,
          });
      }
    }

    const result = await pool
      .request()
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
      .input("profile", sql.NVarChar(20), profile || "driving")
      .input("is_emergency", sql.Bit, is_emergency ? 1 : 0)
      .input("save_type", sql.NVarChar(20), resolvedSaveType).query(`
                INSERT INTO SavedRoutes (
                    user_id, origin_name, origin_lat, origin_lng, 
                    destination_name, destination_lat, destination_lng, 
                    route_name, route_data, distance_meters, duration_seconds, 
                    profile, is_shared, is_emergency, save_type, created_at
                ) 
                OUTPUT INSERTED.*
                VALUES (
                    @user_id, @origin_name, @origin_lat, @origin_lng, 
                    @destination_name, @destination_lat, @destination_lng, 
                    @route_name, @route_data, @distance_meters, @duration_seconds, 
                    @profile, 0, @is_emergency, @save_type, GETDATE()
                );
            `);

    res
      .status(201)
      .json({
        success: true,
        message: "Lưu lộ trình thành công!",
        route: result.recordset[0],
        updated: false,
      });
  } catch (error) {
    console.error("Lỗi lưu lộ trình:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// GET /api/saved-routes/check-duplicate - Kiểm tra trước xem lộ trình (origin/destination/profile) đã lưu thủ công trước đó chưa
router.get("/check-duplicate", authenticateToken, async (req, res) => {
  try {
    const {
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      profile,
    } = req.query;

    if (
      origin_lat === undefined ||
      origin_lng === undefined ||
      destination_lat === undefined ||
      destination_lng === undefined
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu tọa độ để kiểm tra trùng lặp!",
        });
    }

    const pool = await poolPromise;
    const existing = await findDuplicateManualRoute(pool, {
      user_id: req.user.id,
      origin_lat: parseFloat(origin_lat),
      origin_lng: parseFloat(origin_lng),
      destination_lat: parseFloat(destination_lat),
      destination_lng: parseFloat(destination_lng),
      profile,
    });

    res.json({ success: true, duplicate: !!existing, route: existing || null });
  } catch (error) {
    console.error("Lỗi kiểm tra lộ trình trùng lặp:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// GET /api/saved-routes - Lấy danh sách lộ trình đã lưu của người dùng hiện tại (Yêu cầu đăng nhập)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().input("user_id", sql.Int, req.user.id)
      .query(`
                SELECT * FROM SavedRoutes 
                WHERE user_id = @user_id 
                ORDER BY created_at DESC
            `);

    res.json({ success: true, routes: result.recordset });
  } catch (error) {
    console.error("Lỗi lấy danh sách lộ trình đã lưu:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// GET /api/saved-routes/:id - Lấy chi tiết một lộ trình đã lưu (Yêu cầu đăng nhập)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("route_id", sql.Int, parseInt(id))
      .input("user_id", sql.Int, req.user.id).query(`
                SELECT * FROM SavedRoutes 
                WHERE route_id = @route_id AND user_id = @user_id
            `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy lộ trình hoặc bạn không có quyền xem!",
        });
    }

    res.json({ success: true, route: result.recordset[0] });
  } catch (error) {
    console.error("Lỗi lấy chi tiết lộ trình:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// DELETE /api/saved-routes/:id - Xóa một lộ trình đã lưu (Yêu cầu đăng nhập)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("route_id", sql.Int, parseInt(id))
      .input("user_id", sql.Int, req.user.id).query(`
                DELETE FROM SavedRoutes 
                WHERE route_id = @route_id AND user_id = @user_id
            `);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy lộ trình hoặc bạn không có quyền xóa!",
        });
    }

    res.json({ success: true, message: "Xóa lộ trình thành công!" });
  } catch (error) {
    console.error("Lỗi xóa lộ trình:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

// POST /api/saved-routes/:id/share - Tạo share token cho lộ trình đã lưu (Yêu cầu đăng nhập)
router.post("/:id/share", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const token = crypto.randomBytes(16).toString("hex");

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("route_id", sql.Int, parseInt(id))
      .input("user_id", sql.Int, req.user.id)
      .input("share_token", sql.NVarChar(100), token).query(`
                UPDATE SavedRoutes
                SET is_shared = 1, share_token = @share_token
                OUTPUT INSERTED.share_token
                WHERE route_id = @route_id AND user_id = @user_id
            `);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy lộ trình hoặc bạn không có quyền chia sẻ!",
        });
    }

    res.json({ success: true, share_token: result.recordset[0].share_token });
  } catch (error) {
    console.error("Lỗi chia sẻ lộ trình đã lưu:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
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
      is_emergency,
    } = req.body;

    if (
      origin_lat === undefined ||
      origin_lng === undefined ||
      destination_lat === undefined ||
      destination_lng === undefined ||
      !route_data
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Thiếu thông tin tọa độ hoặc dữ liệu lộ trình!",
        });
    }

    const token = crypto.randomBytes(16).toString("hex");

    const pool = await poolPromise;
    const result = await pool
      .request()
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
      .input("profile", sql.NVarChar(20), profile || "driving")
      .input("is_emergency", sql.Bit, is_emergency ? 1 : 0)
      .input("share_token", sql.NVarChar(100), token).query(`
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

    res
      .status(201)
      .json({ success: true, share_token: result.recordset[0].share_token });
  } catch (error) {
    console.error("Lỗi chia sẻ lộ trình trực tiếp:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

module.exports = router;
