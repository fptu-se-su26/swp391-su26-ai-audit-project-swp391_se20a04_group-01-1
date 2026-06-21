const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

// ============ /api/user/* ============

router.get("/profile", authenticateToken, userController.getProfile);

// LƯU Ý: file gốc có 2 route PUT /api/user/profile trùng nhau (dòng 531 và 743).
// Route đăng ký trước sẽ luôn thắng, route sau không bao giờ chạy tới (Express xử lý tuần tự).
// Giữ nguyên thứ tự gốc để không đổi hành vi hiện tại:
router.put("/profile", authenticateToken, userController.updateProfile);     // route thực sự chạy
router.put("/profile", authenticateToken, userController.updateProfileV2);   // route chết, không bao giờ được gọi

router.put("/change-password", authenticateToken, authController.changePassword);
router.get("/favorites/events", authenticateToken, userController.getFavoriteEvents);

module.exports = router;