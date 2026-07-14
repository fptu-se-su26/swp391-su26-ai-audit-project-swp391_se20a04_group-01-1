/**
 * BaseTest - Lớp tiện ích dùng chung cho tất cả test cases
 * Tương đương BasePage trong POM pattern của Selenium
 *
 * Cung cấp:
 * - Tạo JWT token cho test
 * - Mock request/response object
 * - Common assertions
 */
const jwt = require('jsonwebtoken');

const BaseTest = {
    /**
     * Tạo JWT token hợp lệ cho test
     * @param {Object} payload - User payload
     * @param {Object} options - JWT options
     */
    makeToken: (payload, options = {}) =>
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h', ...options }),

    /**
     * Tạo Authorization header với Bearer token
     * @param {Object} payload - User payload
     */
    makeAuthHeader: (payload) => {
        const token = BaseTest.makeToken(payload);
        return `Bearer ${token}`;
    },

    /**
     * Tạo token đã hết hạn
     */
    makeExpiredToken: (payload) =>
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1s' }),

    /**
     * Tạo mock Express request object
     */
    mockRequest: (overrides = {}) => ({
        headers: {},
        body: {},
        user: null,
        params: {},
        query: {},
        ...overrides
    }),

    /**
     * Tạo mock Express response object
     */
    mockResponse: () => {
        const res = {
            status: jest.fn(),
            json: jest.fn()
        };
        res.status.mockReturnValue(res);
        return res;
    }
};

module.exports = BaseTest;
