/**
 * MockFactory - Tạo mock data objects cho test cases
 * Tương đương Page Objects trong POM - cung cấp dữ liệu test có cấu trúc
 *
 * Sử dụng Factory Pattern để tạo test data nhất quán và dễ bảo trì.
 */
const MockFactory = {
    /**
     * Tạo mock user object chuẩn
     */
    createUser: (overrides = {}) => ({
        user_id: 1,
        username: 'testuser',
        email: 'test@test.com',
        password_hash: '$2b$10$fakehashedpassword',
        role: 'user',
        is_active: 1,
        ban_reason: null,
        created_at: new Date('2024-01-01T00:00:00Z'),
        last_login_at: new Date('2024-06-15T08:30:00Z'),
        avatar_url: null,
        is_2fa_enabled: 0,
        two_factor_secret: null,
        ...overrides
    }),

    /**
     * Tạo mock admin user
     */
    createAdminUser: (overrides = {}) =>
        MockFactory.createUser({
            user_id: 10,
            username: 'adminuser',
            email: 'admin@danang.gov.vn',
            role: 'admin',
            is_2fa_enabled: 1,
            ...overrides
        }),

    /**
     * Tạo mock banned user
     */
    createBannedUser: (overrides = {}) =>
        MockFactory.createUser({
            is_active: 0,
            ban_reason: 'Vi phạm chính sách nội dung',
            ...overrides
        }),

    /**
     * Tạo JWT payload từ user object
     */
    createJWTPayload: (user = {}) => ({
        id: user.user_id || 1,
        email: user.email || 'test@test.com',
        username: user.username || 'testuser',
        role: user.role || 'user'
    }),

    /**
     * Tạo mock DB recordset response
     */
    createDBResult: (records = []) => ({
        recordset: records,
        rowsAffected: [records.length]
    }),

    /**
     * Tạo mock empty DB response (không tìm thấy)
     */
    createEmptyDBResult: () => ({
        recordset: [],
        rowsAffected: [0]
    })
};

module.exports = MockFactory;
