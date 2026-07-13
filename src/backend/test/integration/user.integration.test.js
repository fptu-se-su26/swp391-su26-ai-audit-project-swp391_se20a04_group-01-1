/**
 * Integration Tests — User Routes
 * File: test/user.integration.test.js
 *
 * Test các API endpoints /api/user/* với mock DB và JWT auth.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// ── Mock external dependencies ─────────────────────────────────────────────
jest.mock('../../db', () => {
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

jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('fakesalt'),
    hash: jest.fn().mockResolvedValue('$2b$10$newhash'),
    compare: jest.fn()
}));

// ── Setup Express app ──────────────────────────────────────────────────────
let app;

beforeAll(async () => {
    app = express();
    app.use(express.json());
    const userRouter = require('../../routes/user.routes');
    app.use('/api/user', userRouter);
});

const { poolPromise } = require('../../db');
const bcrypt = require('bcrypt');

// Helper: tạo JWT token
const makeAuthHeader = (payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    return `Bearer ${token}`;
};

// ============================================================
// TEST SUITE: GET /api/user/profile
// ============================================================
describe('GET /api/user/profile', () => {

    test('TC-PROFILE-01: Không có token → 401', async () => {
        const res = await request(app).get('/api/user/profile');
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Thiếu token/i);
    });

    test('TC-PROFILE-02: Token không hợp lệ → 403', async () => {
        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', 'Bearer invalid.token.here');

        expect(res.status).toBe(403);
    });

    test('TC-PROFILE-03: User không tồn tại trong DB → 404', async () => {
        const pool = await poolPromise;
        pool.request().query.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 9999, role: 'user' }));

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/không tồn tại/i);
    });

    test('TC-PROFILE-04: User hợp lệ → 200 với dữ liệu profile', async () => {
        const pool = await poolPromise;
        pool.request().query.mockResolvedValueOnce({
            recordset: [{
                user_id: 1,
                username: 'testuser',
                email: 'user@test.com',
                role: 'user',
                created_at: new Date('2024-01-01T00:00:00Z'),
                last_login_at: new Date('2024-06-15T08:30:00Z'),
                password_hash: '$2b$10$fakehash',
                avatar_url: null
            }]
        });

        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 1, role: 'user', email: 'user@test.com' }));

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.username).toBe('testuser');
        expect(res.body.data.email).toBe('user@test.com');
        expect(res.body.data.role).toBe('user');
        // Không expose password_hash
        expect(res.body.data.password_hash).toBeUndefined();
    });
});

// ============================================================
// TEST SUITE: PUT /api/user/profile
// ============================================================
describe('PUT /api/user/profile', () => {

    test('TC-UPDATE-01: Không có token → 401', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .send({ username: 'newname' });

        expect(res.status).toBe(401);
    });

    test('TC-UPDATE-02: Username rỗng → 400', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 1, role: 'user' }))
            .send({ username: '' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/trống|empty/i);
    });

    test('TC-UPDATE-03: Username chỉ khoảng trắng → 400', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 1, role: 'user' }))
            .send({ username: '   ' });

        expect(res.status).toBe(400);
    });

    test('TC-UPDATE-04: Username dưới 3 ký tự → 400', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 1, role: 'user' }))
            .send({ username: 'ab' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/3 ký tự/i);
    });

    test('TC-UPDATE-05: Username hợp lệ, không bị trùng → 200', async () => {
        const pool = await poolPromise;
        // Check trùng username → không trùng
        pool.request().query
            .mockResolvedValueOnce({ recordset: [] })
            // UPDATE thành công
            .mockResolvedValueOnce({ rowsAffected: [1] });

        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 1, role: 'user' }))
            .send({ username: 'updatedUsername' });

        expect(res.status).toBe(200);
    });

    test('TC-UPDATE-06: Username hợp lệ → update thành công (không check trùng)', async () => {
        // NOTE: Route PUT /api/user/profile hiện tại không kiểm tra username trùng lặp
        // mà UPDATE thẳng vào DB. Đây là bug được ghi nhận tại BUG-004.
        // Test này xác nhận behavior thực tế, không phải behavior mong đợi.
        const pool = await poolPromise;
        pool.request().query.mockResolvedValueOnce({ rowsAffected: [1] });

        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', makeAuthHeader({ id: 1, role: 'user' }))
            .send({ username: 'existingUsername' });

        // Hiện tại trả về 200 (bug: không check trùng)
        // Expected (sau fix): nên trả về 400 nếu username đã tồn tại
        expect(res.status).toBe(200); // TODO: Sửa thành 400 sau khi fix BUG-004
    });
});
