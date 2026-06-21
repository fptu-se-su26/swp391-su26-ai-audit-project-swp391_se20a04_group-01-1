jest.mock("bcrypt", () => ({
    hash: jest.fn().mockResolvedValue("hash"),
    genSalt: jest.fn().mockResolvedValue("salt"),
    compare: jest.fn()
}));
jest.mock("../emailService", () => ({ sendOtpEmail: jest.fn().mockResolvedValue(true) }));
jest.mock("../utils/helpers", () => ({
    isValidEmail: jest.fn().mockReturnValue(true),
    isValidPassword: jest.fn().mockReturnValue(true)
}));
jest.mock("../db", () => {
    const query = jest.fn();
    return {
        sql: { NVarChar: "NVarChar", DateTime: "DateTime", Int: "Int" },
        mockQuery: query,
        poolPromise: Promise.resolve({ request: () => ({ input: jest.fn().mockReturnThis(), query }) })
    };
});

const { forgotPassword, verifyOtp, resetPassword, resendOtp, changePassword } = require("../controllers/authController");
const { mockQuery } = require("../db");
const bcrypt = require("bcrypt");
const helpers = require("../utils/helpers");

describe("FORGOT & CHANGE PASSWORD CONTROLLER", () => {
    let req, res;
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        req = { body: {}, user: { id: 1 } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();
        helpers.isValidEmail.mockReturnValue(true);
        helpers.isValidPassword.mockReturnValue(true);
    });

    // --- forgotPassword ---
    test("forgotPassword - Missing email", async () => { await forgotPassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("forgotPassword - Invalid email", async () => { req.body = { email: "a" }; helpers.isValidEmail.mockReturnValueOnce(false); await forgotPassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("forgotPassword - User not found", async () => { req.body = { email: "a@gmail.com" }; mockQuery.mockResolvedValueOnce({ recordset: [] }); await forgotPassword(req, res); expect(res.status).toHaveBeenCalledWith(404); });
    test("forgotPassword - Success", async () => { req.body = { email: "a@gmail.com" }; mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1 }] }).mockResolvedValueOnce({}).mockResolvedValueOnce({}); await forgotPassword(req, res); expect(res.json).toHaveBeenCalled(); });
    test("forgotPassword - DB Error", async () => { req.body = { email: "a@gmail.com" }; mockQuery.mockRejectedValue(new Error("DB")); await forgotPassword(req, res); expect(res.status).toHaveBeenCalledWith(500); });

    // --- verifyOtp ---
    test("verifyOtp - Missing fields", async () => { await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verifyOtp - Invalid email", async () => { req.body = { email: "a", otp: "123456" }; helpers.isValidEmail.mockReturnValueOnce(false); await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verifyOtp - Invalid OTP format", async () => { req.body = { email: "a@gmail.com", otp: "12" }; await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verifyOtp - Not found", async () => { req.body = { email: "a@gmail.com", otp: "123456" }; mockQuery.mockResolvedValueOnce({ recordset: [] }); await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(404); });
    test("verifyOtp - Expired", async () => { req.body = { email: "a@gmail.com", otp: "123456" }; mockQuery.mockResolvedValueOnce({ recordset: [{ expires_at: new Date(Date.now() - 100000) }] }); await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verifyOtp - Wrong OTP", async () => { req.body = { email: "a@gmail.com", otp: "123456" }; mockQuery.mockResolvedValueOnce({ recordset: [{ expires_at: new Date(Date.now() + 100000), otp_code: "654321" }] }); await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verifyOtp - Success", async () => { req.body = { email: "a@gmail.com", otp: "123456" }; mockQuery.mockResolvedValueOnce({ recordset: [{ otp_id: 1, otp_code: "123456", expires_at: new Date(Date.now() + 100000) }] }).mockResolvedValueOnce({}); await verifyOtp(req, res); expect(res.json).toHaveBeenCalled(); });
    test("verifyOtp - DB Error", async () => { req.body = { email: "a@gmail.com", otp: "123456" }; mockQuery.mockRejectedValue(new Error("DB")); await verifyOtp(req, res); expect(res.status).toHaveBeenCalledWith(500); });

    // --- resetPassword ---
    test("resetPassword - Missing fields", async () => { await resetPassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("resetPassword - Invalid email", async () => { req.body = { email: "a", newPassword: "123" }; helpers.isValidEmail.mockReturnValueOnce(false); await resetPassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("resetPassword - Invalid password", async () => { req.body = { email: "a@gmail.com", newPassword: "12" }; helpers.isValidPassword.mockReturnValueOnce(false); await resetPassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("resetPassword - Unverified OTP", async () => { req.body = { email: "a@gmail.com", newPassword: "newPass123" }; mockQuery.mockResolvedValueOnce({ recordset: [{ is_used: 0 }] }); await resetPassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("resetPassword - Success", async () => { req.body = { email: "a@gmail.com", newPassword: "newPass123" }; mockQuery.mockResolvedValueOnce({ recordset: [{ is_used: 1 }] }).mockResolvedValueOnce({}).mockResolvedValueOnce({}); await resetPassword(req, res); expect(res.json).toHaveBeenCalled(); });
    test("resetPassword - DB Error", async () => { req.body = { email: "a@gmail.com", newPassword: "123" }; helpers.isValidPassword.mockReturnValueOnce(true); mockQuery.mockRejectedValue(new Error("DB")); await resetPassword(req, res); expect(res.status).toHaveBeenCalledWith(500); });

    // --- resendOtp ---
    test("resendOtp - Missing email", async () => { await resendOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("resendOtp - Invalid email", async () => { req.body = { email: "a" }; helpers.isValidEmail.mockReturnValueOnce(false); await resendOtp(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("resendOtp - Not found", async () => { req.body = { email: "a@gmail.com" }; mockQuery.mockResolvedValueOnce({ recordset: [] }); await resendOtp(req, res); expect(res.status).toHaveBeenCalledWith(404); });
    test("resendOtp - Success", async () => { req.body = { email: "a@gmail.com" }; mockQuery.mockResolvedValueOnce({ recordset: [{ user_id: 1 }] }).mockResolvedValueOnce({}).mockResolvedValueOnce({}); await resendOtp(req, res); expect(res.json).toHaveBeenCalled(); });
    test("resendOtp - DB Error", async () => { req.body = { email: "a@gmail.com" }; mockQuery.mockRejectedValue(new Error("DB")); await resendOtp(req, res); expect(res.status).toHaveBeenCalledWith(500); });

    // --- changePassword ---
    test("changePassword - Invalid new password", async () => { req.body = { newPassword: "12" }; helpers.isValidPassword.mockReturnValueOnce(false); await changePassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("changePassword - User not found", async () => { req.body = { newPassword: "newPass" }; mockQuery.mockResolvedValueOnce({ recordset: [] }); await changePassword(req, res); expect(res.status).toHaveBeenCalledWith(404); });
    test("changePassword - Missing current", async () => { req.body = { newPassword: "newPass" }; mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "hash" }] }); await changePassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("changePassword - Same password", async () => { req.body = { currentPassword: "newPass", newPassword: "newPass" }; mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "hash" }] }); await changePassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("changePassword - Wrong current", async () => { req.body = { currentPassword: "old", newPassword: "newPass" }; mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "hash" }] }); bcrypt.compare.mockResolvedValueOnce(false); await changePassword(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("changePassword - Success", async () => { req.body = { currentPassword: "old", newPassword: "newPass" }; mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "hash" }] }).mockResolvedValueOnce({}); bcrypt.compare.mockResolvedValueOnce(true); await changePassword(req, res); expect(res.json).toHaveBeenCalled(); });
    test("changePassword - DB Error", async () => { req.body = { newPassword: "newPass" }; mockQuery.mockRejectedValue(new Error("DB")); await changePassword(req, res); expect(res.status).toHaveBeenCalledWith(500); });
});