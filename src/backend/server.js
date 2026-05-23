const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- API ĐĂNG KÝ ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const pool = await poolPromise; // Dùng chung 1 kết nối duy nhất

        const checkUser = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Email này đã được sử dụng!' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password_hash', sql.NVarChar, password_hash)
            .query(`INSERT INTO Users (username, email, password_hash) VALUES (@username, @email, @password_hash)`);

        res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// --- API ĐĂNG NHẬP ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        const user = result.recordset[0];
        if (!user) return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });

        const token = jwt.sign(
            { id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ message: 'Đăng nhập thành công!', token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Khởi động server và bắt lỗi
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server backend đang lắng nghe tại: http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Cổng ${PORT} đang bị phần mềm khác chiếm dụng!`);
    } else {
        console.error('❌ Lỗi Server:', err);
    }
});