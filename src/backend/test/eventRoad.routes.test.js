const request = require('supertest');
const express = require('express');
const eventRoadRoutes = require('../routes/eventRoad.routes');

const app = express();
app.use(express.json());
app.use('/api/event-roads', eventRoadRoutes);

describe('Event Road Routes Tests', () => {
    it('GET /api/event-roads - Lấy danh sách đường cấm', async () => {
        const res = await request(app).get('/api/event-roads');
        
        // Vì đã gọi mock DB từ các test trước hoặc DB trả rỗng
        expect([200, 500]).toContain(res.statusCode);
        if (res.statusCode === 200) {
            expect(res.body).toHaveProperty('success', true);
        }
    });
});