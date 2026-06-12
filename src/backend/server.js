require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("./db");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { sendOtpEmail } = require('./emailService');
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const app = express();

// Cấu hình CORS cho phép Frontend ở cổng 5173 truy cập
app.use(cors({
    origin: "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));

app.use(express.json());

// ============ MIDDLEWARE & UTILS ============

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Thiếu token xác thực!" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Token đã hết hạn!" });
            }
            return res.status(403).json({ message: "Token không hợp lệ!" });
        }
        req.user = user;
        next();
    });
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password) => {
    return password && password.length >= 6;
};

// ================= CHECK BAN STATUS =================

const checkBanStatus = (user) => {
    if (!user) {
        return {
            banned: false
        };
    }

    if (user.is_active === 0 || user.is_active === false) {
        return {
            banned: true,
            message: `Tài khoản đã bị khóa! Lý do: ${user.ban_reason || "Vi phạm chính sách."}`
        };
    }

    return {
        banned: false
    };
};

// Hàm format ngày tháng chính xác (Fix lỗi UTC)
const formatDateTime = (dateObj) => {
    if (!dateObj) return null;
    try {
        const date = new Date(dateObj);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error('🔍 Error in formatDateTime:', error);
        return 'Error formatting date';
    }
};

// ============ ĐĂNG KÝ ============

app.post("/api/auth/register", async (req, res) => {
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

        // Thay thế đoạn kiểm tra trùng lặp trong hàm Đăng ký (Register)
const pool = await poolPromise;
const checkExist = await pool
    .request()
    .input("email", sql.NVarChar, email.toLowerCase())
            .input("username", sql.NVarChar, trimmedUsername)
    .query(
        // CHỈ KIỂM TRA EMAIL TRÙNG LẶP, BỎ KIỂM TRA USERNAME
        "SELECT user_id FROM Users WHERE LOWER(email) = LOWER(@email)"
    );

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

// ============ 2FA ==============

// POST /api/auth/setup-2fa
app.post("/api/auth/setup-2fa", authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email || "admin@danang.gov.vn"; 

        const secret = speakeasy.generateSecret({
            length: 20, 
            name: `DanangSmart:${userEmail}`,
            issuer: "DanangSmart" 
        });

        console.log("👉 Secret Base32 chuẩn gửi về Frontend:", secret.base32); 
        console.log("👉 URL tạo mã QR:", secret.otpauth_url);
        
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
app.post("/api/auth/confirm-2fa", authenticateToken, async (req, res) => {
    try {
        const { code, secret } = req.body;
        console.log("🔍 [DEBUG] Code nhận được:", code);
    console.log("🔍 [DEBUG] Secret nhận được:", secret);
        // 1. Validate đầu vào (Đã làm tốt)
        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, error: { message: "Mã 2FA phải là 6 chữ số!" } });
        }
        
        // 2. Clean secret (Đảm bảo loại bỏ khoảng trắng dư thừa)
        const cleanSecret = secret ? secret.trim() : null;
        if (!cleanSecret) {
            return res.status(400).json({ success: false, error: { message: "Secret không hợp lệ!" } });
        }
        
        const pool = await poolPromise;
        
        // 3. Sử dụng 'verified' để kiểm tra
        const verified = speakeasy.totp.verify({
            secret: cleanSecret, // Sử dụng bản đã trim()
            encoding: "base32",
            token: code,
            window: 1 // Tăng lên window: 2 nếu vẫn thấy lỗi mã sai do lệch giờ
        });
        
        if (!verified) {
            console.warn(`[2FA SECURITY] Failed 2FA for user: ${req.user.id}`);
            return res.status(400).json({ success: false, error: { message: "Mã OTP không chính xác!" } });
        }
        
        // 4. Update Database
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("secret", sql.NVarChar, cleanSecret)
            .query("UPDATE Users SET two_factor_secret = @secret, is_2fa_enabled = 1 WHERE user_id = @user_id");
        
        console.log(`[2FA SECURITY] 2FA enabled for user: ${req.user.id}`);
        res.json({ success: true, message: "K├¡ch hoß║ít 2FA th├ánh c├┤ng!" });
    } catch (error) {
        console.error("[2FA] Confirm error:", error);
        res.status(500).json({ success: false, error: { message: "Lỗi hệ thống!" } });
    }
});

// DELETE /api/auth/disable-2fa
app.delete("/api/auth/disable-2fa", authenticateToken, async (req, res) => {
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
            return res.status(401).json({ 
                success: false, 
                error: { message: "Người dùng không tồn tại!" } 
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.warn(`[2FA SECURITY] Failed password verification for disable-2fa: ${req.user.id}`);
            return res.status(401).json({ 
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

// ============ ĐỔI / TẠO MẬT KHẨU ============
app.put("/api/user/change-password", authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT password_hash FROM Users WHERE user_id = @user_id");

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        // Xử lý kiểm tra mật khẩu hiện tại nếu user ĐÃ CÓ mật khẩu (không phải Google tạo lần đầu)
        if (user.password_hash) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại!" });
            }
            if (currentPassword === newPassword) {
                return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại!" });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) {
                console.warn(`[AUTH SECURITY] Failed change-password attempt for user: ${req.user.id}`);
                // ✅ SỬ DỤNG MÃ 400 (Thay vì 401) ĐỂ KHÔNG BỊ AXIOS ĐÁ VĂNG RA TRANG LOGIN
                return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác!" });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("password_hash", sql.NVarChar, hashedPassword)
            .query("UPDATE Users SET password_hash = @password_hash WHERE user_id = @user_id");

        console.log(`[AUTH] Password changed/created for user: ${req.user.id}`);
        res.json({ message: user.password_hash ? "Đổi mật khẩu thành công!" : "Tạo mật khẩu thành công!" });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

app.post("/api/auth/verify-2fa", async (req, res) => {
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

        // Cập nhật last_login_at
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

// ============ ĐĂNG NHẬP ============
app.post("/api/auth/login", async (req, res) => {
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
            return res.status(401).json({ message: 'Email hoß║╖c mß║¡t khß║⌐u kh├┤ng ch├¡nh x├íc!' });
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

// ============ PROTECTED ROUTES ============

app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT user_id, username, email, role, created_at, last_login_at, password_hash FROM Users WHERE user_id = @user_id");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        const user = result.recordset[0];
        const formattedUser = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: formatDateTime(user.created_at),
            last_login_at: user.last_login_at ? formatDateTime(user.last_login_at) : "Chưa đăng nhập",
            has_password: user.password_hash ? true : false
        };

        res.json({ message: "Lấy dữ liệu thành công!", data: formattedUser });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ============ CẬP NHẬT HỒ SƠ ============
app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const body = req.body || {};
        const username = body.username; 

        if (!username || username.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: "Tên hiển thị không được để trống!" 
            });
        }

        const pool = await poolPromise;
        const trimmedUsername = username.trim();

        // Cập nhật tên thẳng vào Database (Không cần kiểm tra trùng lặp nữa)
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("username", sql.NVarChar, trimmedUsername)
            .query(`
                UPDATE Users 
                SET username = @username 
                WHERE user_id = @user_id
            `);

        res.json({ success: true, message: "Cập nhật hồ sơ thành công!" });
    } catch (error) {
        console.error("❌ Lỗi cập nhật hồ sơ:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi cập nhật", error: error.message });
    }
});

// ============ ADMIN ROUTES ============

app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Truy cập bị từ chối: Cần quyền Admin!' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT user_id, username, email, role, is_active, ban_reason, created_at, last_login_at
            FROM Users
            ORDER BY created_at DESC
        `);
        res.json({ message: "Lấy danh sách người dùng thành công!", data: result.recordset });
    } catch (error) {
        console.error("Admin get users error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

app.put('/api/admin/users/:id/ban', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Truy cập bị từ chối!' });
    }
    try {
        const pool = await poolPromise;
        
        // ÉP KIỂU ID SANG SỐ (INTEGER) TẠI ĐÂY
        const userId = parseInt(req.params.id, 10);
        
        if (isNaN(userId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
        }

        const result = await pool.request()
            .input('ban_reason', sql.NVarChar, req.body.ban_reason || 'Vi phạm chính sách')
            .input('user_id', sql.Int, userId) // Sử dụng biến đã ép kiểu
            .query('UPDATE Users SET is_active = 0, ban_reason = @ban_reason WHERE user_id = @user_id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng này." });
        }

        res.json({ message: "Đã khóa tài khoản thành công" });
    } catch (error) {
        console.error("❌ LỖI SQL KHI KHÓA TÀI KHOẢN:", error);
        res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username) return res.status(400).json({ message: "Vui l├▓ng nhß║¡p username!" });
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) return res.status(400).json({ message: "Username phß║úi c├│ ├¡t nhß║Ñt 3 k├╜ tß╗▒!" });

        const pool = await poolPromise;
        await pool
            .request()
            .input("user_id", sql.Int, userId)
            .input("username", sql.NVarChar, trimmedUsername)
            .query("UPDATE Users SET username = @username WHERE user_id = @user_id");

        console.log(`[USER] Profile updated for user: ${userId}`);
        res.json({ message: "Cß║¡p nhß║¡t profile th├ánh c├┤ng!" });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Lß╗ùi server", error: error.message });
    }
});

// ============ FORGOT PASSWORD ============

app.post('/api/auth/forgot-password', async (req, res) => {
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

app.post('/api/auth/verify-otp', async (req, res) => {
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

app.post('/api/auth/reset-password', async (req, res) => {
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

app.post('/api/auth/resend-otp', async (req, res) => {
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

// ============ EVENTS ============

app.post("/api/events", authenticateToken, async (req, res) => {
    try {
        const { Title, TimeRange, EventDate, Location, Status, IsLive, CrowdLevel, Description } = req.body;

        if (!Title || !EventDate || !Location) return res.status(400).json({ message: "Thiếu thông tin sự kiện!" });

        const pool = await poolPromise;
        await pool
            .request()
            .input("Title", sql.NVarChar, Title)
            .input("TimeRange", sql.NVarChar, TimeRange || null)
            .input("EventDate", sql.NVarChar, EventDate)
            .input("Location", sql.NVarChar, Location)
            .input("Status", sql.NVarChar, Status || "pending")
            .input("IsLive", sql.Bit, IsLive || 0)
            .input("CrowdLevel", sql.NVarChar, CrowdLevel || "low")
            .input("Description", sql.NVarChar, Description || null)
            .query(`INSERT INTO Events (Title, TimeRange, EventDate, Location, Status, IsLive, CrowdLevel, Description) 
                    VALUES (@Title, @TimeRange, @EventDate, @Location, @Status, @IsLive, @CrowdLevel, @Description)`);

        console.log(`[EVENTS] New event created: ${Title}`);
        res.status(201).json({ message: "Lưu sự kiện thành công!" });
    } catch (error) {
        console.error("Add event error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// GET /api/events
app.get("/api/events", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .query(`
                SELECT 
                    event_id, 
                    category_id,
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
                    is_featured,
                    is_free,
                    ticket_price,
                    view_count,
                    favorite_count,
                    created_at,
                    updated_at
                FROM Events 
                ORDER BY start_time DESC
            `);

        res.json({
            message: "Lấy danh sách sự kiện thành công!",
            data: result.recordset,
        });
    } catch (error) {
        console.error("Lỗi lấy sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/events
app.post("/api/events", async (req, res) => {
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
            contact_email,
            website_url
        } = req.body;

        // Γ£à Validate required fields
        if (!title || !start_time || !location_name) {
            return res.status(400).json({ message: "Thiß║┐u th├┤ng tin bß║»t buß╗Öc!" });
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
            .input("latitude", sql.Decimal, latitude || 0)
            .input("longitude", sql.Decimal, longitude || 0)
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
            .input("contact_email", sql.NVarChar, contact_email || null)
            .input("website_url", sql.NVarChar, website_url || null)
            .query(`
                INSERT INTO Events (
                    category_id, created_by, title, short_description, description,
                    location_name, latitude, longitude, address, district,
                    start_time, end_time, banner_url, thumbnail_url, status,
                    is_featured, is_free, ticket_price, organizer_name, contact_email,
                    website_url, created_at, updated_at
                )
                VALUES (
                    @category_id, @created_by, @title, @short_description, @description,
                    @location_name, @latitude, @longitude, @address, @district,
                    @start_time, @end_time, @banner_url, @thumbnail_url, @status,
                    @is_featured, @is_free, @ticket_price, @organizer_name, @contact_email,
                    @website_url, GETDATE(), GETDATE()
                )
            `);

        console.log(`[EVENTS] New event created: ${title}`);
        res.status(201).json({ message: "L╞░u sß╗▒ kiß╗çn th├ánh c├┤ng!" });
    } catch (error) {
        console.error("Add event error:", error);
        res.status(500).json({ message: "Lß╗ùi server", error: error.message });
    }
});

// ============ FLOOD ZONES ============
app.get("/api/flood-zones", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM FloodZones where is_active = 1 ");

        res.json({
            message: "Lß║Ñy dß╗» liß╗çu v├╣ng ngß║¡p lß╗Ñt th├ánh c├┤ng",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lß╗ùi lß║Ñy dß╗» liß╗çu FloodZones:", error);
        res.status(500).json({ message: "Lß╗ùi server", error: error.message });
    }
});

// ============ POIs (Points of Interest) ============

// GET /api/pois - Lß║Ñy danh s├ích tß║Ñt cß║ú POIs (c├│ thß╗â lß╗ìc theo category)
app.get("/api/pois", async (req, res) => {
    try {
        const { category_id } = req.query;
        const pool = await poolPromise;

        let query = `
            SELECT 
                p.poi_id,
                p.name,
                p.latitude,
                p.longitude,
                p.address,
                p.description,
                p.image_url,
                p.website_url,
                p.phone_number,
                p.rating,
                p.is_featured,
                p.is_active,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color_code AS category_color
            FROM POIs p
            LEFT JOIN POIsCategories c ON p.category_id = c.id
            WHERE p.is_active = 1
        `;

        const request = pool.request();

        if (category_id) {
            query += ` AND p.category_id = @category_id`;
            request.input("category_id", sql.Int, parseInt(category_id));
        }

        query += ` ORDER BY p.is_featured DESC, p.rating DESC`;

        const result = await request.query(query);

        res.json({
            message: "Lß║Ñy danh s├ích POI th├ánh c├┤ng!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lß╗ùi lß║Ñy dß╗» liß╗çu POIs:", error);
        res.status(500).json({ message: "Lß╗ùi server", error: error.message });
    }
});

// GET /api/poi-categories - Lß║Ñy danh s├ích tß║Ñt cß║ú POI categories
app.get("/api/poi-categories", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(
            "SELECT id, name, icon, color_code, description FROM POIsCategories ORDER BY id"
        );

        res.json({
            message: "Lß║Ñy danh s├ích POI categories th├ánh c├┤ng!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lß╗ùi lß║Ñy dß╗» liß╗çu POIsCategories:", error);
        res.status(500).json({ message: "Lß╗ùi server", error: error.message });
    }
});

// ============ ─É─éNG NHß║¼P GOOGLE ============

app.post("/api/auth/google", async (req, res) => {
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

        // Cập nhật last_login_at cho Google Login
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

// ============ SERVER STARTUP ============

const PORT = process.env.PORT || 5001;
app
    .listen(PORT, () => {
        console.log(`🚀 Server backend tại http://localhost:${PORT}`);
        console.log(`✅ Kết nối Database thành công!`);
    })
    .on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`❌ Cổng ${PORT} đang bị sử dụng!`);
        } else {
            console.error("❌ Lỗi Server:", err);
        }
    });