/**
 * user.routes.test.js
 * change-password không nằm trực tiếp trong bảng TC nhưng dùng chung rule
 * isValidPassword với /register. TC_031 (User tự xóa tài khoản) KHÔNG có
 * endpoint tương ứng -> xem pending-spec.test.js
 */

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");

jest.mock("../db", () => require("./testUtils/mockDb").mockDbModule());
jest.mock("../middleware/auth", () => require("./testUtils/mockAuthMiddleware").build());

const { __mockQuery } = require("../db");
const userRouter = require("../routes/user.routes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/user", userRouter);
    return app;
}

const USER = JSON.stringify({ id: 1, role: "user" });

beforeEach(() => {
    __mockQuery.mockReset();
});

describe("GET /api/user/profile", () => {
    const app = buildApp();

    test("chưa đăng nhập -> 401", async () => {
        const res = await request(app).get("/api/user/profile");
        expect(res.status).toBe(401);
    });

    test("user không tồn tại -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });
        const res = await request(app).get("/api/user/profile").set("x-test-user", USER);
        expect(res.status).toBe(404);
    });

    test("lấy profile thành công", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    user_id: 1,
                    username: "user",
                    email: "user@gmail.com",
                    role: "user",
                    created_at: new Date(),
                    last_login_at: null,
                    password_hash: "hash",
                    avatar_url: null,
                },
            ],
        });
        const res = await request(app).get("/api/user/profile").set("x-test-user", USER);
        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe("user@gmail.com");
        expect(res.body.data.has_password).toBe(true);
    });
});

describe("PUT /api/user/change-password", () => {
    const app = buildApp();

    test("mật khẩu mới quá ngắn -> 400 (theo rule isValidPassword)", async () => {
        const res = await request(app)
            .put("/api/user/change-password")
            .set("x-test-user", USER)
            .send({ currentPassword: "12345678", newPassword: "123" });
        expect(res.status).toBe(400);
    });

    test("không nhập currentPassword khi tài khoản đã có password -> 400", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "somehash" }] });
        const res = await request(app)
            .put("/api/user/change-password")
            .set("x-test-user", USER)
            .send({ newPassword: "NewPass12345" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/mật khẩu hiện tại/i);
    });

    test("currentPassword sai -> 400", async () => {
        const hash = await bcrypt.hash("RealPass123", 10);
        __mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: hash }] });
        const res = await request(app)
            .put("/api/user/change-password")
            .set("x-test-user", USER)
            .send({ currentPassword: "WrongPass", newPassword: "NewPass12345" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/không chính xác/);
    });

    test("đổi mật khẩu thành công", async () => {
        const hash = await bcrypt.hash("RealPass123", 10);
        __mockQuery
            .mockResolvedValueOnce({ recordset: [{ password_hash: hash }] })
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });

        const res = await request(app)
            .put("/api/user/change-password")
            .set("x-test-user", USER)
            .send({ currentPassword: "RealPass123", newPassword: "NewPass12345" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đổi mật khẩu thành công!");
    });
});