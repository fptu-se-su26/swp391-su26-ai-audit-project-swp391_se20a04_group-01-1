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

const parseTimeToDate = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
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
        res.json({ success: true, message: "Kích hoạt 2FA thành công!" });
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
            return res.status(400).json({ 
                success: false, 
                error: { message: "Người dùng không tồn tại!" } 
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.warn(`[2FA SECURITY] Failed password verification for disable-2fa: ${req.user.id}`);
            // ✅ SỬ DỤNG MÃ 400 (Thay vì 401) ĐỂ KHÔNG BỊ AXIOS ĐÁ VĂNG RA TRANG LOGIN
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

// ============ ADMIN FLOOD ZONES ============
app.get('/api/admin/flood-zones', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Cần quyền Admin!' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                zone_id,
                zone_name,
                district,
                risk_level,
                polygon_coordinates,
                description,
                typical_flood_months,
                is_active,
                last_updated,
                updated_by
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
                last_updated: zone.last_updated ? zone.last_updated.toISOString().split('T')[0] : '',
                updated_by: zone.updated_by,
                
                center: Array.isArray(coordinates) && typeof coordinates[0] === "number"
                    ? coordinates
                    : null,
                radius,
                depthCm,
                level,
                color,
                depthValue: depthCm / 100,
                depthLevel: level,
                bypassPosition: null,
                bypassOptions: []
            };
        });

        res.json({
            success: true,
            message: "Lấy tất cả vùng ngập lụt thành công",
            data
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu FloodZones cho admin:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

app.put('/api/admin/flood-zones/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Truy cập bị từ chối!' });
    }
    try {
        const pool = await poolPromise;
        const zoneId = parseInt(req.params.id, 10);
        if (isNaN(zoneId)) {
            return res.status(400).json({ success: false, message: "ID vùng ngập lụt không hợp lệ!" });
        }
        
        const { is_active } = req.body;
        if (is_active === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu trạng thái is_active!" });
        }

        const activeBit = is_active ? 1 : 0;
        const updatedBy = req.user.id;

        await pool.request()
            .input('is_active', sql.Bit, activeBit)
            .input('updated_by', sql.Int, updatedBy)
            .input('zone_id', sql.Int, zoneId)
            .query(`
                UPDATE FloodZones 
                SET is_active = @is_active, 
                    last_updated = GETDATE(), 
                    updated_by = @updated_by 
                WHERE zone_id = @zone_id
            `);

        res.json({
            success: true,
            message: "Cập nhật trạng thái vùng ngập lụt thành công!"
        });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái FloodZone:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});


app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username) return res.status(400).json({ message: "Vui lòng nhập username!" });
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) return res.status(400).json({ message: "Username phải có ít nhất 3 ký tự!" });

        const pool = await poolPromise;
        await pool
            .request()
            .input("user_id", sql.Int, userId)
            .input("username", sql.NVarChar, trimmedUsername)
            .query("UPDATE Users SET username = @username WHERE user_id = @user_id");

        console.log(`[USER] Profile updated for user: ${userId}`);
        res.json({ message: "Cập nhật profile thành công!" });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
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

// GET /api/events
app.get("/api/events", async (req, res) => {
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

// POST /api/events
app.post("/api/events", authenticateToken, async (req, res) => {
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

        // ✅ Validate required fields
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

// GET /api/event-categories
app.get("/api/event-categories", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(
            "SELECT category_id, name, icon, color_code, description FROM EventCategories ORDER BY category_id"
        );
        res.json({
            message: "Lấy danh sách danh mục sự kiện thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy danh mục sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// PUT /api/events/:id
app.put("/api/events/:id", async (req, res) => {
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

// DELETE /api/events/:id
app.delete("/api/events/:id", async (req, res) => {
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

        res.json({ message: "Xóa sự kiện thành công!" });
    } catch (error) {
        console.error("Lỗi xóa sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/events/:id/favorite - Toggle favorite status
app.post("/api/events/:id/favorite", authenticateToken, async (req, res) => {
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

// GET /api/user/favorites/events - Get user's favorited event IDs
app.get("/api/user/favorites/events", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, userId)
            .query("SELECT event_id FROM UserFavoriteEvents WHERE user_id = @user_id");

        const favoriteIds = result.recordset.map(item => item.event_id);
        res.json({
            message: "Lấy danh sách sự kiện yêu thích thành công!",
            data: favoriteIds
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách yêu thích sự kiện:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ============ FLOOD ZONES ============
app.get("/api/flood-zones", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                zone_id,
                zone_name,
                district,
                risk_level,
                polygon_coordinates,
                description,
                typical_flood_months,
                is_active,
                last_updated,
                updated_by
            FROM FloodZones
            WHERE is_active = 1
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
                id: String(zone.zone_id),
                zone_id: zone.zone_id,
                name: zone.zone_name,
                district: zone.district,

                risk_level: zone.risk_level,
                polygon_coordinates: zone.polygon_coordinates,
                description: zone.description,
                typical_flood_months: zone.typical_flood_months,

                center: Array.isArray(coordinates) && typeof coordinates[0] === "number"
                    ? coordinates
                    : null,

                radius,
                depthCm,
                level,
                color,
                depthValue: depthCm / 100,
                depthLevel: level,

                bypassPosition: null,
                bypassOptions: []
            };
        });

        res.json({
            success: true,
            message: "Lấy dữ liệu vùng ngập lụt thành công",
            data
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu FloodZones:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        });
    }
});
// ============ POIs (Points of Interest) ============

// GET /api/pois - Lấy danh sách tất cả POIs (có thể lọc theo category)
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
            message: "Lấy danh sách POI thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu POIs:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// GET /api/poi-categories - Lấy danh sách tất cả POI categories
app.get("/api/poi-categories", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(
            "SELECT id, name, icon, color_code, description FROM POIsCategories ORDER BY id"
        );

        res.json({
            message: "Lấy danh sách POI categories thành công!",
            data: result.recordset
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu POIsCategories:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ============ ĐĂNG NHẬP GOOGLE ============

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

// ============ EVENT ROADS (ROAD RESTRICTIONS) ============

// GET /api/event-roads - Lấy danh sách đường cấm/hạn chế do sự kiện
app.get("/api/event-roads", async (req, res) => {
    try {
        const { event_id, active_only, approved_only } = req.query;
        const pool = await poolPromise;
        let query = `
            SELECT 
                r.road_id,
                r.event_id,
                e.title AS event_title,
                e.status AS event_status,
                r.road_name,
                r.restriction_type,
                r.restriction_start,
                r.restriction_end,
                r.polyline_encoded,
                r.geojson_coords,
                r.description,
                r.created_at,
                r.bypass_coords,
                r.days_of_week,
                CONVERT(VARCHAR(8), r.start_time_of_day, 108) AS start_time_of_day,
                CONVERT(VARCHAR(8), r.end_time_of_day, 108) AS end_time_of_day
            FROM EventRoad r
            LEFT JOIN Events e ON r.event_id = e.event_id
            WHERE 1=1
        `;

        const request = pool.request();

        if (event_id) {
            query += " AND r.event_id = @event_id";
            request.input("event_id", sql.Int, parseInt(event_id));
        }

        if (approved_only === "true") {
            query += " AND e.status = 'approved'";
        }

        if (active_only === "true") {
            query += " AND r.restriction_start <= GETDATE() AND r.restriction_end >= GETDATE()";
        }

        query += " ORDER BY r.restriction_start ASC";

        const result = await request.query(query);

        // Parse JSON strings to objects/arrays for geojson fields
        let formattedData = result.recordset.map(item => {
            let geojson = null;
            let bypass = null;
            try {
                if (item.geojson_coords) {
                    geojson = JSON.parse(item.geojson_coords);
                }
            } catch (e) {
                console.error("Lỗi parse geojson_coords của road_id:", item.road_id, e.message);
            }
            try {
                if (item.bypass_coords) {
                    bypass = JSON.parse(item.bypass_coords);
                }
            } catch (e) {
                console.error("Lỗi parse bypass_coords của road_id:", item.road_id, e.message);
            }
            return {
                ...item,
                geojson_coords: geojson,
                bypass_coords: bypass
            };
        });

        // Nếu yêu cầu lọc các tuyến đường đang thực sự bị cấm tại thời điểm này
        if (active_only === "true") {
            const now = new Date();
            const currentDay = now.getDay(); // 0: CN, 1: T2, ..., 6: T7
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            formattedData = formattedData.filter(road => {
                if (road.days_of_week) {
                    const days = road.days_of_week.split(',').map(d => parseInt(d.trim()));
                    if (!days.includes(currentDay)) {
                        return false; // Không trùng ngày trong tuần
                    }
                }

                if (road.start_time_of_day && road.end_time_of_day) {
                    const parseTimeToMinutes = (timeStr) => {
                        const parts = timeStr.split(':');
                        return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
                    };
                    const startMin = parseTimeToMinutes(road.start_time_of_day);
                    const endMin = parseTimeToMinutes(road.end_time_of_day);

                    return currentTotalMinutes >= startMin && currentTotalMinutes <= endMin;
                }

                return true;
            });
        }

        res.json({
            success: true,
            message: "Lấy danh sách đường hạn chế thành công!",
            data: formattedData
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/event-roads - Thêm mới một đoạn đường cấm/hạn chế
app.post("/api/event-roads", async (req, res) => {
    try {
        const {
            event_id,
            road_name,
            restriction_type,
            restriction_start,
            restriction_end,
            polyline_encoded,
            geojson_coords,
            description,
            bypass_coords,
            days_of_week,
            start_time_of_day,
            end_time_of_day
        } = req.body;

        if (!event_id || !road_name || !restriction_type || !restriction_start || !restriction_end) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc!" });
        }

        const geojsonStr = typeof geojson_coords === "object" ? JSON.stringify(geojson_coords) : geojson_coords || null;
        const bypassStr = typeof bypass_coords === "object" ? JSON.stringify(bypass_coords) : bypass_coords || null;

        const pool = await poolPromise;
        await pool.request()
            .input("event_id", sql.Int, event_id)
            .input("road_name", sql.NVarChar, road_name)
            .input("restriction_type", sql.NVarChar, restriction_type)
            .input("restriction_start", sql.DateTime, restriction_start)
            .input("restriction_end", sql.DateTime, restriction_end)
            .input("polyline_encoded", sql.NVarChar, polyline_encoded || null)
            .input("geojson_coords", sql.NVarChar, geojsonStr)
            .input("description", sql.NVarChar, description || null)
            .input("bypass_coords", sql.NVarChar, bypassStr)
            .input("days_of_week", sql.NVarChar, days_of_week || null)
            .input("start_time_of_day", sql.Time, parseTimeToDate(start_time_of_day))
            .input("end_time_of_day", sql.Time, parseTimeToDate(end_time_of_day))
            .query(`
                INSERT INTO EventRoad (
                    event_id, road_name, restriction_type, restriction_start, restriction_end,
                    polyline_encoded, geojson_coords, description, created_at, bypass_coords,
                    days_of_week, start_time_of_day, end_time_of_day
                )
                VALUES (
                    @event_id, @road_name, @restriction_type, @restriction_start, @restriction_end,
                    @polyline_encoded, @geojson_coords, @description, GETDATE(), @bypass_coords,
                    @days_of_week, @start_time_of_day, @end_time_of_day
                )
            `);

        res.status(201).json({ success: true, message: "Thêm đường hạn chế thành công!" });
    } catch (error) {
        console.error("Lỗi thêm đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// PUT /api/event-roads/:id - Cập nhật thông tin đường cấm/hạn chế
app.put("/api/event-roads/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            event_id,
            road_name,
            restriction_type,
            restriction_start,
            restriction_end,
            polyline_encoded,
            geojson_coords,
            description,
            bypass_coords,
            days_of_week,
            start_time_of_day,
            end_time_of_day
        } = req.body;

        if (!event_id || !road_name || !restriction_type || !restriction_start || !restriction_end) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc!" });
        }

        const geojsonStr = typeof geojson_coords === "object" ? JSON.stringify(geojson_coords) : geojson_coords || null;
        const bypassStr = typeof bypass_coords === "object" ? JSON.stringify(bypass_coords) : bypass_coords || null;

        const pool = await poolPromise;
        const result = await pool.request()
            .input("road_id", sql.Int, parseInt(id))
            .input("event_id", sql.Int, event_id)
            .input("road_name", sql.NVarChar, road_name)
            .input("restriction_type", sql.NVarChar, restriction_type)
            .input("restriction_start", sql.DateTime, restriction_start)
            .input("restriction_end", sql.DateTime, restriction_end)
            .input("polyline_encoded", sql.NVarChar, polyline_encoded || null)
            .input("geojson_coords", sql.NVarChar, geojsonStr)
            .input("description", sql.NVarChar, description || null)
            .input("bypass_coords", sql.NVarChar, bypassStr)
            .input("days_of_week", sql.NVarChar, days_of_week || null)
            .input("start_time_of_day", sql.Time, parseTimeToDate(start_time_of_day))
            .input("end_time_of_day", sql.Time, parseTimeToDate(end_time_of_day))
            .query(`
                UPDATE EventRoad
                SET 
                    event_id = @event_id,
                    road_name = @road_name,
                    restriction_type = @restriction_type,
                    restriction_start = @restriction_start,
                    restriction_end = @restriction_end,
                    polyline_encoded = @polyline_encoded,
                    geojson_coords = @geojson_coords,
                    description = @description,
                    bypass_coords = @bypass_coords,
                    days_of_week = @days_of_week,
                    start_time_of_day = @start_time_of_day,
                    end_time_of_day = @end_time_of_day
                WHERE road_id = @road_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đường hạn chế cần cập nhật!" });
        }

        res.json({ success: true, message: "Cập nhật đường hạn chế thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/event-roads/:id - Xóa đường cấm/hạn chế
app.delete("/api/event-roads/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("road_id", sql.Int, parseInt(id))
            .query("DELETE FROM EventRoad WHERE road_id = @road_id");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đường hạn chế cần xóa!" });
        }

        res.json({ success: true, message: "Xóa đường hạn chế thành công!" });
    } catch (error) {
        console.error("Lỗi xóa đường hạn chế:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// ============ TRAFFIC ALERTS ENDPOINTS ============

// GET /api/traffic-alerts - Lấy các cảnh báo giao thông đang hoạt động
app.get("/api/traffic-alerts", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ta.*, u.username as creator_name
            FROM TrafficAlerts ta
            LEFT JOIN Users u ON ta.created_by = u.user_id
            WHERE ta.is_active = 1
            ORDER BY ta.created_at DESC
        `);

        const data = result.recordset.map(alert => ({
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
            created_at: alert.created_at
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi lấy danh sách cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/traffic-alerts - Báo cáo cảnh báo giao thông mới (yêu cầu Token)
app.post("/api/traffic-alerts", authenticateToken, async (req, res) => {
    try {
        const {
            type,
            title,
            description,
            location,
            latitude,
            longitude,
            severity,
            event_id
        } = req.body;

        if (!type || !title || latitude === undefined || longitude === undefined || !severity) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("created_by", sql.Int, req.user.id)
            .input("event_id", sql.Int, event_id || null)
            .input("alert_type", sql.NVarChar, type)
            .input("title", sql.NVarChar, title)
            .input("description", sql.NVarChar, description || null)
            .input("location_name", sql.NVarChar, location || null)
            .input("latitude", sql.Decimal(9, 6), parseFloat(latitude))
            .input("longitude", sql.Decimal(9, 6), parseFloat(longitude))
            .input("severity", sql.NVarChar, severity)
            .query(`
                INSERT INTO TrafficAlerts (
                    created_by, event_id, alert_type, title, description,
                    location_name, latitude, longitude, severity, is_active, created_at, updated_at
                )
                OUTPUT INSERTED.alert_id
                VALUES (
                    @created_by, @event_id, @alert_type, @title, @description,
                    @location_name, @latitude, @longitude, @severity, 1, GETDATE(), GETDATE()
                )
            `);

        res.status(201).json({
            success: true,
            message: "Gửi báo cáo sự cố giao thông thành công!",
            alert_id: result.recordset[0].alert_id
        });
    } catch (error) {
        console.error("Lỗi gửi báo cáo sự cố giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/admin/traffic-alerts - Lấy toàn bộ danh sách cảnh báo giao thông (Admin)
app.get("/api/admin/traffic-alerts", authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Cần quyền Admin!' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT ta.*, u.username as creator_name
            FROM TrafficAlerts ta
            LEFT JOIN Users u ON ta.created_by = u.user_id
            ORDER BY ta.created_at DESC
        `);

        const data = result.recordset.map(alert => ({
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
            created_at: alert.created_at
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi lấy toàn bộ danh sách cảnh báo giao thông (Admin):", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// PUT /api/admin/traffic-alerts/:id/toggle - Bật/tắt trạng thái cảnh báo giao thông (Admin)
app.put("/api/admin/traffic-alerts/:id/toggle", authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Cần quyền Admin!' });
    }
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (is_active === undefined) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin is_active!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input("alert_id", sql.Int, parseInt(id))
            .input("is_active", sql.Bit, is_active ? 1 : 0)
            .query(`
                UPDATE TrafficAlerts
                SET is_active = @is_active, updated_at = GETDATE()
                WHERE alert_id = @alert_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy cảnh báo giao thông cần cập nhật!" });
        }

        res.json({ success: true, message: "Cập nhật trạng thái cảnh báo giao thông thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/admin/traffic-alerts/:id - Xóa cảnh báo giao thông (Admin)
app.delete("/api/admin/traffic-alerts/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Cần quyền Admin!' });
    }
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("alert_id", sql.Int, parseInt(id))
            .query(`
                DELETE FROM TrafficAlerts
                WHERE alert_id = @alert_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy cảnh báo giao thông cần xóa!" });
        }

        res.json({ success: true, message: "Xóa cảnh báo giao thông thành công!" });
    } catch (error) {
        console.error("Lỗi xóa cảnh báo giao thông:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// ============ SAVED ROUTES & SHARING ENDPOINTS ============

// POST /api/saved-routes - Lưu lộ trình mới (Yêu cầu đăng nhập)
app.post("/api/saved-routes", authenticateToken, async (req, res) => {
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
            is_emergency
        } = req.body;

        if (origin_lat === undefined || origin_lng === undefined || destination_lat === undefined || destination_lng === undefined || !route_data) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin tọa độ hoặc dữ liệu lộ trình!" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
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
            .input("profile", sql.NVarChar(20), profile || 'driving')
            .input("is_emergency", sql.Bit, is_emergency ? 1 : 0)
            .query(`
                INSERT INTO SavedRoutes (
                    user_id, origin_name, origin_lat, origin_lng, 
                    destination_name, destination_lat, destination_lng, 
                    route_name, route_data, distance_meters, duration_seconds, 
                    profile, is_shared, is_emergency, created_at
                ) 
                OUTPUT INSERTED.*
                VALUES (
                    @user_id, @origin_name, @origin_lat, @origin_lng, 
                    @destination_name, @destination_lat, @destination_lng, 
                    @route_name, @route_data, @distance_meters, @duration_seconds, 
                    @profile, 0, @is_emergency, GETDATE()
                );
            `);

        res.status(201).json({ success: true, message: "Lưu lộ trình thành công!", route: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lưu lộ trình:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/saved-routes - Lấy danh sách lộ trình đã lưu của người dùng hiện tại (Yêu cầu đăng nhập)
app.get("/api/saved-routes", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query(`
                SELECT * FROM SavedRoutes 
                WHERE user_id = @user_id 
                ORDER BY created_at DESC
            `);

        res.json({ success: true, routes: result.recordset });
    } catch (error) {
        console.error("Lỗi lấy danh sách lộ trình đã lưu:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/saved-routes/:id - Lấy chi tiết một lộ trình đã lưu (Yêu cầu đăng nhập)
app.get("/api/saved-routes/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("route_id", sql.Int, parseInt(id))
            .input("user_id", sql.Int, req.user.id)
            .query(`
                SELECT * FROM SavedRoutes 
                WHERE route_id = @route_id AND user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền xem!" });
        }

        res.json({ success: true, route: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lấy chi tiết lộ trình:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// DELETE /api/saved-routes/:id - Xóa một lộ trình đã lưu (Yêu cầu đăng nhập)
app.delete("/api/saved-routes/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("route_id", sql.Int, parseInt(id))
            .input("user_id", sql.Int, req.user.id)
            .query(`
                DELETE FROM SavedRoutes 
                WHERE route_id = @route_id AND user_id = @user_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền xóa!" });
        }

        res.json({ success: true, message: "Xóa lộ trình thành công!" });
    } catch (error) {
        console.error("Lỗi xóa lộ trình:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/saved-routes/:id/share - Tạo share token cho lộ trình đã lưu (Yêu cầu đăng nhập)
app.post("/api/saved-routes/:id/share", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const crypto = require("crypto");
        const token = crypto.randomBytes(16).toString("hex");

        const pool = await poolPromise;
        const result = await pool.request()
            .input("route_id", sql.Int, parseInt(id))
            .input("user_id", sql.Int, req.user.id)
            .input("share_token", sql.NVarChar(100), token)
            .query(`
                UPDATE SavedRoutes
                SET is_shared = 1, share_token = @share_token
                OUTPUT INSERTED.share_token
                WHERE route_id = @route_id AND user_id = @user_id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình hoặc bạn không có quyền chia sẻ!" });
        }

        res.json({ success: true, share_token: result.recordset[0].share_token });
    } catch (error) {
        console.error("Lỗi chia sẻ lộ trình đã lưu:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// POST /api/saved-routes/share-direct - Chia sẻ trực tiếp lộ trình chưa lưu (Yêu cầu đăng nhập)
app.post("/api/saved-routes/share-direct", authenticateToken, async (req, res) => {
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
            is_emergency
        } = req.body;

        if (origin_lat === undefined || origin_lng === undefined || destination_lat === undefined || destination_lng === undefined || !route_data) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin tọa độ hoặc dữ liệu lộ trình!" });
        }

        const crypto = require("crypto");
        const token = crypto.randomBytes(16).toString("hex");

        const pool = await poolPromise;
        const result = await pool.request()
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
            .input("profile", sql.NVarChar(20), profile || 'driving')
            .input("is_emergency", sql.Bit, is_emergency ? 1 : 0)
            .input("share_token", sql.NVarChar(100), token)
            .query(`
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

        res.status(201).json({ success: true, share_token: result.recordset[0].share_token });
    } catch (error) {
        console.error("Lỗi chia sẻ lộ trình trực tiếp:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
    }
});

// GET /api/routes/share/:token - Lấy thông tin lộ trình chia sẻ công khai (Không cần đăng nhập)
app.get("/api/routes/share/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("share_token", sql.NVarChar(100), token)
            .query(`
                SELECT * FROM SavedRoutes 
                WHERE share_token = @share_token AND is_shared = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy lộ trình chia sẻ hoặc liên kết không hợp lệ!" });
        }

        res.json({ success: true, route: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lấy thông tin lộ trình chia sẻ:", error);
        res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
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