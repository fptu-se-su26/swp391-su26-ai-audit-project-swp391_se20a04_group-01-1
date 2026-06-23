const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');

const { sql, poolPromise } = require('../db');
const { sendOtpEmail } = require('../emailService');
const { authenticateToken } = require('../middleware/auth');
const { isValidEmail, isValidPassword, checkBanStatus } = require('../utils/helpers');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Email không hợp lệ!" });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
            return res.status(400).json({ message: "Username phải có ít nhất 3 ký tự!" });
        }

        const pool = await poolPromise;
        const checkExist = await pool
            .request()
            .input("email", sql.NVarChar, email.toLowerCase())
            .query("SELECT user_id FROM Users WHERE LOWER(email) = LOWER(@email)");

        if (checkExist.recordset.length > 0) {
            return res.status(400).json({ message: "Email này đã được đăng ký!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool
            .request()
            .input("username", sql.NVarChar, trimmedUsername)
            .input("email", sql.NVarChar, email.toLowerCase())
            .input("password_hash", sql.NVarChar, hashedPassword)
            .input("role", sql.NVarChar, "user")
            .query(`INSERT INTO Users (username, email, password_hash, role) 
                    VALUES (@username, @email, @password_hash, @role)`);

        console.log(`[AUTH] New user registered: ${email}`);
        res.status(201).json({ message: "Tạo tài khoản thành công!" });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/auth/setup-2fa
router.post('/setup-2fa', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email || "admin@danang.gov.vn"; 

        const secret = speakeasy.generateSecret({
            length: 20, 
            name: `DanangSmart:${userEmail}`,
            issuer: "DanangSmart" 
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        res.json({
            success: true,
            data: {
                qrCode: qrCodeUrl,
                secret: secret.base32 
            }
        });
    } catch (error) {
        console.error("Lỗi sập hệ thống tại setup-2fa:", error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// POST /api/auth/confirm-2fa
router.post('/confirm-2fa', authenticateToken, async (req, res) => {
    try {
        const { code, secret } = req.body;
        console.log("🔍 [DEBUG] Code nhận được:", code);
        console.log("🔍 [DEBUG] Secret nhận được:", secret);
        
        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, error: { message: "Mã 2FA phải là 6 chữ số!" } });
        }
        
        const cleanSecret = secret ? secret.trim() : null;
        if (!cleanSecret) {
            return res.status(400).json({ success: false, error: { message: "Secret không hợp lệ!" } });
        }
        
        const pool = await poolPromise;
        const verified = speakeasy.totp.verify({
            secret: cleanSecret,
            encoding: "base32",
            token: code,
            window: 1
        });
        
        if (!verified) {
            console.warn(`[2FA SECURITY] Failed 2FA for user: ${req.user.id}`);
            return res.status(400).json({ success: false, error: { message: "Mã OTP không chính xác!" } });
        }
        
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("secret", sql.NVarChar, cleanSecret)
            .query("UPDATE Users SET two_factor_secret = @secret, is_2fa_enabled = 1 WHERE user_id = @user_id");
        
        console.log(`[2FA SECURITY] 2FA enabled for user: ${req.user.id}`);
        res.json({ success: true, message: "Kích hoạt 2FA thành công!" });
    } catch (error) {
        console.error("[2FA] Confirm error:", error);
        res.status(500).json({ success: false, error: { message: "Lỗi hệ thống!" } });
    }
});

// DELETE /api/auth/disable-2fa
router.delete('/disable-2fa', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: { message: "Mật khẩu là bắt buộc!" } 
            });
        }
        
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT password_hash FROM Users WHERE user_id = @user_id");
        
        const user = result.recordset[0];
        if (!user) {
            console.warn(`[2FA] User not found: ${req.user.id}`);
            return res.status(400).json({ 
                success: false, 
                error: { message: "Người dùng không tồn tại!" } 
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.warn(`[2FA SECURITY] Failed password verification for disable-2fa: ${req.user.id}`);
            return res.status(400).json({ 
                success: false, 
                error: { message: "Mật khẩu không chính xác!" } 
            });
        }
        
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("UPDATE Users SET is_2fa_enabled = 0, two_factor_secret = NULL WHERE user_id = @user_id");
        
        console.log(`[2FA SECURITY] 2FA disabled for user: ${req.user.id}`);
        res.json({ success: true, message: "Tắt 2FA thành công!" });
    } catch (error) {
        console.error("[2FA] Disable error:", error);
        res.status(500).json({ 
            success: false, 
            error: { message: "Lỗi tắt 2FA!" } 
        });
    }
});

// POST /api/auth/verify-2fa
router.post('/verify-2fa', async (req, res) => {
    try {
        const { code, temp_token } = req.body;
        
        if (!code || !temp_token) {
            return res.status(400).json({ success: false, error: { message: "Mã 2FA và token là bắt buộc!" } });
        }
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, error: { message: "Mã 2FA phải là 6 chữ số!" } });
        }

        const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
        if (!decoded.temp) {
            return res.status(400).json({ success: false, error: { message: "Mã token tạm không hợp lệ!" } });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, decoded.id)
            .query("SELECT user_id, username, email, role, two_factor_secret FROM Users WHERE user_id = @user_id");
        
        const user = result.recordset[0];
        if (!user) {
            console.warn(`[2FA SECURITY] User not found for 2FA verification: ${decoded.id}`);
            return res.status(400).json({ success: false, error: { message: "Người dùng không tồn tại!" } });
        }
        if (!user.two_factor_secret) {
            console.warn(`[2FA SECURITY] No 2FA secret found for user: ${user.user_id}`);
            return res.status(400).json({ success: false, error: { message: "Chưa bật 2FA cho tài khoản này!" } });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: "base32",
            token: code,
            window: 1
        });

        if (verified !== true) {
            console.warn(`[2FA SECURITY] Failed 2FA verification for user: ${user.user_id}`);
            return res.status(400).json({ success: false, error: { message: "Mã OTP không chính xác!" } });
        }

        console.log(`[2FA SECURITY] Successful 2FA verification for user: ${user.user_id}`);

        await pool.request()
            .input("user_id", sql.Int, user.user_id)
            .query("UPDATE Users SET last_login_at = GETDATE() WHERE user_id = @user_id");

        const token = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            access_token: token,
            user: { id: user.user_id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("[2FA SECURITY] 2FA verification error:", error);
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, error: { message: "Phiên xác thực hết hạn!" } });
        }
        res.status(500).json({ success: false, error: { message: "Lỗi xác thực 2FA!" } });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu!" });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Email không hợp lệ!" });
        }

        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("email", sql.NVarChar, email.toLowerCase())
            .query(`
                SELECT user_id, username, email, password_hash, role, is_active, ban_reason
                FROM Users
                WHERE LOWER(email)=LOWER(@email)
            `);

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác!" });
        }

        const banCheck = checkBanStatus(user);
        if (banCheck.banned) {
            return res.status(403).json({ message: banCheck.message });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.warn(`[AUTH] Failed login attempt for: ${email}`);
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const userDb = await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query('SELECT is_2fa_enabled, role FROM Users WHERE user_id = @user_id');

        const dbUser = userDb.recordset[0];
        const is2FA = dbUser?.is_2fa_enabled;
        const userRole = dbUser?.role;

        if (userRole === 'admin' && is2FA) {
            const tempToken = jwt.sign(
                { id: user.user_id, email: user.email, temp: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            console.log(`[AUTH] Admin login requires 2FA: ${email}`);
            return res.json({ requires2FA: true, tempToken, email: user.email });
        }

        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query('UPDATE Users SET last_login_at = GETDATE() WHERE user_id = @user_id');

        const token = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log(`[AUTH] Successful login: ${email}`);
        res.json({
            token,
            role: user.role,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        if (!email || !isValidEmail(email)) return res.status(400).json({ message: "Email không hợp lệ!" });

        const pool = await poolPromise;
        let result = await pool
            .request()
            .input("email", sql.NVarChar, email.toLowerCase())
            .query(`
                SELECT user_id, username, email, role, password_hash, is_active, ban_reason
                FROM Users
                WHERE LOWER(email)=LOWER(@email)
            `);

        let user = result.recordset[0];

        if (!user) {
            await pool
                .request()
                .input("username", sql.NVarChar, name || email.split('@')[0])
                .input("email", sql.NVarChar, email.toLowerCase())
                .input("role", sql.NVarChar, "user")
                .query("INSERT INTO Users (username, email, role) VALUES (@username, @email, @role)");

            result = await pool
                .request()
                .input("email", sql.NVarChar, email.toLowerCase())
                .query("SELECT * FROM Users WHERE LOWER(email) = LOWER(@email)");
            
            user = result.recordset[0];
            if (!user) return res.status(500).json({ message: "Không thể tạo người dùng mới!" });
            console.log(`[AUTH] New Google user created: ${email}`);
        } else {
            console.log(`[AUTH] Google user login: ${email}`);
        }
        
        const banCheck = checkBanStatus(user);
        if (banCheck.banned) {
            return res.status(403).json({ message: banCheck.message });
        }

        await pool.request()
            .input("user_id", sql.Int, user.user_id)
            .query("UPDATE Users SET last_login_at = GETDATE() WHERE user_id = @user_id");

        const jwtToken = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" },
        );

        res.json({
            token: jwtToken,
            role: user.role,
            user: { id: user.user_id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error("Google Auth Error:", err);
        res.status(401).json({ message: "Xác thực Google thất bại" });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Vui lòng nhập email!' });
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Email không hợp lệ!' });

        const pool = await poolPromise;
        const user = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query('SELECT user_id FROM Users WHERE LOWER(email) = LOWER(@email)');

        if (user.recordset.length === 0) return res.status(404).json({ message: 'Email không tồn tại trong hệ thống!' });

        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query("DELETE FROM VerificationCodes WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD'");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('otp', sql.NVarChar, otp)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                INSERT INTO VerificationCodes (user_id, otp_code, otp_type, email, expires_at, is_used)
                VALUES (
                    (SELECT TOP 1 user_id FROM Users WHERE LOWER(email) = LOWER(@email)), 
                    @otp, 'RESET_PASSWORD', @email, @expiresAt, 0
                )
            `);

        await sendOtpEmail(email, otp);
        res.json({ message: 'OTP đã được gửi tới email của bạn!' });
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Vui lòng nhập email và OTP!' });
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Email không hợp lệ!' });
        if (!/^\d{6}$/.test(otp.toString())) return res.status(400).json({ message: 'OTP phải là 6 chữ số!' });

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query(`
                SELECT TOP 1 otp_id, otp_code, expires_at, is_used 
                FROM VerificationCodes 
                WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD' AND is_used = 0 
                ORDER BY created_at DESC
            `);

        if (result.recordset.length === 0) return res.status(404).json({ message: 'Yêu cầu reset mật khẩu không tồn tại!' });

        const record = result.recordset[0];
        if (new Date() > new Date(record.expires_at)) return res.status(400).json({ message: 'OTP đã hết hạn! Vui lòng yêu cầu OTP mới.' });

        if (String(record.otp_code).trim() !== String(otp).trim()) {
            console.warn(`[AUTH SECURITY] Failed OTP verification for: ${email}`);
            return res.status(400).json({ message: 'OTP không chính xác!' });
        }

        await pool.request()
            .input('otp_id', sql.Int, record.otp_id)
            .query('UPDATE VerificationCodes SET is_used = 1 WHERE otp_id = @otp_id');

        console.log(`[AUTH] OTP verified for: ${email}`);
        res.json({ message: 'OTP xác thực thành công!' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu mới!' });
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Email không hợp lệ!' });
        if (!isValidPassword(newPassword)) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự!' });

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query(`
                SELECT TOP 1 is_used 
                FROM VerificationCodes 
                WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD' AND is_used = 1 
                ORDER BY created_at DESC
            `);

        if (result.recordset.length === 0 || !result.recordset[0].is_used) {
            return res.status(400).json({ message: 'OTP chưa được xác thực!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET password_hash = @password_hash WHERE LOWER(email) = LOWER(@email)');

        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query("DELETE FROM VerificationCodes WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD'");

        console.log(`[AUTH] Password reset for: ${email}`);
        res.json({ message: 'Mật khẩu đã được reset thành công!' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Vui lòng nhập email!' });
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Email không hợp lệ!' });

        const pool = await poolPromise;
        const user = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query('SELECT user_id FROM Users WHERE LOWER(email) = LOWER(@email)');

        if (user.recordset.length === 0) return res.status(404).json({ message: 'Email không tồn tại!' });

        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query("DELETE FROM VerificationCodes WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD'");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('otp', sql.NVarChar, otp)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                INSERT INTO VerificationCodes (user_id, otp_code, otp_type, email, expires_at, is_used)
                VALUES (
                    (SELECT TOP 1 user_id FROM Users WHERE LOWER(email) = LOWER(@email)), 
                    @otp, 'RESET_PASSWORD', @email, @expiresAt, 0
                )
            `);

        await sendOtpEmail(email, otp);
        res.json({ message: 'OTP mới đã được gửi tới email!' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

module.exports = router;
