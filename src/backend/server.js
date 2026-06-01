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
app.use(cors());
app.use(express.json());

// ============ MIDDLEWARE ============

// ✅ FIX: Định nghĩa middleware TRƯỚC khi dùng
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

// ============ ĐĂNG KÝ ============

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!username || !email || !password) {
            return res
                .status(400)
                .json({ message: "Vui lòng điền đầy đủ thông tin!" });
        }

        const pool = await poolPromise;

        // 2. Kiểm tra xem email hoặc username đã tồn tại chưa
        const checkExist = await pool
            .request()
            .input("email", sql.NVarChar, email)
            .input("username", sql.NVarChar, username)
            .query(
                "SELECT user_id FROM Users WHERE email = @email OR username = @username",
            );

        if (checkExist.recordset.length > 0) {
            return res
                .status(400)
                .json({ message: "Email hoặc Username đã được sử dụng!" });
        }

        // 3. Mã hóa mật khẩu (Băm password)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Lưu user mới vào Database (Mặc định role là 'user')
        await pool
            .request()
            .input("username", sql.NVarChar, username)
            .input("email", sql.NVarChar, email)
            .input("password_hash", sql.NVarChar, hashedPassword)
            .input("role", sql.NVarChar, "user")
            .query(`INSERT INTO Users (username, email, password_hash, role) 
                    VALUES (@username, @email, @password_hash, @role)`);

        res.status(201).json({ message: "Tạo tài khoản thành công!" });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin!' });
        }

        const pool = await poolPromise;

        // 2. Kiểm tra xem email hoặc username đã tồn tại chưa
        const checkExist = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('username', sql.NVarChar, username)
            .query('SELECT user_id FROM Users WHERE email = @email OR username = @username');

        if (checkExist.recordset.length > 0) {
            return res.status(400).json({ message: 'Email hoặc Username đã được sử dụng!' });
        }

        // 3. Mã hóa mật khẩu (Băm password)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Lưu user mới vào Database (Mặc định role là 'user')
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, 'user')
            .query(`INSERT INTO Users (username, email, password_hash, role) 
                    VALUES (@username, @email, @password_hash, @role)`);

        res.status(201).json({ message: 'Tạo tài khoản thành công!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});


//============ 2FA ==============
//POST /API/AUTH/SETUP-2FA

app.post("/api/auth/setup-2fa", authenticateToken, async (req, res) => {
    try {
        // Sinh khóa bảo mật ngẫu nhiên
        const secret = speakeasy.generateSecret({
            name: `DN-Pulse (${req.user.email})`
        });
        // Tạo mã QR Code dạng Base64 Image
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        // Lưu tạm thời secret vào database
        const pool = await poolPromise;
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .input("secret", sql.NVarChar, secret.base32)
            .query("UPDATE Users SET two_factor_secret = @secret WHERE user_id = @user_id");
        res.json({
            success: true,
            data: {
                qrCode: qrCodeUrl,
                secret: secret.base32
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

//==POST/API/AUTH.CONFIRM-2FA
app.post("/api/auth/confirm-2fa", authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT two_factor_secret FROM Users WHERE user_id = @user_id");
        const userSecret = result.recordset[0]?.two_factor_secret;
        if (!userSecret) {
            return res.status(400).json({ success: false, error: { message: "Không tìm thấy khóa bảo mật 2FA!" } });
        }
        // Kiểm tra mã OTP khớp với thuật toán TOTP
        const verified = speakeasy.totp.verify({
            secret: userSecret,
            encoding: "base32",
            token: code,
            window: 1 // Cho phép lệch ±30 giây do đồng bộ thời gian thiết bị
        });
        if (verified) {
            // Xác thực thành công: Cập nhật cờ kích hoạt 2FA
            await pool.request()
                .input("user_id", sql.Int, req.user.id)
                .query("UPDATE Users SET is_2fa_enabled = 1 WHERE user_id = @user_id");
            res.json({ success: true, message: "Kích hoạt 2FA thành công!" });
        } else {
            res.status(400).json({ success: false, error: { message: "Mã xác thực không đúng!" } });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// DELETE /api/auth/disable-2fa
app.delete("/api/auth/disable-2fa", authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("SELECT password_hash FROM Users WHERE user_id = @user_id");
        const user = result.recordset[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: { message: "Mật khẩu không chính xác!" } });
        }
        await pool.request()
            .input("user_id", sql.Int, req.user.id)
            .query("UPDATE Users SET is_2fa_enabled = 0, two_factor_secret = NULL WHERE user_id = @user_id");
        res.json({ success: true, message: "Tắt 2FA thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

//POST /api/auth/verify-2fa
app.post("/api/auth/verify-2fa", async (req, res) => {
    try {
        const { code, temp_token } = req.body;
        // Verify token tạm thời cấp lúc đăng nhập mật khẩu đúng
        const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
        if (!decoded.temp) {
            return res.status(400).json({ success: false, error: { message: "Mã token tạm không hợp lệ!" } });
        }
        const pool = await poolPromise;
        const result = await pool.request()
            .input("user_id", sql.Int, decoded.id)
            .query("SELECT user_id, username, email, role, two_factor_secret FROM Users WHERE user_id = @user_id");
        const user = result.recordset[0];
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: "base32",
            token: code,
            window: 1
        });
        if (!verified) {
            return res.status(400).json({ success: false, error: { message: "Mã OTP không chính xác!" } });
        }
        // Ký JWT Token chính thức cấp quyền truy cập
        const token = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({
            success: true,
            access_token: token,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, error: { message: "Phiên xác thực hết hạn!" } });
    }
});

// ============ ĐĂNG NHẬP ============

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu!' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT user_id, username, email, password_hash, role FROM Users WHERE email = @email');

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        // ✅ So sánh password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const userDb = await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query('SELECT is_2fa_enabled, role FROM Users WHERE user_id = @user_id');
        const dbUser = userDb.recordset[0];
        const is2FA = dbUser?.is_2fa_enabled;
        const userRole = dbUser?.role; // Lấy role thực tế từ database
        // RÀNG BUỘC: Chỉ kích hoạt luồng 2FA nếu tài khoản là ADMIN và ĐÃ BẬT 2FA
        if (userRole === 'admin' && is2FA) {
            // Tạo token tạm thời chỉ có hiệu lực 5 phút để xác thực 2FA
            const tempToken = jwt.sign(
                { id: user.user_id, email: user.email, temp: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({
                requires2FA: true,
                tempToken,
                email: user.email
            });
        }
        // TẤT CẢ các tài khoản USER thông thường hoặc ADMIN chưa bật 2FA 
        // sẽ nhận thẳng Token chính thức để đăng nhập trực tiếp
        const token = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
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

        console.error('Login error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });

    }
});

// ============ PROTECTED ROUTES ============

// ✅ GET /api/user/profile - Lấy thông tin user
app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;

        // ✅ FIX: Đúng tên parameter @user_id
        const result = await pool
            .request()
            .input("user_id", sql.Int, req.user.id)
            .query(
                "SELECT user_id, username, email, role FROM Users WHERE user_id = @user_id",
            );

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        // ✅ FIX: Trả về đúng format response
        res.json({
            message: "Lấy dữ liệu thành công!",
            data: result.recordset[0],
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ✅ PUT /api/user/profile - Cập nhật profile
app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username) {
            return res.status(400).json({ message: "Vui lòng nhập username!" });
        }

        const pool = await poolPromise;

        await pool
            .request()
            .input("user_id", sql.Int, userId)
            .input("username", sql.NVarChar, username)
            .query("UPDATE Users SET username = @username WHERE user_id = @user_id");

        res.json({ message: "Cập nhật profile thành công!" });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// ============ FORGOT PASSWORD ============

// POST /api/auth/forgot-password - Gửi OTP qua email
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('🔍 [DEBUG] Forgot password request for:', email);

        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập email!' });
        }

        const pool = await poolPromise;

        // Kiểm tra email tồn tại
        const user = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT user_id FROM Users WHERE email = @email');

        console.log('🔍 [DEBUG] User found:', user.recordset.length > 0);

        if (user.recordset.length === 0) {
            return res.status(404).json({ message: 'Email không tồn tại trong hệ thống!' });
        }

        // Tạo OTP ngẫu nhiên 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        console.log('🔍 [DEBUG] OTP generated:', otp);

        // Lưu OTP vào database (Bảng mới: VerificationCodes)
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                INSERT INTO VerificationCodes (user_id, otp_code, otp_type, email, expires_at, is_used)
                VALUES (
                    (SELECT TOP 1 user_id FROM Users WHERE email = @email), 
                    @otp, 
                    'RESET_PASSWORD', 
                    @email, 
                    @expiresAt, 
                    0
                )
            `);
        console.log('🔍 [DEBUG] OTP saved to database');

        // ✅ GỬI EMAIL
        console.log('🔍 [DEBUG] Calling sendOtpEmail...');
        const emailSent = await sendOtpEmail(email, otp);
        console.log('🔍 [DEBUG] sendOtpEmail result:', emailSent);

        res.json({ message: 'OTP đã được gửi tới email của bạn!' });
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/verify-otp - Xác thực OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Vui lòng nhập email và OTP!' });
        }

        const pool = await poolPromise;

        // Kiểm tra OTP (lấy mã chưa sử dụng mới nhất)
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`
                SELECT TOP 1 otp_id, otp_code, expires_at, is_used 
                FROM VerificationCodes 
                WHERE email = @email AND otp_type = 'RESET_PASSWORD' AND is_used = 0 
                ORDER BY created_at DESC
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Yêu cầu reset mật khẩu không tồn tại!' });
        }

        const record = result.recordset[0];

        // Kiểm tra OTP hết hạn
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ message: 'OTP đã hết hạn! Vui lòng yêu cầu OTP mới.' });
        }

        // Kiểm tra OTP đúng
        if (record.otp_code !== otp) {
            return res.status(400).json({ message: 'OTP không chính xác!' });
        }

        // Đánh dấu OTP đã xác thực (chuyển sang is_used = 1)
        await pool.request()
            .input('otp_id', sql.Int, record.otp_id)
            .query('UPDATE VerificationCodes SET is_used = 1 WHERE otp_id = @otp_id');

        res.json({ message: 'OTP xác thực thành công!' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/reset-password - Reset mật khẩu
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu mới!' });
        }

        const pool = await poolPromise;

        // Kiểm tra OTP đã xác thực (is_used = 1)
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`
                SELECT TOP 1 is_used 
                FROM VerificationCodes 
                WHERE email = @email AND otp_type = 'RESET_PASSWORD' AND is_used = 1 
                ORDER BY created_at DESC
            `);

        if (result.recordset.length === 0 || !result.recordset[0].is_used) {
            return res.status(400).json({ message: 'OTP chưa được xác thực!' });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Cập nhật mật khẩu user
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET password_hash = @password_hash WHERE email = @email');

        // Xóa record VerificationCodes sau khi reset thành công
        await pool.request()
            .input('email', sql.NVarChar, email)
            .query("DELETE FROM VerificationCodes WHERE email = @email AND otp_type = 'RESET_PASSWORD'");

        res.json({ message: 'Mật khẩu đã được reset thành công!' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// POST /api/auth/resend-otp - Gửi lại OTP
app.post('/api/auth/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập email!' });
        }

        const pool = await poolPromise;

        // Kiểm tra email tồn tại
        const user = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT user_id FROM Users WHERE email = @email');

        if (user.recordset.length === 0) {
            return res.status(404).json({ message: 'Email không tồn tại!' });
        }

        // Tạo OTP mới
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Thêm OTP mới vào VerificationCodes
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                INSERT INTO VerificationCodes (user_id, otp_code, otp_type, email, expires_at, is_used)
                VALUES (
                    (SELECT TOP 1 user_id FROM Users WHERE email = @email), 
                    @otp, 
                    'RESET_PASSWORD', 
                    @email, 
                    @expiresAt, 
                    0
                )
            `);

        // ✅ GỬI EMAIL
        console.log('🔍 [DEBUG] Calling sendOtpEmail for resend...');
        const emailSent = await sendOtpEmail(email, otp);
        console.log('🔍 [DEBUG] sendOtpEmail result:', emailSent);

        res.json({ message: 'OTP mới đã được gửi tới email!' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ============ EVENTS ============

// POST /api/events - Thêm sự kiện (cần protected sau)
app.post("/api/events", async (req, res) => {
    try {
        const {
            Title,
            TimeRange,
            EventDate,
            Location,
            Status,
            IsLive,
            CrowdLevel,
            Description,
        } = req.body;

        if (!Title || !EventDate || !Location) {
            return res.status(400).json({ message: "Thiếu thông tin sự kiện!" });
        }

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

        res.status(201).json({ message: "Lưu sự kiện thành công!" });
    } catch (error) {
        console.error("Add event error:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
});

// GET /api/events - Lấy danh sách sự kiện từ SQL Server
app.get("/api/events", async (req, res) => {
    try {
        const pool = await poolPromise;
        // Thực hiện truy vấn lấy tất cả sự kiện
        const result = await pool
            .request()
            .query("SELECT * FROM Events ORDER BY start_time DESC");

        // Trả về danh sách sự kiện dưới dạng JSON
        res.json({
            message: "Lấy danh sách sự kiện thành công!",
            data: result.recordset,
        });
    } catch (error) {
        console.error("Lỗi lấy sự kiện:", error);
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

        const pool = await poolPromise;
        let result = await pool
            .request()
            .input("email", sql.NVarChar, email)
            .query("SELECT * FROM Users WHERE email = @email");

        let user = result.recordset[0];

        if (!user) {
            await pool
                .request()
                .input("username", sql.NVarChar, name)
                .input("email", sql.NVarChar, email)
                .input("role", sql.NVarChar, "user")
                .query(
                    "INSERT INTO Users (username, email, role) VALUES (@username, @email, @role)",
                );

            result = await pool
                .request()
                .input("email", sql.NVarChar, email)
                .query("SELECT * FROM Users WHERE email = @email");
            user = result.recordset[0];
        }

        const jwtToken = jwt.sign(
            {
                id: user.user_id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" },
        );

        res.json({
            token: jwtToken,
            role: user.role,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
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
