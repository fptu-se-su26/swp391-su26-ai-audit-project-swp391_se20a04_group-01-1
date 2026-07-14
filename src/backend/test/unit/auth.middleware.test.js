const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

// JWT_SECRET được set trong test/setup.js
const TEST_SECRET = process.env.JWT_SECRET;

// Helper: tạo valid token
const makeToken = (payload, options = {}) =>
    jwt.sign(payload, TEST_SECRET, { expiresIn: '1h', ...options });

// ============================================================
// TEST SUITE: authenticateToken
// ============================================================
describe('authenticateToken middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    // ─── Không có token ──────────────────────────────────────
    test('TC-AUTH-01: Không có Authorization header → 401', () => {
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu token xác thực!' });
        expect(next).not.toHaveBeenCalled();
    });

    test('TC-AUTH-02: Authorization header tồn tại nhưng không có Bearer → 401', () => {
        req.headers['authorization'] = 'only-a-string-no-bearer';
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    // ─── Token không hợp lệ ──────────────────────────────────
    test('TC-AUTH-03: Token giả mạo (sai signature) → 403', () => {
        req.headers['authorization'] = 'Bearer this.is.a.fake.token';
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token không hợp lệ!' });
        expect(next).not.toHaveBeenCalled();
    });

    test('TC-AUTH-04: Token ký bằng secret sai → 403', () => {
        const wrongToken = jwt.sign({ id: 99 }, 'wrong-secret');
        req.headers['authorization'] = `Bearer ${wrongToken}`;
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    // ─── Token hết hạn ───────────────────────────────────────
    test('TC-AUTH-05: Token hết hạn → 401 với thông báo hết hạn', () => {
        const expiredToken = makeToken({ id: 1, role: 'user' }, { expiresIn: '-1s' });
        req.headers['authorization'] = `Bearer ${expiredToken}`;
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token đã hết hạn!' });
        expect(next).not.toHaveBeenCalled();
    });

    // ─── Token hợp lệ ────────────────────────────────────────
    test('TC-AUTH-06: Token hợp lệ → gọi next() và gắn user vào req', () => {
        const payload = { id: 1, email: 'user@test.com', role: 'user' };
        const validToken = makeToken(payload);
        req.headers['authorization'] = `Bearer ${validToken}`;
        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(1);
        expect(req.user.email).toBe('user@test.com');
        expect(req.user.role).toBe('user');
        // Không được gọi res.status hay res.json
        expect(res.status).not.toHaveBeenCalled();
    });

    test('TC-AUTH-07: Token admin hợp lệ → gắn đúng role admin', () => {
        const adminToken = makeToken({ id: 10, email: 'admin@danang.gov.vn', role: 'admin' });
        req.headers['authorization'] = `Bearer ${adminToken}`;
        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user.role).toBe('admin');
        expect(req.user.id).toBe(10);
    });
});

// ============================================================
// TEST SUITE: authorizeRole
// ============================================================
describe('authorizeRole middleware', () => {
    let res, next;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('TC-ROLE-01: User có role phù hợp → gọi next()', () => {
        const req = { user: { role: 'admin' } };
        authorizeRole('admin')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('TC-ROLE-02: User có một trong nhiều roles được phép → gọi next()', () => {
        const req = { user: { role: 'moderator' } };
        authorizeRole('admin', 'moderator')(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('TC-ROLE-03: User role = "user" không được phép → 403', () => {
        const req = { user: { role: 'user' } };
        authorizeRole('admin')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Bạn không có quyền truy cập tài nguyên này!'
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('TC-ROLE-04: req.user không tồn tại (chưa qua authenticateToken) → 403', () => {
        const req = {};
        authorizeRole('admin')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('TC-ROLE-05: req.user.role là undefined → 403', () => {
        const req = { user: { id: 1 } }; // không có role
        authorizeRole('admin')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('TC-ROLE-06: Role list rỗng → luôn từ chối', () => {
        const req = { user: { role: 'admin' } };
        authorizeRole()(req, res, next); // không truyền role nào

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
