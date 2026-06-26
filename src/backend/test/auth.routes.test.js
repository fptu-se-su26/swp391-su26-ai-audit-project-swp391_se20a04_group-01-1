/**
 * auth.routes.test.js
 * Phạm vi: POST /api/auth/register, /login, /forgot-password, /verify-otp,
 *          /reset-password, /resend-otp
 *
 * Map với bảng Test Case (Module 1&2 – Đăng ký/Đăng nhập):
 *   - TC_008-011 (EP email)      -> áp dụng cho /register (nơi isValidEmail thực sự được gọi)
 *   - TC_001-007 (BVA password)  -> áp dụng cho /register (nơi isValidPassword thực sự được gọi)
 *   - TC_012     (sai mật khẩu)  -> /login
 *   - TC_030     (tài khoản LOCKED) -> /login (code hiện tại chỉ có 1 trạng thái "banned"
 *                                       qua is_active=0, KHÔNG phân biệt LOCKED vs DELETED)
 *   - TC_032     (tài khoản DELETED) -> /login (xem ghi chú MISMATCH bên dưới)
 *   - TC_023-025 (OTP 6 số, đúng/sai/thiếu ký tự) -> dùng /verify-otp (flow RESET PASSWORD
 *                                       thật trong code) để kiểm tra logic OTP, vì code
 *                                       KHÔNG có OTP xác thực email khi đăng ký (xem pending-spec.test.js)
 *
 * ⚠️ KHÔNG mock utils/helpers trong các describe BVA/EP — dùng đúng stub thật (8-32 ký tự,
 *    regex email) đã định nghĩa trong utils/helpers.js để test sát với rule trong Excel.
 *    Nếu bạn có file helpers.js thật khác rule này, hãy cập nhật lại stub rồi chạy lại.
 */

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

jest.mock("../db", () => require("./testUtils/mockDb").mockDbModule());
jest.mock("../emailService", () => ({
    sendOtpEmail: jest.fn().mockResolvedValue(true),
}));
// authenticateToken không dùng trong các route được test ở đây nên không cần mock middleware

const { __mockQuery } = require("../db");
const authRouter = require("../routes/auth.routes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);
    return app;
}

beforeEach(() => {
    __mockQuery.mockReset();
    process.env.JWT_SECRET = "test-secret";
});

describe("POST /api/auth/register", () => {
    const app = buildApp();

    test("thiếu username/email/password -> 400", async () => {
        const res = await request(app).post("/api/auth/register").send({ email: "a@b.com" });
        expect(res.status).toBe(400);
    });

    describe("EP - Email format (mapping TC_008-011, RULE-REG-01)", () => {
        test.each([
            ["TC_009 - thiếu @", "useremail.com"],
            ["TC_010 - thiếu domain sau @", "user@"],
            ["TC_011 - chứa khoảng trắng", "user @gmail.com"],
        ])("%s -> 400 \"Email không hợp lệ!\"", async (_label, email) => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email, password: "12345678" });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Email không hợp lệ!");
        });

        test("TC_008 - email đúng định dạng -> vượt qua bước validate email", async () => {
            __mockQuery
                .mockResolvedValueOnce({ recordset: [] }) // check email chưa tồn tại
                .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }); // insert user

            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "12345678" });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Tạo tài khoản thành công!");
        });
    });

    describe("BVA - Độ dài mật khẩu (mapping TC_001-006, RULE-REG-03)", () => {
        test("TC_001 - 7 ký tự (dưới min) -> 400", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "1234567" });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Mật khẩu/);
        });

        test("TC_002 - 8 ký tự (đúng min) -> chấp nhận, đi tiếp tới DB", async () => {
            __mockQuery
                .mockResolvedValueOnce({ recordset: [] })
                .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "12345678" });
            expect(res.status).toBe(201);
        });

        test("TC_003 - 9 ký tự (min+1) -> chấp nhận", async () => {
            __mockQuery
                .mockResolvedValueOnce({ recordset: [] })
                .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "123456789" });
            expect(res.status).toBe(201);
        });

        test("TC_004 - 31 ký tự (max-1) -> chấp nhận", async () => {
            __mockQuery
                .mockResolvedValueOnce({ recordset: [] })
                .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "a".repeat(31) });
            expect(res.status).toBe(201);
        });

        test("TC_005 - 32 ký tự (đúng max) -> chấp nhận", async () => {
            __mockQuery
                .mockResolvedValueOnce({ recordset: [] })
                .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] });
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "a".repeat(32) });
            expect(res.status).toBe(201);
        });

        test("TC_006 - 33 ký tự (vượt max) -> 400", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "a".repeat(33) });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Mật khẩu/);
        });

        test("TC_007 - mật khẩu bỏ trống -> 400", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({ username: "testuser", email: "user@gmail.com", password: "" });
            expect(res.status).toBe(400);
        });
    });

    test("email đã tồn tại trong DB -> 400", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1 }] });
        const res = await request(app)
            .post("/api/auth/register")
            .send({ username: "testuser", email: "user@gmail.com", password: "12345678" });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Email này đã được đăng ký!");
    });

    test("username dưới 3 ký tự (sau khi trim) -> 400", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ username: "ab", email: "user@gmail.com", password: "12345678" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Username/);
    });
});

describe("POST /api/auth/login", () => {
    const app = buildApp();

    test("thiếu email hoặc password -> 400", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "user@gmail.com" });
        expect(res.status).toBe(400);
    });

    test("email sai định dạng -> 400 \"Email không hợp lệ!\"", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "useremail.com", password: "12345678" });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Email không hợp lệ!");
    });

    test("TC_012 - email không tồn tại trong DB -> 401 sai thông tin", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "notfound@gmail.com", password: "WrongPass99" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Email hoặc mật khẩu không chính xác!");
    });

    test("TC_012 - mật khẩu sai (không khớp hash) -> 401 sai thông tin", async () => {
        const hash = await bcrypt.hash("CorrectPass123", 10);
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    user_id: 1,
                    username: "user",
                    email: "user@gmail.com",
                    password_hash: hash,
                    role: "user",
                    is_active: 1,
                    ban_reason: null,
                },
            ],
        });
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "user@gmail.com", password: "WrongPass99" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Email hoặc mật khẩu không chính xác!");
    });

    test("TC_030 - tài khoản bị khóa (is_active = 0) -> 403 kèm lý do khóa", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    user_id: 1,
                    username: "locked_user",
                    email: "locked_user@gmail.com",
                    password_hash: "irrelevant",
                    role: "user",
                    is_active: 0,
                    ban_reason: "Vi phạm chính sách",
                },
            ],
        });
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "locked_user@gmail.com", password: "AnyPass123" });
        expect(res.status).toBe(403);
        // ⚠️ MISMATCH: Excel kỳ vọng message "Tài khoản đã bị khóa, vui lòng liên hệ CSKH"
        // (TC_030). Code thật trả message theo checkBanStatus() — phụ thuộc ban_reason.
        expect(res.body.message).toMatch(/khóa/i);
    });

    test(
        "TC_032 (MISMATCH) - code hiện tại KHÔNG có trạng thái DELETED riêng; " +
        "email không tồn tại trả về message sai-thông-tin chung, không phải 'tài khoản không tồn tại'",
        async () => {
            __mockQuery.mockResolvedValueOnce({ recordset: [] });
            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "deleted_user@gmail.com", password: "AnyPass123" });
            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Email hoặc mật khẩu không chính xác!");
            expect(res.body.message).not.toBe("Tài khoản không tồn tại trên hệ thống");
        }
    );

    test("đăng nhập thành công -> trả token + thông tin user", async () => {
        const hash = await bcrypt.hash("12345678", 10);
        __mockQuery
            .mockResolvedValueOnce({
                recordset: [
                    {
                        user_id: 1,
                        username: "user",
                        email: "user@gmail.com",
                        password_hash: hash,
                        role: "user",
                        is_active: 1,
                        ban_reason: null,
                    },
                ],
            })
            .mockResolvedValueOnce({ recordset: [{ is_2fa_enabled: 0, role: "user" }] })
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }); // update last_login_at

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "user@gmail.com", password: "12345678" });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe("user@gmail.com");
    });

    test("admin có 2FA bật -> trả requires2FA + tempToken (không login thẳng)", async () => {
        const hash = await bcrypt.hash("AdminPass123", 10);
        __mockQuery
            .mockResolvedValueOnce({
                recordset: [
                    {
                        user_id: 99,
                        username: "admin",
                        email: "admin@danangcity.gov.vn",
                        password_hash: hash,
                        role: "admin",
                        is_active: 1,
                        ban_reason: null,
                    },
                ],
            })
            .mockResolvedValueOnce({ recordset: [{ is_2fa_enabled: 1, role: "admin" }] });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "admin@danangcity.gov.vn", password: "AdminPass123" });

        expect(res.status).toBe(200);
        expect(res.body.requires2FA).toBe(true);
        expect(res.body.tempToken).toBeDefined();
    });
});

describe("POST /api/auth/verify-otp (flow reset password — dùng để kiểm tra logic OTP chung)", () => {
    const app = buildApp();

    test("TC_025-equivalent - OTP thiếu ký tự (5 số) -> 400 \"OTP phải là 6 chữ số!\"", async () => {
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "12345" });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("OTP phải là 6 chữ số!");
    });

    test("TC_024-equivalent - OTP sai (không khớp mã đã gửi) -> 400", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    otp_id: 1,
                    otp_code: "482615",
                    expires_at: new Date(Date.now() + 5 * 60 * 1000),
                    is_used: 0,
                },
            ],
        });
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "999999" });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("OTP không chính xác!");
    });

    test("TC_023-equivalent - OTP đúng -> 200 xác thực thành công", async () => {
        __mockQuery
            .mockResolvedValueOnce({
                recordset: [
                    {
                        otp_id: 1,
                        otp_code: "482615",
                        expires_at: new Date(Date.now() + 5 * 60 * 1000),
                        is_used: 0,
                    },
                ],
            })
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }); // mark OTP used

        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "482615" });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("OTP xác thực thành công!");
    });

    test("OTP đã hết hạn -> 400", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    otp_id: 1,
                    otp_code: "482615",
                    expires_at: new Date(Date.now() - 1000),
                    is_used: 0,
                },
            ],
        });
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "482615" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/hết hạn/);
    });

    test("không tồn tại yêu cầu reset nào đang chờ -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "482615" });
        expect(res.status).toBe(404);
    });
});

describe("POST /api/auth/forgot-password", () => {
    const app = buildApp();

    test("email không tồn tại -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "notfound@gmail.com" });
        expect(res.status).toBe(404);
    });

    test("email tồn tại -> 200, gửi OTP", async () => {
        __mockQuery
            .mockResolvedValueOnce({ recordset: [{ user_id: 1 }] })
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }) // delete old OTP
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }); // insert new OTP

        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "user@gmail.com" });
        expect(res.status).toBe(200);
    });
});

describe("POST /api/auth/reset-password", () => {
    const app = buildApp();

    test("mật khẩu mới không hợp lệ -> 400", async () => {
        const res = await request(app)
            .post("/api/auth/reset-password")
            .send({ email: "user@gmail.com", newPassword: "123" });
        expect(res.status).toBe(400);
    });

    test("OTP chưa được xác thực (is_used=0/không có record) -> 400", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });
        const res = await request(app)
            .post("/api/auth/reset-password")
            .send({ email: "user@gmail.com", newPassword: "NewPass12345" });
        expect(res.status).toBe(400);
    });

    test("OTP đã xác thực -> đổi mật khẩu thành công", async () => {
        __mockQuery
            .mockResolvedValueOnce({ recordset: [{ is_used: 1 }] })
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }) // update password
            .mockResolvedValueOnce({ recordset: [], rowsAffected: [1] }); // delete OTP records

        const res = await request(app)
            .post("/api/auth/reset-password")
            .send({ email: "user@gmail.com", newPassword: "NewPass12345" });
        expect(res.status).toBe(200);
    });
});

describe("Supplemental Auth unit tests from TC_061-TC_067", () => {
    const app = buildApp();

    test("TC_061 - login email bo trong -> 400", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "", password: "12345678" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/email/i);
    });

    test("TC_062 - login email co 2 ky tu @ -> 400", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "user@@gmail.com", password: "12345678" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Email/);
    });

    test("TC_063 - password chi gom khoang trang -> 400", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ username: "testuser", email: "user@gmail.com", password: "        " });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/M/);
    });

    test("TC_064 - OTP da het han -> 400", async () => {
        __mockQuery.mockResolvedValueOnce({
            recordset: [
                {
                    otp_id: 99,
                    otp_code: "482615",
                    expires_at: new Date(Date.now() - 5 * 60 * 1000),
                    is_used: 0,
                },
            ],
        });

        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "482615" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/OTP/);
    });

    test("TC_065 - OTP 7 ky tu vuot gioi han -> 400", async () => {
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: "user@gmail.com", otp: "1234567" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/OTP/);
    });

    test("TC_067 - forgot password voi email chua dang ky -> 404", async () => {
        __mockQuery.mockResolvedValueOnce({ recordset: [] });

        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "notfound@gmail.com" });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Email/);
    });
});
