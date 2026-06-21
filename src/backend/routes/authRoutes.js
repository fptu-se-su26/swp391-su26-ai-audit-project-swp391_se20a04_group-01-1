const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);

// 2FA
router.post("/setup-2fa", authenticateToken, authController.setup2FA);
router.post("/confirm-2fa", authenticateToken, authController.confirm2FA);
router.delete("/disable-2fa", authenticateToken, authController.disable2FA);
router.post("/verify-2fa", authController.verify2FA);

// Forgot / Reset password
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-otp", authController.resendOtp);

module.exports = router;