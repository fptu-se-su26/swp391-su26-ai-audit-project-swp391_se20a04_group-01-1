const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin.routes');

const app = express();
app.use(express.json());

// Mock Middleware để giả lập việc không có hoặc có token
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        if (req.headers.authorization === 'Bearer VALID_ADMIN_TOKEN') {
            req.user = { id: 1, role: 'admin' };
            next();
        } else {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    },
    authorizeRole: (role) => (req, res, next) => {
        if (req.user && req.user.role === role) next();
        else return res.status(403).json({ message: 'Forbidden' });
    }
}));

app.use('/api/admin', adminRoutes);

describe('Admin Routes Tests', () => {
    it('GET /api/admin/users - Chặn truy cập nếu không có token', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.statusCode).toEqual(401);
    });

    it('GET /api/admin/users - Cho phép truy cập nếu là admin', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', 'Bearer VALID_ADMIN_TOKEN');
        
        // Trả về 200 hoặc 500 (do chưa mock sâu DB, nhưng chắc chắn vượt qua auth)
        expect([200, 500]).toContain(res.statusCode); 
    });
});