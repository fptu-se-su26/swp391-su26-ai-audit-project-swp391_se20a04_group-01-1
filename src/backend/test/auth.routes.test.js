const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth.routes');

// Mock Database & Email Service
jest.mock('../db', () => ({
    sql: { NVarChar: 'NVarChar', Int: 'Int', Bit: 'Bit', DateTime: 'DateTime' },
    poolPromise: Promise.resolve({
        request: jest.fn().mockReturnThis(),
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [1] })
    })
}));

jest.mock('../emailService', () => ({
    sendOtpEmail: jest.fn().mockResolvedValue(true)
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes Tests', () => {
    it('POST /api/auth/login - Thất bại do thiếu thông tin', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com' }); // Thiếu password
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe("Vui lòng nhập email và mật khẩu!");
    });

    it('POST /api/auth/register - Thất bại do email không hợp lệ', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', email: 'invalid-email', password: 'password123' });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toBe("Email không hợp lệ!");
    });
});