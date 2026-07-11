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
            .input("username", sql.NVarChar, trimmedUsername)
            .query("SELECT user_id, email FROM Users WHERE LOWER(email) = LOWER(@email) OR username = @username");

        if (checkExist.recordset.length > 0) {
            const emailTaken = checkExist.recordset.some(r => r.email.toLowerCase() === email.toLowerCase());
            if (emailTaken) return res.status(400).json({ message: "Email này đã được đăng ký!" });
            return res.status(400).json({ message: "Username này đã được sử dụng!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 🔴 THAY ĐỔI: Thêm is_email_verified = 0 khi tạo user
        await pool
            .request()
            .input("username", sql.NVarChar, trimmedUsername)
            .input("email", sql.NVarChar, email.toLowerCase())
            .input("password_hash", sql.NVarChar, hashedPassword)
            .input("role", sql.NVarChar, "user")
            .input("is_email_verified", sql.Bit, 0)  // ← THÊM DÒNG NÀY
            .query(`INSERT INTO Users (username, email, password_hash, role, is_email_verified) 
                    VALUES (@username, @email, @password_hash, @role, @is_email_verified)`);

        console.log(`[AUTH] New user registered: ${email}`);

        // TẠO VÀ GỬI OTP (Đã đưa vào trong hàm async)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('otp', sql.NVarChar, otp)
            .query("UPDATE Users SET otp = @otp, otp_expires = DATEADD(minute, 5, GETDATE()) WHERE LOWER(email) = LOWER(@email)");

        await sendOtpEmail(email, otp);

        return res.status(201).json({ 
            message: "Tạo tài khoản thành công! Vui lòng kiểm tra email để xác minh.",
            requiresEmailVerification: true 
        });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/auth/verify-register-otp
router.post('/verify-register-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Kiểm tra đầu vào
        if (!email || !otp) {
            return res.status(400).json({ message: "Vui lòng cung cấp email và mã OTP!" });
        }

        const pool = await poolPromise;

        // 2. Kiểm tra xem OTP có khớp và còn hạn không
        const result = await pool.request()
            .input("email", sql.NVarChar, email.toLowerCase())
            .input("otp", sql.NVarChar, otp)
            .query(`
                SELECT user_id, otp_expires 
                FROM Users 
                WHERE LOWER(email) = LOWER(@email) 
                AND otp = @otp
            `);

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: "Mã OTP không chính xác!" });
        }

        const user = result.recordset[0];

        // 3. Kiểm tra hạn sử dụng
        if (new Date() > new Date(user.otp_expires)) {
            return res.status(400).json({ message: "Mã OTP đã hết hạn!" });
        }

        // 🔴 THAY ĐỔI: Cập nhật is_email_verified = 1 thay vì is_email_verified
        await pool.request()
            .input("email", sql.NVarChar, email.toLowerCase())
            .query(`
                UPDATE Users 
                SET is_email_verified = 1, 
                    otp = NULL, 
                    otp_expires = NULL 
                WHERE LOWER(email) = LOWER(@email)
            `);

        return res.json({ 
            success: true, 
            message: "Xác thực email thành công! Bạn có thể đăng nhập ngay." 
        });

    } catch (error) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
});

// POST /api/auth/resend-register-otp (🆕 ENDPOINT MỚI)
router.post('/resend-register-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Vui lòng nhập email!" });
        }
        
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Email không hợp lệ!" });
        }

        const pool = await poolPromise;
        
        // Kiểm tra user có tồn tại không
        const user = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query('SELECT user_id, is_email_verified FROM Users WHERE LOWER(email) = LOWER(@email)');

        if (user.recordset.length === 0) {
            return res.status(404).json({ message: "Email không tồn tại!" });
        }
        
        // Nếu đã xác minh rồi, báo lỗi
        if (user.recordset[0].is_email_verified) {
            return res.status(400).json({ message: "Tài khoản này đã được xác minh!" });
        }

        // Tạo OTP mới
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Cập nhật OTP và hạn sử dụng
        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('otp', sql.NVarChar, otp)
            .query("UPDATE Users SET otp = @otp, otp_expires = DATEADD(minute, 5, GETDATE()) WHERE LOWER(email) = LOWER(@email)");

        // Gửi email
        await sendOtpEmail(email, otp);

        return res.json({ message: "Mã OTP mới đã được gửi tới email!" });
        
    } catch (error) {
        console.error('Resend register OTP error:', error);
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
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
            { expiresIn: "30s" }
        );

        const refreshToken = jwt.sign(
            { id: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // Hạn dài
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .input('token', sql.NVarChar, refreshToken)
            .input('expires_at', sql.DateTime, expiresAt)
            .query('INSERT INTO RefreshTokens (user_id, token, expires_at) VALUES (@user_id, @token, @expires_at)');

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('access_token', token, {
            httpOnly: true, secure: isProduction, sameSite: 'strict', maxAge: 15 * 60 * 1000
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true, secure: isProduction, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            role: user.role,
            user: { id: user.user_id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error("Google Auth Error:", err);
        res.status(401).json({ message: "Xác thực Google thất bại" });
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
                SELECT user_id, username, email, password_hash, role, is_active, ban_reason, is_email_verified 
                FROM Users
                WHERE LOWER(email)=LOWER(@email)
            `); 

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác!" });
        }
        
        // 🔴 THAY ĐỔI: Kiểm tra is_email_verified TRƯỚC khi kiểm tra password
        if (!user.is_email_verified) {
            return res.status(403).json({ 
                requiresEmailVerification: true,
                message: "Vui lòng xác minh email trước khi đăng nhập!", 
                email: user.email 
            });
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

        // Access Token
        const token = jwt.sign(
            {
                id: user.user_id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Refresh Token
        const refreshToken = jwt.sign(
            {
                id: user.user_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Lưu Refresh Token
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .input('token', sql.NVarChar, refreshToken)
            .input(
                'expires_at',
                sql.DateTime,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            )
            .query(`
                INSERT INTO RefreshTokens(user_id, token, expires_at)
                VALUES(@user_id,@token,@expires_at)
            `);

        console.log(`[AUTH] Successful login: ${email}`);

        res.json({
            token,
            refresh_token: refreshToken,
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
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token không hợp lệ!" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const email = payload.email;
        const username = payload.name || payload.email.split('@')[0];

        const pool = await poolPromise;

        let user = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT user_id, email, username, role FROM Users WHERE LOWER(email) = LOWER(@email)');

        if (user.recordset.length === 0) {
            // Tạo user mới từ Google
            await pool.request()
                .input('username', sql.NVarChar, username)
                .input('email', sql.NVarChar, email)
                .input('password_hash', sql.NVarChar, 'google_auth')
                .input('role', sql.NVarChar, 'user')
                .input('is_email_verified', sql.Bit, 1) // Google tự verify
                .query(`
                    INSERT INTO Users (username, email, password_hash, role, is_email_verified)
                    VALUES (@username, @email, @password_hash, @role, @is_email_verified)
                `);

            user = await pool.request()
                .input('email', sql.NVarChar, email)
                .query('SELECT user_id, email, username, role FROM Users WHERE LOWER(email) = LOWER(@email)');
        }

        const userData = user.recordset[0];

        const jwtToken = jwt.sign(
            { id: userData.user_id, email: userData.email, role: userData.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: userData.user_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        await pool.request()
            .input('user_id', sql.Int, userData.user_id)
            .input('token', sql.NVarChar, refreshToken)
            .input('expires_at', sql.DateTime, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
            .query('INSERT INTO RefreshTokens (user_id, token, expires_at) VALUES (@user_id, @token, @expires_at)');

        res.json({
            token: jwtToken,
            refresh_token: refreshToken,
            role: userData.role,
            user: {
                id: userData.user_id,
                username: userData.username,
                email: userData.email,
                role: userData.role
            }
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
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

        if (user.recordset.length === 0) return res.status(404).json({ message: 'Email không tồn tại!' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
        res.json({ message: 'OTP xác nhận đã được gửi tới email!' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email và OTP là bắt buộc!' });

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('otp', sql.NVarChar, otp)
            .query(`
                SELECT verification_id, expires_at 
                FROM VerificationCodes 
                WHERE LOWER(email) = LOWER(@email) 
                AND otp_code = @otp 
                AND otp_type = 'RESET_PASSWORD'
                AND is_used = 0
            `);

        if (result.recordset.length === 0) return res.status(400).json({ message: 'Mã OTP không chính xác!' });

        const record = result.recordset[0];
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn!' });
        }

        res.json({ message: 'Xác thực OTP thành công!' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP và mật khẩu mới là bắt buộc!' });
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự!' });
        }

        const pool = await poolPromise;

        // 1. Kiểm tra xem OTP có hợp lệ không
        const checkOtp = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('otp', sql.NVarChar, otp)
            .query(`
                SELECT verification_id, expires_at 
                FROM VerificationCodes 
                WHERE LOWER(email) = LOWER(@email) 
                AND otp_code = @otp 
                AND otp_type = 'RESET_PASSWORD'
                AND is_used = 0
            `);

        // 2. Nếu không tìm thấy (chưa xác thực hoặc đã quá 10 phút)
        if (checkOtp.recordset.length === 0) {
            // Tùy chọn: Xóa các mã OTP cũ của email này để làm sạch database
            await pool.request()
                .input('email', sql.NVarChar, email.toLowerCase())
                .query("DELETE FROM VerificationCodes WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD'");
            
            return res.status(400).json({ message: 'Phiên xác thực đã hết hạn (quá 10 phút) hoặc chưa được xác thực. Vui lòng yêu cầu OTP mới!' });
        }

        // 3. Nếu hợp lệ, tiến hành băm mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Cập nhật mật khẩu mới vào bảng Users
        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET password_hash = @password_hash WHERE LOWER(email) = LOWER(@email)');

        // 5. Xóa mã OTP sau khi đổi mật khẩu thành công để không bị dùng lại
        await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query("DELETE FROM VerificationCodes WHERE LOWER(email) = LOWER(@email) AND otp_type = 'RESET_PASSWORD'");

        console.log(`[AUTH] Password reset for: ${email}`);
        return res.json({ message: 'Mật khẩu đã được reset thành công!' });
        
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ message: 'Lỗi server', error: error.message });
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

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(401).json({
                message: 'Missing refresh token'
            });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input('token', sql.NVarChar, refresh_token)
            .query(`
                SELECT *
                FROM RefreshTokens
                WHERE token=@token
                AND is_revoked=0
                AND expires_at > GETDATE()
            `);

        if (result.recordset.length === 0) {
            return res.status(403).json({
                message: 'Token không hợp lệ'
            });
        }

        const decoded = jwt.verify(
            refresh_token,
            process.env.JWT_SECRET
        );

        const userResult = await pool.request()
            .input('user_id', sql.Int, decoded.id)
            .query(`
                SELECT user_id,email,username,role
                FROM Users
                WHERE user_id=@user_id
            `);

        const user = userResult.recordset[0];

        if (!user) {
            return res.status(404).json({
                message: 'Người dùng không tồn tại'
            });
        }

        // Access Token mới
        const newAccessToken = jwt.sign(
            {
                id: user.user_id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '15m'
            }
        );

        // Refresh Token mới
        const newRefreshToken = jwt.sign(
            {
                id: user.user_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        // revoke token cũ
        await pool.request()
            .input('token', sql.NVarChar, refresh_token)
            .query(`
                UPDATE RefreshTokens
                SET is_revoked=1
                WHERE token=@token
            `);

        // insert token mới
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .input('token', sql.NVarChar, newRefreshToken)
            .input(
                'expires_at',
                sql.DateTime,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            )
            .query(`
                INSERT INTO RefreshTokens
                (user_id,token,expires_at)
                VALUES
                (@user_id,@token,@expires_at)
            `);

        res.json({
            token: newAccessToken,
            refresh_token: newRefreshToken
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: 'Lỗi server'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {

        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                message: 'Missing refresh token'
            });
        }

        const pool = await poolPromise;

        await pool.request()
            .input('token', sql.NVarChar, refresh_token)
            .query(`
                UPDATE RefreshTokens
                SET is_revoked=1
                WHERE token=@token
            `);

        res.json({
            message: 'Đã đăng xuất'
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: 'Lỗi server'
        });
    }
});

module.exports = router;
