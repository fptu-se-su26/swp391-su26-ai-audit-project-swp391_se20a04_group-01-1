require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ============ MIDDLEWARE ============

// ✅ FIX: Định nghĩa middleware TRƯỚC khi dùng
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Thiếu token xác thực!' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token đã hết hạn!' });
            }
            return res.status(403).json({ message: 'Token không hợp lệ!' });
        }

        req.user = user;
        next();
    });
};

// ============ ĐĂNG NHẬP ============

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
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

        // ✅ Tạo JWT token
        const token = jwt.sign(
            { id: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // ✅ Trả về token + user info
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
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;

        // ✅ FIX: Đúng tên parameter @user_id
        const result = await pool.request()
            .input('user_id', sql.Int, req.user.id)
            .query('SELECT user_id, username, email, role FROM Users WHERE user_id = @user_id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Người dùng không tồn tại!' });
        }

        // ✅ FIX: Trả về đúng format response
        res.json({
            message: 'Lấy dữ liệu thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ✅ PUT /api/user/profile - Cập nhật profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username) {
            return res.status(400).json({ message: 'Vui lòng nhập username!' });
        }

        const pool = await poolPromise;

        await pool.request()
            .input('user_id', sql.Int, userId)
            .input('username', sql.NVarChar, username)
            .query('UPDATE Users SET username = @username WHERE user_id = @user_id');

        res.json({ message: 'Cập nhật profile thành công!' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ============ EVENTS ============

// POST /api/events - Thêm sự kiện (cần protected sau)
app.post('/api/events', async (req, res) => {
    try {
        const { Title, TimeRange, EventDate, Location, Status, IsLive, CrowdLevel, Description } = req.body;

        if (!Title || !EventDate || !Location) {
            return res.status(400).json({ message: 'Thiếu thông tin sự kiện!' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('Title', sql.NVarChar, Title)
            .input('TimeRange', sql.NVarChar, TimeRange || null)
            .input('EventDate', sql.NVarChar, EventDate)
            .input('Location', sql.NVarChar, Location)
            .input('Status', sql.NVarChar, Status || 'pending')
            .input('IsLive', sql.Bit, IsLive || 0)
            .input('CrowdLevel', sql.NVarChar, CrowdLevel || 'low')
            .input('Description', sql.NVarChar, Description || null)
            .query(`INSERT INTO Events (Title, TimeRange, EventDate, Location, Status, IsLive, CrowdLevel, Description) 
                    VALUES (@Title, @TimeRange, @EventDate, @Location, @Status, @IsLive, @CrowdLevel, @Description)`);

        res.status(201).json({ message: 'Lưu sự kiện thành công!' });
    } catch (error) {
        console.error('Add event error:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// ============ SERVER STARTUP ============

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server backend tại http://localhost:${PORT}`);
    console.log(`✅ Kết nối Database thành công!`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Cổng ${PORT} đang bị sử dụng!`);
    } else {
        console.error('❌ Lỗi Server:', err);
    }
});