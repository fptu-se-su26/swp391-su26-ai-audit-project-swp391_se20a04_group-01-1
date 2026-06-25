/**
 * Factory cho jest.mock('../middleware/auth', () => require('./testUtils/mockAuthMiddleware').build())
 *
 * Cách dùng trong test (supertest request):
 *   .set('x-test-user', JSON.stringify({ id: 1, role: 'admin' }))
 *
 * Nếu không set header này, authenticateToken sẽ trả 401 (giả lập "chưa đăng nhập").
 * authorizeRole('admin') sẽ trả 403 nếu req.user.role khác role yêu cầu.
 */
function build() {
    const authenticateToken = (req, res, next) => {
        const raw = req.headers["x-test-user"];
        if (!raw) {
            return res.status(401).json({ message: "Không có token xác thực!" });
        }
        try {
            req.user = JSON.parse(raw);
            next();
        } catch (e) {
            return res.status(403).json({ message: "Token không hợp lệ!" });
        }
    };

    const authorizeRole = (role) => (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
        }
        next();
    };

    return { authenticateToken, authorizeRole };
}

module.exports = { build };