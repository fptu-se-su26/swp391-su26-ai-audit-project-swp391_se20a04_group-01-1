/**
 * admin.routes.test.js
 * Map: TC_028 (Admin khóa tài khoản ACTIVE -> LOCKED, RULE-ADM-01)
 *
 * TC_029 (Admin mở khóa LOCKED -> ACTIVE) KHÔNG có endpoint tương ứng trong code
 * (admin.routes.js chỉ có PUT /users/:id/ban, không có /unban) -> xem pending-spec.test.js
 */

const request = require("supertest");
const express = require("express");

jest.mock("../db", () => require("./testUtils/mockDb").mockDbModule());
jest.mock("../middleware/auth", () => require("./testUtils/mockAuthMiddleware").build());
jest.mock("../schedulerService", () => ({
    runFloodAlertJob: jest.fn().mockResolvedValue(undefined),
}));

const { __mockQuery } = require("../db");
const adminRouter = require("../routes/admin.routes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/admin", adminRouter);
    return app;
}

const ADMIN_USER = JSON.stringify({ id: 99, role: "admin" });
const NORMAL_USER = JSON.stringify({ id: 1, role: "user" });

beforeEach(() => {
    __mockQuery.mockReset();
});

describe("Auth guard trên toàn bộ /api/admin/*", () => {
    const app = buildApp();

    test("không có header x-test-user (giả lập chưa đăng nhập) -> 401", async () => {
        const res = await request(app).get("/api/admin/users");
        expect(res.status).toBe(401);
    });

    test("user thường (role=user) -> 403", async () => {
        const res = await request(app).get("/api/admin/users").set("x-test-user", NORMAL_USER);
        expect(res.status).toBe(403);
    });
});

describe("PUT /api/admin/users/:id/ban (TC_028 - RULE-ADM-01)", () => {
    const app = buildApp();

    test("TC_028 - Admin khóa user đang ACTIVE -> 200, set is_active=0", async () => {
        __mockQuery.mockResolvedValueOnce({ rowsAffected: [1] });

        const res = await request(app)
            .put("/api/admin/users/5/ban")
            .set("x-test-user", ADMIN_USER)
            .send({ ban_reason: "Vi phạm chính sách" });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/khóa/);
    });

    test("id không hợp lệ (không phải số) -> 400", async () => {
        const res = await request(app)
            .put("/api/admin/users/abc/ban")
            .set("x-test-user", ADMIN_USER)
            .send({});
        expect(res.status).toBe(400);
    });

    test("không tìm thấy user (rowsAffected=0) -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ rowsAffected: [0] });
        const res = await request(app)
            .put("/api/admin/users/999/ban")
            .set("x-test-user", ADMIN_USER)
            .send({});
        expect(res.status).toBe(404);
    });
});

describe("GET /api/admin/users", () => {
    const app = buildApp();

    test("admin hợp lệ -> trả danh sách user", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [{ user_id: 1, username: "u1", email: "u1@gmail.com", role: "user" }],
        });
        const res = await request(app).get("/api/admin/users").set("x-test-user", ADMIN_USER);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
});

describe("GET /api/admin/flood-zones", () => {
    const app = buildApp();

    test("trả danh sách vùng ngập kèm depthCm/level/color tính theo risk_level", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    zone_id: 1,
                    zone_name: "Khu vực Nguyễn Văn Linh",
                    district: "Hải Châu",
                    risk_level: "High",
                    polygon_coordinates: JSON.stringify([16.05, 108.2]),
                    description: "",
                    typical_flood_months: "",
                    is_active: 1,
                    last_updated: new Date("2024-01-01"),
                    updated_by: 99,
                },
            ],
        });

        const res = await request(app)
            .get("/api/admin/flood-zones")
            .set("x-test-user", ADMIN_USER);

        expect(res.status).toBe(200);
        expect(res.body.data[0].level).toBe("high");
        expect(res.body.data[0].depthCm).toBe(80); // High + chứa "Nguyễn Văn Linh"
    });
});