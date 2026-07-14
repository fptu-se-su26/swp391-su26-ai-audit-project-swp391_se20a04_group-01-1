/**
 * Integration Tests — Auth Routes
 * File: test/auth.integration.test.js
 *
 * Test các API endpoints /api/auth/* bằng cách mock toàn bộ
 * external dependencies (DB, email service, scheduler).
 *
 * Pattern: Import routes trực tiếp thay vì khởi động server thật,
 * rồi dùng supertest để gửi HTTP request.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// ── Mock tất cả external dependencies TRƯỚC KHI import routes ─────────────
jest.mock('../../db', () => {
    // mockQuery được trả về từ pool.request().query(...)
    // Các test case sẽ mock resolve/reject tuỳ kịch bản
    const mockQuery = jest.fn();
    const mockRequest = {
        input: jest.fn().mockReturnThis(),
        query: mockQuery
    };
    const mockPool = {
        request: jest.fn(() => mockRequest)
    };

    return {
        sql: {
            NVarChar: 'NVarChar',
            Int: 'Int',
            Bit: 'Bit',
            DateTime: 'DateTime',
            Decimal: 'Decimal',
            MAX: 'MAX'
        },
        poolPromise: Promise.resolve(mockPool)
    };
});

jest.mock('../../emailService', () => ({
    sendOtpEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../schedulerService', () => ({
    startScheduler: jest.fn()
}));

jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('fakesalt'),
    hash: jest.fn().mockResolvedValue('$2b$10$fakehashedpassword'),
    compare: jest.fn()
}));

jest.mock('qrcode', () => ({
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,fakeqrcode')
}));

// ── Lấy mockQuery để control kết quả DB trong từng test ───────────────────
const { poolPromise } = require('../../db');
const bcrypt = require('bcrypt');

// ── Tạo Express app gọn cho test (không start server thật) ────────────────
let app;

beforeAll(async () => {
    app = express();
    app.use(express.json());
    // Import router sau khi mock xong
    const authRouter = require('../../routes/auth.routes');
    app.use('/api/auth', authRouter);
});

// Helper: reset mockQuery trước mỗi test
const getMockQuery = async () => {
    const pool = await poolPromise;
    return pool.request().query;
};

// ============================================================
// TEST SUITE: POST /api/auth/register
// ============================================================
describe('POST /api/auth/register', () => {

    test('TC-REG-01: Thiếu email → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/đầy đủ/i);
    });

    test('TC-REG-02: Thiếu password → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', email: 'test@test.com' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/đầy đủ/i);
    });

    test('TC-REG-03: Thiếu username → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@test.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/đầy đủ/i);
    });

    test('TC-REG-04: Body hoàn toàn rỗng → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toBeDefined();
    });

    test('TC-REG-05: Email sai định dạng → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', email: 'not-an-email', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/email/i);
    });

    test('TC-REG-06: Password dưới 6 ký tự → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', email: 'test@test.com', password: '123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/6 ký tự/i);
    });

    test('TC-REG-07: Username dưới 3 ký tự → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'ab', email: 'test@test.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/3 ký tự/i);
    });

    test('TC-REG-08: Username chỉ chứa khoảng trắng → 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: '   ', email: 'test@test.com', password: 'password123' });

        expect(res.status).toBe(400);
    });

    test('TC-REG-09: Email đã tồn tại trong hệ thống → 400', async () => {
        const pool = await poolPromise;
        // Giả lập DB trả về user đã tồn tại với email trùng
        pool.request().query.mockResolvedValueOnce({
            recordset: [{ user_id: 1, email: 'existing@test.com' }]
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'newuser', email: 'existing@test.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/email.*đăng ký/i);
    });

    test('TC-REG-10: Username đã tồn tại trong hệ thống → 400', async () => {
        const pool = await poolPromise;
        // Giả lập DB trả về user đã tồn tại với username trùng
        pool.request().query.mockResolvedValueOnce({
            recordset: [{ user_id: 2, email: 'other@test.com' }]
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'existinguser', email: 'new@test.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/username/i);
    });

    test('TC-REG-11: Đăng ký thành công → 201', async () => {
        const pool = await poolPromise;
        // Lần 1: check email/username không tồn tại
        pool.request().query
            .mockResolvedValueOnce({ recordset: [] })
            // Lần 2: INSERT thành công
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'brandnewuser', email: 'brandnew@test.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/thành công/i);
    });
});

// ============================================================
// TEST SUITE: POST /api/auth/login
// ============================================================
describe('POST /api/auth/login', () => {

    test('TC-LOGIN-01: Thiếu email → 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/email/i);
    });

    test('TC-LOGIN-02: Thiếu password → 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user@test.com' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/password|mật khẩu/i);
    });

    test('TC-LOGIN-03: Email sai định dạng → 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'not-valid-email', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/email/i);
    });

    test('TC-LOGIN-04: Email không tồn tại trong DB → 401', async () => {
        const pool = await poolPromise;
        pool.request().query.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'notfound@test.com', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/không chính xác/i);
    });

    test('TC-LOGIN-05: Mật khẩu sai → 401', async () => {
        const pool = await poolPromise;
        pool.request().query.mockResolvedValueOnce({
            recordset: [{
                user_id: 1,
                username: 'testuser',
                email: 'user@test.com',
                password_hash: '$2b$10$fakehashedpassword',
                role: 'user',
                is_active: 1,
                ban_reason: null
            }]
        });
        // bcrypt.compare trả về false → sai mật khẩu
        bcrypt.compare.mockResolvedValueOnce(false);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user@test.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/không chính xác/i);
    });

    test('TC-LOGIN-06: Tài khoản bị khoá (is_active = 0) → 403', async () => {
        const pool = await poolPromise;
        pool.request().query.mockResolvedValueOnce({
            recordset: [{
                user_id: 2,
                username: 'banneduser',
                email: 'banned@test.com',
                password_hash: '$2b$10$fakehashedpassword',
                role: 'user',
                is_active: 0,
                ban_reason: 'Vi phạm chính sách nội dung'
            }]
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'banned@test.com', password: 'password123' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/bị khóa/i);
    });

    test('TC-LOGIN-07: Login thành công → 200 với token', async () => {
        const pool = await poolPromise;
        // Query 1: lấy user
        pool.request().query
            .mockResolvedValueOnce({
                recordset: [{
                    user_id: 3,
                    username: 'validuser',
                    email: 'valid@test.com',
                    password_hash: '$2b$10$fakehashedpassword',
                    role: 'user',
                    is_active: 1,
                    ban_reason: null
                }]
            })
            // Query 2: lấy 2FA info
            .mockResolvedValueOnce({
                recordset: [{ is_2fa_enabled: 0, role: 'user' }]
            })
            // Query 3: UPDATE last_login_at
            .mockResolvedValueOnce({ rowsAffected: [1] });

        // bcrypt.compare trả về true → đúng mật khẩu
        bcrypt.compare.mockResolvedValueOnce(true);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'valid@test.com', password: 'correctpassword' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe('valid@test.com');
        expect(res.body.role).toBe('user');
    });

    test('TC-LOGIN-08: Admin có bật 2FA → yêu cầu xác thực 2FA', async () => {
        const pool = await poolPromise;
        pool.request().query
            .mockResolvedValueOnce({
                recordset: [{
                    user_id: 10,
                    username: 'adminuser',
                    email: 'admin@danang.gov.vn',
                    password_hash: '$2b$10$fakehashedpassword',
                    role: 'admin',
                    is_active: 1,
                    ban_reason: null
                }]
            })
            .mockResolvedValueOnce({
                recordset: [{ is_2fa_enabled: 1, role: 'admin' }]
            });

        bcrypt.compare.mockResolvedValueOnce(true);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@danang.gov.vn', password: 'adminpassword' });

        expect(res.status).toBe(200);
        expect(res.body.requires2FA).toBe(true);
        expect(res.body.tempToken).toBeDefined();
        // Không có token chính
        expect(res.body.token).toBeUndefined();
    });
});

// ============================================================
// TEST SUITE: POST /api/auth/verify-2fa
// ============================================================
describe('POST /api/auth/verify-2fa', () => {

    test('TC-2FA-01: Thiếu code hoặc temp_token → 400', async () => {
        const res = await request(app)
            .post('/api/auth/verify-2fa')
            .send({ code: '123456' }); // thiếu temp_token

        expect(res.status).toBe(400);
    });

    test('TC-2FA-02: Mã code không phải 6 chữ số → 400', async () => {
        const tempToken = jwt.sign(
            { id: 10, email: 'admin@danang.gov.vn', temp: true },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );

        const res = await request(app)
            .post('/api/auth/verify-2fa')
            .send({ code: 'abcdef', temp_token: tempToken });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toMatch(/6 chữ số/i);
    });
});
