const request = require("supertest");
const app = require("../server");

describe("Auth Controller", () => {

    // ================= REGISTER =================

    describe("POST /api/auth/register", () => {

        test("TC_AUTH_REG_01 - Register thành công", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "testuser",
                    email: "test@example.com",
                    password: "123456"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        test("TC_AUTH_REG_02 - Thiếu username", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    email: "test@example.com",
                    password: "123456"
                });

            expect(res.statusCode).toBe(400);
        });

        test("TC_AUTH_REG_03 - Email không hợp lệ", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "user",
                    email: "abc",
                    password: "123456"
                });

            expect(res.statusCode).toBe(400);
        });

        test("TC_AUTH_REG_04 - Password dưới 6 ký tự", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    username: "user",
                    email: "abc@gmail.com",
                    password: "123"
                });

            expect(res.statusCode).toBe(400);
        });

    });

    // ================= LOGIN =================

    describe("POST /api/auth/login", () => {

        test("TC_AUTH_LOGIN_01 - Login thành công", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "user@gmail.com",
                    password: "123456"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        test("TC_AUTH_LOGIN_02 - Sai email", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "notfound@gmail.com",
                    password: "123456"
                });

            expect([401, 404]).toContain(res.statusCode);
        });

        test("TC_AUTH_LOGIN_03 - Sai password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "user@gmail.com",
                    password: "wrongpass"
                });

            expect(res.statusCode).toBe(401);
        });

        test("TC_AUTH_LOGIN_04 - Email rỗng", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "",
                    password: "123456"
                });

            expect(res.statusCode).toBe(400);
        });

    });

    // ================= FORGOT PASSWORD =================

    describe("POST /api/auth/forgot-password", () => {

        test("TC_AUTH_FP_01 - Gửi OTP thành công", async () => {
            const res = await request(app)
                .post("/api/auth/forgot-password")
                .send({
                    email: "user@gmail.com"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        test("TC_AUTH_FP_02 - Email không tồn tại", async () => {
            const res = await request(app)
                .post("/api/auth/forgot-password")
                .send({
                    email: "notfound@gmail.com"
                });

            expect([400, 404]).toContain(res.statusCode);
        });

    });

    // ================= VERIFY OTP =================

    describe("POST /api/auth/verify-otp", () => {

        test("TC_AUTH_OTP_01 - OTP hợp lệ", async () => {
            const res = await request(app)
                .post("/api/auth/verify-otp")
                .send({
                    email: "user@gmail.com",
                    otp: "123456"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        test("TC_AUTH_OTP_02 - OTP sai", async () => {
            const res = await request(app)
                .post("/api/auth/verify-otp")
                .send({
                    email: "user@gmail.com",
                    otp: "999999"
                });

            expect(res.statusCode).toBe(400);
        });

    });

    // ================= RESET PASSWORD =================

    describe("POST /api/auth/reset-password", () => {

        test("TC_AUTH_RESET_01 - Reset thành công", async () => {
            const res = await request(app)
                .post("/api/auth/reset-password")
                .send({
                    email: "user@gmail.com",
                    newPassword: "newpass123"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        test("TC_AUTH_RESET_02 - Password quá ngắn", async () => {
            const res = await request(app)
                .post("/api/auth/reset-password")
                .send({
                    email: "user@gmail.com",
                    newPassword: "123"
                });

            expect(res.statusCode).toBe(400);
        });

    });

    // ================= GOOGLE LOGIN =================

    describe("POST /api/auth/google-login", () => {

        test("TC_AUTH_GOOGLE_01 - Token Google hợp lệ", async () => {
            const res = await request(app)
                .post("/api/auth/google-login")
                .send({
                    token: "VALID_GOOGLE_TOKEN"
                });

            expect([200, 201]).toContain(res.statusCode);
        });

        test("TC_AUTH_GOOGLE_02 - Token Google không hợp lệ", async () => {
            const res = await request(app)
                .post("/api/auth/google-login")
                .send({
                    token: "INVALID_TOKEN"
                });

            expect([400, 401]).toContain(res.statusCode);
        });

    });

});