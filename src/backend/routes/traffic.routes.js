const express = require("express");
const router = express.Router();

const { sql, poolPromise } = require("../db");
const { authenticateToken } = require("../middleware/auth");

const getExpireAfterMinutes = (type, severity) => {
  const normalizedType = String(type || "").toUpperCase();
  const normalizedSeverity = String(severity || "").toUpperCase();

  if (normalizedType === "FLOOD") {
    if (normalizedSeverity === "LOW") return 30;
    if (normalizedSeverity === "MEDIUM") return 60;
    if (normalizedSeverity === "HIGH") return 90;

    return 60;
  }

  if (normalizedType === "CONGESTION" || normalizedType === "TRAFFIC_JAM") {
    if (normalizedSeverity === "LOW") return 20;
    if (normalizedSeverity === "MEDIUM") return 30;
    if (normalizedSeverity === "HIGH") return 45;

    return 30;
  }

  if (normalizedType === "ACCIDENT") {
    return 90;
  }

  return 30;
};

// GET /api/traffic-alerts - Lấy các cảnh báo giao thông đang hoạt động
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
    SELECT ta.*, u.username AS creator_name
    FROM TrafficAlerts ta
    LEFT JOIN Users u
        ON ta.created_by = u.user_id
    WHERE ta.is_active = 1
  AND ta.expire_at > GETDATE()
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
      affected_area_polygon: alert.affected_area_polygon,
      created_at: alert.created_at,
      updated_at: alert.updated_at,
      last_verified_at: alert.last_verified_at,
      expire_after_minutes: alert.expire_after_minutes,
      expire_at: alert.expire_at,
      like_count: alert.like_count || 0,
      dislike_count: alert.dislike_count || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi lấy danh sách cảnh báo giao thông:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
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
      affected_area_polygon,
    } = req.body;
    const userId = req.user?.userId ?? req.user?.user_id ?? req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người dùng!",
      });
    }

    if (
      !type ||
      !title ||
      latitude === undefined ||
      longitude === undefined ||
      !severity
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc!",
      });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      return res.status(400).json({
        success: false,
        message: "Tọa độ không hợp lệ!",
      });
    }

    const normalizedType = String(type).trim().toUpperCase();
    const normalizedSeverity = String(severity).trim().toUpperCase();

    const expireAfterMinutes = getExpireAfterMinutes(
      normalizedType,
      normalizedSeverity,
    );

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("created_by", sql.Int, userId)
      .input("event_id", sql.Int, event_id || null)
      .input("alert_type", sql.NVarChar(50), normalizedType)
      .input("title", sql.NVarChar(255), title)
      .input("description", sql.NVarChar(sql.MAX), description || null)
      .input("location_name", sql.NVarChar(255), location || null)
      .input("latitude", sql.Decimal(9, 6), parsedLatitude)
      .input("longitude", sql.Decimal(9, 6), parsedLongitude)
      .input("severity", sql.NVarChar(50), normalizedSeverity)
      .input(
        "affected_area_polygon",
        sql.NVarChar(sql.MAX),
        affected_area_polygon || null,
      )
      .input("expire_after_minutes", sql.Int, expireAfterMinutes).query(`
        INSERT INTO dbo.TrafficAlerts (
          created_by,
          event_id,
          alert_type,
          title,
          description,
          location_name,
          latitude,
          longitude,
          severity,
          affected_area_polygon,
          is_active,
          created_at,
          updated_at,
          last_verified_at,
          expire_after_minutes,
          expire_at,
          like_count,
          dislike_count
        )
        OUTPUT
          INSERTED.alert_id,
          INSERTED.last_verified_at,
          INSERTED.expire_after_minutes,
          INSERTED.expire_at,
          INSERTED.like_count,
          INSERTED.dislike_count,
          INSERTED.is_active
        VALUES (
          @created_by,
          @event_id,
          @alert_type,
          @title,
          @description,
          @location_name,
          @latitude,
          @longitude,
          @severity,
          @affected_area_polygon,
          1,
          GETDATE(),
          GETDATE(),
          GETDATE(),
          @expire_after_minutes,
          DATEADD(
            MINUTE,
            @expire_after_minutes,
            GETDATE()
          ),
          0,
          0
        )
      `);

    return res.status(201).json({
      success: true,
      message: "Gửi báo cáo sự cố giao thông thành công!",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Lỗi gửi báo cáo sự cố giao thông:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
});

router.get("/:id/votes", authenticateToken, async (req, res) => {
  try {
    const alertId = Number(req.params.id);
    const userId = req.user?.userId ?? req.user?.user_id ?? req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người dùng!",
      });
    }

    if (!Number.isInteger(alertId) || alertId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID cảnh báo không hợp lệ!",
      });
    }

    const pool = await poolPromise;

    const alertResult = await pool.request().input("alert_id", sql.Int, alertId)
      .query(`
                    SELECT
                        alert_id,
                        like_count,
                        dislike_count,
                        is_active,
                        expire_at
                    FROM TrafficAlerts
                    WHERE alert_id = @alert_id
                `);

    if (alertResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo!",
      });
    }

    const voteResult = await pool
      .request()
      .input("alert_id", sql.Int, alertId)
      .input("user_id", sql.Int, userId).query(`
                    SELECT vote_type
                    FROM TrafficAlertVotes
                    WHERE alert_id = @alert_id
                      AND user_id = @user_id
                `);

    const alert = alertResult.recordset[0];

    return res.json({
      success: true,
      data: {
        alert_id: alert.alert_id,
        like_count: alert.like_count || 0,
        dislike_count: alert.dislike_count || 0,
        my_vote: voteResult.recordset[0]?.vote_type || null,
        is_active: alert.is_active === true || alert.is_active === 1,
        expire_at: alert.expire_at,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin vote:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
});

router.put("/:id/vote", authenticateToken, async (req, res) => {
  let transaction;

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    const alertId = Number(req.params.id);
    const userId = req.user?.userId ?? req.user?.user_id ?? req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người dùng!",
      });
    }
    const voteType = String(req.body.voteType || "").toUpperCase();

    if (!Number.isInteger(alertId) || alertId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID cảnh báo không hợp lệ!",
      });
    }

    if (!["LIKE", "DISLIKE"].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: "voteType chỉ nhận LIKE hoặc DISLIKE!",
      });
    }

    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const alertRequest = new sql.Request(transaction);

    const alertResult = await alertRequest.input("alert_id", sql.Int, alertId)
      .query(`
                        SELECT
                            alert_id,
                            is_active,
                            expire_after_minutes,
                            expire_at
                        FROM TrafficAlerts
                            WITH (
                                UPDLOCK,
                                HOLDLOCK
                            )
                        WHERE alert_id = @alert_id
                    `);

    if (alertResult.recordset.length === 0) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo!",
      });
    }

    const alert = alertResult.recordset[0];

    if (alert.is_active !== true && alert.is_active !== 1) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message: "Cảnh báo đã ngừng hoạt động!",
      });
    }

    if (alert.expire_at && new Date(alert.expire_at) <= new Date()) {
      const expireRequest = new sql.Request(transaction);

      await expireRequest.input("alert_id", sql.Int, alertId).query(`
                        UPDATE TrafficAlerts
                        SET
                            is_active = 0,
                            updated_at = GETDATE()
                        WHERE alert_id = @alert_id
                    `);

      await transaction.commit();

      return res.status(409).json({
        success: false,
        message: "Cảnh báo đã hết hiệu lực!",
      });
    }

    const currentVoteRequest = new sql.Request(transaction);

    const currentVoteResult = await currentVoteRequest
      .input("alert_id", sql.Int, alertId)
      .input("user_id", sql.Int, userId).query(`
                        SELECT vote_type
                        FROM TrafficAlertVotes
                            WITH (
                                UPDLOCK,
                                HOLDLOCK
                            )
                        WHERE alert_id = @alert_id
                          AND user_id = @user_id
                    `);

    const currentVote = currentVoteResult.recordset[0]?.vote_type || null;
    let finalVote = voteType;

    if (currentVote === voteType) {
      const deleteVoteRequest = new sql.Request(transaction);

      await deleteVoteRequest
        .input("alert_id", sql.Int, alertId)
        .input("user_id", sql.Int, userId).query(`
      DELETE FROM TrafficAlertVotes
      WHERE alert_id = @alert_id
        AND user_id = @user_id
    `);

      finalVote = null;
    } else if (!currentVote) {
      const insertVoteRequest = new sql.Request(transaction);

      await insertVoteRequest
        .input("alert_id", sql.Int, alertId)
        .input("user_id", sql.Int, userId)
        .input("vote_type", sql.VarChar(10), voteType).query(`
      INSERT INTO TrafficAlertVotes (
        alert_id,
        user_id,
        vote_type,
        created_at,
        updated_at
      )
      VALUES (
        @alert_id,
        @user_id,
        @vote_type,
        SYSDATETIME(),
        SYSDATETIME()
      )
    `);
    } else {
      const updateVoteRequest = new sql.Request(transaction);

      await updateVoteRequest
        .input("alert_id", sql.Int, alertId)
        .input("user_id", sql.Int, userId)
        .input("vote_type", sql.VarChar(10), voteType).query(`
      UPDATE TrafficAlertVotes
      SET
        vote_type = @vote_type,
        updated_at = SYSDATETIME()
      WHERE alert_id = @alert_id
        AND user_id = @user_id
    `);
    }
    const voteChangedToLike = finalVote === "LIKE" && currentVote !== "LIKE";

    const countRequest = new sql.Request(transaction);

    const countResult = await countRequest.input("alert_id", sql.Int, alertId)
      .query(`
                    SELECT
                        SUM(
                            CASE
                                WHEN vote_type = 'LIKE'
                                THEN 1
                                ELSE 0
                            END
                        ) AS like_count,

                        SUM(
                            CASE
                                WHEN vote_type = 'DISLIKE'
                                THEN 1
                                ELSE 0
                            END
                        ) AS dislike_count
                    FROM TrafficAlertVotes
                    WHERE alert_id = @alert_id
                `);

    const likeCount = countResult.recordset[0].like_count || 0;

    const dislikeCount = countResult.recordset[0].dislike_count || 0;

    const shouldDeactivate = dislikeCount >= 5 && dislikeCount - likeCount >= 5;

    const shouldExtendExpiration = voteChangedToLike;

    const updateAlertRequest = new sql.Request(transaction);

    await updateAlertRequest
      .input("alert_id", sql.Int, alertId)
      .input("like_count", sql.Int, likeCount)
      .input("dislike_count", sql.Int, dislikeCount)
      .input("is_active", sql.Bit, shouldDeactivate ? 0 : 1)
      .input("extend_expiration", sql.Bit, shouldExtendExpiration ? 1 : 0)
      .query(`
                    UPDATE TrafficAlerts
                    SET
                        like_count =
                            @like_count,
                        dislike_count =
                            @dislike_count,
                        is_active =
                            @is_active,

                        last_verified_at =
                            CASE
                                WHEN @extend_expiration = 1
                                THEN GETDATE()
                                ELSE last_verified_at
                            END,

                        expire_at =
                            CASE
                                WHEN @extend_expiration = 1
                                THEN DATEADD(
                                    MINUTE,
                                    expire_after_minutes,
                                    GETDATE()
                                )
                                ELSE expire_at
                            END,

                        updated_at = GETDATE()
                    WHERE alert_id = @alert_id
                `);

    const responseRequest = new sql.Request(transaction);

    const responseResult = await responseRequest.input(
      "alert_id",
      sql.Int,
      alertId,
    ).query(`
                        SELECT
                            alert_id,
                            like_count,
                            dislike_count,
                            last_verified_at,
                            expire_after_minutes,
                            expire_at,
                            is_active
                        FROM TrafficAlerts
                        WHERE alert_id = @alert_id
                    `);

    await transaction.commit();

    return res.json({
      success: true,
      message:
        finalVote === null
          ? "Đã hủy vote!"
          : currentVote
            ? "Đổi vote thành công!"
            : "Vote thành công!",
      data: {
        ...responseResult.recordset[0],
        my_vote: finalVote,
        deactivated: shouldDeactivate,
      },
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {
        // Transaction chưa bắt đầu hoặc đã đóng.
      }
    }

    console.error("Lỗi vote cảnh báo:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi vote cảnh báo!",
      error: error.message,
    });
  }
});

module.exports = router;
