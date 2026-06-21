jest.mock("speakeasy", () => ({ generateSecret: jest.fn(), totp: { verify: jest.fn() } }));
jest.mock("qrcode", () => ({ toDataURL: jest.fn() }));
jest.mock("bcrypt", () => ({ compare: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ verify: jest.fn(), sign: jest.fn().mockReturnValue("token") }));
jest.mock("../db", () => {
    const query = jest.fn();
    return { sql: { NVarChar: "NVarChar", Int: "Int" }, mockQuery: query, poolPromise: Promise.resolve({ request: () => ({ input: jest.fn().mockReturnThis(), query }) }) };
});

const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { setup2FA, confirm2FA, disable2FA, verify2FA } = require("../controllers/authController");
const { mockQuery } = require("../db");

describe("2FA CONTROLLER", () => {
    let req, res;
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        req = { user: { id: 1, email: "test@gmail.com" }, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.clearAllMocks();
    });

    test("setup2FA - Success & Error", async () => {
        speakeasy.generateSecret.mockReturnValue({ base32: "SECRET", otpauth_url: "URL" });
        QRCode.toDataURL.mockResolvedValue("QR");
        await setup2FA(req, res);
        expect(res.json).toHaveBeenCalled();
        
        QRCode.toDataURL.mockRejectedValue(new Error("err"));
        await setup2FA(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("confirm2FA - Missing code/secret", async () => { await confirm2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("confirm2FA - Missing secret", async () => { req.body = { code: "123456" }; await confirm2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("confirm2FA - Failed Verify", async () => { req.body = { code: "123456", secret: "SEC" }; speakeasy.totp.verify.mockReturnValue(false); await confirm2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("confirm2FA - Success & Error", async () => {
        req.body = { code: "123456", secret: "SEC  " };
        speakeasy.totp.verify.mockReturnValue(true);
        mockQuery.mockResolvedValue({});
        await confirm2FA(req, res);
        expect(res.json).toHaveBeenCalled();
        
        mockQuery.mockRejectedValue(new Error("DB"));
        await confirm2FA(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("disable2FA - Missing password", async () => { await disable2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("disable2FA - User not found", async () => { req.body = { password: "123" }; mockQuery.mockResolvedValueOnce({ recordset: [] }); await disable2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("disable2FA - Wrong password", async () => { req.body = { password: "123" }; mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "hash" }] }); bcrypt.compare.mockResolvedValueOnce(false); await disable2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("disable2FA - Success & Error", async () => {
        req.body = { password: "123" };
        mockQuery.mockResolvedValueOnce({ recordset: [{ password_hash: "hash" }] }).mockResolvedValueOnce({});
        bcrypt.compare.mockResolvedValueOnce(true);
        await disable2FA(req, res);
        expect(res.json).toHaveBeenCalled();

        mockQuery.mockRejectedValue(new Error("DB"));
        await disable2FA(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test("verify2FA - Missing code/token", async () => { await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verify2FA - Invalid code format", async () => { req.body = { code: "12", temp_token: "token" }; await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verify2FA - Expired token", async () => { req.body = { code: "123456", temp_token: "token" }; jwt.verify.mockImplementation(() => { throw { name: "TokenExpiredError" } }); await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(401); });
    test("verify2FA - Not temp token", async () => { req.body = { code: "123456", temp_token: "token" }; jwt.verify.mockReturnValueOnce({ temp: false }); await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verify2FA - User not found", async () => { req.body = { code: "123456", temp_token: "token" }; jwt.verify.mockReturnValueOnce({ id: 1, temp: true }); mockQuery.mockResolvedValueOnce({ recordset: [] }); await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verify2FA - 2FA not enabled", async () => { req.body = { code: "123456", temp_token: "token" }; jwt.verify.mockReturnValueOnce({ id: 1, temp: true }); mockQuery.mockResolvedValueOnce({ recordset: [{ two_factor_secret: null }] }); await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verify2FA - Wrong OTP", async () => { req.body = { code: "123456", temp_token: "token" }; jwt.verify.mockReturnValueOnce({ id: 1, temp: true }); mockQuery.mockResolvedValueOnce({ recordset: [{ two_factor_secret: "SEC" }] }); speakeasy.totp.verify.mockReturnValue(false); await verify2FA(req, res); expect(res.status).toHaveBeenCalledWith(400); });
    test("verify2FA - Success & Error", async () => {
        req.body = { code: "123456", temp_token: "token" };
        jwt.verify.mockReturnValue({ id: 1, temp: true });
        mockQuery.mockResolvedValueOnce({ recordset: [{ two_factor_secret: "SEC" }] }).mockResolvedValueOnce({});
        speakeasy.totp.verify.mockReturnValue(true);
        await verify2FA(req, res);
        expect(res.json).toHaveBeenCalled();

        jwt.verify.mockImplementation(() => { throw new Error("Other error"); });
        await verify2FA(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});